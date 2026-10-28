import express from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { upload, uploadDir } from '../middleware/upload.js';
import { getExpiryStatus, getDaysLeft, calculateWarrantyEndDate } from '../utils/expiry.js';

const router = express.Router();

// Helper to decorate record with computed expiry status and days left
function decorateRecord(record, reminderWindow = 30) {
  const targetDate = record.type === 'warranty' ? record.warranty_end_date : record.expiry_date;
  const status = getExpiryStatus(targetDate, new Date(), reminderWindow);
  const daysLeft = getDaysLeft(targetDate, new Date());

  return {
    ...record,
    has_file: Boolean(record.file_path),
    expiry_status: status,
    days_left: daysLeft,
  };
}

// Validate date format YYYY-MM-DD
function isValidDate(dateStr) {
  if (!dateStr) return true; // Optional dates pass check
  if (typeof dateStr !== 'string') return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

// Apply authentication to all record routes
router.use(authenticate);

// GET /api/records?search=&category=&status=
router.get('/', (req, res) => {
  try {
    const { search, category, status } = req.query;
    const userId = req.user.id;

    let query = 'SELECT * FROM records WHERE user_id = ?';
    const params = [userId];

    if (category && category.trim()) {
      query += ' AND category = ?';
      params.push(category.trim());
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ' AND (title LIKE ? OR notes LIKE ? OR category LIKE ? OR receipt_location LIKE ?)';
      params.push(term, term, term, term);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const rawRecords = stmt.all(...params);

    let records = rawRecords.map(r => decorateRecord(r));

    // Filter by calculated status if specified
    if (status && status.trim()) {
      const targetStatus = status.trim().toLowerCase();
      records = records.filter(r => r.expiry_status.toLowerCase() === targetStatus);
    }

    res.json({
      count: records.length,
      records,
    });
  } catch (err) {
    console.error('[Get Records Error]:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /api/records
router.post('/', (req, res) => {
  try {
    const userId = req.user.id;
    const {
      type = 'document',
      title,
      category,
      issue_date,
      expiry_date,
      purchase_date,
      warranty_months,
      warranty_end_date: custom_warranty_end_date,
      receipt_location,
      notes,
    } = req.body || {};

    // Validate type
    if (!['document', 'warranty'].includes(type)) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Record type must be either "document" or "warranty"',
      });
    }

    // Common validations
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        details: type === 'warranty' ? 'Product name is required' : 'Document title is required',
      });
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Category is required',
      });
    }

    // Date validations
    if (issue_date && !isValidDate(issue_date)) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Issue date must be a valid date format (YYYY-MM-DD)',
      });
    }

    if (expiry_date && !isValidDate(expiry_date)) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Expiry date must be a valid date format (YYYY-MM-DD)',
      });
    }

    if (purchase_date && !isValidDate(purchase_date)) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Purchase date must be a valid date format (YYYY-MM-DD)',
      });
    }

    if (custom_warranty_end_date && !isValidDate(custom_warranty_end_date)) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Warranty end date must be a valid date format (YYYY-MM-DD)',
      });
    }

    // Check: Expiry earlier than issue date
    if (issue_date && expiry_date) {
      const issue = new Date(issue_date);
      const expiry = new Date(expiry_date);
      if (expiry < issue) {
        return res.status(400).json({
          error: 'Validation error',
          details: 'Expiry date cannot be earlier than the issue date',
        });
      }
    }

    // Warranty specific calculations and checks
    let finalWarrantyEndDate = custom_warranty_end_date || null;
    if (type === 'warranty') {
      if (!purchase_date) {
        return res.status(400).json({
          error: 'Validation error',
          details: 'Purchase date is required for warranty records',
        });
      }

      if (warranty_months && !finalWarrantyEndDate) {
        finalWarrantyEndDate = calculateWarrantyEndDate(purchase_date, Number(warranty_months));
      }

      if (purchase_date && finalWarrantyEndDate) {
        const purchase = new Date(purchase_date);
        const end = new Date(finalWarrantyEndDate);
        if (end < purchase) {
          return res.status(400).json({
            error: 'Validation error',
            details: 'Warranty end date cannot be earlier than purchase date',
          });
        }
      }
    }

    const insertStmt = db.prepare(`
      INSERT INTO records (
        user_id, type, title, category, issue_date, expiry_date,
        purchase_date, warranty_months, warranty_end_date,
        receipt_location, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const info = insertStmt.run(
      userId,
      type,
      title.trim(),
      category.trim(),
      issue_date || null,
      expiry_date || null,
      purchase_date || null,
      warranty_months ? parseInt(warranty_months, 10) : null,
      finalWarrantyEndDate || null,
      receipt_location ? receipt_location.trim() : null,
      notes ? notes.trim() : null
    );

    const newId = Number(info.lastInsertRowid);
    const createdRecord = db.prepare('SELECT * FROM records WHERE id = ?').get(newId);

    res.status(201).json({
      message: `Record saved to database (ID ${newId})`,
      record: decorateRecord(createdRecord),
    });
  } catch (err) {
    console.error('[Create Record Error]:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/records/:id
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Validation error', details: 'Invalid record ID' });
    }

    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id);

    if (!record) {
      return res.status(404).json({ error: 'Not found', details: 'Record not found' });
    }

    // Ownership check: user can only access their own records
    if (record.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        details: 'You do not have permission to access this record',
      });
    }

    res.json({ record: decorateRecord(record) });
  } catch (err) {
    console.error('[Get Record Error]:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// PUT /api/records/:id
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Validation error', details: 'Invalid record ID' });
    }

    const existing = db.prepare('SELECT * FROM records WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Not found', details: 'Record not found' });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        details: 'You do not have permission to modify this record',
      });
    }

    const {
      type = existing.type,
      title = existing.title,
      category = existing.category,
      issue_date = existing.issue_date,
      expiry_date = existing.expiry_date,
      purchase_date = existing.purchase_date,
      warranty_months = existing.warranty_months,
      warranty_end_date: custom_warranty_end_date,
      receipt_location = existing.receipt_location,
      notes = existing.notes,
    } = req.body || {};

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Validation error', details: 'Title/Product name cannot be empty' });
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return res.status(400).json({ error: 'Validation error', details: 'Category cannot be empty' });
    }

    if (issue_date && !isValidDate(issue_date)) {
      return res.status(400).json({ error: 'Validation error', details: 'Issue date must be valid' });
    }

    if (expiry_date && !isValidDate(expiry_date)) {
      return res.status(400).json({ error: 'Validation error', details: 'Expiry date must be valid' });
    }

    if (issue_date && expiry_date) {
      if (new Date(expiry_date) < new Date(issue_date)) {
        return res.status(400).json({
          error: 'Validation error',
          details: 'Expiry date cannot be earlier than the issue date',
        });
      }
    }

    let finalWarrantyEndDate = custom_warranty_end_date !== undefined ? custom_warranty_end_date : existing.warranty_end_date;
    if (type === 'warranty') {
      if (warranty_months && (!finalWarrantyEndDate || custom_warranty_end_date === undefined)) {
        finalWarrantyEndDate = calculateWarrantyEndDate(purchase_date, Number(warranty_months));
      }
      if (purchase_date && finalWarrantyEndDate) {
        if (new Date(finalWarrantyEndDate) < new Date(purchase_date)) {
          return res.status(400).json({
            error: 'Validation error',
            details: 'Warranty end date cannot be earlier than purchase date',
          });
        }
      }
    }

    const updateStmt = db.prepare(`
      UPDATE records
      SET type = ?,
          title = ?,
          category = ?,
          issue_date = ?,
          expiry_date = ?,
          purchase_date = ?,
          warranty_months = ?,
          warranty_end_date = ?,
          receipt_location = ?,
          notes = ?,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);

    updateStmt.run(
      type,
      title.trim(),
      category.trim(),
      issue_date || null,
      expiry_date || null,
      purchase_date || null,
      warranty_months ? parseInt(warranty_months, 10) : null,
      finalWarrantyEndDate || null,
      receipt_location ? receipt_location.trim() : null,
      notes ? notes.trim() : null,
      id,
      userId
    );

    const updated = db.prepare('SELECT * FROM records WHERE id = ?').get(id);

    res.json({
      message: `Record updated in database (ID ${id})`,
      record: decorateRecord(updated),
    });
  } catch (err) {
    console.error('[Update Record Error]:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// DELETE /api/records/:id
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Validation error', details: 'Invalid record ID' });
    }

    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id);

    if (!record) {
      return res.status(404).json({ error: 'Not found', details: 'Record not found' });
    }

    if (record.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        details: 'You do not have permission to delete this record',
      });
    }

    // If file exists, delete it from disk
    if (record.file_path && fs.existsSync(record.file_path)) {
      try {
        fs.unlinkSync(record.file_path);
      } catch (err) {
        console.warn('[File unlink warning]:', err.message);
      }
    }

    // Delete record (cascade removes associated notifications)
    db.prepare('DELETE FROM records WHERE id = ?').run(id);

    res.json({
      message: `Record removed from database (ID ${id})`,
      id,
    });
  } catch (err) {
    console.error('[Delete Record Error]:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /api/records/:id/file (upload one file, max 5MB, type-checked)
router.post('/:id/file', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.user.id;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Validation error', details: 'Invalid record ID' });
  }

  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
  if (!record) {
    return res.status(404).json({ error: 'Not found', details: 'Record not found' });
  }

  if (record.user_id !== userId) {
    return res.status(403).json({
      error: 'Access denied',
      details: 'You do not have permission to attach files to this record',
    });
  }

  // Execute multer upload with error trapping
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size limit exceeded',
          details: 'Uploaded file cannot exceed 5 MB',
        });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          error: 'Unsupported file type',
          details: err.message,
        });
      }
      return res.status(400).json({
        error: 'Upload failed',
        details: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'No file was provided in the upload request',
      });
    }

    // Clean up old file if replaced
    if (record.file_path && fs.existsSync(record.file_path)) {
      try {
        fs.unlinkSync(record.file_path);
      } catch (e) {
        console.warn('[Old file cleanup warning]:', e.message);
      }
    }

    // Update record with file metadata
    const updateFileStmt = db.prepare(`
      UPDATE records
      SET file_path = ?,
          file_original_name = ?,
          file_mime_type = ?,
          file_size = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    updateFileStmt.run(
      req.file.path,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      id
    );

    const updated = db.prepare('SELECT * FROM records WHERE id = ?').get(id);

    res.status(200).json({
      message: `File uploaded and attached to record (ID ${id})`,
      file: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      record: decorateRecord(updated),
    });
  });
});

// GET /api/records/:id/file (authenticated download only)
router.get('/:id/file', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Validation error', details: 'Invalid record ID' });
    }

    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id);

    if (!record) {
      return res.status(404).json({ error: 'Not found', details: 'Record not found' });
    }

    // CRITICAL: Ownership check prevents User A accessing User B's files
    if (record.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        details: 'You do not have permission to download this record attachment',
      });
    }

    if (!record.file_path || !fs.existsSync(record.file_path)) {
      return res.status(404).json({
        error: 'File not found',
        details: 'No document attachment exists for this record',
      });
    }

    // Send file securely with original filename and mime type
    res.setHeader('Content-Type', record.file_mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(record.file_original_name || 'document')}"`
    );

    const fileStream = fs.createReadStream(record.file_path);
    fileStream.pipe(res);
  } catch (err) {
    console.error('[Download File Error]:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router;
