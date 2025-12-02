import { Router, Request, Response, NextFunction } from 'express';
import { productService } from '../services/productService';
import { HttpError } from '../middleware/errorHandler';
import { optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/products/categories - List categories that have products (for filtering)
router.get(
	'/categories',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const categories = await productService.getCategories();
			res.json({ categories });
		} catch (error) {
			console.error('Error in GET /api/products/categories:', error);
			next(error);
		}
	}
);

// GET /api/products/categories/all - List all available categories (for product creation)
router.get(
	'/categories/all',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const categories = await productService.getAllAvailableCategories();
			res.json({ categories });
		} catch (error) {
			console.error('Error in GET /api/products/categories/all:', error);
			next(error);
		}
	}
);

// GET /api/products/tags - List tags that have products (for filtering)
router.get('/tags', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const tags = await productService.getTags();
		res.json({ tags });
	} catch (error) {
		console.error('Error in GET /api/products/tags:', error);
		next(error);
	}
});

// GET /api/products/tags/all - List all available tags (for product creation)
router.get(
	'/tags/all',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const tags = await productService.getAllAvailableTags();
			res.json({ tags });
		} catch (error) {
			console.error('Error in GET /api/products/tags/all:', error);
			next(error);
		}
	}
);

// GET /api/products/featured - Get featured products for landing page
router.get(
	'/featured',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { limit } = req.query;
			const products = await productService.getFeaturedProducts(
				limit ? parseInt(limit as string, 10) : 8
			);
			res.json({ products });
		} catch (error) {
			console.error('Error in GET /api/products/featured:', error);
			next(error);
		}
	}
);

// GET /api/products/discover - Get random products for discovery section
router.get(
	'/discover',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { limit } = req.query;
			const products = await productService.getDiscoverProducts(
				limit ? parseInt(limit as string, 10) : 6
			);
			res.json({ products });
		} catch (error) {
			console.error('Error in GET /api/products/discover:', error);
			next(error);
		}
	}
);

// GET /api/products - List products with optional filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { q, category, tag, minRating, page, pageSize } = req.query;

		const result = await productService.getProducts({
			q: q as string | undefined,
			category: category as string | undefined,
			tag: tag as string | undefined,
			minRating: minRating ? parseFloat(minRating as string) : undefined,
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
router.get(
	'/:id',
	optionalAuthMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
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
	}
);

export default router;
