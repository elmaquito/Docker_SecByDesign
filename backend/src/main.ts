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
import metadataRoutes from './notes/metadata.routes'; // Exports router with /themes and /categories
import tagsRoutes from './tags/tags.routes';

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

// --- Routes ---
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/notes', notesRoutes);
app.use('/', metadataRoutes); // Contains /themes and /categories
app.use('/tags', tagsRoutes);

// --- Health Check ---
app.get('/health', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: time.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'DB Connection Error' });
  }
});

// --- Error Handler ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});

export default app;

