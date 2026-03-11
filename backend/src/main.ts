import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pool } from './config/database';
import { NODE_ENV } from './config/env';

// Routes
import authRoutes from './auth/auth.routes';
import userRoutes from './users/user.routes';
import notesRoutes from './notes/notes.routes';
import metadataRoutes from './metadata/metadata.routes';
import tagsRoutes from './tags/tags.routes';
import { errorHandler, apiLimiter, sanitizeInput } from './common/middleware';


const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Security Middleware (0.5.0)
app.use(apiLimiter);
app.use(sanitizeInput);

// --- Routes ---

// Create API v1 Router
const v1Router = express.Router();

// Mount routes to API v1
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/notes', notesRoutes);
v1Router.use('/', metadataRoutes); // Contains /themes and /categories
v1Router.use('/tags', tagsRoutes);

// Health Check (v1)
v1Router.get('/health', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: time.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'DB Connection Error' });
  }
});

// Mount v1 Router
app.use('/api/v1', v1Router);

// --- Backward Compatibility (ALIAS) ---
// Mount the same routers at root level for legacy clients
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/notes', notesRoutes);
app.use('/', metadataRoutes);
app.use('/tags', tagsRoutes);

// Legacy Health Check
app.get('/health', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: time.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'DB Connection Error' });
  }
});

// --- Error Handler ---
app.use(errorHandler);

// --- Start Server ---
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  });
}

export default app;

