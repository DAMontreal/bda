import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
    root: path.resolve(import.meta.dirname, "..", "client"),
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}`
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

// --- REVISED serveStatic FUNCTION ---
export function serveStatic(app: Express) {
  const currentDir = typeof import.meta !== 'undefined' ? import.meta.dirname : __dirname;
  const clientBuildPath = path.resolve(currentDir, "..", "dist");

  console.log(`[serveStatic] Resolved dist directory: ${clientBuildPath}`);

  if (!fs.existsSync(clientBuildPath)) {
    console.error(`ERROR: dist directory not found at: ${clientBuildPath}`);
    throw new Error(`Missing build output: ${clientBuildPath}`);
  }

  try {
    const files = fs.readdirSync(clientBuildPath);
    console.log(`[serveStatic] Contents of dist/: ${files.join(', ')}`);
    const assetsPath = path.join(clientBuildPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      const assetFiles = fs.readdirSync(assetsPath);
      console.log(`[serveStatic] Contents of assets/: ${assetFiles.join(', ')}`);
    } else {
      console.warn(`[serveStatic] No assets/ directory found in dist/`);
    }
  } catch (err) {
    console.error(`[serveStatic] Failed to read build directory:`, err);
  }

  log(`Serving static files from: ${clientBuildPath}`);

  app.use((req, res, next) => {
    if (req.path.includes('.') && !req.path.endsWith('.html')) {
      console.log(`[Static Check] Request potentially for static file: ${req.path}`);
    }
    if (req.path.startsWith('/assets/')) {
      console.log(`[Static Check] Request for asset: ${req.path}`);
    }
    next();
  });

  app.use(express.static(clientBuildPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  // Only fallback for non-file routes (SPA routing)
  app.get("*", (req, res) => {
    if (!req.path.includes(".")) {
      console.log(`[Fallback Route] Serving index.html for request: ${req.originalUrl}`);
      const indexPath = path.join(clientBuildPath, "index.html");

      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error(`Error sending index.html:`, err);
            res.status(500).send("Error loading app.");
          } else {
            console.log(`[Fallback Route] Sent index.html for ${req.originalUrl}`);
          }
        });
      } else {
        console.error(`index.html not found at ${indexPath}`);
        res.status(404).send("App entry not found.");
      }
    } else {
      console.log(`[Fallback Route] Skipping index.html for static file: ${req.originalUrl}`);
      res.status(404).send("File not found.");
    }
  });
}
