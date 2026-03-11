import express from 'express';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import noteRoutes from './routes/notes';
import tagRoutes from './routes/tags';
import metadataRoutes from './routes/metadata';


const app = express();

<<<<<<< HEAD
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
=======
// Health check route
app.use('/api/v1/health', (req, res) => {
    res.status(200).send('OK');
});
app.use('/health', (req, res) => {
    res.redirect(301, '/api/v1/health');
});

// Mounting all routers under /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notes', noteRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1', metadataRoutes);
>>>>>>> 09a58d31bf9cec552e7aa54865e03715276fdcff

export default app;