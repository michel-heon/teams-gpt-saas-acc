const cron = require('node-cron');
const config = require('../config');
const meteringApiService = require('./meteringApiService');

/**
 * Service d'agrégation des usages pour facturation Marketplace
 * 
 * PROBLÈME : L'API Marketplace limite à 1 événement/heure par resourceId+dimension
 * SOLUTION : Accumuler localement, émettre le total agrégé toutes les heures
 * 
 * Exemple : 20 messages entre 10:00-11:00
 *   - Messages 1-20 → Accumulés dans buffer (quantity = 20)
 *   - 11:00 → Émission unique avec quantity=20 vers API
 * 
 * Architecture :
 *   - Buffer in-memory (Map) : key = "subscriptionId:planId:dimension:hour"
 *   - Tâche planifiée (node-cron) : Émission toutes les heures (minute 0)
 *   - Persistence : JSON dump au shutdown, reload au startup
 */
class UsageAggregationService {
    constructor() {
        /**
         * Buffer d'agrégation : Map<string, AggregatedUsage>
         * key format: "subscriptionId:planId:dimension:hourTimestamp"
         * value: { subscriptionId, planId, dimension, quantity, hour, firstSeen }
         */
        this.buffer = new Map();
        
        /**
         * Tâche cron pour émission planifiée
         */
        this.cronJob = null;
        
        /**
         * Flag d'initialisation
         */
        this.initialized = false;
    }

    /**
     * Initialise le service d'agrégation
     * - Charge buffer depuis fichier si disponible
     * - Démarre tâche planifiée d'émission
     */
    async initialize() {
        if (this.initialized) {
            console.log('[UsageAggregation] Service already initialized');
            return;
        }

        try {
            // Charger buffer depuis fichier (si disponible)
            await this.loadBuffer();

            // Démarrer tâche planifiée (toutes les heures à la minute 0)
            this.startScheduledEmission();

            // Hook pour sauvegarder buffer au shutdown
            this.setupShutdownHook();

            this.initialized = true;
            console.log('[UsageAggregation] Service initialized successfully');
        } catch (error) {
            console.error('[UsageAggregation] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Accumule un message dans le buffer d'agrégation
     * 
     * @param {string} subscriptionId - Azure Marketplace subscription ID (GUID)
     * @param {string} planId - Plan ID (e.g., "professional")
     * @param {string} dimension - Dimension de facturation (e.g., "pro", "enterprise")
     * @param {number} quantity - Quantité à ajouter (généralement 1 par message)
     */
    async accumulate(subscriptionId, planId, dimension, quantity = 1) {
        if (!subscriptionId || !planId || !dimension) {
            console.error('[UsageAggregation] Missing required parameters:', {
                subscriptionId, planId, dimension
            });
            return;
        }

        // Arrondir timestamp à l'heure actuelle (minute 0, seconde 0)
        const now = new Date();
        const hour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
        const hourTimestamp = hour.getTime();

        // Clé unique pour cette combinaison subscription+plan+dimension+hour
        const key = `${subscriptionId}:${planId}:${dimension}:${hourTimestamp}`;

        // Récupérer ou créer entrée dans buffer
        let entry = this.buffer.get(key);
        if (!entry) {
            entry = {
                subscriptionId,
                planId,
                dimension,
                quantity: 0,
                hour: hourTimestamp,
                firstSeen: Date.now()
            };
            this.buffer.set(key, entry);
        }

        // Incrémenter quantité
        entry.quantity += quantity;

        console.log(`[UsageAggregation] Accumulated: ${key} → quantity=${entry.quantity}`);
    }

    /**
     * Démarre tâche planifiée pour émission horaire
     * Cron: "0 * * * *" = Toutes les heures à la minute 0
     */
    startScheduledEmission() {
        if (this.cronJob) {
            console.log('[UsageAggregation] Cron job already running');
            return;
        }

        // Tâche planifiée : Toutes les heures à la minute 0
        this.cronJob = cron.schedule('0 * * * *', async () => {
            console.log('[UsageAggregation] Scheduled emission triggered');
            await this.emitAggregatedUsage();
        });

        console.log('[UsageAggregation] Scheduled emission started (hourly at minute 0)');
    }

    /**
     * Émet tous les usages agrégés vers l'API Marketplace
     * - Parcourt buffer
     * - Émet chaque entrée via meteringApiService.emitUsageEvent()
     * - Supprime entrées émises avec succès
     */
    async emitAggregatedUsage() {
        if (this.buffer.size === 0) {
            console.log('[UsageAggregation] No aggregated usage to emit');
            return;
        }

        console.log(`[UsageAggregation] Emitting ${this.buffer.size} aggregated usage entries...`);

        const now = Date.now();
        const emittedKeys = [];
        const failedKeys = [];

        for (const [key, entry] of this.buffer.entries()) {
            try {
                // Vérifier si heure est complète (éviter d'émettre heure en cours)
                const hourEnd = entry.hour + 60 * 60 * 1000; // +1 heure
                if (now < hourEnd) {
                    console.log(`[UsageAggregation] Skipping ${key} (hour not complete yet)`);
                    continue;
                }

                // Émettre vers API Marketplace
                console.log(`[UsageAggregation] Emitting ${key} with quantity=${entry.quantity}...`);
                const result = await meteringApiService.getInstance().emitUsageEvent(
                    entry.subscriptionId,
                    entry.planId,
                    entry.dimension,
                    entry.quantity,
                    new Date(entry.hour) // effectiveStartTime = début de l'heure
                );

                if (result.success) {
                    console.log(`[UsageAggregation] ✅ Successfully emitted ${key}:`, result.data);
                    emittedKeys.push(key);
                } else {
                    // Erreur non-bloquante : Conserver dans buffer pour réessayer
                    console.error(`[UsageAggregation] ⚠️ Failed to emit ${key}:`, result.error);
                    failedKeys.push(key);
                }
            } catch (error) {
                console.error(`[UsageAggregation] ❌ Error emitting ${key}:`, error);
                failedKeys.push(key);
            }
        }

        // Supprimer entrées émises avec succès
        emittedKeys.forEach(key => this.buffer.delete(key));

        console.log(`[UsageAggregation] Emission complete: ${emittedKeys.length} succeeded, ${failedKeys.length} failed`);

        // Sauvegarder buffer (pour persistance)
        await this.saveBuffer();
    }

    /**
     * Sauvegarde le buffer dans un fichier JSON (pour persistance)
     * Permet de restaurer les données agrégées après redémarrage
     */
    async saveBuffer() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const bufferFile = path.join(__dirname, '../../data/usage-buffer.json');

            // Créer dossier si nécessaire
            const dir = path.dirname(bufferFile);
            await fs.mkdir(dir, { recursive: true });

            // Convertir Map → Array pour JSON
            const bufferData = Array.from(this.buffer.entries()).map(([key, value]) => ({
                key,
                ...value
            }));

            // Écrire fichier
            await fs.writeFile(bufferFile, JSON.stringify(bufferData, null, 2));
            console.log(`[UsageAggregation] Buffer saved: ${bufferData.length} entries`);
        } catch (error) {
            console.error('[UsageAggregation] Failed to save buffer:', error);
        }
    }

    /**
     * Charge le buffer depuis fichier JSON (restauration après redémarrage)
     */
    async loadBuffer() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const bufferFile = path.join(__dirname, '../../data/usage-buffer.json');

            // Vérifier si fichier existe
            try {
                await fs.access(bufferFile);
            } catch {
                console.log('[UsageAggregation] No existing buffer file to load');
                return;
            }

            // Lire fichier
            const data = await fs.readFile(bufferFile, 'utf-8');
            const bufferData = JSON.parse(data);

            // Restaurer Map depuis Array
            bufferData.forEach(item => {
                const { key, ...value } = item;
                this.buffer.set(key, value);
            });

            console.log(`[UsageAggregation] Buffer loaded: ${this.buffer.size} entries`);
        } catch (error) {
            console.error('[UsageAggregation] Failed to load buffer:', error);
        }
    }

    /**
     * Configure hook pour sauvegarder buffer au shutdown
     */
    setupShutdownHook() {
        const shutdown = async () => {
            console.log('[UsageAggregation] Shutdown detected, saving buffer...');
            await this.saveBuffer();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }

    /**
     * Arrête le service d'agrégation
     * - Stoppe tâche cron
     * - Émet usages en attente
     * - Sauvegarde buffer
     */
    async stop() {
        console.log('[UsageAggregation] Stopping service...');

        // Arrêter tâche cron
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }

        // Émettre usages en attente
        await this.emitAggregatedUsage();

        // Sauvegarder buffer
        await this.saveBuffer();

        this.initialized = false;
        console.log('[UsageAggregation] Service stopped');
    }

    /**
     * Récupère statistiques du buffer
     * Utile pour monitoring et debugging
     */
    getStats() {
        const stats = {
            totalEntries: this.buffer.size,
            entries: []
        };

        for (const [key, entry] of this.buffer.entries()) {
            stats.entries.push({
                key,
                subscriptionId: entry.subscriptionId,
                planId: entry.planId,
                dimension: entry.dimension,
                quantity: entry.quantity,
                hour: new Date(entry.hour).toISOString(),
                firstSeen: new Date(entry.firstSeen).toISOString()
            });
        }

        return stats;
    }
}

// Singleton instance
let instance = null;

/**
 * Récupère instance singleton du service d'agrégation
 */
function getInstance() {
    if (!instance) {
        instance = new UsageAggregationService();
    }
    return instance;
}

module.exports = {
    getInstance,
    UsageAggregationService
};
