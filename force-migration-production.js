#!/usr/bin/env node

/**
 * Script de migration forcée pour ajouter la colonne image_url en production
 * Utilise une connexion directe PostgreSQL sans ORM
 */

import { Pool } from 'pg';

async function forceMigrationProduction() {
  console.log('🚀 Migration forcée en production...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL non défini');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // Tester la connexion
    console.log('📡 Test de connexion...');
    await pool.query('SELECT 1');
    console.log('✅ Connexion réussie');
    
    // Vérifier la structure actuelle
    console.log('🔍 Vérification de la structure actuelle...');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'troc_ads' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Colonnes actuelles:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Vérifier si image_url existe
    const imageUrlExists = columnsResult.rows.some(col => col.column_name === 'image_url');
    
    if (!imageUrlExists) {
      console.log('⚠️  Colonne image_url manquante, ajout en cours...');
      await pool.query('ALTER TABLE troc_ads ADD COLUMN image_url TEXT;');
      console.log('✅ Colonne image_url ajoutée');
    } else {
      console.log('✅ Colonne image_url déjà présente');
    }
    
    // Test d'insertion avec image_url
    console.log('🧪 Test insertion avec image_url...');
    const testResult = await pool.query(`
      INSERT INTO troc_ads (title, description, category, user_id, image_url, created_at)
      VALUES ('Test Migration Force', 'Test avec image_url', 'collaboration', 2, 'https://example.com/test.jpg', NOW())
      RETURNING id, title, image_url
    `);
    
    console.log('✅ Test réussi:', testResult.rows[0]);
    
    // Nettoyer le test
    await pool.query('DELETE FROM troc_ads WHERE title = \'Test Migration Force\'');
    console.log('🧹 Test nettoyé');
    
    console.log('🎉 Migration forcée terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur migration:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

forceMigrationProduction();