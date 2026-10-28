import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lifevault-dev-secret-key-2026';

export function authenticate(req, res, next) {
  let token = null;

  // Support Authorization header Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    // Support authenticated download link token
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      details: 'Missing bearer authorization token',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        error: 'Invalid token',
        details: 'Token payload missing user identity',
      });
    }

    const stmt = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');
    const user = stmt.get(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        details: 'The user account for this token no longer exists',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      details: err.message,
    });
  }
}
