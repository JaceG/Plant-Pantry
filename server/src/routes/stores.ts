import { Router, Request, Response, NextFunction } from 'express';
import { storeService } from '../services';

const router = Router();

// GET /api/stores - List all stores
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await storeService.getStores();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

