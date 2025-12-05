import { Router, Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService';
import { reviewService } from '../services/reviewService';
import { cityService } from '../services/cityService';
import { storeService } from '../services/storeService';
import {
	authMiddleware,
	adminMiddleware,
	AuthenticatedRequest,
} from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import { Product, UserProduct } from '../models';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
router.get(
	'/dashboard',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const stats = await adminService.getDashboardStats();
			res.json({ stats });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/products/pending
 * Get pending products for moderation
 */
router.get(
	'/products/pending',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;

			const result = await adminService.getPendingProducts(
				page,
				pageSize
			);
			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/products/:id/approve
 * Approve a pending product
 */
router.post(
	'/products/:id/approve',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const success = await adminService.approveProduct(id);

			if (!success) {
				throw new HttpError('Product not found', 404);
			}

			res.json({ message: 'Product approved successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/products/:id/reject
 * Reject a pending product
 */
router.post(
	'/products/:id/reject',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { reason } = req.body;

			const success = await adminService.rejectProduct(id, reason);

			if (!success) {
				throw new HttpError('Product not found', 404);
			}

			res.json({ message: 'Product rejected' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/users
 * Get all users
 */
router.get(
	'/users',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;

			const result = await adminService.getUsers(page, pageSize);
			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/users/:id/role
 * Update user role
 */
router.put(
	'/users/:id/role',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { role } = req.body;

			if (!['user', 'admin', 'moderator'].includes(role)) {
				throw new HttpError('Invalid role', 400);
			}

			const success = await adminService.updateUserRole(id, role);

			if (!success) {
				throw new HttpError('User not found', 404);
			}

			res.json({ message: 'User role updated successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/stores
 * Get all stores
 */
router.get(
	'/stores',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;
			const type = req.query.type as string | undefined;

			const result = await adminService.getStores(page, pageSize, type);
			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

/**
 * DELETE /api/admin/stores/:id
 * Delete a store
 */
router.delete(
	'/stores/:id',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const success = await adminService.deleteStore(id);

			if (!success) {
				throw new HttpError('Store not found', 404);
			}

			res.json({ message: 'Store deleted successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/stores/:id
 * Update a store
 */
router.put(
	'/stores/:id',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const updates = req.body;

			// Validate that at least one field is being updated
			const allowedFields = [
				'name',
				'type',
				'regionOrScope',
				'websiteUrl',
				'address',
				'city',
				'state',
				'zipCode',
				'country',
				'phoneNumber',
			];

			const filteredUpdates: Record<string, any> = {};
			for (const field of allowedFields) {
				if (updates[field] !== undefined) {
					filteredUpdates[field] = updates[field];
				}
			}

			if (Object.keys(filteredUpdates).length === 0) {
				throw new HttpError('No valid fields to update', 400);
			}

			const updatedStore = await storeService.updateStore(
				id,
				filteredUpdates
			);

			if (!updatedStore) {
				throw new HttpError('Store not found', 404);
			}

			res.json({ store: updatedStore });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/products/archived
 * Get archived products only
 */
router.get(
	'/products/archived',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;

			const result = await adminService.getArchivedProducts(
				page,
				pageSize
			);
			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/products/user-generated
 * Get user-generated products only
 */
router.get(
	'/products/user-generated',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;

			const result = await adminService.getUserGeneratedProducts(
				page,
				pageSize
			);
			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/products/:id/archive
 * Archive a product
 */
router.post(
	'/products/:id/archive',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const userId = req.userId;

			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const success = await adminService.archiveProduct(id, userId);

			if (!success) {
				throw new HttpError('Product not found', 404);
			}

			res.json({ message: 'Product archived successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/products/:id/unarchive
 * Unarchive a product
 */
router.post(
	'/products/:id/unarchive',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const success = await adminService.unarchiveProduct(id);

			if (!success) {
				throw new HttpError('Product not found', 404);
			}

			res.json({ message: 'Product unarchived successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/filters
 * Get all filters (categories or tags) for admin management
 */
router.get(
	'/filters',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const type = req.query.type as 'category' | 'tag';
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 50;

			if (!type || !['category', 'tag'].includes(type)) {
				throw new HttpError(
					'Invalid filter type. Must be "category" or "tag"',
					400
				);
			}

			const result = await adminService.getAllFilters(
				type,
				page,
				pageSize
			);
			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/filters/archive
 * Archive a filter
 */
router.post(
	'/filters/archive',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { type, value } = req.body;
			const userId = req.userId;

			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			if (!type || !['category', 'tag'].includes(type)) {
				throw new HttpError(
					'Invalid filter type. Must be "category" or "tag"',
					400
				);
			}

			if (!value || typeof value !== 'string') {
				throw new HttpError('Filter value is required', 400);
			}

			const success = await adminService.archiveFilter(
				type,
				value,
				userId
			);

			if (!success) {
				throw new HttpError('Failed to archive filter', 500);
			}

			res.json({ message: 'Filter archived successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/filters/unarchive
 * Unarchive a filter
 */
router.post(
	'/filters/unarchive',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { type, value } = req.body;

			if (!type || !['category', 'tag'].includes(type)) {
				throw new HttpError(
					'Invalid filter type. Must be "category" or "tag"',
					400
				);
			}

			if (!value || typeof value !== 'string') {
				throw new HttpError('Filter value is required', 400);
			}

			const success = await adminService.unarchiveFilter(type, value);

			if (!success) {
				throw new HttpError(
					'Filter not found or already unarchived',
					404
				);
			}

			res.json({ message: 'Filter unarchived successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/filters/display-name
 * Set or update a filter display name
 */
router.put(
	'/filters/display-name',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { type, value, displayName } = req.body;
			const userId = req.userId;

			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			if (!type || !['category', 'tag'].includes(type)) {
				throw new HttpError(
					'Invalid filter type. Must be "category" or "tag"',
					400
				);
			}

			if (!value || typeof value !== 'string') {
				throw new HttpError('Filter value is required', 400);
			}

			if (
				!displayName ||
				typeof displayName !== 'string' ||
				!displayName.trim()
			) {
				throw new HttpError('Display name is required', 400);
			}

			const success = await adminService.setFilterDisplayName(
				type,
				value,
				displayName,
				userId
			);

			if (!success) {
				throw new HttpError('Failed to set display name', 500);
			}

			res.json({ message: 'Display name updated successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * DELETE /api/admin/filters/display-name
 * Remove a filter display name (revert to default)
 */
router.delete(
	'/filters/display-name',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { type, value } = req.body;

			if (!type || !['category', 'tag'].includes(type)) {
				throw new HttpError(
					'Invalid filter type. Must be "category" or "tag"',
					400
				);
			}

			if (!value || typeof value !== 'string') {
				throw new HttpError('Filter value is required', 400);
			}

			const success = await adminService.removeFilterDisplayName(
				type,
				value
			);

			if (!success) {
				throw new HttpError('Display name not found', 404);
			}

			res.json({ message: 'Display name removed successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/reviews/pending
 * Get pending reviews for moderation
 */
router.get(
	'/reviews/pending',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;

			const result = await reviewService.getPendingReviews(
				page,
				pageSize
			);
			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/reviews/:id/approve
 * Approve a review
 */
router.post(
	'/reviews/:id/approve',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const adminId = req.userId!;

			const review = await reviewService.approveReview(id, adminId);
			res.json({ message: 'Review approved successfully', review });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/reviews/:id/reject
 * Reject a review
 */
router.post(
	'/reviews/:id/reject',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const adminId = req.userId!;

			const review = await reviewService.rejectReview(id, adminId);
			res.json({ message: 'Review rejected', review });
		} catch (error) {
			next(error);
		}
	}
);

// ============================================
// FEATURED PRODUCTS MANAGEMENT
// ============================================

/**
 * GET /api/admin/featured-products
 * Get all featured products
 */
router.get(
	'/featured-products',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Get featured products from both Product and UserProduct collections
			const [apiProducts, userProducts] = await Promise.all([
				Product.find({
					featured: true,
					archived: { $ne: true },
				})
					.select(
						'name brand sizeOrVariant imageUrl categories tags featured featuredOrder featuredAt'
					)
					.lean(),
				UserProduct.find({
					featured: true,
					archived: { $ne: true },
					status: 'approved',
				})
					.select(
						'name brand sizeOrVariant imageUrl categories tags featured featuredOrder featuredAt'
					)
					.lean(),
			]);

			// Combine and sort by featuredOrder, then featuredAt
			const allProducts = [
				...apiProducts.map((p) => ({
					id: p._id.toString(),
					name: p.name,
					brand: p.brand,
					sizeOrVariant: p.sizeOrVariant,
					imageUrl: p.imageUrl,
					categories: p.categories,
					tags: p.tags,
					featured: p.featured,
					featuredOrder: p.featuredOrder || 0,
					featuredAt: p.featuredAt,
				})),
				...userProducts.map((p) => ({
					id: p._id.toString(),
					name: p.name,
					brand: p.brand,
					sizeOrVariant: p.sizeOrVariant,
					imageUrl: p.imageUrl,
					categories: p.categories,
					tags: p.tags,
					featured: p.featured,
					featuredOrder: p.featuredOrder || 0,
					featuredAt: p.featuredAt,
				})),
			].sort((a, b) => {
				if (a.featuredOrder !== b.featuredOrder) {
					return a.featuredOrder - b.featuredOrder;
				}
				// If same order, sort by featuredAt descending
				const aTime = a.featuredAt
					? new Date(a.featuredAt).getTime()
					: 0;
				const bTime = b.featuredAt
					? new Date(b.featuredAt).getTime()
					: 0;
				return bTime - aTime;
			});

			res.json({ products: allProducts });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/products/:id/feature
 * Feature or unfeature a product (works with both Product and UserProduct)
 */
router.put(
	'/products/:id/feature',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { featured } = req.body;

			if (typeof featured !== 'boolean') {
				throw new HttpError('featured must be a boolean', 400);
			}

			const updateData: any = { featured };
			if (featured) {
				// Get the current max order from both collections and add 1
				const [maxApiProduct, maxUserProduct] = await Promise.all([
					Product.findOne({ featured: true })
						.sort({ featuredOrder: -1 })
						.select('featuredOrder')
						.lean(),
					UserProduct.findOne({ featured: true })
						.sort({ featuredOrder: -1 })
						.select('featuredOrder')
						.lean(),
				]);

				const maxOrder = Math.max(
					maxApiProduct?.featuredOrder || 0,
					maxUserProduct?.featuredOrder || 0
				);
				updateData.featuredOrder = maxOrder + 1;
				updateData.featuredAt = new Date();
			} else {
				updateData.featuredOrder = 0;
				updateData.featuredAt = null;
			}

			// Try to update in Product first, then UserProduct
			let product = await Product.findByIdAndUpdate(id, updateData, {
				new: true,
			});

			if (!product) {
				// Not found in Product, try UserProduct
				product = (await UserProduct.findByIdAndUpdate(id, updateData, {
					new: true,
				})) as any;
			}

			if (!product) {
				throw new HttpError('Product not found', 404);
			}

			res.json({
				message: featured
					? 'Product featured successfully'
					: 'Product unfeatured successfully',
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/products/:id/feature-order
 * Update the display order of a featured product (works with both Product and UserProduct)
 */
router.put(
	'/products/:id/feature-order',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { order } = req.body;

			if (typeof order !== 'number' || order < 0) {
				throw new HttpError('order must be a non-negative number', 400);
			}

			// Try to update in Product first, then UserProduct
			let product = await Product.findByIdAndUpdate(
				id,
				{ featuredOrder: order },
				{ new: true }
			);

			if (!product) {
				product = (await UserProduct.findByIdAndUpdate(
					id,
					{ featuredOrder: order },
					{ new: true }
				)) as any;
			}

			if (!product) {
				throw new HttpError('Product not found', 404);
			}

			res.json({ message: 'Feature order updated successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/featured-products/reorder
 * Reorder all featured products (works with both Product and UserProduct)
 */
router.put(
	'/featured-products/reorder',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { productIds } = req.body;

			if (!Array.isArray(productIds)) {
				throw new HttpError('productIds must be an array', 400);
			}

			// Update the order of each product (try both collections)
			const updates = productIds.map(async (id, index) => {
				// Try Product first
				const apiResult = await Product.findByIdAndUpdate(id, {
					featuredOrder: index,
				});
				if (!apiResult) {
					// Not found in Product, try UserProduct
					await UserProduct.findByIdAndUpdate(id, {
						featuredOrder: index,
					});
				}
			});

			await Promise.all(updates);

			res.json({ message: 'Featured products reordered successfully' });
		} catch (error) {
			next(error);
		}
	}
);

// ============================================
// CITY LANDING PAGES MANAGEMENT
// ============================================

/**
 * GET /api/admin/city-pages
 * Get all city landing pages (including inactive)
 */
router.get(
	'/city-pages',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const cityPages = await cityService.getAllCityPages();
			res.json({ cityPages });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/city-pages/:slug
 * Get a specific city landing page by slug
 */
router.get(
	'/city-pages/:slug',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const cityPage = await cityService.getCityPage(slug, true); // Include inactive

			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			res.json({ cityPage });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/city-pages
 * Create a new city landing page
 */
router.post(
	'/city-pages',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const {
				slug,
				cityName,
				state,
				headline,
				description,
				isActive,
				featuredStoreIds,
			} = req.body;

			if (!slug || !cityName || !state || !headline || !description) {
				throw new HttpError(
					'slug, cityName, state, headline, and description are required',
					400
				);
			}

			const cityPage = await cityService.createCityPage({
				slug,
				cityName,
				state,
				headline,
				description,
				isActive,
				featuredStoreIds,
			});

			res.status(201).json({
				message: 'City page created successfully',
				cityPage,
			});
		} catch (error: any) {
			if (error.code === 11000) {
				next(
					new HttpError(
						'A city page with this slug already exists',
						409
					)
				);
			} else {
				next(error);
			}
		}
	}
);

/**
 * PUT /api/admin/city-pages/:slug
 * Update a city landing page
 */
router.put(
	'/city-pages/:slug',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const {
				cityName,
				state,
				headline,
				description,
				isActive,
				featuredStoreIds,
			} = req.body;

			const cityPage = await cityService.updateCityPage(slug, {
				cityName,
				state,
				headline,
				description,
				isActive,
				featuredStoreIds,
			});

			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			res.json({ message: 'City page updated successfully', cityPage });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * DELETE /api/admin/city-pages/:slug
 * Delete a city landing page
 */
router.delete(
	'/city-pages/:slug',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const success = await cityService.deleteCityPage(slug);

			if (!success) {
				throw new HttpError('City page not found', 404);
			}

			res.json({ message: 'City page deleted successfully' });
		} catch (error) {
			next(error);
		}
	}
);

// ============================================
// CITY PAGE STORES MANAGEMENT
// ============================================

import { CityLandingPage } from '../models';

/**
 * GET /api/admin/city-pages/:slug/stores
 * Get all stores in a city with product counts by moderation status
 */
router.get(
	'/city-pages/:slug/stores',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;

			// Get the city page to find city/state
			const cityPage = await CityLandingPage.findOne({ slug }).lean();
			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			// Find stores that match this city/state
			const stores = await Store.find({
				city: { $regex: new RegExp(`^${cityPage.cityName}$`, 'i') },
				state: { $regex: new RegExp(`^${cityPage.state}$`, 'i') },
			})
				.sort({ name: 1 })
				.lean();

			// Get product counts by moderation status for each store
			const storeIds = stores.map((s) => s._id);
			const availabilityCounts = await Availability.aggregate([
				{ $match: { storeId: { $in: storeIds } } },
				{
					$group: {
						_id: {
							storeId: '$storeId',
							status: '$moderationStatus',
						},
						count: { $sum: 1 },
					},
				},
			]);

			// Build a map of storeId -> { confirmed, pending, rejected }
			const countMap = new Map<
				string,
				{
					confirmed: number;
					pending: number;
					rejected: number;
					total: number;
				}
			>();

			availabilityCounts.forEach((a: any) => {
				const storeId = a._id.storeId.toString();
				if (!countMap.has(storeId)) {
					countMap.set(storeId, {
						confirmed: 0,
						pending: 0,
						rejected: 0,
						total: 0,
					});
				}
				const counts = countMap.get(storeId)!;
				const status = a._id.status || 'confirmed';
				if (status === 'confirmed') counts.confirmed += a.count;
				else if (status === 'pending') counts.pending += a.count;
				else if (status === 'rejected') counts.rejected += a.count;
				counts.total += a.count;
			});

			res.json({
				stores: stores.map((store) => {
					const counts = countMap.get(store._id.toString()) || {
						confirmed: 0,
						pending: 0,
						rejected: 0,
						total: 0,
					};
					return {
						id: store._id.toString(),
						name: store.name,
						type: store.type,
						address: store.address,
						city: store.city,
						state: store.state,
						zipCode: store.zipCode,
						websiteUrl: store.websiteUrl,
						phoneNumber: store.phoneNumber,
						productCount: counts.confirmed, // Only confirmed products
						pendingCount: counts.pending,
						totalCount: counts.total,
					};
				}),
				city: {
					cityName: cityPage.cityName,
					state: cityPage.state,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/stores/:storeId/products
 * Get all products at a specific store with moderation details
 */
router.get(
	'/stores/:storeId/products',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { storeId } = req.params;

			// Get the store
			const store = await Store.findById(storeId).lean();
			if (!store) {
				throw new HttpError('Store not found', 404);
			}

			// Get all availability records for this store
			const availabilities = await Availability.find({ storeId })
				.populate('reportedBy', 'email displayName')
				.populate('moderatedBy', 'email displayName')
				.sort({ createdAt: -1 })
				.lean();

			// Get product details
			const productIds = availabilities.map((a) => a.productId);

			const [apiProducts, userProducts] = await Promise.all([
				Product.find({
					_id: { $in: productIds },
				})
					.select(
						'name brand sizeOrVariant imageUrl categories archived'
					)
					.lean(),
				UserProduct.find({
					_id: { $in: productIds },
				})
					.select(
						'name brand sizeOrVariant imageUrl categories archived'
					)
					.lean(),
			]);

			const productMap = new Map<string, any>();
			apiProducts.forEach((p) =>
				productMap.set(p._id.toString(), { ...p, productType: 'api' })
			);
			userProducts.forEach((p) =>
				productMap.set(p._id.toString(), { ...p, productType: 'user' })
			);

			// Build response with moderation details
			const products = availabilities
				.map((avail) => {
					const product = productMap.get(avail.productId.toString());
					if (!product) return null;

					return {
						availabilityId: avail._id.toString(),
						productId: product._id.toString(),
						name: product.name,
						brand: product.brand,
						sizeOrVariant: product.sizeOrVariant,
						imageUrl: product.imageUrl,
						categories: product.categories || [],
						productType: product.productType,
						archived: product.archived,
						// Availability details
						source: avail.source,
						moderationStatus: avail.moderationStatus || 'confirmed',
						priceRange: avail.priceRange,
						notes: avail.notes,
						lastConfirmedAt: avail.lastConfirmedAt,
						createdAt: avail.createdAt,
						// Reporter info (if user contribution)
						reportedBy: avail.reportedBy
							? {
									id: (
										avail.reportedBy as any
									)._id?.toString(),
									email: (avail.reportedBy as any).email,
									displayName: (avail.reportedBy as any)
										.displayName,
							  }
							: null,
						// Moderator info
						moderatedBy: avail.moderatedBy
							? {
									id: (
										avail.moderatedBy as any
									)._id?.toString(),
									email: (avail.moderatedBy as any).email,
									displayName: (avail.moderatedBy as any)
										.displayName,
							  }
							: null,
						moderatedAt: avail.moderatedAt,
					};
				})
				.filter(Boolean);

			// Count by status
			const statusCounts = {
				confirmed: products.filter(
					(p: any) => p.moderationStatus === 'confirmed'
				).length,
				pending: products.filter(
					(p: any) => p.moderationStatus === 'pending'
				).length,
				rejected: products.filter(
					(p: any) => p.moderationStatus === 'rejected'
				).length,
			};

			res.json({
				store: {
					id: store._id.toString(),
					name: store.name,
					type: store.type,
					address: store.address,
					city: store.city,
					state: store.state,
					zipCode: store.zipCode,
					websiteUrl: store.websiteUrl,
					phoneNumber: store.phoneNumber,
				},
				products,
				statusCounts,
				totalCount: products.length,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/availability/:availabilityId/moderate
 * Approve or reject an availability report
 */
router.put(
	'/availability/:availabilityId/moderate',
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { availabilityId } = req.params;
			const { status } = req.body;

			if (!['confirmed', 'rejected'].includes(status)) {
				throw new HttpError(
					'Status must be "confirmed" or "rejected"',
					400
				);
			}

			const availability = await Availability.findByIdAndUpdate(
				availabilityId,
				{
					moderationStatus: status,
					moderatedBy: req.user?.userId,
					moderatedAt: new Date(),
				},
				{ new: true }
			);

			if (!availability) {
				throw new HttpError('Availability not found', 404);
			}

			res.json({
				message: `Availability ${status}`,
				availability: {
					id: availability._id.toString(),
					moderationStatus: availability.moderationStatus,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/city-pages/:slug/stores
 * Add a store to a city (create new or update existing store's city/state)
 */
router.post(
	'/city-pages/:slug/stores',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const {
				storeId,
				name,
				type,
				address,
				zipCode,
				websiteUrl,
				phoneNumber,
			} = req.body;

			// Get the city page
			const cityPage = await CityLandingPage.findOne({ slug }).lean();
			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			let store;

			if (storeId) {
				// Update existing store's city/state
				store = await Store.findByIdAndUpdate(
					storeId,
					{
						city: cityPage.cityName,
						state: cityPage.state,
					},
					{ new: true }
				);
				if (!store) {
					throw new HttpError('Store not found', 404);
				}
			} else {
				// Create a new store in this city
				if (!name) {
					throw new HttpError('Store name is required', 400);
				}
				store = await Store.create({
					name,
					type: type || 'brick_and_mortar',
					city: cityPage.cityName,
					state: cityPage.state,
					address,
					zipCode,
					websiteUrl,
					phoneNumber,
				});
			}

			res.status(201).json({
				message: storeId
					? 'Store added to city'
					: 'Store created in city',
				store: {
					id: store._id.toString(),
					name: store.name,
					type: store.type,
					city: store.city,
					state: store.state,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * DELETE /api/admin/city-pages/:slug/stores/:storeId
 * Remove a store from a city (clears the store's city/state)
 */
router.delete(
	'/city-pages/:slug/stores/:storeId',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { storeId } = req.params;

			// Clear the store's city/state (don't delete the store itself)
			const store = await Store.findByIdAndUpdate(
				storeId,
				{ city: '', state: '' },
				{ new: true }
			);

			if (!store) {
				throw new HttpError('Store not found', 404);
			}

			res.json({ message: 'Store removed from city' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/city-pages/:slug/products
 * Get all products available at stores in this city
 */
router.get(
	'/city-pages/:slug/products',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;

			// Get the city page
			const cityPage = await CityLandingPage.findOne({ slug }).lean();
			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			// Find stores in this city
			const stores = await Store.find({
				city: { $regex: new RegExp(`^${cityPage.cityName}$`, 'i') },
				state: { $regex: new RegExp(`^${cityPage.state}$`, 'i') },
			}).lean();

			const storeIds = stores.map((s) => s._id);
			const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

			// Get all availability records for these stores
			const availabilities = await Availability.find({
				storeId: { $in: storeIds },
			}).lean();

			// Get unique product IDs
			const productIds = [
				...new Set(availabilities.map((a) => a.productId.toString())),
			];

			// Get product details from both collections
			const [apiProducts, userProducts] = await Promise.all([
				Product.find({
					_id: { $in: productIds },
					archived: { $ne: true },
				})
					.select('name brand sizeOrVariant imageUrl categories')
					.lean(),
				UserProduct.find({
					_id: { $in: productIds },
					archived: { $ne: true },
					status: 'approved',
				})
					.select('name brand sizeOrVariant imageUrl categories')
					.lean(),
			]);

			const productMap = new Map<string, any>();
			apiProducts.forEach((p) => productMap.set(p._id.toString(), p));
			userProducts.forEach((p) => productMap.set(p._id.toString(), p));

			// Group availabilities by product
			const productAvailMap = new Map<string, any[]>();
			availabilities.forEach((a) => {
				const prodId = a.productId.toString();
				if (!productAvailMap.has(prodId)) {
					productAvailMap.set(prodId, []);
				}
				productAvailMap.get(prodId)!.push(a);
			});

			// Build response
			const products = productIds
				.map((prodId) => {
					const product = productMap.get(prodId);
					if (!product) return null;

					const prodAvails = productAvailMap.get(prodId) || [];
					const storeNames = prodAvails.map((a) => {
						const store = storeMap.get(a.storeId.toString());
						return store?.name || 'Unknown';
					});

					return {
						id: product._id.toString(),
						name: product.name,
						brand: product.brand,
						sizeOrVariant: product.sizeOrVariant,
						imageUrl: product.imageUrl,
						categories: product.categories || [],
						storeCount: storeNames.length,
						storeNames: storeNames.slice(0, 3),
						availabilities: prodAvails.map((a) => ({
							storeId: a.storeId.toString(),
							storeName:
								storeMap.get(a.storeId.toString())?.name ||
								'Unknown',
							priceRange: a.priceRange,
						})),
					};
				})
				.filter(Boolean);

			res.json({
				products,
				totalCount: products.length,
				city: {
					cityName: cityPage.cityName,
					state: cityPage.state,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/city-pages/:slug/products
 * Add a product to a store in this city
 */
router.post(
	'/city-pages/:slug/products',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const { productId, storeId, priceRange } = req.body;

			if (!productId || !storeId) {
				throw new HttpError('productId and storeId are required', 400);
			}

			// Get the city page
			const cityPage = await CityLandingPage.findOne({ slug }).lean();
			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			// Verify store is in this city
			const store = await Store.findOne({
				_id: storeId,
				city: { $regex: new RegExp(`^${cityPage.cityName}$`, 'i') },
				state: { $regex: new RegExp(`^${cityPage.state}$`, 'i') },
			}).lean();

			if (!store) {
				throw new HttpError('Store not found in this city', 404);
			}

			// Check if product exists
			let product = await Product.findById(productId).lean();
			if (!product) {
				product = (await UserProduct.findById(productId).lean()) as any;
			}
			if (!product) {
				throw new HttpError('Product not found', 404);
			}

			// Check if availability already exists
			const existing = await Availability.findOne({
				productId,
				storeId,
			}).lean();

			if (existing) {
				throw new HttpError(
					'Product is already available at this store',
					409
				);
			}

			// Create availability
			await Availability.create({
				productId,
				storeId,
				status: 'known',
				priceRange,
				lastConfirmedAt: new Date(),
				source: 'user_contribution',
			});

			res.status(201).json({
				message: 'Product added to store',
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * DELETE /api/admin/city-pages/:slug/products/:productId
 * Remove a product from all stores in this city
 */
router.delete(
	'/city-pages/:slug/products/:productId',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug, productId } = req.params;
			const { storeId } = req.query;

			// Get the city page
			const cityPage = await CityLandingPage.findOne({ slug }).lean();
			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			if (storeId) {
				// Remove from specific store
				await Availability.findOneAndDelete({
					productId,
					storeId: storeId as string,
				});
			} else {
				// Remove from all stores in this city
				const stores = await Store.find({
					city: { $regex: new RegExp(`^${cityPage.cityName}$`, 'i') },
					state: { $regex: new RegExp(`^${cityPage.state}$`, 'i') },
				}).lean();

				const storeIds = stores.map((s) => s._id);
				await Availability.deleteMany({
					productId,
					storeId: { $in: storeIds },
				});
			}

			res.json({ message: 'Product removed from city stores' });
		} catch (error) {
			next(error);
		}
	}
);

// ============================================
// STORE AVAILABILITY MANAGEMENT
// ============================================

import { Availability, Store } from '../models';

/**
 * GET /api/admin/stores/:storeId/availability
 * Get all products available at a store
 */
router.get(
	'/stores/:storeId/availability',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { storeId } = req.params;

			// Verify store exists
			const store = await Store.findById(storeId).lean();
			if (!store) {
				throw new HttpError('Store not found', 404);
			}

			// Get all availability records for this store
			const availabilities = await Availability.find({ storeId })
				.sort({ createdAt: -1 })
				.lean();

			// Get product details for all availability records
			const productIds = availabilities.map((a) => a.productId);

			// Search both Product and UserProduct collections
			const [apiProducts, userProducts] = await Promise.all([
				Product.find({
					_id: { $in: productIds },
					archived: { $ne: true },
				})
					.select('name brand sizeOrVariant imageUrl categories')
					.lean(),
				UserProduct.find({
					_id: { $in: productIds },
					archived: { $ne: true },
					status: 'approved',
				})
					.select('name brand sizeOrVariant imageUrl categories')
					.lean(),
			]);

			// Create a map of product ID to product details
			const productMap = new Map<string, any>();
			apiProducts.forEach((p) => productMap.set(p._id.toString(), p));
			userProducts.forEach((p) => productMap.set(p._id.toString(), p));

			// Build response with product details
			const products = availabilities
				.map((avail) => {
					const product = productMap.get(avail.productId.toString());
					if (!product) return null;

					return {
						availabilityId: avail._id.toString(),
						productId: product._id.toString(),
						name: product.name,
						brand: product.brand,
						sizeOrVariant: product.sizeOrVariant,
						imageUrl: product.imageUrl,
						categories: product.categories || [],
						priceRange: avail.priceRange,
						moderationStatus: avail.moderationStatus,
						source: avail.source,
						lastConfirmedAt: avail.lastConfirmedAt,
						createdAt: avail.createdAt,
					};
				})
				.filter(Boolean);

			res.json({
				store: {
					id: store._id.toString(),
					name: store.name,
					city: store.city,
					state: store.state,
				},
				products,
				totalCount: products.length,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/stores/:storeId/availability
 * Add a product to a store's availability
 */
router.post(
	'/stores/:storeId/availability',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { storeId } = req.params;
			const { productId, priceRange } = req.body;

			if (!productId) {
				throw new HttpError('productId is required', 400);
			}

			// Verify store exists
			const store = await Store.findById(storeId).lean();
			if (!store) {
				throw new HttpError('Store not found', 404);
			}

			// Check if product exists in either collection
			let product = await Product.findById(productId).lean();
			if (!product) {
				product = (await UserProduct.findById(productId).lean()) as any;
			}
			if (!product) {
				throw new HttpError('Product not found', 404);
			}

			// Check if availability already exists
			const existing = await Availability.findOne({
				productId,
				storeId,
			}).lean();

			if (existing) {
				throw new HttpError(
					'Product is already available at this store',
					409
				);
			}

			// Create availability record
			const availability = await Availability.create({
				productId,
				storeId,
				moderationStatus: 'confirmed',
				priceRange: priceRange || undefined,
				lastConfirmedAt: new Date(),
				source: 'admin',
			});

			res.status(201).json({
				message: 'Product added to store availability',
				availability: {
					id: availability._id.toString(),
					productId: availability.productId.toString(),
					storeId: availability.storeId.toString(),
					priceRange: availability.priceRange,
					moderationStatus: availability.moderationStatus,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/stores/:storeId/availability/:productId
 * Update a product's availability at a store (e.g., price)
 */
router.put(
	'/stores/:storeId/availability/:productId',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { storeId, productId } = req.params;
			const { priceRange, moderationStatus } = req.body;

			const updateData: any = {
				lastConfirmedAt: new Date(),
			};

			if (priceRange !== undefined) {
				updateData.priceRange = priceRange;
			}
			if (moderationStatus !== undefined) {
				if (
					!['confirmed', 'pending', 'rejected'].includes(
						moderationStatus
					)
				) {
					throw new HttpError('Invalid moderationStatus value', 400);
				}
				updateData.moderationStatus = moderationStatus;
			}

			const availability = await Availability.findOneAndUpdate(
				{ productId, storeId },
				updateData,
				{ new: true }
			);

			if (!availability) {
				throw new HttpError('Availability record not found', 404);
			}

			res.json({
				message: 'Availability updated successfully',
				availability: {
					id: availability._id.toString(),
					productId: availability.productId.toString(),
					storeId: availability.storeId.toString(),
					priceRange: availability.priceRange,
					moderationStatus: availability.moderationStatus,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * DELETE /api/admin/stores/:storeId/availability/:productId
 * Remove a product from a store's availability
 */
router.delete(
	'/stores/:storeId/availability/:productId',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { storeId, productId } = req.params;

			const result = await Availability.findOneAndDelete({
				productId,
				storeId,
			});

			if (!result) {
				throw new HttpError('Availability record not found', 404);
			}

			res.json({ message: 'Product removed from store availability' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/stores/:storeId/availability/bulk
 * Add multiple products to a store's availability at once
 */
router.post(
	'/stores/:storeId/availability/bulk',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { storeId } = req.params;
			const { productIds } = req.body;

			if (!Array.isArray(productIds) || productIds.length === 0) {
				throw new HttpError(
					'productIds must be a non-empty array',
					400
				);
			}

			// Verify store exists
			const store = await Store.findById(storeId).lean();
			if (!store) {
				throw new HttpError('Store not found', 404);
			}

			// Get existing availabilities to avoid duplicates
			const existingAvails = await Availability.find({
				storeId,
				productId: { $in: productIds },
			}).lean();

			const existingProductIds = new Set(
				existingAvails.map((a) => a.productId.toString())
			);

			// Filter to only new products
			const newProductIds = productIds.filter(
				(id: string) => !existingProductIds.has(id)
			);

			if (newProductIds.length === 0) {
				return res.json({
					message: 'All products are already available at this store',
					added: 0,
					skipped: productIds.length,
				});
			}

			// Create availability records for new products
			const availabilities = newProductIds.map((productId: string) => ({
				productId,
				storeId,
				status: 'known',
				lastConfirmedAt: new Date(),
				source: 'user_contribution',
			}));

			await Availability.insertMany(availabilities);

			res.status(201).json({
				message: 'Products added to store availability',
				added: newProductIds.length,
				skipped: productIds.length - newProductIds.length,
			});
		} catch (error) {
			next(error);
		}
	}
);

// ============================================
// PENDING REPORTS DASHBOARD
// ============================================

/**
 * GET /api/admin/pending-reports
 * Get all pending availability reports across all cities
 */
router.get(
	'/pending-reports',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Get all pending availability records
			const pendingReports = await Availability.find({
				moderationStatus: 'pending',
			})
				.populate('reportedBy', 'email displayName')
				.populate('storeId', 'name city state address')
				.sort({ createdAt: -1 })
				.lean();

			// Get product details
			const productIds = pendingReports.map((r) => r.productId);

			const [apiProducts, userProducts] = await Promise.all([
				Product.find({ _id: { $in: productIds } })
					.select('name brand imageUrl')
					.lean(),
				UserProduct.find({ _id: { $in: productIds } })
					.select('name brand imageUrl')
					.lean(),
			]);

			const productMap = new Map<string, any>();
			apiProducts.forEach((p) =>
				productMap.set(p._id.toString(), { ...p, productType: 'api' })
			);
			userProducts.forEach((p) =>
				productMap.set(p._id.toString(), { ...p, productType: 'user' })
			);

			// Build response grouped by city
			const reportsByCity: Record<string, any[]> = {};

			pendingReports.forEach((report) => {
				const store = report.storeId as any;
				if (!store) return;

				const cityKey = `${store.city || 'Unknown'}, ${
					store.state || '??'
				}`;
				if (!reportsByCity[cityKey]) {
					reportsByCity[cityKey] = [];
				}

				const product = productMap.get(report.productId.toString());

				reportsByCity[cityKey].push({
					id: report._id.toString(),
					productId: report.productId.toString(),
					productName: product?.name || 'Unknown Product',
					productBrand: product?.brand || '',
					productImageUrl: product?.imageUrl,
					productType: product?.productType || 'api',
					storeId: store._id?.toString(),
					storeName: store.name,
					storeAddress: store.address,
					priceRange: report.priceRange,
					notes: report.notes,
					source: report.source,
					reportedBy: report.reportedBy
						? {
								id: (report.reportedBy as any)._id?.toString(),
								email: (report.reportedBy as any).email,
								displayName: (report.reportedBy as any)
									.displayName,
						  }
						: null,
					createdAt: report.createdAt,
				});
			});

			// Convert to array format
			const cities = Object.entries(reportsByCity).map(
				([city, reports]) => ({
					city,
					reports,
					count: reports.length,
				})
			);

			// Sort by count descending
			cities.sort((a, b) => b.count - a.count);

			const totalPending = pendingReports.length;

			res.json({
				totalPending,
				cities,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/pending-reports/bulk-moderate
 * Approve or reject multiple reports at once
 */
router.put(
	'/pending-reports/bulk-moderate',
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { reportIds, status } = req.body;

			if (!Array.isArray(reportIds) || reportIds.length === 0) {
				throw new HttpError('reportIds array is required', 400);
			}

			if (!['confirmed', 'rejected'].includes(status)) {
				throw new HttpError(
					'Status must be "confirmed" or "rejected"',
					400
				);
			}

			const result = await Availability.updateMany(
				{
					_id: { $in: reportIds },
					moderationStatus: 'pending',
				},
				{
					moderationStatus: status,
					moderatedBy: req.user?.userId,
					moderatedAt: new Date(),
				}
			);

			res.json({
				message: `${result.modifiedCount} reports ${status}`,
				modifiedCount: result.modifiedCount,
			});
		} catch (error) {
			next(error);
		}
	}
);

export default router;
