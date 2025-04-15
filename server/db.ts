import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Vérifions si la variable DATABASE_URL est définie
console.log("DATABASE_URL défini:", !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Tentative de connexion à la base de données...");

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

console.log("Connexion à la base de données établie avec succès");

// Test de connexion à la base de données
pool.query('SELECT 1').then(() => {
  console.log("Test de connexion réussi");
}).catch(err => {
  console.error("Erreur lors du test de connexion:", err);
});