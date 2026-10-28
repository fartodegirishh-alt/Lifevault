import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import app from './server/app.js';
import { initDb } from './server/db.js';
import { initCronService } from './services/../server/services/cron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Ensure SQLite database tables and foreign keys are active
initDb();

// Start background cron scheduler for reminder notifications
initCronService();

async function startServer() {
  if (!isProduction) {
    // In development: mount Vite middlewares so SPA hot module replacement & SSR/SPA assets
    // are served directly by the Express server on port 3000 alongside /api routes.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log('[LifeVault] Vite dev middleware attached to Express on port', PORT);
  } else {
    // In production: serve static assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res, next) => {
      // Don't intercept API routes
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[LifeVault] Serving production build from dist');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LifeVault Full-Stack] Server running at http://0.0.0.0:${PORT}`);
    console.log(`[LifeVault Full-Stack] REST API ready at http://0.0.0.0:${PORT}/api`);
  });
}

startServer().catch((err) => {
  console.error('[LifeVault Server Startup Error]:', err);
  process.exit(1);
});
