export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "../client/dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Make sure to run 'npm run build' inside /client`
    );
  }

  // Sert tous les fichiers générés (index.html, assets/*.js, etc.)
  app.use(express.static(distPath));

  // Pour toutes les routes React → on renvoie index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));

    // Ajoute ces deux lignes si elles ne sont pas déjà là
export function setupVite(app: Express, server: Server) {
  ...
}

export function log(message: string, source = "express") {
  ...
}

  });
}
