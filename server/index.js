import app from './app.js';
import { initDb } from './db.js';
import { initCronService } from './services/cron.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

// Initialize DB tables
initDb();

// Start cron reminder job
initCronService();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[LifeVault Server] Express REST API running on http://0.0.0.0:${PORT}`);
  console.log(`[LifeVault Server] Health check available at http://0.0.0.0:${PORT}/api/health`);
});

export default server;
