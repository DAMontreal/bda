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

// --- START OF MODIFIED serveStatic function with Enhanced Logging ---
export function serveStatic(app: Express) {
  // Use import.meta.dirname if available in ESM context, otherwise __dirname for CJS
  const currentDir = typeof import.meta !== 'undefined' ? import.meta.dirname : __dirname;
  const clientBuildPath = path.resolve(currentDir, "public"); // Should resolve to /workspace/dist/public

  // --- Start Enhanced Logging ---
  console.log(`[serveStatic] Running script directory (resolved): ${currentDir}`);
  console.log(`[serveStatic] Calculated client build path: ${clientBuildPath}`);

  if (!fs.existsSync(clientBuildPath)) {
    console.error(`ERROR: Client build directory not found at: ${clientBuildPath}`);
    // Updated context in error message
    console.error("Make sure the client is built correctly (vite build) and its output directory ('dist/public') is included in the deployment.");
    throw new Error(`Client build directory not found: ${clientBuildPath}`);
  } else {
    // Log the contents of the build directory to verify files exist
    try {
      const files = fs.readdirSync(clientBuildPath);
      console.log(`[serveStatic] Contents of ${clientBuildPath}: ${files.join(', ')}`);
      // Specifically check for the 'assets' subdirectory
      const assetsPath = path.join(clientBuildPath, 'assets');
      if (fs.existsSync(assetsPath)) {
         const assetFiles = fs.readdirSync(assetsPath);
         console.log(`[serveStatic] Contents of ${assetsPath}: ${assetFiles.join(', ')}`);
      } else {
         console.log(`[serveStatic] Assets directory ${assetsPath} does NOT exist!`);
      }
    } catch (e) {
       console.error(`[serveStatic] Error reading directory ${clientBuildPath}:`, e);
    }
  }
  // --- End Enhanced Logging ---

  log(`Serving static files from: ${clientBuildPath}`); // Uses the 'log' function defined above

  // Middleware to log requests potentially handled by static server
  app.use((req, res, next) => {
    // Log requests for files likely within /assets/
    if (req.path.includes('.') && !req.path.endsWith('.html')) { // Simple check for file extensions, ignore .html
         console.log(`[Static Check] Request potentially for static file: ${req.path}`);
    }
    // Specifically log requests starting with /assets/
    if (req.path.startsWith('/assets/')) {
         console.log(`[Static Check] Request for asset: ${req.path}`);
    }
    next();
  });

  // Serve static assets (JS, CSS, images) from the client build directory
  // Add options to ensure correct Content-Type for JS modules
  app.use(express.static(clientBuildPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
  }));


  // Fallback for SPA routing: serve the client's index.html for any unknown routes
  app.use("*", (_req, res) => {
    // Log when the fallback is actually hit
    console.log(`[Fallback Route] Serving index.html for request: ${_req.originalUrl}`);
    const indexPath = path.resolve(clientBuildPath, "index.html");
    // Check if index.html exists before sending
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error(`Error sending index.html from ${indexPath}:`, err);
            res.status(500).send("Error loading application.");
          } else {
            console.log(`[Fallback Route] Successfully sent index.html for ${_req.originalUrl}`);
          }
        });
    } else {
        console.error(`[Fallback Route] index.html not found at ${indexPath} for request ${_req.originalUrl}`);
        res.status(404).send("Application entry point not found.");
    }
  });
}
// --- END OF MODIFIED serveStatic function ---


// --- Ensure path and fs imports are at the top ---
// (These should already be there based on previous snippets, but double-check)
// import path from 'path';
// import fs from 'fs';
// import express, { type Express } from 'express';
