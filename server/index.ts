import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import fileUpload from "express-fileupload";
import { initializeStorage } from "./supabase";

const app = express();
// Créer un second serveur pour les vérifications de santé sur le port 8000
const healthApp = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload({
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limite de taille
  },
  abortOnLimit: true,
  useTempFiles: false  // Désactiver les fichiers temporaires pour utiliser la mémoire
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialiser les buckets Supabase
  try {
    await initializeStorage();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Supabase Storage:', error);
  }
  
  const server = await registerRoutes(app);

  // Gestionnaire d'erreur global amélioré
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Log détaillé de l'erreur
    console.error("ERREUR NON GÉRÉE:", err);
    console.error("Stack trace:", err.stack);
    
    // Statut HTTP à utiliser
    const status = err.status || err.statusCode || 500;
    
    // Message d'erreur à afficher
    const message = err.message || "Internal Server Error";
    
    // En production, on n'inclut pas les détails techniques dans la réponse
    const responseBody = {
      message,
      // Inclure les détails techniques seulement en développement
      ...(process.env.NODE_ENV !== 'production' && { 
        error: err.toString(),
        stack: err.stack
      })
    };
    
    // Envoyer la réponse
    res.status(status).json(responseBody);
    
    // En dev, on propage l'erreur pour avoir un crash complet
    if (process.env.NODE_ENV !== 'production') {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Configuration du serveur de santé sur le port 8000
  // Configuration des routes de santé
  healthApp.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Créer et démarrer le serveur HTTP de santé sur le port 8000
  if (process.env.NODE_ENV === 'production') {
    const healthServer = createServer(healthApp);
    healthServer.listen(8000, '0.0.0.0', () => {
      log('Health check server running on port 8000');
    });
  }
})();
