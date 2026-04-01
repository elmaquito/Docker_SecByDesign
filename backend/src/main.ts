import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PORT, NODE_ENV, CORS_ORIGINS, validateEnvironment } from './config/env';

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Validate environment early
// validateEnvironment(); // Moved inside startServer

import { pool, testDatabaseConnection } from './config/database';
import { apiLimiter, sanitizeInput } from './common/middleware';
import authRoutes from './auth/auth.routes';
import userRoutes from './users/user.routes';
import noteRoutes from './notes/notes.routes';
import tagRoutes from './tags/tags.routes';
import metadataRoutes from './metadata/metadata.routes';
import feedRoutes from './feed/feed.routes';

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
v1Router.use('/feed', feedRoutes);

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
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start Server ---
async function startServer() {
  try {
    // Validate environment first
    validateEnvironment();
    
    // Test database connection with retries
    let dbConnected = false;
    for (let i = 0; i < 10; i++) {
      dbConnected = await testDatabaseConnection();
      if (dbConnected) break;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database after 10 retries');
      process.exit(1);
    }

    // Start the server
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT} in ${NODE_ENV} mode`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Call the async startup function
startServer().catch(error => {
  console.error('❌ Startup error:', error);
  process.exit(1);
});

export default app;