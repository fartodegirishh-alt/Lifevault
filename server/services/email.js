// Email reminder service: Only runs if SMTP credentials are provided in environment
export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

export async function sendEmailReminder({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    console.log('[LifeVault Email Service] Email reminders not configured. Skipping SMTP dispatch.');
    return {
      sent: false,
      reason: 'Email reminders not configured (SMTP credentials missing)',
    };
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'LifeVault <no-reply@lifevault.test>',
      to,
      subject,
      text,
      html,
    });

    console.log(`[LifeVault Email Service] Sent email to ${to}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[LifeVault Email Service] Error sending email:', error.message);
    return { sent: false, error: error.message };
  }
}
