import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect serverless environments (Vercel, AWS Lambda)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Choose a writable database location
let dbPath = process.env.DB_PATH;
if (!dbPath) {
  if (isServerless) {
    dbPath = '/tmp/lifevault.db';
  } else {
    dbPath = path.resolve(__dirname, '../data/lifevault.db');
  }
}

let dbDir = path.dirname(dbPath);
try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (err) {
  // If target directory is read-only (standard on Vercel), fall back to /tmp
  console.warn('[LifeVault DB] Falling back to /tmp/lifevault.db due to read-only filesystem:', err.message);
  dbPath = '/tmp/lifevault.db';
  dbDir = '/tmp';
}

export const db = new Database(dbPath);

// Enable foreign key constraints and WAL mode
db.pragma('foreign_keys = ON');
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  // Ignore journal mode errors on read-only environments
}

// Initialise schemas
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('document', 'warranty')),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      issue_date TEXT,
      expiry_date TEXT,
      purchase_date TEXT,
      warranty_months INTEGER,
      warranty_end_date TEXT,
      receipt_location TEXT,
      notes TEXT,
      file_path TEXT,
      file_original_name TEXT,
      file_mime_type TEXT,
      file_size INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      record_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_expiry ON records(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_records_warranty_end ON records(warranty_end_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  `);

  // Auto-seed if database is completely empty (vital for instant Vercel deployments)
  autoSeedIfEmpty();
}

// Helper to seed on cold start if empty
function autoSeedIfEmpty() {
  try {
    const userCount = db.prepare('SELECT count(*) as count FROM users').get()?.count || 0;
    if (userCount > 0) return;

    console.log('[LifeVault DB] Empty database detected. Auto-seeding demo user and records...');
    
    // Hash demo password: Demo@1234
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('Demo@1234', salt);

    const userRes = db.prepare(`
      INSERT INTO users (name, email, password_hash, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run('Alex Morgan (Demo)', 'demo@lifevault.test', passwordHash);

    const userId = Number(userRes.lastInsertRowid);

    const getRelative = (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.toISOString().split('T')[0];
    };

    const initialRecords = [
      {
        type: 'document',
        title: 'International Travel Passport',
        category: 'Identity',
        issue_date: getRelative(-730),
        expiry_date: getRelative(365),
        notes: 'Biometric passport. Required for international travel.',
        receipt_location: 'Home Safe, Blue Binder',
      },
      {
        type: 'document',
        title: 'State Driver’s License (Class C)',
        category: 'Vehicle',
        issue_date: getRelative(-1400),
        expiry_date: getRelative(12), // Expiring soon
        notes: 'Renew before expiration date.',
        receipt_location: 'Physical wallet',
      },
      {
        type: 'document',
        title: 'National Health ID Card',
        category: 'Identity',
        issue_date: getRelative(-750),
        expiry_date: getRelative(-18), // Expired
        notes: 'Expired card. Re-issue requested.',
        receipt_location: 'Desk drawer',
      },
      {
        type: 'document',
        title: 'Bachelor of Science Degree Certificate',
        category: 'Education',
        issue_date: getRelative(-2000),
        expiry_date: null, // Permanent
        notes: 'Original graduation certificate.',
        receipt_location: 'Safe Box A-1',
      },
      {
        type: 'warranty',
        title: 'Apple MacBook Pro 16" M3 Max',
        category: 'Warranty',
        purchase_date: getRelative(-180),
        warranty_months: 24,
        warranty_end_date: getRelative(550),
        receipt_location: 'Email receipt',
        notes: 'AppleCare+ plan active.',
      },
      {
        type: 'warranty',
        title: 'Dyson V12 Detect Slim Vacuum',
        category: 'Warranty',
        purchase_date: getRelative(-723),
        warranty_months: 24,
        warranty_end_date: getRelative(7), // Expiring soon
        receipt_location: 'Utility closet',
        notes: '2-year warranty ends this week.',
      },
      {
        type: 'warranty',
        title: 'Sony WH-1000XM4 Noise Canceling Headphones',
        category: 'Warranty',
        purchase_date: getRelative(-405),
        warranty_months: 12,
        warranty_end_date: getRelative(-40), // Expired
        receipt_location: 'BestBuy invoice',
        notes: 'Retail warranty ended.',
      },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO records (
        user_id, type, title, category, issue_date, expiry_date,
        purchase_date, warranty_months, warranty_end_date,
        receipt_location, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    for (const r of initialRecords) {
      insertStmt.run(
        userId,
        r.type,
        r.title,
        r.category,
        r.issue_date || null,
        r.expiry_date || null,
        r.purchase_date || null,
        r.warranty_months || null,
        r.warranty_end_date || null,
        r.receipt_location || null,
        r.notes || null
      );
    }

    console.log('[LifeVault DB] Auto-seed complete with demo user and sample records.');
  } catch (err) {
    console.warn('[LifeVault DB] Auto-seed skipped:', err.message);
  }
}

// Ensure tables exist upon load
initDb();
