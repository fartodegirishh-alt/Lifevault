import cron from 'node-cron';
import { db } from '../db.js';
import { getExpiryStatus, getDaysLeft } from '../utils/expiry.js';
import { isEmailConfigured, sendEmailReminder } from './email.js';

let cronState = {
  lastRunTime: null,
  lastRunSummary: 'Not run yet',
  isRunning: false,
};

export function getCronStatus() {
  return {
    lastRunTime: cronState.lastRunTime,
    lastRunSummary: cronState.lastRunSummary,
    isRunning: cronState.isRunning,
  };
}

/**
 * Executes the reminder evaluation job across all records.
 * Generates in-app notifications and optionally dispatches emails.
 */
export async function runReminderCheck() {
  if (cronState.isRunning) {
    return { status: 'already_running', timestamp: new Date().toISOString() };
  }

  cronState.isRunning = true;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const reminderWindowDays = parseInt(process.env.REMINDER_DAYS_WINDOW || '30', 10);

  let notificationsCreated = 0;
  let recordsChecked = 0;
  let emailsSent = 0;

  try {
    // Select all records joined with their user email
    const stmt = db.prepare(`
      SELECT r.*, u.email as user_email, u.name as user_name
      FROM records r
      JOIN users u ON r.user_id = u.id
    `);
    const records = stmt.all();
    recordsChecked = records.length;

    const checkExistingNotif = db.prepare(`
      SELECT id FROM notifications
      WHERE user_id = ? AND record_id = ? AND message LIKE ? AND created_at >= date('now', '-1 day')
    `);

    const insertNotif = db.prepare(`
      INSERT INTO notifications (user_id, record_id, message, is_read, created_at)
      VALUES (?, ?, ?, 0, datetime('now'))
    `);

    for (const record of records) {
      const targetDate = record.type === 'warranty' ? record.warranty_end_date : record.expiry_date;
      if (!targetDate) continue;

      const status = getExpiryStatus(targetDate, now, reminderWindowDays);
      const daysLeft = getDaysLeft(targetDate, now);

      if (daysLeft === null) continue;

      // Only notify for expiring soon (0 to window) or freshly expired (0 to -7 days)
      if (daysLeft <= reminderWindowDays && daysLeft >= -7) {
        let msg = '';
        if (daysLeft === 0) {
          msg = `Urgent: ${record.type === 'warranty' ? 'Warranty for' : 'Document'} "${record.title}" expires today (${targetDate})!`;
        } else if (daysLeft > 0) {
          msg = `Reminder: ${record.type === 'warranty' ? 'Warranty for' : 'Document'} "${record.title}" expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${targetDate}).`;
        } else {
          msg = `Notice: ${record.type === 'warranty' ? 'Warranty for' : 'Document'} "${record.title}" expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago (${targetDate}).`;
        }

        // Deduplicate: check if a notification with matching message was already posted today
        const existing = checkExistingNotif.get(record.user_id, record.id, `%${targetDate}%`);
        if (!existing) {
          insertNotif.run(record.user_id, record.id, msg);
          notificationsCreated++;

          // Attempt email dispatch if configured
          if (isEmailConfigured()) {
            const emailRes = await sendEmailReminder({
              to: record.user_email,
              subject: `[LifeVault] Expiry Alert: ${record.title}`,
              text: `Hello ${record.user_name},\n\n${msg}\n\nLog in to LifeVault to view or update this record.`,
            });
            if (emailRes.sent) emailsSent++;
          }
        }
      }
    }

    if (!isEmailConfigured()) {
      console.log('[LifeVault Cron] Email reminders not configured. In-app notifications generated.');
    }

    cronState.lastRunTime = new Date().toISOString();
    cronState.lastRunSummary = `Checked ${recordsChecked} record(s). Created ${notificationsCreated} notification(s). Emails sent: ${emailsSent}.`;
  } catch (err) {
    console.error('[LifeVault Cron] Error in reminder job:', err);
    cronState.lastRunSummary = `Error: ${err.message}`;
  } finally {
    cronState.isRunning = false;
  }

  return {
    lastRunTime: cronState.lastRunTime,
    recordsChecked,
    notificationsCreated,
    emailsSent,
    summary: cronState.lastRunSummary,
  };
}

/**
 * Initializes the node-cron scheduler:
 * - Runs once on server startup
 * - Runs every midnight ('0 0 * * *')
 */
export function initCronService() {
  console.log('[LifeVault Cron] Initializing reminder cron scheduler...');
  
  // Run on server start after short initial delay
  setTimeout(() => {
    runReminderCheck().catch(err => {
      console.error('[LifeVault Cron] Initial startup check failed:', err);
    });
  }, 2000);

  // Daily midnight cron schedule
  cron.schedule('0 0 * * *', () => {
    console.log('[LifeVault Cron] Running scheduled daily reminder job...');
    runReminderCheck();
  });
}
