import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

console.log("Environnement:", process.env.NODE_ENV);
console.log("DATABASE_URL défini:", !!process.env.DATABASE_URL);

// Fonction de création de pool avec réessais
const createPoolWithRetry = (retries = 5, delay = 3000) => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }

  let attempt = 0;
  
  const tryConnect = () => {
    attempt++;
    console.log(`Tentative de connexion à la base de données (${attempt}/${retries})...`);
    
    try {
      const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000  // 10 secondes de timeout
      });
      
      return pool;
    } catch (error) {
      console.error(`Erreur de connexion (tentative ${attempt}):`, error);
      
      if (attempt >= retries) {
        console.error("Nombre maximum de tentatives atteint. Abandon.");
        throw error;
      }
      
      console.log(`Nouvelle tentative dans ${delay/1000} secondes...`);
      // En production, on attend et on réessaie
      if (process.env.NODE_ENV === 'production') {
        setTimeout(tryConnect, delay);
      } else {
        throw error;
      }
    }
  };
  
  return tryConnect();
};

// Initialiser le pool et la connexion DB avec gestion d'erreur
let pool, db;

try {
  pool = createPoolWithRetry();
  db = drizzle({ client: pool, schema });
  
  // Test de connexion
  pool.query('SELECT 1')
    .then(() => console.log("Connexion à la base de données vérifiée et fonctionnelle"))
    .catch(err => console.error("Erreur lors du test de la base de données:", err));
  
} catch (error) {
  console.error("Erreur critique lors de l'initialisation de la base de données:", error);
  
  // En développement, on échoue rapidement
  if (process.env.NODE_ENV !== 'production') {
    throw error;
  }
  
  // En production, on crée un objet de remplacement pour éviter les crashs
  console.warn("Création d'un objet de remplacement pour éviter les crashs en production");
  const mockPool = {
    query: () => Promise.reject(new Error("Database connection failed")),
    connect: () => Promise.reject(new Error("Database connection failed"))
  };
  
  pool = mockPool;
  db = {
    select: () => ({ from: () => ({ where: () => Promise.reject(new Error("Database connection failed")) }) }),
    insert: () => ({ values: () => ({ returning: () => Promise.reject(new Error("Database connection failed")) }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.reject(new Error("Database connection failed")) }) }) }),
    delete: () => ({ where: () => ({ returning: () => Promise.reject(new Error("Database connection failed")) }) })
  };
}

export { pool, db };