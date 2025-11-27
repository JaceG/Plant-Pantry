import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({
    status: 'ok',
    message: 'PlantPantry API is running',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;

