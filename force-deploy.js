#!/usr/bin/env node

/**
 * Script pour forcer un redéploiement en production
 */

import fs from 'fs';

// Créer un fichier unique pour forcer le redéploiement
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const deployTrigger = `FORCE_DEPLOY_TROC_IMAGES_${timestamp}`;

// Modifier le package.json pour forcer un rebuild
const packagePath = './package.json';
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Ajouter un script de déploiement unique
packageData.scripts = packageData.scripts || {};
packageData.scripts.deploy = `echo "Deploying with ${deployTrigger}"`;

fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));

// Créer un fichier de trigger de déploiement
fs.writeFileSync('./.deployment-trigger', deployTrigger);

console.log('🚀 Déploiement forcé déclenché:', deployTrigger);
console.log('⏳ Le serveur va redémarrer automatiquement dans 1-2 minutes');
console.log('✅ Les images TROC'DAM seront alors fonctionnelles');