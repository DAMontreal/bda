import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db, pool } from "../server/db";

async function main() {
  console.log("Migration started...");
  
  try {
    await migrate(db, { migrationsFolder: "migrations" });
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();