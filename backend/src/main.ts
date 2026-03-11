import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PORT, NODE_ENV, CORS_ORIGINS } from './config/env';
import { pool } from './config/database';
import { apiLimiter, sanitizeInput } from './common/middleware';
import authRoutes from './auth/auth.routes';
import userRoutes from './users/user.routes';
import noteRoutes from './notes/notes.routes';
import tagRoutes from './tags/tags.routes';
import metadataRoutes from './metadata/metadata.routes';

const app = express();

// --- Middleware ---
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Security Middleware (0.5.0)
app.use(apiLimiter);
app.use((req, res, next) => sanitizeInput(req, res, next));

// --- Routes ---

// Create API v1 Router
const v1Router = express.Router();

// Mount routes to API v1
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/notes', noteRoutes);
v1Router.use('/', metadataRoutes); // Contains /themes and /categories
v1Router.use('/tags', tagRoutes);

// Health Check (v1)
v1Router.get('/health', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: time.rows[0].now, version: 'v1' });
  } catch (_err) {
    res.status(500).json({ status: 'DB Connection Error' });
  }
});

// Mount v1 Router
app.use('/api/v1', v1Router);

// --- Backward Compatibility (ALIAS) ---
// Mount the same routers at root level for legacy clients
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/notes', noteRoutes);
app.use('/', metadataRoutes);
app.use('/tags', tagRoutes);

// Legacy Health Check
app.get('/health', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: time.rows[0].now, legacy: true });
  } catch (_err) {
    res.status(500).json({ status: 'DB Connection Error' });
  }
});

// --- Error Handler ---
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start Server ---
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  });
}

export default app;