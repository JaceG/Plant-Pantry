import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { adminService } from '../services/adminService';
import { reviewService } from '../services/reviewService';
import { cityService } from '../services/cityService';
import { storeService } from '../services/storeService';
import { storeChainService } from '../services/storeChainService';
import {
	authMiddleware,
	adminMiddleware,
	AuthenticatedRequest,
} from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';
import {
	Product,
	UserProduct,
	Store,
	StoreChain,
	Availability,
} from '../models';

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
				'chainId',
				'locationIdentifier',
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

// ============================================
// STORE CHAIN MANAGEMENT
// ============================================

/**
 * GET /api/admin/chains
 * Get all store chains
 */
router.get(
	'/chains',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const includeInactive = req.query.includeInactive === 'true';
			const chains = await storeChainService.getChains(includeInactive);
			res.json({ chains });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/chains/:id
 * Get a specific chain
 */
router.get(
	'/chains/:id',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const chain = await storeChainService.getChainById(id);

			if (!chain) {
				throw new HttpError('Chain not found', 404);
			}

			res.json({ chain });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/chains
 * Create a new store chain
 */
router.post(
	'/chains',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { name, slug, logoUrl, websiteUrl, type } = req.body;

			if (!name || !name.trim()) {
				throw new HttpError('Chain name is required', 400);
			}

			const chain = await storeChainService.createChain({
				name: name.trim(),
				slug: slug?.trim(),
				logoUrl: logoUrl?.trim(),
				websiteUrl: websiteUrl?.trim(),
				type,
			});

			res.status(201).json({
				message: 'Chain created successfully',
				chain,
			});
		} catch (error: any) {
			if (error.code === 11000) {
				next(
					new HttpError(
						'A chain with this name or slug already exists',
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
 * PUT /api/admin/chains/:id
 * Update a store chain
 */
router.put(
	'/chains/:id',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { name, slug, logoUrl, websiteUrl, type, isActive } =
				req.body;

			const updates: any = {};
			if (name !== undefined) updates.name = name.trim();
			if (slug !== undefined) updates.slug = slug.trim();
			if (logoUrl !== undefined) updates.logoUrl = logoUrl.trim();
			if (websiteUrl !== undefined)
				updates.websiteUrl = websiteUrl.trim();
			if (type !== undefined) updates.type = type;
			if (isActive !== undefined) updates.isActive = isActive;

			if (Object.keys(updates).length === 0) {
				throw new HttpError('No valid fields to update', 400);
			}

			const chain = await storeChainService.updateChain(id, updates);

			if (!chain) {
				throw new HttpError('Chain not found', 404);
			}

			res.json({ message: 'Chain updated successfully', chain });
		} catch (error: any) {
			if (error.code === 11000) {
				next(
					new HttpError(
						'A chain with this name or slug already exists',
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
 * DELETE /api/admin/chains/:id
 * Delete a store chain (only if no stores assigned)
 */
router.delete(
	'/chains/:id',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const result = await storeChainService.deleteChain(id);

			if (!result.success) {
				throw new HttpError(result.message, 400);
			}

			res.json({ message: result.message });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/chains/:id/stores
 * Get all stores in a chain
 */
router.get(
	'/chains/:id/stores',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const city = req.query.city as string | undefined;
			const state = req.query.state as string | undefined;

			const chain = await storeChainService.getChainById(id);
			if (!chain) {
				throw new HttpError('Chain not found', 404);
			}

			const result = await storeService.getStoresByChain(id, {
				city,
				state,
			});

			res.json({
				chain,
				stores: result.items,
				totalCount: result.items.length,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/stores/:id/assign-chain
 * Assign a store to a chain
 */
router.post(
	'/stores/:id/assign-chain',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { chainId, locationIdentifier } = req.body;

			const result = await storeChainService.assignStoreToChain(
				id,
				chainId || null,
				locationIdentifier
			);

			if (!result.success) {
				throw new HttpError(result.message, 400);
			}

			res.json({ message: result.message });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/stores/bulk-assign-chain
 * Bulk assign stores to a chain
 */
router.post(
	'/stores/bulk-assign-chain',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { storeIds, chainId } = req.body;

			if (!Array.isArray(storeIds) || storeIds.length === 0) {
				throw new HttpError('storeIds array is required', 400);
			}

			const result = await storeChainService.bulkAssignToChain(
				storeIds,
				chainId || null
			);

			if (!result.success) {
				throw new HttpError(result.message, 400);
			}

			res.json({
				message: result.message,
				updated: result.updated,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/stores/grouped
 * Get stores grouped by chain (includes empty chains for admin management)
 */
router.get(
	'/stores/grouped',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Pass true to include chains with no stores (for admin management)
			const result = await storeService.getStoresGroupedByChain(true);
			res.json(result);
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
 * POST /api/admin/filters
 * Create a new filter (category or tag)
 */
router.post(
	'/filters',
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

			if (!value || typeof value !== 'string' || !value.trim()) {
				throw new HttpError('Filter value is required', 400);
			}

			const result = await adminService.createFilter(
				type,
				value,
				displayName,
				userId
			);

			res.status(201).json({
				message: `${
					type === 'category' ? 'Category' : 'Tag'
				} created successfully`,
				filter: result,
			});
		} catch (error: any) {
			if (error.message?.includes('already exists')) {
				next(new HttpError(error.message, 409));
			} else {
				next(error);
			}
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

// ============================================
// PENDING STORES MANAGEMENT
// ============================================

/**
 * GET /api/admin/stores/pending
 * Get pending stores for moderation
 */
router.get(
	'/stores/pending',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;

			const result = await adminService.getPendingStores(page, pageSize);
			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/stores/:id/approve
 * Approve a pending store
 */
router.post(
	'/stores/:id/approve',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const adminId = req.userId!;

			const success = await adminService.approveStore(id, adminId);

			if (!success) {
				throw new HttpError('Store not found', 404);
			}

			res.json({ message: 'Store approved successfully' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/stores/:id/reject
 * Reject a pending store
 */
router.post(
	'/stores/:id/reject',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const adminId = req.userId!;

			const success = await adminService.rejectStore(id, adminId);

			if (!success) {
				throw new HttpError('Store not found', 404);
			}

			res.json({ message: 'Store rejected' });
		} catch (error) {
			next(error);
		}
	}
);

// ============================================
// TRUSTED CONTRIBUTORS MANAGEMENT
// ============================================

/**
 * PUT /api/admin/users/:id/trusted
 * Set user trusted contributor status
 */
router.put(
	'/users/:id/trusted',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { trusted } = req.body;
			const adminId = req.userId!;

			if (typeof trusted !== 'boolean') {
				throw new HttpError('trusted must be a boolean', 400);
			}

			const success = await adminService.setUserTrustedStatus(
				id,
				trusted,
				adminId
			);

			if (!success) {
				throw new HttpError('User not found', 404);
			}

			res.json({
				message: trusted
					? 'User is now a trusted contributor'
					: 'User trusted status removed',
			});
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
// TRUSTED CONTRIBUTOR REVIEW
// ============================================

/**
 * GET /api/admin/trusted-review/products
 * Get trusted contributor products pending review
 */
router.get(
	'/trusted-review/products',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;
			const result = await adminService.getTrustedProductsPendingReview(
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
 * GET /api/admin/trusted-review/stores
 * Get trusted contributor stores pending review
 */
router.get(
	'/trusted-review/stores',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;
			const result = await adminService.getTrustedStoresPendingReview(
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
 * POST /api/admin/trusted-review/products/:id/approve
 * Mark a trusted contributor product as reviewed (approved)
 */
router.post(
	'/trusted-review/products/:id/approve',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const adminId = req.userId!;

			const success = await adminService.markProductReviewed(id, adminId);

			if (!success) {
				throw new HttpError('Product not found', 404);
			}

			res.json({ message: 'Product reviewed and approved' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/trusted-review/products/:id/reject
 * Reject a trusted contributor product (changes status to rejected)
 */
router.post(
	'/trusted-review/products/:id/reject',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const adminId = req.userId!;

			const success = await adminService.rejectTrustedProduct(
				id,
				adminId
			);

			if (!success) {
				throw new HttpError('Product not found', 404);
			}

			res.json({
				message: 'Product rejected and removed from public view',
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/trusted-review/stores/:id/approve
 * Mark a trusted contributor store as reviewed (approved)
 */
router.post(
	'/trusted-review/stores/:id/approve',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const adminId = req.userId!;

			const success = await adminService.markStoreReviewed(id, adminId);

			if (!success) {
				throw new HttpError('Store not found', 404);
			}

			res.json({ message: 'Store reviewed and approved' });
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/trusted-review/stores/:id/reject
 * Reject a trusted contributor store (changes status to rejected)
 */
router.post(
	'/trusted-review/stores/:id/reject',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const adminId = req.userId!;

			const success = await adminService.rejectTrustedStore(id, adminId);

			if (!success) {
				throw new HttpError('Store not found', 404);
			}

			res.json({
				message: 'Store rejected and removed from public view',
			});
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
// CITY CONTENT EDIT REVIEW
// ============================================

/**
 * GET /api/admin/city-content-edits
 * Get all pending city content edits for review
 */
router.get(
	'/city-content-edits',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;
			const status = (req.query.status as string) || 'pending';
			const citySlug = req.query.citySlug as string | undefined;

			const skip = (page - 1) * pageSize;

			const query: Record<string, any> = {};
			if (status !== 'all') {
				query.status = status;
			}
			if (citySlug) {
				query.citySlug = citySlug.toLowerCase();
			}

			const [edits, total] = await Promise.all([
				CityContentEdit.find(query)
					.populate('userId', 'email displayName')
					.populate('reviewedBy', 'email displayName')
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(pageSize)
					.lean(),
				CityContentEdit.countDocuments(query),
			]);

			// Get city page info for each edit
			const citySlugs = [...new Set(edits.map((e) => e.citySlug))];
			const cityPages = await CityLandingPage.find({
				slug: { $in: citySlugs },
			}).lean();
			const cityMap = new Map(
				cityPages.map((c) => [
					c.slug,
					{ cityName: c.cityName, state: c.state },
				])
			);

			const items = edits.map((edit) => {
				const city = cityMap.get(edit.citySlug);
				return {
					id: edit._id.toString(),
					cityPageId: edit.cityPageId.toString(),
					citySlug: edit.citySlug,
					cityName: city?.cityName || 'Unknown',
					state: city?.state || '??',
					field: edit.field,
					originalValue: edit.originalValue,
					suggestedValue: edit.suggestedValue,
					reason: edit.reason,
					status: edit.status,
					submittedBy: edit.userId
						? {
								id: (edit.userId as any)._id?.toString(),
								email: (edit.userId as any).email,
								displayName: (edit.userId as any).displayName,
						  }
						: null,
					reviewedBy: edit.reviewedBy
						? {
								id: (edit.reviewedBy as any)._id?.toString(),
								email: (edit.reviewedBy as any).email,
								displayName: (edit.reviewedBy as any)
									.displayName,
						  }
						: null,
					reviewedAt: edit.reviewedAt,
					reviewNote: edit.reviewNote,
					createdAt: edit.createdAt,
				};
			});

			res.json({
				items,
				total,
				page,
				pageSize,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/city-content-edits/counts
 * Get counts of pending edits by city
 */
router.get(
	'/city-content-edits/counts',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const counts = await CityContentEdit.aggregate([
				{ $match: { status: 'pending' } },
				{
					$group: {
						_id: '$citySlug',
						count: { $sum: 1 },
					},
				},
			]);

			const totalPending = counts.reduce((sum, c) => sum + c.count, 0);

			// Get city names
			const citySlugs = counts.map((c) => c._id);
			const cityPages = await CityLandingPage.find({
				slug: { $in: citySlugs },
			}).lean();
			const cityMap = new Map(
				cityPages.map((c) => [
					c.slug,
					{ cityName: c.cityName, state: c.state },
				])
			);

			const byCitySlug = counts.map((c) => {
				const city = cityMap.get(c._id);
				return {
					citySlug: c._id,
					cityName: city?.cityName || 'Unknown',
					state: city?.state || '??',
					count: c.count,
				};
			});

			res.json({
				totalPending,
				byCitySlug,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/city-content-edits/:id/approve
 * Approve a city content edit and apply it
 */
router.post(
	'/city-content-edits/:id/approve',
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { reviewNote } = req.body;
			const adminId = req.user?.userId;

			// Get the edit
			const edit = await CityContentEdit.findById(id);
			if (!edit) {
				throw new HttpError('Content edit not found', 404);
			}

			if (edit.status !== 'pending') {
				throw new HttpError('This edit has already been reviewed', 400);
			}

			// Apply the edit to the city page
			const updateData: Record<string, string> = {};
			updateData[edit.field] = edit.suggestedValue;

			const updatedCityPage = await CityLandingPage.findByIdAndUpdate(
				edit.cityPageId,
				updateData,
				{ new: true }
			);

			if (!updatedCityPage) {
				throw new HttpError('City page not found', 404);
			}

			// Update the edit status
			edit.status = 'approved';
			edit.reviewedBy = adminId
				? new mongoose.Types.ObjectId(adminId)
				: undefined;
			edit.reviewedAt = new Date();
			if (reviewNote) {
				edit.reviewNote = reviewNote;
			}
			await edit.save();

			res.json({
				message: 'Edit approved and applied',
				edit: {
					id: edit._id.toString(),
					field: edit.field,
					status: edit.status,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/city-content-edits/:id/reject
 * Reject a city content edit
 */
router.post(
	'/city-content-edits/:id/reject',
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { reviewNote } = req.body;
			const adminId = req.user?.userId;

			// Get the edit
			const edit = await CityContentEdit.findById(id);
			if (!edit) {
				throw new HttpError('Content edit not found', 404);
			}

			if (edit.status !== 'pending') {
				throw new HttpError('This edit has already been reviewed', 400);
			}

			// Update the edit status
			edit.status = 'rejected';
			edit.reviewedBy = adminId
				? new mongoose.Types.ObjectId(adminId)
				: undefined;
			edit.reviewedAt = new Date();
			if (reviewNote) {
				edit.reviewNote = reviewNote;
			}
			await edit.save();

			res.json({
				message: 'Edit rejected',
				edit: {
					id: edit._id.toString(),
					field: edit.field,
					status: edit.status,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/city-content-edits/bulk-review
 * Approve or reject multiple edits at once
 */
router.put(
	'/city-content-edits/bulk-review',
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { editIds, action, reviewNote } = req.body;
			const adminId = req.user?.userId;

			if (!Array.isArray(editIds) || editIds.length === 0) {
				throw new HttpError('editIds array is required', 400);
			}

			if (!['approve', 'reject'].includes(action)) {
				throw new HttpError(
					'action must be "approve" or "reject"',
					400
				);
			}

			const newStatus = action === 'approve' ? 'approved' : 'rejected';

			// Get all pending edits
			const edits = await CityContentEdit.find({
				_id: { $in: editIds },
				status: 'pending',
			});

			if (edits.length === 0) {
				return res.json({
					message: 'No pending edits found to review',
					processedCount: 0,
				});
			}

			// If approving, apply the edits to city pages
			if (action === 'approve') {
				for (const edit of edits) {
					const updateData: Record<string, string> = {};
					updateData[edit.field] = edit.suggestedValue;

					await CityLandingPage.findByIdAndUpdate(
						edit.cityPageId,
						updateData
					);
				}
			}

			// Update all edit statuses
			await CityContentEdit.updateMany(
				{ _id: { $in: editIds }, status: 'pending' },
				{
					status: newStatus,
					reviewedBy: adminId
						? new mongoose.Types.ObjectId(adminId)
						: undefined,
					reviewedAt: new Date(),
					...(reviewNote && { reviewNote }),
				}
			);

			res.json({
				message: `${edits.length} edit(s) ${newStatus}`,
				processedCount: edits.length,
			});
		} catch (error) {
			next(error);
		}
	}
);

// ============================================
// CITY PAGE STORES MANAGEMENT
// ============================================

import { CityLandingPage, CityContentEdit } from '../models';

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

			// Create availability (admin-created, no review needed)
			await Availability.create({
				productId,
				storeId,
				priceRange,
				lastConfirmedAt: new Date(),
				source: 'admin',
				moderationStatus: 'confirmed',
				needsReview: false,
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

// ============================================
// RETAILER CONTENT EDIT REVIEW
// ============================================

import { RetailerContentEdit, BrandContentEdit, BrandPage } from '../models';

/**
 * GET /api/admin/retailer-content-edits
 * Get all pending retailer content edits for review
 */
router.get(
	'/retailer-content-edits',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;
			const status = (req.query.status as string) || 'pending';
			const retailerType = req.query.retailerType as string | undefined;

			const skip = (page - 1) * pageSize;

			const query: Record<string, any> = {};
			if (status !== 'all') {
				query.status = status;
			}
			if (retailerType && ['store', 'chain'].includes(retailerType)) {
				query.retailerType = retailerType;
			}

			const [edits, total] = await Promise.all([
				RetailerContentEdit.find(query)
					.populate('userId', 'email displayName')
					.populate('reviewedBy', 'email displayName')
					.populate('storeId', 'name address city state')
					.populate('chainId', 'name slug')
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(pageSize)
					.lean(),
				RetailerContentEdit.countDocuments(query),
			]);

			const items = edits.map((edit) => ({
				id: edit._id.toString(),
				retailerType: edit.retailerType,
				storeId: edit.storeId
					? (edit.storeId as any)._id?.toString()
					: undefined,
				storeName: edit.storeId
					? (edit.storeId as any).name
					: undefined,
				storeAddress: edit.storeId
					? `${(edit.storeId as any).city || ''}, ${
							(edit.storeId as any).state || ''
					  }`.trim()
					: undefined,
				chainId: edit.chainId
					? (edit.chainId as any)._id?.toString()
					: undefined,
				chainName: edit.chainId
					? (edit.chainId as any).name
					: undefined,
				chainSlug: edit.chainSlug,
				field: edit.field,
				originalValue: edit.originalValue,
				suggestedValue: edit.suggestedValue,
				reason: edit.reason,
				status: edit.status,
				trustedContribution: edit.trustedContribution,
				autoApplied: edit.autoApplied,
				submittedBy: edit.userId
					? {
							id: (edit.userId as any)._id?.toString(),
							email: (edit.userId as any).email,
							displayName: (edit.userId as any).displayName,
					  }
					: null,
				reviewedBy: edit.reviewedBy
					? {
							id: (edit.reviewedBy as any)._id?.toString(),
							email: (edit.reviewedBy as any).email,
							displayName: (edit.reviewedBy as any).displayName,
					  }
					: null,
				reviewedAt: edit.reviewedAt,
				reviewNote: edit.reviewNote,
				createdAt: edit.createdAt,
			}));

			res.json({
				items,
				total,
				page,
				pageSize,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/retailer-content-edits/:id/approve
 * Approve a retailer content edit and apply it
 */
router.post(
	'/retailer-content-edits/:id/approve',
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { reviewNote } = req.body;
			const adminId = req.user?.userId;

			const edit = await RetailerContentEdit.findById(id);
			if (!edit) {
				throw new HttpError('Content edit not found', 404);
			}

			if (edit.status !== 'pending') {
				throw new HttpError('This edit has already been reviewed', 400);
			}

			// Apply the edit
			const updateData: Record<string, string> = {};
			updateData[edit.field] = edit.suggestedValue;

			if (edit.retailerType === 'chain' && edit.chainId) {
				await StoreChain.findByIdAndUpdate(edit.chainId, updateData);
			} else if (edit.retailerType === 'store' && edit.storeId) {
				await Store.findByIdAndUpdate(edit.storeId, updateData);
			}

			// Update the edit status
			edit.status = 'approved';
			edit.reviewedBy = adminId
				? new mongoose.Types.ObjectId(adminId)
				: undefined;
			edit.reviewedAt = new Date();
			if (reviewNote) {
				edit.reviewNote = reviewNote;
			}
			await edit.save();

			res.json({
				message: 'Edit approved and applied',
				edit: {
					id: edit._id.toString(),
					field: edit.field,
					status: edit.status,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/retailer-content-edits/:id/reject
 * Reject a retailer content edit
 */
router.post(
	'/retailer-content-edits/:id/reject',
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { reviewNote } = req.body;
			const adminId = req.user?.userId;

			const edit = await RetailerContentEdit.findById(id);
			if (!edit) {
				throw new HttpError('Content edit not found', 404);
			}

			if (edit.status !== 'pending') {
				throw new HttpError('This edit has already been reviewed', 400);
			}

			// If it was auto-applied, we need to revert the change
			if (edit.autoApplied && edit.trustedContribution) {
				const revertData: Record<string, string> = {};
				revertData[edit.field] = edit.originalValue;

				if (edit.retailerType === 'chain' && edit.chainId) {
					await StoreChain.findByIdAndUpdate(
						edit.chainId,
						revertData
					);
				} else if (edit.retailerType === 'store' && edit.storeId) {
					await Store.findByIdAndUpdate(edit.storeId, revertData);
				}
			}

			// Update the edit status
			edit.status = 'rejected';
			edit.reviewedBy = adminId
				? new mongoose.Types.ObjectId(adminId)
				: undefined;
			edit.reviewedAt = new Date();
			if (reviewNote) {
				edit.reviewNote = reviewNote;
			}
			await edit.save();

			res.json({
				message: 'Edit rejected',
				edit: {
					id: edit._id.toString(),
					field: edit.field,
					status: edit.status,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

// ============================================
// BRAND CONTENT EDIT REVIEW
// ============================================

// ============================================
// BRAND HIERARCHY MANAGEMENT
// ============================================

/**
 * Helper to generate a URL-friendly slug from a brand name
 */
function generateBrandSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * GET /api/admin/brands
 * Get all brands with hierarchy info for admin management
 * Discovers brands from products and merges with BrandPage entries
 * Supports letter-based filtering: letter=A returns brands starting with A
 * letter=# returns brands starting with numbers or special characters
 */
router.get(
	'/brands',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const officialOnly = req.query.officialOnly === 'true';
			const unassignedOnly = req.query.unassignedOnly === 'true';
			const letter = (req.query.letter as string)?.toUpperCase();

			// Get product counts per brand (case-insensitive)
			const [productBrandCounts, userProductBrandCounts] =
				await Promise.all([
					Product.aggregate([
						{ $match: { archived: { $ne: true } } },
						{
							$group: {
								_id: {
									$toLower: { $trim: { input: '$brand' } },
								},
								count: { $sum: 1 },
								originalName: { $first: '$brand' },
							},
						},
					]),
					UserProduct.aggregate([
						{
							$match: {
								status: 'approved',
								archived: { $ne: true },
							},
						},
						{
							$group: {
								_id: {
									$toLower: { $trim: { input: '$brand' } },
								},
								count: { $sum: 1 },
								originalName: { $first: '$brand' },
							},
						},
					]),
				]);

			// Build a map of normalized brand name -> { count, originalName }
			const brandCountMap = new Map<
				string,
				{ count: number; originalName: string }
			>();

			for (const item of productBrandCounts) {
				const key = item._id;
				const existing = brandCountMap.get(key);
				if (existing) {
					existing.count += item.count;
				} else {
					brandCountMap.set(key, {
						count: item.count,
						originalName: item.originalName,
					});
				}
			}

			for (const item of userProductBrandCounts) {
				const key = item._id;
				const existing = brandCountMap.get(key);
				if (existing) {
					existing.count += item.count;
				} else {
					brandCountMap.set(key, {
						count: item.count,
						originalName: item.originalName,
					});
				}
			}

			// Get unique brand names from the count map
			const uniqueBrandNames = Array.from(brandCountMap.values()).map(
				(v) => v.originalName.trim()
			);

			// Normalize function: trim and collapse multiple spaces to single space
			const normalize = (name: string) =>
				name.trim().replace(/\s+/g, ' ').toLowerCase();

			// Get all existing BrandPage entries
			const existingBrandPages = await BrandPage.find()
				.populate('parentBrandId', 'brandName slug displayName')
				.lean();

			// Create a map of normalized brandName -> BrandPage
			const brandPageMap = new Map(
				existingBrandPages.map((bp) => [normalize(bp.brandName), bp])
			);

			// Get child counts for official brands
			const officialBrandIds = existingBrandPages
				.filter((b) => b.isOfficial)
				.map((b) => b._id);

			const childCounts = await BrandPage.aggregate([
				{
					$match: {
						parentBrandId: { $in: officialBrandIds },
					},
				},
				{
					$group: {
						_id: '$parentBrandId',
						count: { $sum: 1 },
					},
				},
			]);

			const childCountMap = new Map(
				childCounts.map((c) => [c._id.toString(), c.count])
			);

			// Get child brands and their product counts for calculating totalProductCount
			const childBrands = await BrandPage.find({
				parentBrandId: { $in: officialBrandIds },
			})
				.select('brandName parentBrandId')
				.lean();

			// Create a map of parent ID -> array of child brand names
			const parentChildBrandsMap = new Map<string, string[]>();
			for (const child of childBrands) {
				const parentId = child.parentBrandId?.toString();
				if (parentId) {
					const existing = parentChildBrandsMap.get(parentId) || [];
					existing.push(child.brandName.toLowerCase());
					parentChildBrandsMap.set(parentId, existing);
				}
			}

			// Calculate total product counts for each official brand (own + children's products)
			const childProductCountsMap = new Map<string, number>();
			for (const [parentId, childNames] of parentChildBrandsMap.entries()) {
				let totalChildProducts = 0;
				for (const childName of childNames) {
					totalChildProducts +=
						brandCountMap.get(childName)?.count || 0;
				}
				childProductCountsMap.set(parentId, totalChildProducts);
			}

			// Helper to check if brand starts with a letter or # (non-letter)
			const getFirstLetter = (name: string): string => {
				const firstChar = name.trim().charAt(0).toUpperCase();
				return /[A-Z]/.test(firstChar) ? firstChar : '#';
			};

			// Helper to check if brand matches letter filter
			const matchesLetter = (name: string): boolean => {
				if (!letter) return true;
				const firstLetter = getFirstLetter(name);
				return firstLetter === letter;
			};

			// Build combined brand list
			const officialItems: any[] = [];
			const unassignedItems: any[] = [];
			const letterCounts: Record<string, number> = { '#': 0 };
			'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((l) => {
				letterCounts[l] = 0;
			});

			for (const brandName of uniqueBrandNames) {
				const normalizedName = normalize(brandName);
				const existingPage = brandPageMap.get(normalizedName);
				const productCount =
					brandCountMap.get(normalizedName)?.count || 0;

				if (existingPage) {
					// Brand has a BrandPage entry
					const brandId = existingPage._id.toString();
					const childProductsTotal =
						childProductCountsMap.get(brandId) || 0;
					const item = {
						id: brandId,
						brandName: existingPage.brandName,
						slug: existingPage.slug,
						displayName: existingPage.displayName,
						isOfficial: existingPage.isOfficial || false,
						isActive: existingPage.isActive,
						productCount,
						totalProductCount: productCount + childProductsTotal,
						parentBrand: existingPage.parentBrandId
							? {
									id: (
										existingPage.parentBrandId as any
									)._id?.toString(),
									brandName: (
										existingPage.parentBrandId as any
									).brandName,
									slug: (existingPage.parentBrandId as any)
										.slug,
									displayName: (
										existingPage.parentBrandId as any
									).displayName,
							  }
							: null,
						childCount: childCountMap.get(brandId) || 0,
					};

					// Track letter counts for unassigned brands
					if (!item.isOfficial && !item.parentBrand) {
						const firstLetter = getFirstLetter(item.displayName);
						letterCounts[firstLetter] =
							(letterCounts[firstLetter] || 0) + 1;
					}

					// Separate official vs unassigned
					if (item.isOfficial) {
						officialItems.push(item);
					} else if (!item.parentBrand) {
						// Only include if matches letter filter
						if (matchesLetter(item.displayName)) {
							unassignedItems.push(item);
						}
					}
				} else {
					// Brand only exists on products, no BrandPage yet
					const item = {
						id: null, // No BrandPage yet
						brandName: brandName,
						slug: generateBrandSlug(brandName),
						displayName: brandName,
						isOfficial: false,
						isActive: true,
						productCount,
						totalProductCount: productCount, // No children, so same as productCount
						parentBrand: null,
						childCount: 0,
					};

					// Track letter counts
					const firstLetter = getFirstLetter(item.displayName);
					letterCounts[firstLetter] =
						(letterCounts[firstLetter] || 0) + 1;

					// Only include if matches letter filter
					if (matchesLetter(item.displayName)) {
						unassignedItems.push(item);
					}
				}
			}

			// Also include official BrandPages that don't have any products
			// (e.g., parent brands like "Amazon" created from scratch)
			const processedBrandPageIds = new Set(
				officialItems.map((item) => item.id).filter(Boolean)
			);

			for (const brandPage of existingBrandPages) {
				if (
					brandPage.isOfficial &&
					!processedBrandPageIds.has(brandPage._id.toString())
				) {
					// This official brand has no products, add it
					const brandId = brandPage._id.toString();
					const childProductsTotal =
						childProductCountsMap.get(brandId) || 0;
					officialItems.push({
						id: brandId,
						brandName: brandPage.brandName,
						slug: brandPage.slug,
						displayName: brandPage.displayName,
						isOfficial: true,
						isActive: brandPage.isActive,
						productCount: 0,
						totalProductCount: childProductsTotal,
						parentBrand: brandPage.parentBrandId
							? {
									id: (
										brandPage.parentBrandId as any
									)._id?.toString(),
									brandName: (brandPage.parentBrandId as any)
										.brandName,
									slug: (brandPage.parentBrandId as any).slug,
									displayName: (
										brandPage.parentBrandId as any
									).displayName,
							  }
							: null,
						childCount: childCountMap.get(brandId) || 0,
					});
				}
			}

			// Sort both lists alphabetically
			officialItems.sort((a, b) =>
				a.displayName.localeCompare(b.displayName)
			);
			unassignedItems.sort((a, b) =>
				a.displayName.localeCompare(b.displayName)
			);

			// Return based on filter
			if (officialOnly) {
				res.json({ brands: officialItems, letterCounts });
			} else if (unassignedOnly) {
				res.json({ brands: unassignedItems, letterCounts });
			} else {
				// Return both sections
				res.json({
					officialBrands: officialItems,
					unassignedBrands: unassignedItems,
					letterCounts,
				});
			}
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/brands
 * Create a new brand from scratch
 * Used for creating official parent brands that don't exist in products yet
 */
router.post(
	'/brands',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { brandName, isOfficial = false } = req.body;

			if (!brandName || typeof brandName !== 'string') {
				throw new HttpError('brandName is required', 400);
			}

			const trimmedName = brandName.trim();
			if (!trimmedName) {
				throw new HttpError('brandName cannot be empty', 400);
			}

			const slug = generateBrandSlug(trimmedName);

			// Check if brand already exists (by name or slug)
			const existing = await BrandPage.findOne({
				$or: [
					{
						brandName: {
							$regex: new RegExp(
								`^${trimmedName.replace(
									/[.*+?^${}()|[\]\\]/g,
									'\\$&'
								)}$`,
								'i'
							),
						},
					},
					{ slug: slug },
				],
			});

			if (existing) {
				throw new HttpError(
					`A brand with this name or slug already exists: "${existing.displayName}"`,
					400
				);
			}

			// Create the new brand
			const newBrand = await BrandPage.create({
				brandName: trimmedName,
				slug: slug,
				displayName: trimmedName,
				isOfficial: isOfficial,
				isActive: true,
			});

			res.status(201).json({
				message: `Brand "${trimmedName}" created successfully`,
				brand: {
					id: newBrand._id.toString(),
					brandName: newBrand.brandName,
					slug: newBrand.slug,
					displayName: newBrand.displayName,
					isOfficial: newBrand.isOfficial,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/brands/official
 * Get all official brands (for dropdown selection)
 */
router.get(
	'/brands/official',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const brands = await BrandPage.find({
				isOfficial: true,
				isActive: true,
			})
				.select('brandName slug displayName')
				.sort({ displayName: 1 })
				.lean();

			res.json({
				brands: brands.map((b) => ({
					id: b._id.toString(),
					brandName: b.brandName,
					slug: b.slug,
					displayName: b.displayName,
				})),
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/brands/:id
 * Get a specific brand with full details
 */
router.get(
	'/brands/:id',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;

			const brand = await BrandPage.findById(id)
				.populate('parentBrandId', 'brandName slug displayName')
				.lean();

			if (!brand) {
				throw new HttpError('Brand not found', 404);
			}

			// Get child brands if official
			let childBrands: any[] = [];
			if (brand.isOfficial) {
				const children = await BrandPage.find({
					parentBrandId: brand._id,
				})
					.select('brandName slug displayName isActive')
					.lean();
				childBrands = children.map((c) => ({
					id: c._id.toString(),
					brandName: c.brandName,
					slug: c.slug,
					displayName: c.displayName,
					isActive: c.isActive,
				}));
			}

			res.json({
				brand: {
					id: brand._id.toString(),
					brandName: brand.brandName,
					slug: brand.slug,
					displayName: brand.displayName,
					description: brand.description,
					logoUrl: brand.logoUrl,
					websiteUrl: brand.websiteUrl,
					isOfficial: brand.isOfficial || false,
					isActive: brand.isActive,
					parentBrand: brand.parentBrandId
						? {
								id: (
									brand.parentBrandId as any
								)._id?.toString(),
								brandName: (brand.parentBrandId as any)
									.brandName,
								slug: (brand.parentBrandId as any).slug,
								displayName: (brand.parentBrandId as any)
									.displayName,
						  }
						: null,
					childBrands,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/brands/:id/official
 * Mark a brand as official or not
 * If id is a brand name (no existing BrandPage), creates one first
 */
router.put(
	'/brands/:id/official',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { isOfficial, brandName } = req.body;

			if (typeof isOfficial !== 'boolean') {
				throw new HttpError('isOfficial must be a boolean', 400);
			}

			let brand;

			// Check if id is a valid ObjectId
			if (mongoose.Types.ObjectId.isValid(id)) {
				brand = await BrandPage.findById(id);
			}

			// If not found by ID and brandName provided, find or create BrandPage
			if (!brand && brandName) {
				const slug = generateBrandSlug(brandName);
				// Check if a BrandPage already exists with this brandName or slug
				const existing = await BrandPage.findOne({
					$or: [
						{
							brandName: {
								$regex: new RegExp(`^${brandName}$`, 'i'),
							},
						},
						{ slug: slug },
					],
				});

				if (existing) {
					brand = existing;
					// Update the existing brand's official status
					if (isOfficial) {
						brand.isOfficial = true;
						brand.parentBrandId = undefined;
					} else {
						// If unmarking as official, first unassign all child brands
						await BrandPage.updateMany(
							{ parentBrandId: brand._id },
							{ $unset: { parentBrandId: 1 } }
						);
						brand.isOfficial = false;
					}
					await brand.save();
				} else {
					brand = await BrandPage.create({
						brandName: brandName,
						slug: slug,
						displayName: brandName,
						isOfficial: isOfficial,
						isActive: true,
					});
				}
			} else if (!brand) {
				throw new HttpError('Brand not found', 404);
			} else {
				// Update existing brand
				if (isOfficial) {
					brand.isOfficial = true;
					brand.parentBrandId = undefined;
				} else {
					// If unmarking as official, first unassign all child brands
					await BrandPage.updateMany(
						{ parentBrandId: brand._id },
						{ $unset: { parentBrandId: 1 } }
					);
					brand.isOfficial = false;
				}
				await brand.save();
			}

			res.json({
				message: isOfficial
					? 'Brand marked as official'
					: 'Brand unmarked as official',
				brand: {
					id: brand._id.toString(),
					isOfficial: brand.isOfficial,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * PUT /api/admin/brands/:id/assign-parent
 * Assign a brand to an official parent brand
 * If id is not a valid ObjectId, creates BrandPage first using brandName from body
 */
router.put(
	'/brands/:id/assign-parent',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { parentBrandId, brandName } = req.body;

			let brand;

			// Check if id is a valid ObjectId
			if (mongoose.Types.ObjectId.isValid(id)) {
				brand = await BrandPage.findById(id);
			}

			// If not found by ID and brandName provided, find or create BrandPage
			if (!brand && brandName) {
				const slug = generateBrandSlug(brandName);
				// Check if a BrandPage already exists with this brandName or slug
				// Exclude the target parent from search if provided
				const searchQuery: any = {
					$or: [
						{
							brandName: {
								$regex: new RegExp(`^${brandName}$`, 'i'),
							},
						},
						{ slug: slug },
					],
				};
				if (parentBrandId) {
					searchQuery._id = { $ne: parentBrandId };
				}
				const existing = await BrandPage.findOne(searchQuery);

				if (existing) {
					brand = existing;
				} else {
					// Check if slug conflicts with parent
					let finalSlug = slug;
					if (parentBrandId) {
						const parentBrand = await BrandPage.findById(
							parentBrandId
						);
						if (parentBrand && parentBrand.slug === slug) {
							// Generate unique slug
							let suffix = 1;
							while (true) {
								finalSlug = `${slug}-${suffix}`;
								const slugExists = await BrandPage.findOne({
									slug: finalSlug,
								});
								if (!slugExists) break;
								suffix++;
							}
						}
					}
					brand = await BrandPage.create({
						brandName: brandName,
						slug: finalSlug,
						displayName: brandName,
						isOfficial: false,
						isActive: true,
					});
				}
			} else if (!brand) {
				throw new HttpError('Brand not found', 404);
			}

			// Cannot assign a parent to an official brand
			if (brand.isOfficial) {
				throw new HttpError(
					'Cannot assign a parent to an official brand. Unmark it as official first.',
					400
				);
			}

			if (parentBrandId) {
				// Verify parent exists and is official
				const parentBrand = await BrandPage.findById(parentBrandId);
				if (!parentBrand) {
					throw new HttpError('Parent brand not found', 404);
				}
				if (!parentBrand.isOfficial) {
					throw new HttpError(
						'Parent brand must be marked as official',
						400
					);
				}

				brand.parentBrandId = parentBrand._id;
			} else {
				// Clear parent assignment
				brand.parentBrandId = undefined;
			}

			await brand.save();

			res.json({
				message: parentBrandId
					? 'Brand assigned to parent'
					: 'Brand unassigned from parent',
				brand: {
					id: brand._id.toString(),
					parentBrandId: brand.parentBrandId?.toString() || null,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/brands/:id/bulk-assign-children
 * Assign multiple brands to an official parent brand
 * Handles both existing BrandPages (ObjectIds) and brands without pages (brand names)
 */
router.post(
	'/brands/:id/bulk-assign-children',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { childBrandIds } = req.body;

			if (!Array.isArray(childBrandIds) || childBrandIds.length === 0) {
				throw new HttpError('childBrandIds array is required', 400);
			}

			// Verify parent exists and is official
			const parentBrand = await BrandPage.findById(id);
			if (!parentBrand) {
				throw new HttpError('Parent brand not found', 404);
			}
			if (!parentBrand.isOfficial) {
				throw new HttpError(
					'Parent brand must be marked as official',
					400
				);
			}

			// Separate valid ObjectIds from brand names
			const validObjectIds: string[] = [];
			const brandNames: string[] = [];

			for (const childId of childBrandIds) {
				if (mongoose.Types.ObjectId.isValid(childId)) {
					validObjectIds.push(childId);
				} else {
					brandNames.push(childId);
				}
			}

			let createdCount = 0;
			const newBrandPageIds: string[] = [];
			const skippedBrands: string[] = [];

			// Create BrandPages for brands that don't have one yet
			for (const brandName of brandNames) {
				const slug = generateBrandSlug(brandName);
				// Check if a BrandPage already exists for this brand name or slug
				// Exclude the parent brand from this search
				const existing = await BrandPage.findOne({
					_id: { $ne: parentBrand._id },
					$or: [
						{
							brandName: {
								$regex: new RegExp(`^${brandName}$`, 'i'),
							},
						},
						{ slug: slug },
					],
				});

				if (existing) {
					// Already exists (and it's not the parent), just add to the list
					newBrandPageIds.push(existing._id.toString());
				} else {
					// Check if the slug conflicts with the parent brand
					if (parentBrand.slug === slug) {
						// Generate a unique slug by appending a suffix
						let uniqueSlug = slug;
						let suffix = 1;
						while (true) {
							uniqueSlug = `${slug}-${suffix}`;
							const slugExists = await BrandPage.findOne({
								slug: uniqueSlug,
							});
							if (!slugExists) break;
							suffix++;
						}
						// Create new BrandPage with unique slug
						const newBrandPage = await BrandPage.create({
							brandName: brandName,
							slug: uniqueSlug,
							displayName: brandName,
							isOfficial: false,
							isActive: true,
							parentBrandId: parentBrand._id,
						});
						newBrandPageIds.push(newBrandPage._id.toString());
						createdCount++;
					} else {
						// Create new BrandPage with original slug
						const newBrandPage = await BrandPage.create({
							brandName: brandName,
							slug: slug,
							displayName: brandName,
							isOfficial: false,
							isActive: true,
							parentBrandId: parentBrand._id,
						});
						newBrandPageIds.push(newBrandPage._id.toString());
						createdCount++;
					}
				}
			}

			// Combine all brand IDs (existing + newly created)
			const allBrandIds = [...validObjectIds, ...newBrandPageIds];

			// Update all existing child brands (excluding the parent itself and other official brands)
			const result = await BrandPage.updateMany(
				{
					_id: { $in: allBrandIds, $ne: id },
					isOfficial: { $ne: true },
				},
				{ parentBrandId: parentBrand._id }
			);

			const totalAssigned = result.modifiedCount + createdCount;

			// Provide more informative response
			let message: string;
			if (totalAssigned === 0) {
				if (childBrandIds.length === 1) {
					message =
						'Brand was already assigned or could not be assigned';
				} else {
					message = `No new brands were assigned (${childBrandIds.length} were already assigned or could not be assigned)`;
				}
			} else if (totalAssigned === 1) {
				message = `1 brand assigned to ${parentBrand.displayName}`;
			} else {
				message = `${totalAssigned} brands assigned to ${parentBrand.displayName}`;
			}

			res.json({
				message,
				modifiedCount: totalAssigned,
				requestedCount: childBrandIds.length,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * GET /api/admin/brands/:id/children
 * Get all child brands of an official brand
 */
router.get(
	'/brands/:id/children',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;

			const brand = await BrandPage.findById(id).lean();
			if (!brand) {
				throw new HttpError('Brand not found', 404);
			}

			const children = await BrandPage.find({
				parentBrandId: brand._id,
			})
				.select('brandName slug displayName isActive')
				.sort({ brandName: 1 })
				.lean();

			// Get product counts for each child brand
			const childBrandNames = children.map((c) => c.brandName);
			const productCounts = await Product.aggregate([
				{
					$match: {
						brand: { $in: childBrandNames },
						archived: { $ne: true },
					},
				},
				{
					$group: {
						_id: { $toLower: '$brand' },
						count: { $sum: 1 },
					},
				},
			]);

			// Create a map for quick lookup (normalized brand name -> count)
			const countMap = new Map<string, number>();
			for (const pc of productCounts) {
				countMap.set(pc._id, pc.count);
			}

			res.json({
				parentBrand: {
					id: brand._id.toString(),
					brandName: brand.brandName,
					displayName: brand.displayName,
				},
				children: children.map((c) => ({
					id: c._id.toString(),
					brandName: c.brandName,
					slug: c.slug,
					displayName: c.displayName,
					isActive: c.isActive,
					productCount: countMap.get(c.brandName.toLowerCase()) || 0,
				})),
			});
		} catch (error) {
			next(error);
		}
	}
);

// ============================================
// BRAND CONTENT EDIT REVIEW
// ============================================

/**
 * GET /api/admin/brand-content-edits
 * Get all pending brand content edits for review
 */
router.get(
	'/brand-content-edits',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = parseInt(req.query.page as string) || 1;
			const pageSize = parseInt(req.query.pageSize as string) || 20;
			const status = (req.query.status as string) || 'pending';

			const skip = (page - 1) * pageSize;

			const query: Record<string, any> = {};
			if (status !== 'all') {
				query.status = status;
			}

			const [edits, total] = await Promise.all([
				BrandContentEdit.find(query)
					.populate('userId', 'email displayName')
					.populate('reviewedBy', 'email displayName')
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(pageSize)
					.lean(),
				BrandContentEdit.countDocuments(query),
			]);

			const items = edits.map((edit) => ({
				id: edit._id.toString(),
				brandPageId: edit.brandPageId?.toString(),
				brandName: edit.brandName,
				brandSlug: edit.brandSlug,
				field: edit.field,
				originalValue: edit.originalValue,
				suggestedValue: edit.suggestedValue,
				reason: edit.reason,
				status: edit.status,
				trustedContribution: edit.trustedContribution,
				autoApplied: edit.autoApplied,
				submittedBy: edit.userId
					? {
							id: (edit.userId as any)._id?.toString(),
							email: (edit.userId as any).email,
							displayName: (edit.userId as any).displayName,
					  }
					: null,
				reviewedBy: edit.reviewedBy
					? {
							id: (edit.reviewedBy as any)._id?.toString(),
							email: (edit.reviewedBy as any).email,
							displayName: (edit.reviewedBy as any).displayName,
					  }
					: null,
				reviewedAt: edit.reviewedAt,
				reviewNote: edit.reviewNote,
				createdAt: edit.createdAt,
			}));

			res.json({
				items,
				total,
				page,
				pageSize,
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/brand-content-edits/:id/approve
 * Approve a brand content edit and apply it
 */
router.post(
	'/brand-content-edits/:id/approve',
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { reviewNote } = req.body;
			const adminId = req.user?.userId;

			const edit = await BrandContentEdit.findById(id);
			if (!edit) {
				throw new HttpError('Content edit not found', 404);
			}

			if (edit.status !== 'pending') {
				throw new HttpError('This edit has already been reviewed', 400);
			}

			// Apply the edit
			const updateData: Record<string, any> = {};
			updateData[edit.field] = edit.suggestedValue;
			updateData.updatedBy = adminId
				? new mongoose.Types.ObjectId(adminId)
				: undefined;

			if (edit.brandPageId) {
				await BrandPage.findByIdAndUpdate(edit.brandPageId, updateData);
			}

			// Update the edit status
			edit.status = 'approved';
			edit.reviewedBy = adminId
				? new mongoose.Types.ObjectId(adminId)
				: undefined;
			edit.reviewedAt = new Date();
			if (reviewNote) {
				edit.reviewNote = reviewNote;
			}
			await edit.save();

			res.json({
				message: 'Edit approved and applied',
				edit: {
					id: edit._id.toString(),
					field: edit.field,
					status: edit.status,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/admin/brand-content-edits/:id/reject
 * Reject a brand content edit
 */
router.post(
	'/brand-content-edits/:id/reject',
	async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { reviewNote } = req.body;
			const adminId = req.user?.userId;

			const edit = await BrandContentEdit.findById(id);
			if (!edit) {
				throw new HttpError('Content edit not found', 404);
			}

			if (edit.status !== 'pending') {
				throw new HttpError('This edit has already been reviewed', 400);
			}

			// If it was auto-applied, we need to revert the change
			if (
				edit.autoApplied &&
				edit.trustedContribution &&
				edit.brandPageId
			) {
				const revertData: Record<string, string> = {};
				revertData[edit.field] = edit.originalValue;
				await BrandPage.findByIdAndUpdate(edit.brandPageId, revertData);
			}

			// Update the edit status
			edit.status = 'rejected';
			edit.reviewedBy = adminId
				? new mongoose.Types.ObjectId(adminId)
				: undefined;
			edit.reviewedAt = new Date();
			if (reviewNote) {
				edit.reviewNote = reviewNote;
			}
			await edit.save();

			res.json({
				message: 'Edit rejected',
				edit: {
					id: edit._id.toString(),
					field: edit.field,
					status: edit.status,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

export default router;
