-- ============================================================================
-- Phase 2.3 : Script de test - Validation migration Teams Integration
-- ============================================================================
-- Description : Valide que la migration 002-teams-integration.sql s'est correctement exécutée
-- Version     : 002-test
-- Date        : 31 octobre 2025
-- Auteur      : michel-heon
-- Usage       : Exécuter APRÈS 002-teams-integration.sql
-- ============================================================================

USE [sac-02AMPSaaSDB];
GO

SET NOCOUNT ON;
GO

DECLARE @TestsPassed INT = 0;
DECLARE @TestsFailed INT = 0;
DECLARE @TestsTotal INT = 0;

PRINT '========================================================================';
PRINT 'Phase 2.3 : Tests de validation migration';
PRINT '========================================================================';
PRINT '';
PRINT 'Date : ' + CONVERT(VARCHAR(20), GETDATE(), 120);
PRINT '';

-- ============================================================================
-- TEST 1 : Vérifier colonnes Subscriptions
-- ============================================================================

PRINT '------------------------------------------------------------------------';
PRINT 'TEST 1 : Vérification colonnes Subscriptions';
PRINT '------------------------------------------------------------------------';

DECLARE @ColonnesPresentes INT;

SELECT @ColonnesPresentes = COUNT(*)
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Subscriptions'
AND COLUMN_NAME IN ('TeamsUserId', 'TeamsConversationId', 'TenantId');

SET @TestsTotal = @TestsTotal + 1;

IF @ColonnesPresentes = 3
BEGIN
    PRINT '✓ PASSED : 3 colonnes Teams présentes dans Subscriptions';
    SET @TestsPassed = @TestsPassed + 1;
END
ELSE
BEGIN
    PRINT '✗ FAILED : ' + CAST(@ColonnesPresentes AS VARCHAR(2)) + '/3 colonnes trouvées';
    SET @TestsFailed = @TestsFailed + 1;
    
    -- Détailler les colonnes manquantes
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Subscriptions' AND COLUMN_NAME = 'TeamsUserId')
        PRINT '  ✗ Colonne TeamsUserId manquante';
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Subscriptions' AND COLUMN_NAME = 'TeamsConversationId')
        PRINT '  ✗ Colonne TeamsConversationId manquante';
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Subscriptions' AND COLUMN_NAME = 'TenantId')
        PRINT '  ✗ Colonne TenantId manquante';
END

PRINT '';

-- ============================================================================
-- TEST 2 : Vérifier types des colonnes
-- ============================================================================

PRINT '------------------------------------------------------------------------';
PRINT 'TEST 2 : Vérification types des colonnes';
PRINT '------------------------------------------------------------------------';

DECLARE @TypesCorrects INT;

SELECT @TypesCorrects = COUNT(*)
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Subscriptions'
AND COLUMN_NAME IN ('TeamsUserId', 'TeamsConversationId', 'TenantId')
AND DATA_TYPE = 'nvarchar'
AND CHARACTER_MAXIMUM_LENGTH = 255
AND IS_NULLABLE = 'YES';

SET @TestsTotal = @TestsTotal + 1;

IF @TypesCorrects = 3
BEGIN
    PRINT '✓ PASSED : Types NVARCHAR(255) NULL corrects';
    SET @TestsPassed = @TestsPassed + 1;
END
ELSE
BEGIN
    PRINT '✗ FAILED : Types incorrects pour ' + CAST(3 - @TypesCorrects AS VARCHAR(2)) + ' colonne(s)';
    SET @TestsFailed = @TestsFailed + 1;
    
    -- Afficher les types actuels
    SELECT 
        COLUMN_NAME,
        DATA_TYPE + 
        CASE 
            WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
            THEN '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS VARCHAR(10)) + ')' 
            ELSE '' 
        END AS DataType,
        IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Subscriptions'
    AND COLUMN_NAME IN ('TeamsUserId', 'TeamsConversationId', 'TenantId');
END

PRINT '';

-- ============================================================================
-- TEST 3 : Vérifier index Subscriptions
-- ============================================================================

PRINT '------------------------------------------------------------------------';
PRINT 'TEST 3 : Vérification index sur Subscriptions';
PRINT '------------------------------------------------------------------------';

DECLARE @IndexPresents INT;

SELECT @IndexPresents = COUNT(*)
FROM sys.indexes
WHERE object_id = OBJECT_ID('Subscriptions')
AND name IN ('IX_Subscriptions_TeamsUserId', 'IX_Subscriptions_TenantId');

SET @TestsTotal = @TestsTotal + 1;

IF @IndexPresents = 2
BEGIN
    PRINT '✓ PASSED : 2 index Teams présents';
    SET @TestsPassed = @TestsPassed + 1;
END
ELSE
BEGIN
    PRINT '✗ FAILED : ' + CAST(@IndexPresents AS VARCHAR(2)) + '/2 index trouvés';
    SET @TestsFailed = @TestsFailed + 1;
    
    -- Lister les index existants sur Subscriptions
    SELECT 
        name AS IndexName,
        type_desc AS IndexType,
        is_unique AS IsUnique
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Subscriptions')
    ORDER BY name;
END

PRINT '';

-- ============================================================================
-- TEST 4 : Vérifier table TeamsMessageLogs (optionnel)
-- ============================================================================

PRINT '------------------------------------------------------------------------';
PRINT 'TEST 4 : Vérification table TeamsMessageLogs (optionnel)';
PRINT '------------------------------------------------------------------------';

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TeamsMessageLogs')
BEGIN
    PRINT '✓ INFO : Table TeamsMessageLogs créée';
    
    -- Vérifier les colonnes essentielles
    DECLARE @ColonnesLogs INT;
    SELECT @ColonnesLogs = COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'TeamsMessageLogs'
    AND COLUMN_NAME IN ('Id', 'SubscriptionId', 'TeamsUserId', 'ConversationId', 'Dimension', 'Timestamp');
    
    SET @TestsTotal = @TestsTotal + 1;
    
    IF @ColonnesLogs = 6
    BEGIN
        PRINT '✓ PASSED : Colonnes essentielles présentes (6/6)';
        SET @TestsPassed = @TestsPassed + 1;
        
        -- Vérifier les index sur TeamsMessageLogs
        DECLARE @IndexLogs INT;
        SELECT @IndexLogs = COUNT(*)
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('TeamsMessageLogs')
        AND name LIKE 'IX_TeamsMessageLogs%';
        
        PRINT '✓ INFO : ' + CAST(@IndexLogs AS VARCHAR(2)) + ' index créés sur TeamsMessageLogs';
    END
    ELSE
    BEGIN
        PRINT '✗ FAILED : Colonnes manquantes (' + CAST(@ColonnesLogs AS VARCHAR(2)) + '/6)';
        SET @TestsFailed = @TestsFailed + 1;
    END
END
ELSE
BEGIN
    PRINT '⊗ INFO : Table TeamsMessageLogs non créée (optionnel, OK)';
END

PRINT '';

-- ============================================================================
-- TEST 5 : Vérifier vue vw_SubscriptionUsageStats
-- ============================================================================

PRINT '------------------------------------------------------------------------';
PRINT 'TEST 5 : Vérification vue vw_SubscriptionUsageStats';
PRINT '------------------------------------------------------------------------';

SET @TestsTotal = @TestsTotal + 1;

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = 'vw_SubscriptionUsageStats')
BEGIN
    PRINT '✓ PASSED : Vue vw_SubscriptionUsageStats créée';
    SET @TestsPassed = @TestsPassed + 1;
    
    -- Tester que la vue retourne des résultats (peut être vide)
    BEGIN TRY
        DECLARE @RowCount INT;
        SELECT @RowCount = COUNT(*) FROM [dbo].[vw_SubscriptionUsageStats];
        PRINT '✓ INFO : Vue accessible, ' + CAST(@RowCount AS VARCHAR(10)) + ' abonnement(s) retourné(s)';
    END TRY
    BEGIN CATCH
        PRINT '✗ WARNING : Erreur lors de la lecture de la vue : ' + ERROR_MESSAGE();
    END CATCH
END
ELSE
BEGIN
    PRINT '✗ FAILED : Vue vw_SubscriptionUsageStats non créée';
    SET @TestsFailed = @TestsFailed + 1;
END

PRINT '';

-- ============================================================================
-- TEST 6 : Vérifier procédure sp_LinkTeamsUserToSubscription
-- ============================================================================

PRINT '------------------------------------------------------------------------';
PRINT 'TEST 6 : Vérification procédure sp_LinkTeamsUserToSubscription';
PRINT '------------------------------------------------------------------------';

SET @TestsTotal = @TestsTotal + 1;

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.ROUTINES 
    WHERE ROUTINE_NAME = 'sp_LinkTeamsUserToSubscription' 
    AND ROUTINE_TYPE = 'PROCEDURE'
)
BEGIN
    PRINT '✓ PASSED : Procédure sp_LinkTeamsUserToSubscription créée';
    SET @TestsPassed = @TestsPassed + 1;
END
ELSE
BEGIN
    PRINT '✗ FAILED : Procédure sp_LinkTeamsUserToSubscription non créée';
    SET @TestsFailed = @TestsFailed + 1;
END

PRINT '';

-- ============================================================================
-- TEST 7 : Test fonctionnel - Liaison utilisateur (avec données test)
-- ============================================================================

PRINT '------------------------------------------------------------------------';
PRINT 'TEST 7 : Test fonctionnel - Liaison utilisateur Teams';
PRINT '------------------------------------------------------------------------';

-- Créer un abonnement de test
DECLARE @TestAmpSubId UNIQUEIDENTIFIER = NEWID();
DECLARE @TestTeamsUserId NVARCHAR(255) = '29:test-phase-2-3-' + CAST(NEWID() AS NVARCHAR(36));
DECLARE @TestTenantId NVARCHAR(255) = 'test-tenant-' + CAST(NEWID() AS NVARCHAR(36));

BEGIN TRY
    -- Insérer abonnement test
    INSERT INTO [dbo].[Subscriptions] (
        AmpsubscriptionId,
        Name,
        AmpplanId,
        Ampquantity,
        SubscriptionStatus,
        CreateDate,
        IsActive
    )
    VALUES (
        @TestAmpSubId,
        'Test Subscription Phase 2.3',
        'teams-gpt-pro',
        1,
        'Subscribed',
        GETUTCDATE(),
        1
    );
    
    PRINT '✓ INFO : Abonnement test créé';
    
    -- Appeler la procédure de liaison
    DECLARE @ProcResult TABLE (
        RowsAffected INT,
        AmpSubscriptionId UNIQUEIDENTIFIER,
        TeamsUserId NVARCHAR(255),
        TenantId NVARCHAR(255),
        Status NVARCHAR(50)
    );
    
    INSERT INTO @ProcResult
    EXEC [dbo].[sp_LinkTeamsUserToSubscription]
        @AmpSubscriptionId = @TestAmpSubId,
        @TeamsUserId = @TestTeamsUserId,
        @TenantId = @TestTenantId;
    
    DECLARE @RowsAffected INT;
    SELECT @RowsAffected = RowsAffected FROM @ProcResult;
    
    SET @TestsTotal = @TestsTotal + 1;
    
    IF @RowsAffected = 1
    BEGIN
        PRINT '✓ PASSED : Procédure sp_LinkTeamsUserToSubscription fonctionne';
        SET @TestsPassed = @TestsPassed + 1;
        
        -- Vérifier que les données sont bien enregistrées
        DECLARE @VerifTeamsUserId NVARCHAR(255);
        DECLARE @VerifTenantId NVARCHAR(255);
        
        SELECT 
            @VerifTeamsUserId = TeamsUserId,
            @VerifTenantId = TenantId
        FROM [dbo].[Subscriptions]
        WHERE AmpsubscriptionId = @TestAmpSubId;
        
        IF @VerifTeamsUserId = @TestTeamsUserId AND @VerifTenantId = @TestTenantId
        BEGIN
            PRINT '✓ INFO : Données TeamsUserId et TenantId correctement enregistrées';
        END
        ELSE
        BEGIN
            PRINT '✗ WARNING : Données enregistrées différentes des données envoyées';
        END
    END
    ELSE
    BEGIN
        PRINT '✗ FAILED : Procédure a retourné ' + CAST(@RowsAffected AS VARCHAR(10)) + ' lignes affectées (attendu: 1)';
        SET @TestsFailed = @TestsFailed + 1;
    END
    
    -- Nettoyer l'abonnement test
    DELETE FROM [dbo].[Subscriptions] WHERE AmpsubscriptionId = @TestAmpSubId;
    PRINT '✓ INFO : Abonnement test supprimé';
    
END TRY
BEGIN CATCH
    PRINT '✗ FAILED : Erreur lors du test fonctionnel : ' + ERROR_MESSAGE();
    SET @TestsTotal = @TestsTotal + 1;
    SET @TestsFailed = @TestsFailed + 1;
    
    -- Nettoyer en cas d'erreur
    IF EXISTS (SELECT 1 FROM [dbo].[Subscriptions] WHERE AmpsubscriptionId = @TestAmpSubId)
    BEGIN
        DELETE FROM [dbo].[Subscriptions] WHERE AmpsubscriptionId = @TestAmpSubId;
        PRINT '✓ INFO : Abonnement test nettoyé après erreur';
    END
END CATCH

PRINT '';

-- ============================================================================
-- TEST 8 : Vérifier version DatabaseVersionHistory
-- ============================================================================

PRINT '------------------------------------------------------------------------';
PRINT 'TEST 8 : Vérification version DatabaseVersionHistory';
PRINT '------------------------------------------------------------------------';

SET @TestsTotal = @TestsTotal + 1;

IF EXISTS (
    SELECT 1 FROM [dbo].[DatabaseVersionHistory]
    WHERE VersionNumber = 8.30
)
BEGIN
    PRINT '✓ PASSED : Version 8.30 enregistrée dans DatabaseVersionHistory';
    SET @TestsPassed = @TestsPassed + 1;
    
    SELECT TOP 1
        VersionNumber,
        ChangeLog,
        CreateBy,
        CreateDate
    FROM [dbo].[DatabaseVersionHistory]
    WHERE VersionNumber = 8.30
    ORDER BY CreateDate DESC;
END
ELSE
BEGIN
    PRINT '✗ FAILED : Version 8.30 non trouvée dans DatabaseVersionHistory';
    SET @TestsFailed = @TestsFailed + 1;
END

PRINT '';

-- ============================================================================
-- Résumé des tests
-- ============================================================================

PRINT '========================================================================';
PRINT 'RÉSUMÉ DES TESTS';
PRINT '========================================================================';
PRINT '';
PRINT 'Tests exécutés : ' + CAST(@TestsTotal AS VARCHAR(3));
PRINT 'Tests réussis  : ' + CAST(@TestsPassed AS VARCHAR(3)) + ' ✓';
PRINT 'Tests échoués  : ' + CAST(@TestsFailed AS VARCHAR(3)) + CASE WHEN @TestsFailed > 0 THEN ' ✗' ELSE '' END;
PRINT '';

IF @TestsFailed = 0
BEGIN
    PRINT '========================================================================';
    PRINT '✓✓✓ TOUS LES TESTS SONT PASSÉS ✓✓✓';
    PRINT '========================================================================';
    PRINT '';
    PRINT 'La migration Phase 2.3 est validée et fonctionnelle.';
    PRINT '';
    PRINT 'Prochaines étapes :';
    PRINT '  1. Redémarrer l''application Teams GPT';
    PRINT '  2. Tester l''intégration avec un utilisateur Teams réel';
    PRINT '  3. Vérifier les logs de l''application';
    PRINT '';
END
ELSE
BEGIN
    PRINT '========================================================================';
    PRINT '✗✗✗ CERTAINS TESTS ONT ÉCHOUÉ ✗✗✗';
    PRINT '========================================================================';
    PRINT '';
    PRINT 'Veuillez vérifier les erreurs ci-dessus et corriger avant de continuer.';
    PRINT 'Il est recommandé de :';
    PRINT '  1. Vérifier les logs de la migration 002-teams-integration.sql';
    PRINT '  2. Relancer la migration si nécessaire';
    PRINT '  3. Relancer ce script de test';
    PRINT '';
END

PRINT 'Date fin : ' + CONVERT(VARCHAR(20), GETDATE(), 120);
PRINT '';

GO
