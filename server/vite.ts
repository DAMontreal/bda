import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config"; // Assuming vite.config is one level up from server/
import { nanoid } from "nanoid";

const viteLogger = createLogger();

// --- Make sure this function is present and exported ---
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// --- Make sure this function is present and exported ---
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false, // Assuming you want to pass config programmatically
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
    // Define root relative to this file (server/vite.ts)
    root: path.resolve(import.meta.dirname, "..", "client"), // Point to the client directory
  });

  app.use(vite.middlewares);

  // Vite dev server SPA fallback
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Resolve index.html within the client directory
      const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      // Adjust this replacement if your client entry point is different
      template = template.replace(
        `src="/src/main.tsx"`, // Or main.jsx, etc.
        `src="/src/main.tsx?v=${nanoid()}` // Adjust path if needed
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      if (e instanceof Error) {
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });
}

// --- This is the corrected serveStatic function ---
export function serveStatic(app: Express) {
  // Calculate the correct path to the CLIENT'S build output directory
  // Goes up one level from server's dist (__dirname -> /workspace/dist), then into client/dist
  // ASSUMES client builds to 'dist'. Change 'dist' below if client/vite.config.ts uses a different build.outDir
  const clientBuildPath = path.resolve(import.meta.dirname, "..", "client", "dist");

  // Check if the calculated client build path exists
  if (!fs.existsSync(clientBuildPath)) {
    // Provide a more informative error message
    console.error(`ERROR: Client build directory not found at: ${clientBuildPath}`);
    // import.meta.dirname should be available in ES modules. If error persists, replace with __dirname if using CommonJS context, but ESM is expected here.
    console.error(`Current directory (import.meta.dirname inside running script): ${import.meta.dirname}`);
    console.error("Make sure the client is built correctly and its output directory ('dist' by default) is included in the deployment.");
    // Optionally throw an error to halt startup, or serve a minimal error page
    throw new Error(`Client build directory not found: ${clientBuildPath}`);
    /* Or alternatively, serve an error page:
    app.use("*", (_req, res) => {
      res.status(500).send("Server configuration error: Client build not found.");
    });
    return;
    */
  }

  log(`Serving static files from: ${clientBuildPath}`); // Uses the 'log' function defined above

  // Serve static assets (JS, CSS, images) from the client build directory
  app.use(express.static(clientBuildPath));

  // Fallback for SPA routing: serve the client's index.html for any unknown routes
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(clientBuildPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`Error sending index.html from ${indexPath}:`, err);
        res.status(500).send("Error loading application.");
      }
    });
  });
}

// --- Ensure path and fs imports are at the top ---
// (These should already be there based on previous snippets, but double-check)
// import path from 'path';
// import fs from 'fs';
// import express, { type Express } from 'express';
