import { Router, Request, Response, NextFunction } from 'express';
import { productService } from '../services';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

// GET /api/products/categories - List all categories (must come before /:id)
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await productService.getCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Error in GET /api/products/categories:', error);
    next(error);
  }
});

// GET /api/products - List products with optional filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, category, tag, page, pageSize } = req.query;

    const result = await productService.getProducts({
      q: q as string | undefined,
      category: category as string | undefined,
      tag: tag as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    next(error);
  }
});

// GET /api/products/:id - Get product details with availability (must come last)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { refresh } = req.query; // Optional: ?refresh=true to force API fetch
    
    const product = await productService.getProductById(id, {
      refreshAvailability: refresh === 'true',
    });

    if (!product) {
      throw new HttpError('Product not found', 404);
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

export default router;

