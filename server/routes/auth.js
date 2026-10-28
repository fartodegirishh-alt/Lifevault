import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifevault-dev-secret-key-2026';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Full name is required',
      });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'A valid email address is required',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Password must be at least 6 characters long',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({
        error: 'Registration failed',
        details: 'An account with this email address already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const insertStmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
    const info = insertStmt.run(cleanName, cleanEmail, passwordHash);

    const userId = Number(info.lastInsertRowid);
    const user = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      created_at: new Date().toISOString(),
    };

    // Sign JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user,
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message,
    });
  }
});

// POST /api/auth/login (with rate limiting)
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Both email and password are required',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      if (req.rateLimit?.recordFailure) req.rateLimit.recordFailure();
      return res.status(401).json({
        error: 'Invalid credentials',
        details: 'Incorrect email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      if (req.rateLimit?.recordFailure) req.rateLimit.recordFailure();
      return res.status(401).json({
        error: 'Invalid credentials',
        details: 'Incorrect email or password',
      });
    }

    // Login successful
    if (req.rateLimit?.recordSuccess) req.rateLimit.recordSuccess();

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message,
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
