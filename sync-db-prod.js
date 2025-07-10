// Script temporaire pour synchroniser la DB de production
import { Pool } from '@neondatabase/serverless';

async function syncDatabase() {
  // Utiliser la même DATABASE_URL que l'app
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Vérification de la structure de la table troc_ads...');
    
    // Vérifier les colonnes existantes
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'troc_ads'
      ORDER BY ordinal_position
    `);
    
    console.log('Colonnes actuelles:', result.rows.map(r => r.column_name));
    
    // Vérifier si image_url existe
    const hasImageUrl = result.rows.some(row => row.column_name === 'image_url');
    
    if (!hasImageUrl) {
      console.log('Ajout de la colonne image_url...');
      await pool.query('ALTER TABLE troc_ads ADD COLUMN image_url TEXT');
      console.log('✅ Colonne image_url ajoutée');
    } else {
      console.log('✅ Colonne image_url existe déjà');
    }
    
    // Test de création d'annonce
    console.log('Test de création d\'annonce...');
    const testResult = await pool.query(`
      INSERT INTO troc_ads (title, description, category, user_id) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, ['Test sync DB', 'Test de synchronisation', 'collaboration', 1]);
    
    console.log('✅ Test réussi:', testResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

syncDatabase();