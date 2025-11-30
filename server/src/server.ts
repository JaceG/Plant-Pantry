// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/database';
import { healthRoutes, productRoutes, storeRoutes, listRoutes, userProductRoutes, authRoutes, adminRoutes, reviewRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/user-products', userProductRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/reviews', reviewRoutes);

// GET /api/config/google-api-key - Get Google API key for frontend (public endpoint)
app.get('/api/config/google-api-key', (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Google API key not configured' });
  }
  // Return the API key - it's safe to expose as it should be restricted by domain/IP in Google Cloud Console
  res.json({ apiKey });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to MongoDB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🌱 PlantPantry server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});

export default app;
