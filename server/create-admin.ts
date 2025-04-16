import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../shared/schema";
import { users } from "../shared/schema";

// Configuration pour Neon
neonConfig.webSocketConstructor = ws;

async function createAdminUser() {
  // URL de la base de données (à remplacer par celle passée en paramètre)
  const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];
  
  if (!DATABASE_URL) {
    console.error("Veuillez fournir l'URL de la base de données en argument");
    process.exit(1);
  }

  console.log("Tentative de connexion à la base de données...");
  console.log("URL de connexion (masquée):", DATABASE_URL.replace(/:[^:]*@/, ":****@"));

  // Connexion à la base de données
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const db = drizzle({ client: pool, schema });

  try {
    // Configuration de l'utilisateur admin
    const adminUser = {
      username: "dg",
      password: "Roxanne123", 
      email: "dg@diversiteartistique.org",
      firstName: "Direction",
      lastName: "Générale",
      bio: "Administration du Bottin des artistes",
      discipline: "administration",
      location: "Montréal",
      website: "https://www.diversiteartistique.org",
      socialMedia: {
        facebook: "https://facebook.com/diversiteartistiquemontreal",
        instagram: "https://instagram.com/diversiteartistique",
        linkedin: "https://linkedin.com/company/diversiteartistiquemontreal"
      },
      isAdmin: true,
      isApproved: true,
      createdAt: new Date()
    };

    // Configuration d'un second admin (optionnel)
    const secondAdmin = {
      username: "admin",
      password: "admin123", 
      email: "admin@diversiteartistique.org",
      firstName: "Admin",
      lastName: "DAM",
      bio: "Compte administrateur secondaire",
      discipline: "administration",
      location: "Montréal",
      isAdmin: true,
      isApproved: true,
      createdAt: new Date()
    };

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.select().from(users).where(eq(users.username, adminUser.username));

    if (existingUser.length > 0) {
      console.log(`L'utilisateur '${adminUser.username}' existe déjà.`);
    } else {
      // Insérer l'utilisateur administrateur
      const result = await db.insert(users).values([adminUser]);
      console.log("Utilisateur administrateur créé avec succès:", adminUser.username);
    }

    // Vérifier si le second admin existe déjà
    const existingSecondAdmin = await db.select().from(users).where(eq(users.username, secondAdmin.username));

    if (existingSecondAdmin.length > 0) {
      console.log(`L'utilisateur '${secondAdmin.username}' existe déjà.`);
    } else {
      // Insérer le second admin
      const result = await db.insert(users).values([secondAdmin]);
      console.log("Second administrateur créé avec succès:", secondAdmin.username);
    }

    // Lister tous les utilisateurs
    const allUsers = await db.select().from(users);
    console.log(`Total des utilisateurs dans la base de données: ${allUsers.length}`);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - Admin: ${user.isAdmin ? 'Oui' : 'Non'}, Approuvé: ${user.isApproved ? 'Oui' : 'Non'}`);
    });

    console.log("Opération terminée avec succès !");
  } catch (error) {
    console.error("Erreur lors de la création de l'admin:", error);
  } finally {
    // Fermer la connexion
    await pool.end();
  }
}

// Exécuter la fonction
createAdminUser().catch(console.error);