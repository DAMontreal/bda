#!/usr/bin/env node

/**
 * Script de migration pour ajouter la colonne image_url en production
 * Ce script détecte automatiquement l'environnement et applique les migrations nécessaires
 */

import { pool } from './server/db.js';

async function migrateProduction() {
  console.log('🚀 Début de la migration de production...');
  
  try {
    // Vérifier la structure actuelle
    console.log('📊 Vérification de la structure actuelle...');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'troc_ads' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colonnes actuelles:', columnsResult.rows.map(r => r.column_name));
    
    // Vérifier si image_url existe
    const hasImageUrl = columnsResult.rows.some(row => row.column_name === 'image_url');
    
    if (!hasImageUrl) {
      console.log('➕ Ajout de la colonne image_url...');
      await pool.query('ALTER TABLE troc_ads ADD COLUMN image_url TEXT');
      console.log('✅ Colonne image_url ajoutée avec succès');
    } else {
      console.log('✅ Colonne image_url existe déjà');
    }
    
    // Test de fonctionnement
    console.log('🧪 Test de création d\'annonce avec image...');
    
    // D'abord, obtenir un utilisateur admin
    const adminResult = await pool.query('SELECT id FROM users WHERE is_admin = true LIMIT 1');
    if (adminResult.rows.length === 0) {
      throw new Error('Aucun utilisateur admin trouvé');
    }
    const adminId = adminResult.rows[0].id;
    
    // Créer une annonce de test avec image
    const testResult = await pool.query(`
      INSERT INTO troc_ads (title, description, category, user_id, image_url) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `, [
      'Test migration production',
      'Annonce de test pour vérifier le support des images',
      'collaboration',
      adminId,
      'https://yorkiuccnxoyyzrliung.supabase.co/storage/v1/object/public/image/test-migration.jpg'
    ]);
    
    console.log('✅ Test réussi! Annonce créée:', {
      id: testResult.rows[0].id,
      title: testResult.rows[0].title,
      imageUrl: testResult.rows[0].image_url
    });
    
    console.log('🎉 Migration de production terminée avec succès!');
    console.log('📸 Le support des images TROC\'DAM est maintenant activé en production');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécuter la migration
migrateProduction().catch(console.error);