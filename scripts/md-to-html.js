#!/usr/bin/env node
/**
 * Crée des pages HTML de redirection vers GitHub
 */

const fs = require('fs');
const path = require('path');

const GITHUB_BASE_URL = 'https://github.com/Cotechnoe/Assistant-GPT-Teams/blob/main';

// Template HTML de redirection
const REDIRECT_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url={{GITHUB_URL}}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirection - {{TITLE}}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
        h1 {
            margin: 0 0 20px 0;
            font-size: 2em;
        }
        p {
            margin: 10px 0;
            font-size: 1.1em;
        }
        a {
            color: #fff;
            text-decoration: underline;
        }
        .spinner {
            margin: 30px auto;
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Assistant GPT Teams</h1>
        <p>{{TITLE}}</p>
        <div class="spinner"></div>
        <p>Redirection vers GitHub...</p>
        <p><a href="{{GITHUB_URL}}">Cliquez ici si la redirection ne fonctionne pas</a></p>
    </div>
</body>
</html>
`;

/**
 * Crée une page HTML de redirection
 */
function createRedirectPage(mdFileName, outputDir) {
    const baseName = path.basename(mdFileName, '.md');
    const outputPath = path.join(outputDir, `${baseName}.html`);
    const githubUrl = `${GITHUB_BASE_URL}/${mdFileName}`;

    // Générer le HTML de redirection
    const html = REDIRECT_TEMPLATE
        .replace(/{{TITLE}}/g, baseName)
        .replace(/{{GITHUB_URL}}/g, githubUrl);

    // Créer le répertoire de sortie si nécessaire
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Écrire le fichier HTML
    fs.writeFileSync(outputPath, html, 'utf8');

    return outputPath;
}

/**
 * Main
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: node md-to-html.js <input_dir> <output_dir>');
        process.exit(1);
    }

    const inputDir = args[0];
    const outputDir = args[1];

    if (!fs.existsSync(inputDir)) {
        console.error(`❌ Répertoire d'entrée non trouvé: ${inputDir}`);
        process.exit(1);
    }

    // Trouver tous les fichiers .md
    const mdFiles = fs.readdirSync(inputDir)
        .filter(file => file.endsWith('.md'));

    if (mdFiles.length === 0) {
        console.error(`❌ Aucun fichier .md trouvé dans ${inputDir}`);
        process.exit(1);
    }

    console.log(`🔗 Création de ${mdFiles.length} pages de redirection GitHub...`);

    // Créer les pages de redirection
    mdFiles.forEach(mdFile => {
        const outputPath = createRedirectPage(mdFile, outputDir);
        const githubUrl = `${GITHUB_BASE_URL}/${mdFile}`;
        console.log(`  ✅ ${mdFile} → ${path.basename(outputPath)} (→ GitHub)`);
    });

    console.log(`\n✅ Pages créées! Fichiers dans: ${outputDir}`);
    console.log(`📍 Base URL GitHub: ${GITHUB_BASE_URL}`);
}

if (require.main === module) {
    main();
}

module.exports = { createRedirectPage };
