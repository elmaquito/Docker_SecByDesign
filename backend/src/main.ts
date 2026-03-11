import express from 'express';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import noteRoutes from './routes/notes';
import tagRoutes from './routes/tags';
import metadataRoutes from './routes/metadata';

const app = express();

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

export default app;