import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { productService } from '../services/productService';
import { HttpError } from '../middleware/errorHandler';
import {
	optionalAuthMiddleware,
	authMiddleware,
	AuthenticatedRequest,
} from '../middleware/auth';
import { Availability, Store, Product, UserProduct, User } from '../models';

// Helper to check if user is trusted
async function isUserTrusted(userId: string): Promise<boolean> {
	const user = await User.findById(userId)
		.select('trustedContributor role')
		.lean();
	if (!user) return false;
	if (user.role === 'admin' || user.role === 'moderator') return true;
	return user.trustedContributor === true;
}

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

// GET /api/products/brand/:brandName/stores - Get stores where a brand's products are available
router.get(
	'/brand/:brandName/stores',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { brandName } = req.params;
			const decodedBrandName = decodeURIComponent(brandName);

			// Find all products from this brand
			const [apiProducts, userProducts] = await Promise.all([
				Product.find({
					brand: {
						$regex: new RegExp(
							`^${decodedBrandName.replace(
								/[.*+?^${}()|[\]\\]/g,
								'\\$&'
							)}$`,
							'i'
						),
					},
					archived: { $ne: true },
				})
					.select('_id')
					.lean(),
				UserProduct.find({
					brand: {
						$regex: new RegExp(
							`^${decodedBrandName.replace(
								/[.*+?^${}()|[\]\\]/g,
								'\\$&'
							)}$`,
							'i'
						),
					},
					status: 'approved',
					archived: { $ne: true },
				})
					.select('_id')
					.lean(),
			]);

			const productIds = [
				...apiProducts.map((p) => p._id),
				...userProducts.map((p) => p._id),
			];

			if (productIds.length === 0) {
				return res.json({
					chainGroups: [],
					independentStores: [],
					onlineStores: [],
					totalStores: 0,
				});
			}

			// Find all availability records for these products
			const availabilities = await Availability.find({
				productId: { $in: productIds },
				moderationStatus: 'confirmed',
			})
				.select('storeId')
				.lean();

			const storeIds = [
				...new Set(availabilities.map((a) => a.storeId.toString())),
			];

			if (storeIds.length === 0) {
				return res.json({
					chainGroups: [],
					independentStores: [],
					onlineStores: [],
					totalStores: 0,
				});
			}

			// Fetch stores with chain info
			const stores = await Store.find({
				_id: { $in: storeIds },
				moderationStatus: { $ne: 'rejected' },
			})
				.populate('chainId')
				.lean();

			// Group stores
			const chainMap = new Map<string, { chain: any; stores: any[] }>();
			const independentStores: any[] = [];
			const onlineStores: any[] = [];

			for (const store of stores) {
				const storeData = {
					id: store._id.toString(),
					name: store.name,
					type: store.type,
					address: store.address,
					city: store.city,
					state: store.state,
					zipCode: store.zipCode,
					latitude: store.latitude,
					longitude: store.longitude,
					locationIdentifier: store.locationIdentifier,
				};

				if (
					store.type === 'online_retailer' ||
					store.type === 'brand_direct'
				) {
					onlineStores.push(storeData);
				} else if (store.chainId) {
					const chain = store.chainId as any;
					const chainId = chain._id.toString();
					if (!chainMap.has(chainId)) {
						chainMap.set(chainId, {
							chain: {
								id: chainId,
								name: chain.name,
								slug: chain.slug,
								logoUrl: chain.logoUrl,
							},
							stores: [],
						});
					}
					chainMap.get(chainId)!.stores.push(storeData);
				} else {
					independentStores.push(storeData);
				}
			}

			const chainGroups = Array.from(chainMap.values()).sort(
				(a, b) => b.stores.length - a.stores.length
			);

			res.json({
				chainGroups,
				independentStores,
				onlineStores,
				totalStores: stores.length,
			});
		} catch (error) {
			console.error(
				'Error in GET /api/products/brand/:brandName/stores:',
				error
			);
			next(error);
		}
	}
);

// GET /api/products - List products with optional filters
// Uses optionalAuthMiddleware to show pending products to their creators
router.get(
	'/',
	optionalAuthMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const {
				q,
				category,
				tag,
				brand,
				minRating,
				page,
				pageSize,
				city,
				state,
			} = req.query;
			const userId = req.userId; // From optional auth

			const result = await productService.getProducts({
				q: q as string | undefined,
				category: category as string | undefined,
				tag: tag as string | undefined,
				brand: brand as string | undefined,
				minRating: minRating
					? parseFloat(minRating as string)
					: undefined,
				page: page ? parseInt(page as string, 10) : undefined,
				pageSize: pageSize
					? parseInt(pageSize as string, 10)
					: undefined,
				city: city as string | undefined,
				state: state as string | undefined,
				userId, // Pass userId to show pending products to their creator
			});

			res.json(result);
		} catch (error) {
			console.error('Error in GET /api/products:', error);
			next(error);
		}
	}
);

/**
 * GET /api/products/stores-by-city
 * Get stores grouped by city for the availability report dropdown
 * NOTE: This route MUST come before /:id to avoid being matched as a product ID
 */
router.get(
	'/stores-by-city',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { city, state } = req.query;

			let query: any = {};

			// Only filter by city/state if both are provided
			if (city && state) {
				query.city = { $regex: new RegExp(`^${city}$`, 'i') };
				query.state = { $regex: new RegExp(`^${state}$`, 'i') };
				query.type = 'brick_and_mortar';
			}

			const stores = await Store.find(query)
				.select(
					'name city state address type chainId locationIdentifier'
				)
				.populate('chainId', 'name')
				.sort({ state: 1, city: 1, name: 1 })
				.lean();

			// Group by city/state for physical stores
			const grouped: Record<
				string,
				{ city: string; state: string; stores: any[] }
			> = {};

			// Separate online stores
			const onlineStores: any[] = [];

			stores.forEach((store: any) => {
				const storeData = {
					id: store._id.toString(),
					name: store.locationIdentifier
						? `${(store.chainId as any)?.name || store.name} - ${
								store.locationIdentifier
						  }`
						: store.name,
					address: store.address,
					chainName: (store.chainId as any)?.name,
				};

				if (store.type === 'brick_and_mortar') {
					// Group physical stores by location
					if (store.city && store.state) {
						const key = `${store.city}, ${store.state}`;
						if (!grouped[key]) {
							grouped[key] = {
								city: store.city,
								state: store.state,
								stores: [],
							};
						}
						grouped[key].stores.push(storeData);
					} else {
						// Stores without city/state go to "Other Physical Stores"
						const key = 'Other Locations';
						if (!grouped[key]) {
							grouped[key] = {
								city: 'Other Locations',
								state: '',
								stores: [],
							};
						}
						grouped[key].stores.push(storeData);
					}
				} else {
					// Online retailers and brand direct stores
					onlineStores.push(storeData);
				}
			});

			// Sort locations - "Other Locations" should come last
			const sortedLocations = Object.values(grouped).sort((a, b) => {
				if (a.city === 'Other Locations') return 1;
				if (b.city === 'Other Locations') return -1;
				return `${a.state}, ${a.city}`.localeCompare(
					`${b.state}, ${b.city}`
				);
			});

			// Add online stores as a separate "location" if any exist
			if (onlineStores.length > 0) {
				sortedLocations.push({
					city: 'Online Retailers',
					state: '',
					stores: onlineStores,
				});
			}

			res.json({
				locations: sortedLocations,
			});
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/products/:id - Get product details with availability (must come last)
// Use optionalAuthMiddleware to check if user is admin (allows viewing archived products)
// and to show pending products to their creators
router.get(
	'/:id',
	optionalAuthMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { refresh } = req.query; // Optional: ?refresh=true to force API fetch

			// Allow admins to view archived products
			const isAdmin = req.user?.role === 'admin';
			const userId = req.userId; // From optional auth

			const product = await productService.getProductById(id, {
				refreshAvailability: refresh === 'true',
				allowArchived: isAdmin, // Admins can view archived products
				userId, // Pass userId to show pending products to their creator
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

			// Check if user is trusted (bypass moderation)
			const userId = req.user?.userId;
			const isTrusted = userId ? await isUserTrusted(userId) : false;

			// Create new availability report
			await Availability.create({
				productId: id,
				storeId,
				source: 'user_contribution',
				reportedBy: userId,
				moderationStatus: isTrusted ? 'confirmed' : 'pending', // Trusted users' content goes live immediately
				priceRange: priceRange || undefined,
				notes: notes || undefined,
				lastConfirmedAt: new Date(),
				needsReview: true, // All user content needs review (even trusted)
				trustedContribution: isTrusted, // Track if from trusted contributor
			});

			const message = isTrusted
				? 'Availability reported and live. Thank you! It will be reviewed shortly.'
				: 'Availability reported. Thank you! It will be reviewed shortly.';

			res.status(201).json({
				message,
				isUpdate: false,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/products/:id/confirm-availability
 * Confirm that a product is still available at a store
 * Requires authentication
 */
router.post(
	'/:id/confirm-availability',
	authMiddleware,
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { storeId } = req.body;

			if (!storeId) {
				throw new HttpError('storeId is required', 400);
			}

			// Validate IDs
			if (!mongoose.Types.ObjectId.isValid(id)) {
				throw new HttpError('Invalid product ID', 400);
			}
			if (!mongoose.Types.ObjectId.isValid(storeId)) {
				throw new HttpError('Invalid store ID', 400);
			}

			// Find existing availability (must use ObjectIds for the query)
			const existing = await Availability.findOne({
				productId: new mongoose.Types.ObjectId(id),
				storeId: new mongoose.Types.ObjectId(storeId),
			});

			if (!existing) {
				throw new HttpError('Availability record not found', 404);
			}

			// Update: set moderationStatus to 'confirmed' which makes available=true
			// in the getProductAvailability query
			await Availability.findByIdAndUpdate(existing._id, {
				lastConfirmedAt: new Date(),
				moderationStatus: 'confirmed',
			});

			res.json({
				message: 'Thanks for confirming! This helps other shoppers.',
				status: 'known',
			});
		} catch (error) {
			next(error);
		}
	}
);

export default router;
