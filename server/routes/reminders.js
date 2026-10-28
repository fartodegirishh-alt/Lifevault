import express from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { getExpiryStatus, getDaysLeft } from '../utils/expiry.js';
import { runReminderCheck } from '../services/cron.js';

const router = express.Router();

// Helper to decorate record
function decorateRecord(record, windowDays = 30) {
  const targetDate = record.type === 'warranty' ? record.warranty_end_date : record.expiry_date;
  const status = getExpiryStatus(targetDate, new Date(), windowDays);
  const daysLeft = getDaysLeft(targetDate, new Date());

  return {
    ...record,
    has_file: Boolean(record.file_path),
    expiry_status: status,
    days_left: daysLeft,
    target_date: targetDate,
  };
}

// GET /api/upcoming?days=30
router.get('/upcoming', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const windowDays = parseInt(req.query.days || '30', 10);

    // Retrieve all records for this user
    const stmt = db.prepare('SELECT * FROM records WHERE user_id = ?');
    const allUserRecords = stmt.all(userId);

    let activeCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let noExpiryCount = 0;

    const decorated = allUserRecords.map(r => {
      const dec = decorateRecord(r, windowDays);
      if (dec.expiry_status === 'Active') activeCount++;
      else if (dec.expiry_status === 'Expiring soon') expiringSoonCount++;
      else if (dec.expiry_status === 'Expired') expiredCount++;
      else if (dec.expiry_status === 'No expiry date') noExpiryCount++;
      return dec;
    });

    // Filter to upcoming records that have a target date
    const withDate = decorated.filter(r => r.target_date !== null && r.days_left !== null);

    // Sort by days_left ascending (most urgent first)
    withDate.sort((a, b) => a.days_left - b.days_left);

    // Records within the requested window (or already expired recently)
    const upcomingRecords = withDate.filter(r => r.days_left <= windowDays);

    res.json({
      windowDays,
      counts: {
        total: allUserRecords.length,
        active: activeCount,
        expiringSoon: expiringSoonCount,
        expired: expiredCount,
        noExpiry: noExpiryCount,
      },
      upcoming: upcomingRecords,
      allSorted: withDate,
    });
  } catch (err) {
    console.error('[Upcoming Reminders Error]:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET /api/notifications
router.get('/notifications', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const stmt = db.prepare(`
      SELECT n.*, r.title as record_title, r.type as record_type
      FROM notifications n
      LEFT JOIN records r ON n.record_id = r.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 100
    `);

    const notifications = stmt.all(userId);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    res.json({
      unreadCount,
      notifications,
    });
  } catch (err) {
    console.error('[Get Notifications Error]:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/notifications/:id/read', authenticate, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Validation error', details: 'Invalid notification ID' });
    }

    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    if (!notif) {
      return res.status(404).json({ error: 'Not found', details: 'Notification not found' });
    }

    if (notif.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied', details: 'Forbidden' });
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);

    res.json({
      message: 'Notification marked as read',
      id,
    });
  } catch (err) {
    console.error('[Mark Notification Error]:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /api/notifications/read-all
router.post('/notifications/read-all', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /api/notifications/run-cron (trigger manually for testing/user sync)
router.post('/notifications/run-cron', authenticate, async (req, res) => {
  try {
    const result = await runReminderCheck();
    res.json({
      message: 'Reminder check completed',
      result,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run reminder job', details: err.message });
  }
});

export default router;
