#!/usr/bin/env node

/**
 * Script pour synchroniser l'ORM avec la base de données en production
 * Force le rechargement du schéma de base de données
 */

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function syncORMProduction() {
  console.log('🔄 Synchronisation ORM production...');
  
  try {
    // Vérifier la connexion à la base de données
    console.log('📡 Test de connexion...');
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Connexion réussie');
    
    // Vérifier que la colonne image_url existe
    console.log('🔍 Vérification de la colonne image_url...');
    const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'troc_ads' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Colonnes trouvées:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Tester l'insertion avec image_url
    console.log('🧪 Test insertion avec image_url...');
    const testResult = await db.execute(sql`
      INSERT INTO troc_ads (title, description, category, user_id, image_url, created_at)
      VALUES ('Test ORM Sync', 'Test synchronisation ORM', 'collaboration', 2, 'https://example.com/test.jpg', NOW())
      RETURNING id, title, image_url
    `);
    
    console.log('✅ Test réussi:', testResult[0]);
    
    // Nettoyer le test
    await db.execute(sql`DELETE FROM troc_ads WHERE title = 'Test ORM Sync'`);
    console.log('🧹 Test nettoyé');
    
    console.log('🎉 Synchronisation ORM terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error.message);
    process.exit(1);
  }
}

syncORMProduction();