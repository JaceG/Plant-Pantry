import { Router, Request, Response, NextFunction } from 'express';
import { productService } from '../services';
import { HttpError } from '../middleware/errorHandler';
import { optionalAuthMiddleware } from '../middleware/auth';

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

// GET /api/products/tags - List all tags (must come before /:id)
router.get('/tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await productService.getTags();
    res.json({ tags });
  } catch (error) {
    console.error('Error in GET /api/products/tags:', error);
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
// Use optionalAuthMiddleware to check if user is admin (allows viewing archived products)
router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { refresh } = req.query; // Optional: ?refresh=true to force API fetch
    
    // Allow admins to view archived products
    const isAdmin = req.user?.role === 'admin';
    
    const product = await productService.getProductById(id, {
      refreshAvailability: refresh === 'true',
      allowArchived: isAdmin, // Admins can view archived products
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

