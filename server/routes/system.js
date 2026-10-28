import express from 'express';
import fs from 'fs';
import { db } from '../db.js';
import { getCronStatus } from '../services/cron.js';
import { isEmailConfigured } from '../services/email.js';
import { uploadDir } from '../middleware/upload.js';

const router = express.Router();
const serverStartTime = Date.now();

// GET /api/health
router.get('/health', (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const test = db.prepare('SELECT 1 as alive').get();
    if (test && test.alive === 1) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  const cronInfo = getCronStatus();
  const emailReady = isEmailConfigured();

  let storageStatus = 'ready';
  let storedFileCount = 0;
  try {
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      storedFileCount = files.length;
    } else {
      storageStatus = 'directory_missing';
    }
  } catch (err) {
    storageStatus = `error: ${err.message}`;
  }

  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    db: dbStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    serverStartedAt: new Date(serverStartTime).toISOString(),
    cronLastRun: cronInfo.lastRunTime,
    cronSummary: cronInfo.lastRunSummary,
    emailStatus: emailReady ? 'configured' : 'not configured',
    emailConfigured: emailReady,
    storage: {
      status: storageStatus,
      filesCount: storedFileCount,
      path: uploadDir,
    },
  });
});

export default router;
