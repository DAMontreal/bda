import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

// Configure WebSocket pour Neon Serverless
neonConfig.webSocketConstructor = ws;

// Récupérer l'URL de la base de données
const DATABASE_URL = process.env.DATABASE_URL || '';
console.log("DATABASE_URL défini:", !!DATABASE_URL);

if (!DATABASE_URL) {
  console.error("DATABASE_URL n'est pas défini!");
  process.exit(1);
}

// Fonction pour tester la connexion
async function testConnection() {
  let pool: Pool | null = null;
  
  try {
    console.log("Tentative de connexion à Supabase/Neon...");
    console.log("URL de connexion (masquée):", DATABASE_URL.replace(/:[^:]*@/, ":****@"));
    
    // Créer un pool de connexion avec un timeout explicite
    pool = new Pool({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 15000, // 15 seconds timeout
    });
    
    // Tester la connexion avec une requête simple
    const startTime = Date.now();
    const result = await pool.query('SELECT version()');
    const endTime = Date.now();
    
    console.log("✅ Connexion réussie en", (endTime - startTime), "ms");
    console.log("Version PostgreSQL:", result.rows[0].version);
    
    // Tester la liste des tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log("Tables dans la base de données:");
    tables.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });
    
    // Tester le nombre d'utilisateurs
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log("Nombre d'utilisateurs:", userCount.rows[0].count);
    
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de la connexion à la base de données:");
    console.error(error);
    return false;
  } finally {
    // Fermer proprement le pool de connexion
    if (pool) {
      console.log("Fermeture du pool de connexion...");
      await pool.end();
      console.log("Pool de connexion fermé");
    }
  }
}

// Exécuter le test
testConnection()
  .then(success => {
    if (success) {
      console.log("Test de connexion à Supabase/Neon terminé avec succès");
      process.exit(0);
    } else {
      console.error("Test de connexion à Supabase/Neon échoué");
      process.exit(1);
    }
  })
  .catch(err => {
    console.error("Erreur inattendue:", err);
    process.exit(1);
  });