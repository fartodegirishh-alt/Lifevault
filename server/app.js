import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRouter from './routes/auth.js';
import recordsRouter from './routes/records.js';
import remindersRouter from './routes/reminders.js';
import systemRouter from './routes/system.js';

const app = express();

// Security headers with relaxed directives for dev iframe & API embedding
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite dynamically injects scripts and styles
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Cross-origin resource sharing
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// System routes (public health check endpoint)
app.use('/api', systemRouter);

// Auth, Records, and Reminders routes
app.use('/api/auth', authRouter);
app.use('/api/records', recordsRouter);
app.use('/api', remindersRouter);

// 404 handler for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    details: `No route matches ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler returning consistent { error, details }
app.use((err, req, res, next) => {
  console.error('[Centralized Error Handler]:', err);

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    details: err.message || 'An unexpected error occurred on the server',
  });
});

export default app;
