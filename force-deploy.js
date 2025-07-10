/**
 * Script pour forcer un redéploiement en production
 */

// Toucher le fichier deployment-trigger pour forcer le redéploiement
import fs from 'fs';
const date = new Date().toISOString();

// Créer/modifier un fichier pour déclencher le déploiement
fs.writeFileSync('.deployment-trigger', `DEPLOY FORCÉ - ${date}\nCorrections TROC'DAM appliquées\nSupport images activé\n`);

console.log('🚀 Déploiement forcé déclenché');
console.log('✅ Corrections TROC\'DAM seront appliquées en production');
console.log('✅ Support complet des images sera activé');
console.log('\n📋 Changements à déployer:');
console.log('- Correction erreur "Pool2 is not a constructor"');
console.log('- Correction erreur SQL "no parameter $1"');
console.log('- Bypass ORM complet avec sql.raw');
console.log('- Mode compatible avec/sans colonne image_url');
console.log('- Endpoint admin pour migration SQL');
console.log('\n⏱️ Attendre 2-3 minutes pour activation complète');