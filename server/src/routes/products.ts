import { Router, Request, Response, NextFunction } from 'express';
import { productService } from '../services/productService';
import { HttpError } from '../middleware/errorHandler';
import {
	optionalAuthMiddleware,
	authMiddleware,
	AuthenticatedRequest,
} from '../middleware/auth';
import { Availability, Store, Product, UserProduct } from '../models';

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

/**
 * POST /api/products/:id/report-availability
 * Report that a product is available at a store (user contribution)
 * Requires authentication
 */
router.post(
	'/:id/report-availability',
	authMiddleware,
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { storeId, priceRange, notes } = req.body;

			if (!storeId) {
				throw new HttpError('storeId is required', 400);
			}

			// Check if product exists
			let product = await Product.findById(id).lean();
			if (!product) {
				product = (await UserProduct.findById(id).lean()) as any;
			}
			if (!product) {
				throw new HttpError('Product not found', 404);
			}

			// Check if store exists
			const store = await Store.findById(storeId).lean();
			if (!store) {
				throw new HttpError('Store not found', 404);
			}

			// Check if availability already exists
			const existing = await Availability.findOne({
				productId: id,
				storeId,
			}).lean();

			if (existing) {
				// Update existing to refresh confirmation
				await Availability.findByIdAndUpdate(existing._id, {
					lastConfirmedAt: new Date(),
					// If it was rejected, set back to pending
					moderationStatus:
						existing.moderationStatus === 'rejected'
							? 'pending'
							: existing.moderationStatus,
				});

				return res.json({
					message: 'Availability confirmed',
					isUpdate: true,
				});
			}

			// Create new availability report
			await Availability.create({
				productId: id,
				storeId,
				source: 'user_contribution',
				reportedBy: req.user?.userId,
				moderationStatus: 'pending', // Pending approval
				priceRange: priceRange || undefined,
				notes: notes || undefined,
				lastConfirmedAt: new Date(),
			});

			res.status(201).json({
				message:
					'Availability reported. Thank you! It will be reviewed shortly.',
				isUpdate: false,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/products/stores-by-city
 * Get stores grouped by city for the availability report dropdown
 */
router.get(
	'/stores-by-city',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { city, state } = req.query;

			let query: any = {
				type: 'brick_and_mortar', // Only physical stores
			};

			if (city && state) {
				query.city = { $regex: new RegExp(`^${city}$`, 'i') };
				query.state = { $regex: new RegExp(`^${state}$`, 'i') };
			}

			const stores = await Store.find(query)
				.select('name city state address')
				.sort({ state: 1, city: 1, name: 1 })
				.lean();

			// Group by city/state
			const grouped: Record<
				string,
				{ city: string; state: string; stores: any[] }
			> = {};

			stores.forEach((store) => {
				const key = `${store.city || 'Unknown'}, ${
					store.state || '??'
				}`;
				if (!grouped[key]) {
					grouped[key] = {
						city: store.city || 'Unknown',
						state: store.state || '??',
						stores: [],
					};
				}
				grouped[key].stores.push({
					id: store._id.toString(),
					name: store.name,
					address: store.address,
				});
			});

			res.json({
				locations: Object.values(grouped),
			});
		} catch (error) {
			next(error);
		}
	}
);

export default router;
