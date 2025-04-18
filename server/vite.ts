export function serveStatic(app: Express) {
  // Calculate the correct path to the CLIENT'S build output directory
  // Goes up one level from server's dist (__dirname -> /workspace/dist), then into client/dist
  // ASSUMES client builds to 'dist'. Change 'dist' below if client/vite.config.ts uses a different build.outDir
  const clientBuildPath = path.resolve(import.meta.dirname, "..", "client", "dist");

  // Check if the calculated client build path exists
  if (!fs.existsSync(clientBuildPath)) {
    // Provide a more informative error message
    console.error(`ERROR: Client build directory not found at: ${clientBuildPath}`);
    console.error(`Current directory (__dirname inside running script): ${import.meta.dirname}`);
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

  log(`Serving static files from: ${clientBuildPath}`);

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
