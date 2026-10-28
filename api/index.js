import app from '../server/app.js';
import { initDb } from '../server/db.js';

// Ensure SQLite schemas and initial demo records exist on serverless cold starts
initDb();

export default function handler(req, res) {
  return app(req, res);
}
