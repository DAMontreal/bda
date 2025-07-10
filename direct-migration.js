/**
 * Migration directe utilisant la même DATABASE_URL que la production
 */
import { Pool } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL non définie');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addImageUrlColumn() {
  console.log('🚀 MIGRATION DIRECTE - Ajout colonne image_url');
  
  try {
    // 1. Vérifier la structure actuelle
    const checkQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'troc_ads' 
      ORDER BY ordinal_position
    `;
    
    const currentStructure = await pool.query(checkQuery);
    console.log('📋 Structure actuelle de troc_ads:');
    currentStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // 2. Vérifier si image_url existe
    const hasImageUrl = currentStructure.rows.some(col => col.column_name === 'image_url');
    
    if (!hasImageUrl) {
      console.log('➕ Ajout de la colonne image_url...');
      
      await pool.query('ALTER TABLE troc_ads ADD COLUMN image_url TEXT');
      console.log('✅ Colonne image_url ajoutée avec succès');
      
      // Vérification après ajout
      const newStructure = await pool.query(checkQuery);
      console.log('📋 Nouvelle structure:');
      newStructure.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('ℹ️ Colonne image_url existe déjà');
    }
    
    // 3. Test d'insertion
    console.log('🧪 Test d\'insertion avec image_url...');
    
    const insertResult = await pool.query(`
      INSERT INTO troc_ads (title, description, category, user_id, image_url, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, title, image_url
    `, [
      'TEST FINAL MIGRATION',
      'Test après ajout colonne image_url',
      'collaboration',
      1,
      'https://example.com/test.jpg'
    ]);
    
    console.log('🎉 Test réussi:', insertResult.rows[0]);
    
    await pool.end();
    return true;
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    await pool.end();
    return false;
  }
}

addImageUrlColumn()
  .then(success => {
    console.log(success ? '🎉 MIGRATION TERMINÉE' : '❌ MIGRATION ÉCHOUÉE');
    process.exit(success ? 0 : 1);
  });