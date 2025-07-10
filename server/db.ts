import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configuration pour Neon Serverless
neonConfig.webSocketConstructor = ws;

// Log d'information sur l'environnement
console.log("Environnement:", process.env.NODE_ENV || "development");
console.log("DATABASE_URL défini:", !!process.env.DATABASE_URL);

// Vérification de la présence de l'URL de connexion
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

let pool: Pool | any;
let db: ReturnType<typeof drizzle> | any;

try {
  console.log("Tentative de connexion à la base de données...");
  
  // Initialisation du pool avec les timeouts et gestion SSL améliorée
  const sslConfig = process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } // En production, on accepte les certificats auto-signés ou expirés
    : undefined;                   // En dev, on utilise les paramètres par défaut
  
  console.log("Mode SSL:", process.env.NODE_ENV === 'production' ? "Sécurité réduite (production)" : "Standard (développement)");
  
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000, // 30 secondes de timeout
    idleTimeoutMillis: 60000,      // 1 minute d'inactivité max
    max: 20,                       // Nombre max de clients dans le pool
    ssl: sslConfig
  });
  
  // Initialisation de Drizzle ORM
  db = drizzle({ client: pool, schema });
  
  console.log("Connexion à la base de données établie avec succès");
  
  // Vérification de la connexion
  pool.query('SELECT 1')
    .then(() => console.log("Test de connexion réussi"))
    .catch((err: Error) => {
      console.error("Erreur lors du test de connexion:", err);
      
      // En production, on tente de se reconnecter
      if (process.env.NODE_ENV === 'production') {
        console.log("Tentative de reconnexion...");
        setTimeout(() => {
          pool.query('SELECT 1')
            .then(() => console.log("Reconnexion réussie"))
            .catch((err: Error) => console.error("Échec de la reconnexion:", err));
        }, 5000);
      }
    });
  
  // Gestion des événements du pool
  pool.on('error', (err: Error) => {
    console.error('Erreur inattendue du pool de connexion:', err);
    
    // En production, ne pas crash le serveur
    if (process.env.NODE_ENV !== 'production') {
      throw err;
    }
  });
  
} catch (error) {
  console.error("ERREUR CRITIQUE lors de l'initialisation de la base de données:", error);
  
  if (process.env.NODE_ENV !== 'production') {
    // En développement, on fail fast
    throw error;
  } else {
    // En production, on crée des objets qui vont logger les erreurs
    // mais ne vont pas faire crash l'application
    console.warn("Création d'objets de remplacement pour la production");
    
    // Mock pool qui renvoie des erreurs contrôlées
    pool = {
      query: () => Promise.reject(new Error("Database connection failed")),
      connect: () => Promise.reject(new Error("Database connection failed")),
      on: () => {},
      end: () => Promise.resolve()
    } as unknown as Pool;
    
    // Mock Drizzle qui renvoie des erreurs contrôlées
    db = drizzle({ client: pool, schema });
  }
}

export { pool, db };