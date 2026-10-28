import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db, initDb } from './db.js';
import { uploadDir } from './middleware/upload.js';
import { runReminderCheck } from './services/cron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to format date relative to today
function getRelativeDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

async function seed() {
  console.log('[LifeVault Seed] Starting database seeding...');
  initDb();

  // Create demo user: demo@lifevault.test / Demo@1234
  const email = 'demo@lifevault.test';
  const plainPassword = 'Demo@1234';
  const name = 'Alex Morgan (Demo)';

  // Check if user exists, else create
  let user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);
    const res = db.prepare(`
      INSERT INTO users (name, email, password_hash, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(name, email, passwordHash);
    user = { id: Number(res.lastInsertRowid), email };
    console.log(`[LifeVault Seed] Created demo user: ${email} (ID ${user.id})`);
  } else {
    console.log(`[LifeVault Seed] Existing demo user found: ${email} (ID ${user.id})`);
  }

  // Clear existing records for demo user to ensure clean seed state
  db.prepare('DELETE FROM records WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(user.id);

  // Create a sample demo document file in uploadDir
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const samplePdfPath = path.join(uploadDir, 'demo_sample_passport_copy.pdf');
  fs.writeFileSync(
    samplePdfPath,
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
  );

  const sampleReceiptPath = path.join(uploadDir, 'demo_sample_macbook_receipt.pdf');
  fs.writeFileSync(
    sampleReceiptPath,
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000010 00000 n\n0000000060 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
  );

  // 10 Fictional records spanning all categories and states:
  const seedRecords = [
    // 1. Active document
    {
      type: 'document',
      title: 'International Travel Passport',
      category: 'Identity',
      issue_date: getRelativeDate(-730),
      expiry_date: getRelativeDate(365), // Active (~1 year left)
      notes: 'Biometric passport issued in capital city. Required for overseas travel.',
      receipt_location: 'Home Safe, Blue Binder Shelf 2',
      file_path: samplePdfPath,
      file_original_name: 'Alex_Passport_Copy.pdf',
      file_mime_type: 'application/pdf',
      file_size: 350,
    },
    // 2. Expiring soon document (12 days left)
    {
      type: 'document',
      title: 'State Driver’s License (Class C)',
      category: 'Vehicle',
      issue_date: getRelativeDate(-1448),
      expiry_date: getRelativeDate(12), // Expiring soon! (12 days)
      notes: 'Must complete vision test online or in person before renewal deadline.',
      receipt_location: 'Physical wallet & digital scan',
    },
    // 3. Expired document (-18 days ago)
    {
      type: 'document',
      title: 'National Health ID Card',
      category: 'Identity',
      issue_date: getRelativeDate(-750),
      expiry_date: getRelativeDate(-18), // Expired!
      notes: 'Grace period has lapsed. Apply for digital re-issue via government portal.',
      receipt_location: 'Filing cabinet drawer A',
    },
    // 4. No expiry document
    {
      type: 'document',
      title: 'Bachelor of Science Degree Certificate',
      category: 'Education',
      issue_date: getRelativeDate(-2000),
      expiry_date: null, // No expiry date!
      notes: 'Original graduation certificate with university embossed seal.',
      receipt_location: 'Fireproof safe box A-4',
    },
    // 5. Active warranty
    {
      type: 'warranty',
      title: 'Apple MacBook Pro 16" M3 Max',
      category: 'Warranty',
      purchase_date: getRelativeDate(-180),
      warranty_months: 24,
      warranty_end_date: getRelativeDate(550), // Active (~1.5 years left)
      receipt_location: 'Email receipt + Official AppleCare+ agreement',
      notes: 'Includes AppleCare+ with accidental damage coverage.',
      file_path: sampleReceiptPath,
      file_original_name: 'Apple_Order_Receipt_MacBook.pdf',
      file_mime_type: 'application/pdf',
      file_size: 350,
    },
    // 6. Expiring soon warranty (7 days left)
    {
      type: 'warranty',
      title: 'Dyson V12 Detect Slim Vacuum',
      category: 'Warranty',
      purchase_date: getRelativeDate(-723),
      warranty_months: 24,
      warranty_end_date: getRelativeDate(7), // Expiring soon! (7 days)
      receipt_location: 'Utility closet box & digital receipt in email',
      notes: '2-year standard manufacturer warranty ending this week.',
    },
    // 7. Expired warranty (-40 days ago)
    {
      type: 'warranty',
      title: 'Sony WH-1000XM4 Noise Canceling Headphones',
      category: 'Warranty',
      purchase_date: getRelativeDate(-405),
      warranty_months: 12,
      warranty_end_date: getRelativeDate(-40), // Expired!
      receipt_location: 'BestBuy order invoice #BB-9921',
      notes: '1-year retail warranty concluded last month.',
    },
    // 8. Expiring soon document (24 days left)
    {
      type: 'document',
      title: 'Comprehensive Auto Insurance Policy',
      category: 'Insurance',
      issue_date: getRelativeDate(-341),
      expiry_date: getRelativeDate(24), // Expiring soon! (24 days)
      notes: 'Policy #POL-883921. Compare renewal quotes before direct debit.',
      receipt_location: 'Insurance broker portal & home files',
    },
    // 9. Active document
    {
      type: 'document',
      title: 'Residential Apartment Lease Agreement',
      category: 'Other',
      issue_date: getRelativeDate(-120),
      expiry_date: getRelativeDate(245), // Active
      notes: '12-month fixed term lease. 60-day renewal notice clause.',
      receipt_location: 'Shared drive and paper contract',
    },
    // 10. Active warranty
    {
      type: 'warranty',
      title: 'De\'Longhi Magnifica Espresso Machine',
      category: 'Warranty',
      purchase_date: getRelativeDate(-90),
      warranty_months: 24,
      warranty_end_date: getRelativeDate(640), // Active
      receipt_location: 'Box warranty card & kitchen appliance drawer',
      notes: 'Registered online with serial number for extended coverage.',
    },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO records (
      user_id, type, title, category, issue_date, expiry_date,
      purchase_date, warranty_months, warranty_end_date,
      receipt_location, notes, file_path, file_original_name,
      file_mime_type, file_size, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  for (const rec of seedRecords) {
    insertStmt.run(
      user.id,
      rec.type,
      rec.title,
      rec.category,
      rec.issue_date || null,
      rec.expiry_date || null,
      rec.purchase_date || null,
      rec.warranty_months || null,
      rec.warranty_end_date || null,
      rec.receipt_location || null,
      rec.notes || null,
      rec.file_path || null,
      rec.file_original_name || null,
      rec.file_mime_type || null,
      rec.file_size || null
    );
  }

  console.log(`[LifeVault Seed] Seeded ${seedRecords.length} records for demo user.`);

  // Generate initial reminder notifications
  const reminderResult = await runReminderCheck();
  console.log('[LifeVault Seed] Initial reminder scan executed:', reminderResult.summary);
  console.log('[LifeVault Seed] Database seed complete!');
}

seed().catch(err => {
  console.error('[LifeVault Seed Error]:', err);
  process.exit(1);
});
