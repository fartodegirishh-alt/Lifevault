// In-memory rate limiter for login attempts
const loginAttempts = new Map();

// Configuration: max 5 failed attempts per 15 minutes window
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const email = (req.body?.email || '').toLowerCase().trim();
  const key = `${ip}:${email}`;
  const now = Date.now();

  const record = loginAttempts.get(key);

  if (record) {
    if (now - record.startTime > WINDOW_MS) {
      // Window expired, reset
      loginAttempts.delete(key);
    } else if (record.count >= MAX_ATTEMPTS) {
      const remainingMinutes = Math.ceil((record.startTime + WINDOW_MS - now) / 60000);
      return res.status(429).json({
        error: 'Too many failed login attempts',
        details: `Account temporarily locked due to repeated failed logins. Please try again in ${remainingMinutes} minute(s).`,
      });
    }
  }

  // Attach recordFailure and recordSuccess helpers to request
  req.rateLimit = {
    recordFailure: () => {
      const current = loginAttempts.get(key) || { count: 0, startTime: now };
      if (now - current.startTime > WINDOW_MS) {
        loginAttempts.set(key, { count: 1, startTime: now });
      } else {
        loginAttempts.set(key, { count: current.count + 1, startTime: current.startTime });
      }
    },
    recordSuccess: () => {
      loginAttempts.delete(key);
    },
  };

  next();
}
