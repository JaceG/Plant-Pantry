import mongoose from 'mongoose';
import {
	Product,
	UserProduct,
	Store,
	User,
	Availability,
	ArchivedFilter,
	FilterDisplayName,
	FilterType,
} from '../models';
import { StoreModerationStatus } from '../models/Store';

export interface DashboardStats {
	products: {
		total: number;
		apiSourced: number;
		userContributed: number;
		pendingApproval: number;
		trustedPendingReview: number; // Trusted contributor content pending review
	};
	stores: {
		total: number;
		physical: number;
		online: number;
		brandDirect: number;
		pendingApproval: number;
		trustedPendingReview: number; // Trusted contributor content pending review
	};
	users: {
		total: number;
		admins: number;
		moderators: number;
		regularUsers: number;
		trustedContributors: number;
	};
	availability: {
		total: number;
		userContributed: number;
		pendingApproval: number;
		trustedPendingReview: number; // Trusted contributor content pending review
	};
	reviews: {
		pendingApproval: number;
	};
	recentActivity: {
		newProductsThisWeek: number;
		newUsersThisWeek: number;
		newStoresThisWeek: number;
	};
}

export interface PendingProduct {
	id: string;
	name: string;
	brand: string;
	description?: string;
	sizeOrVariant?: string;
	categories: string[];
	tags?: string[];
	imageUrl?: string;
	userId: string;
	userEmail?: string;
	createdAt: Date;
	// For edit suggestions - reference to the original product being edited
	sourceProductId?: string;
	isEditSuggestion: boolean;
	originalProduct?: {
		id: string;
		name: string;
		brand: string;
		description?: string;
		sizeOrVariant?: string;
		categories: string[];
		tags?: string[];
		imageUrl?: string;
	};
}

export interface AdminUser {
	id: string;
	email: string;
	displayName: string;
	role: string;
	trustedContributor: boolean;
	trustedAt?: Date;
	createdAt: Date;
	lastLogin?: Date;
	productsContributed: number;
}

export const adminService = {
	/**
	 * Get dashboard statistics
	 */
	async getDashboardStats(): Promise<DashboardStats> {
		const oneWeekAgo = new Date();
		oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

		// Import Review model for pending reviews count
		const { Review } = await import('../models');

		// Run all queries in parallel
		const [
			apiProductsCount,
			userProductsCount,
			pendingProductsCount,
			physicalStoresCount,
			onlineStoresCount,
			brandDirectStoresCount,
			pendingStoresCount,
			adminsCount,
			moderatorsCount,
			totalUsersCount,
			trustedContributorsCount,
			totalAvailabilityCount,
			userContributedAvailabilityCount,
			pendingAvailabilityCount,
			pendingReviewsCount,
			newProductsThisWeek,
			newUsersThisWeek,
			newStoresThisWeek,
			// Trusted contributor pending review counts
			trustedProductsPendingReview,
			trustedStoresPendingReview,
			trustedAvailabilityPendingReview,
		] = await Promise.all([
			Product.countDocuments(),
			UserProduct.countDocuments({ status: 'approved' }),
			UserProduct.countDocuments({
				status: 'pending',
				trustedContribution: { $ne: true },
			}), // Regular pending
			Store.countDocuments({
				type: 'brick_and_mortar',
				moderationStatus: { $ne: 'rejected' },
			}),
			Store.countDocuments({
				type: 'online_retailer',
				moderationStatus: { $ne: 'rejected' },
			}),
			Store.countDocuments({
				type: 'brand_direct',
				moderationStatus: { $ne: 'rejected' },
			}),
			Store.countDocuments({
				moderationStatus: 'pending',
				trustedContribution: { $ne: true },
			}), // Regular pending
			User.countDocuments({ role: 'admin' }),
			User.countDocuments({ role: 'moderator' }),
			User.countDocuments(),
			User.countDocuments({ trustedContributor: true }),
			Availability.countDocuments(),
			Availability.countDocuments({ source: 'user_contribution' }),
			Availability.countDocuments({
				moderationStatus: 'pending',
				trustedContribution: { $ne: true },
			}), // Regular pending
			Review.countDocuments({ status: 'pending' }),
			UserProduct.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
			User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
			Store.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
			// Trusted contributor pending review counts
			UserProduct.countDocuments({
				needsReview: true,
				trustedContribution: true,
			}),
			Store.countDocuments({
				needsReview: true,
				trustedContribution: true,
			}),
			Availability.countDocuments({
				needsReview: true,
				trustedContribution: true,
			}),
		]);

		return {
			products: {
				total: apiProductsCount + userProductsCount,
				apiSourced: apiProductsCount,
				userContributed: userProductsCount,
				pendingApproval: pendingProductsCount,
				trustedPendingReview: trustedProductsPendingReview,
			},
			stores: {
				total:
					physicalStoresCount +
					onlineStoresCount +
					brandDirectStoresCount,
				physical: physicalStoresCount,
				online: onlineStoresCount,
				brandDirect: brandDirectStoresCount,
				pendingApproval: pendingStoresCount,
				trustedPendingReview: trustedStoresPendingReview,
			},
			users: {
				total: totalUsersCount,
				admins: adminsCount,
				moderators: moderatorsCount,
				regularUsers: totalUsersCount - adminsCount - moderatorsCount,
				trustedContributors: trustedContributorsCount,
			},
			availability: {
				total: totalAvailabilityCount,
				userContributed: userContributedAvailabilityCount,
				pendingApproval: pendingAvailabilityCount,
				trustedPendingReview: trustedAvailabilityPendingReview,
			},
			reviews: {
				pendingApproval: pendingReviewsCount,
			},
			recentActivity: {
				newProductsThisWeek,
				newUsersThisWeek,
				newStoresThisWeek,
			},
		};
	},

	/**
	 * Get pending products for moderation
	 */
	async getPendingProducts(
		page: number = 1,
		pageSize: number = 20
	): Promise<{
		items: PendingProduct[];
		total: number;
		page: number;
		pageSize: number;
	}> {
		const skip = (page - 1) * pageSize;

		const [products, total] = await Promise.all([
			UserProduct.find({ status: 'pending' })
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(pageSize)
				.lean(),
			UserProduct.countDocuments({ status: 'pending' }),
		]);

		// Get user emails for the products
		const userIds = [...new Set(products.map((p) => p.userId.toString()))];
		const users = await User.find({ _id: { $in: userIds } })
			.select('_id email')
			.lean();
		const userMap = new Map(users.map((u) => [u._id.toString(), u.email]));

		// Get original products for edit suggestions
		const sourceProductIds = products
			.filter((p) => p.sourceProductId)
			.map((p) => p.sourceProductId);

		// Fetch from both API products and user products
		const [apiProducts, userProducts] = await Promise.all([
			sourceProductIds.length > 0
				? Product.find({ _id: { $in: sourceProductIds } })
						.select(
							'_id name brand description sizeOrVariant categories tags imageUrl'
						)
						.lean()
				: Promise.resolve([]),
			sourceProductIds.length > 0
				? UserProduct.find({
						_id: { $in: sourceProductIds },
						status: 'approved',
				  })
						.select(
							'_id name brand description sizeOrVariant categories tags imageUrl'
						)
						.lean()
				: Promise.resolve([]),
		]);

		// Create a map of original products
		const originalProductMap = new Map<
			string,
			{
				id: string;
				name: string;
				brand: string;
				description?: string;
				sizeOrVariant?: string;
				categories: string[];
				tags?: string[];
				imageUrl?: string;
			}
		>();

		[...apiProducts, ...userProducts].forEach((p) => {
			originalProductMap.set(p._id.toString(), {
				id: p._id.toString(),
				name: p.name,
				brand: p.brand,
				description: p.description,
				sizeOrVariant: p.sizeOrVariant,
				categories: p.categories || [],
				tags: p.tags,
				imageUrl: p.imageUrl,
			});
		});

		const items: PendingProduct[] = products.map((p) => {
			const sourceId = p.sourceProductId?.toString();
			const originalProduct = sourceId
				? originalProductMap.get(sourceId)
				: undefined;

			return {
				id: p._id.toString(),
				name: p.name,
				brand: p.brand,
				description: p.description,
				sizeOrVariant: p.sizeOrVariant,
				categories: p.categories,
				tags: p.tags,
				imageUrl: p.imageUrl,
				userId: p.userId.toString(),
				userEmail: userMap.get(p.userId.toString()),
				createdAt: p.createdAt,
				sourceProductId: sourceId,
				isEditSuggestion: !!sourceId,
				originalProduct,
			};
		});

		return { items, total, page, pageSize };
	},

	/**
	 * Approve a pending product
	 * For edit suggestions (products with sourceProductId), this applies the changes
	 */
	async approveProduct(productId: string): Promise<boolean> {
		// First, get the pending product to check if it's an edit suggestion
		const pendingProduct = await UserProduct.findById(productId).lean();
		if (!pendingProduct) {
			return false;
		}

		// Check if this is an edit suggestion (has sourceProductId)
		if (pendingProduct.sourceProductId) {
			const sourceId = pendingProduct.sourceProductId.toString();

			// Check if the source is a UserProduct (user-contributed product)
			const sourceUserProduct = await UserProduct.findById(
				sourceId
			).lean();

			if (sourceUserProduct) {
				// Source is a user product - apply changes to the original
				// Use $set to explicitly set all fields, including empty values
				// This ensures deletions (field cleared to empty) are applied
				await UserProduct.findByIdAndUpdate(sourceId, {
					$set: {
						name: pendingProduct.name,
						brand: pendingProduct.brand,
						// Use empty string for optional text fields if undefined/null
						description: pendingProduct.description ?? '',
						sizeOrVariant: pendingProduct.sizeOrVariant ?? '',
						categories: pendingProduct.categories || [],
						tags: pendingProduct.tags || [],
						isStrictVegan: pendingProduct.isStrictVegan ?? true,
						imageUrl: pendingProduct.imageUrl ?? '',
						nutritionSummary: pendingProduct.nutritionSummary ?? '',
						ingredientSummary:
							pendingProduct.ingredientSummary ?? '',
						chainAvailabilities:
							pendingProduct.chainAvailabilities || [],
						updatedAt: new Date(),
					},
				});

				// Delete the suggestion since changes are applied to original
				await UserProduct.findByIdAndDelete(productId);
				return true;
			} else {
				// Source is an API product - approve the edit as an override
				// The system will use this UserProduct instead of the API product
				// Make sure sourceProductId is stored as ObjectId for proper lookup
				await UserProduct.findByIdAndUpdate(productId, {
					status: 'approved',
					sourceProductId: new mongoose.Types.ObjectId(sourceId),
				});
				return true;
			}
		} else {
			// Not an edit suggestion - just approve the new product
			const result = await UserProduct.findByIdAndUpdate(
				productId,
				{ status: 'approved' },
				{ new: true }
			);
			return !!result;
		}
	},

	/**
	 * Reject a pending product
	 */
	async rejectProduct(productId: string, reason?: string): Promise<boolean> {
		const result = await UserProduct.findByIdAndUpdate(
			productId,
			{
				status: 'rejected',
				rejectionReason: reason,
				rejectedAt: new Date(),
			},
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Get all users for admin management
	 */
	async getUsers(
		page: number = 1,
		pageSize: number = 20
	): Promise<{
		items: AdminUser[];
		total: number;
		page: number;
		pageSize: number;
	}> {
		const skip = (page - 1) * pageSize;

		const [users, total] = await Promise.all([
			User.find()
				.select(
					'email displayName role trustedContributor trustedAt createdAt lastLogin'
				)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(pageSize)
				.lean(),
			User.countDocuments(),
		]);

		// Get product counts for each user
		const userIds = users.map((u) => u._id);
		const productCounts = await UserProduct.aggregate([
			{ $match: { userId: { $in: userIds } } },
			{ $group: { _id: '$userId', count: { $sum: 1 } } },
		]);
		const countMap = new Map(
			productCounts.map((pc) => [pc._id.toString(), pc.count])
		);

		const items: AdminUser[] = users.map((u) => ({
			id: u._id.toString(),
			email: u.email,
			displayName: u.displayName,
			role: u.role,
			trustedContributor: u.trustedContributor || false,
			trustedAt: u.trustedAt,
			createdAt: u.createdAt,
			lastLogin: u.lastLogin,
			productsContributed: countMap.get(u._id.toString()) || 0,
		}));

		return { items, total, page, pageSize };
	},

	/**
	 * Update user role
	 */
	async updateUserRole(
		userId: string,
		role: 'user' | 'admin' | 'moderator'
	): Promise<boolean> {
		const result = await User.findByIdAndUpdate(
			userId,
			{ role },
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Get all stores for admin management
	 */
	async getStores(
		page: number = 1,
		pageSize: number = 20,
		type?: string
	): Promise<{
		items: any[];
		total: number;
		page: number;
		pageSize: number;
	}> {
		const skip = (page - 1) * pageSize;
		const query: Record<string, any> = {};
		if (type) {
			query.type = type;
		}

		const [stores, total] = await Promise.all([
			Store.find(query)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(pageSize)
				.lean(),
			Store.countDocuments(query),
		]);

		const items = stores.map((s) => ({
			id: s._id.toString(),
			name: s.name,
			type: s.type,
			regionOrScope: s.regionOrScope,
			address: s.address,
			city: s.city,
			state: s.state,
			websiteUrl: s.websiteUrl,
			createdAt: s.createdAt,
		}));

		return { items, total, page, pageSize };
	},

	/**
	 * Delete a store
	 */
	async deleteStore(storeId: string): Promise<boolean> {
		const result = await Store.findByIdAndDelete(storeId);
		if (result) {
			// Also delete related availability entries
			await Availability.deleteMany({ storeId });
		}
		return !!result;
	},

	/**
	 * Get pending stores for moderation
	 */
	async getPendingStores(
		page: number = 1,
		pageSize: number = 20
	): Promise<{
		items: any[];
		total: number;
		page: number;
		pageSize: number;
	}> {
		const skip = (page - 1) * pageSize;

		const [stores, total] = await Promise.all([
			Store.find({ moderationStatus: 'pending' })
				.populate('createdBy', 'email displayName')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(pageSize)
				.lean(),
			Store.countDocuments({ moderationStatus: 'pending' }),
		]);

		const items = stores.map((s) => ({
			id: s._id.toString(),
			name: s.name,
			type: s.type,
			regionOrScope: s.regionOrScope,
			address: s.address,
			city: s.city,
			state: s.state,
			zipCode: s.zipCode,
			websiteUrl: s.websiteUrl,
			phoneNumber: s.phoneNumber,
			googlePlaceId: s.googlePlaceId,
			moderationStatus: s.moderationStatus,
			createdBy: s.createdBy
				? {
						id: (s.createdBy as any)._id?.toString(),
						email: (s.createdBy as any).email,
						displayName: (s.createdBy as any).displayName,
				  }
				: null,
			createdAt: s.createdAt,
		}));

		return { items, total, page, pageSize };
	},

	/**
	 * Approve a pending store
	 */
	async approveStore(storeId: string, adminId: string): Promise<boolean> {
		const result = await Store.findByIdAndUpdate(
			storeId,
			{
				moderationStatus: 'confirmed',
				moderatedBy: new mongoose.Types.ObjectId(adminId),
				moderatedAt: new Date(),
			},
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Reject a pending store
	 */
	async rejectStore(storeId: string, adminId: string): Promise<boolean> {
		const result = await Store.findByIdAndUpdate(
			storeId,
			{
				moderationStatus: 'rejected',
				moderatedBy: new mongoose.Types.ObjectId(adminId),
				moderatedAt: new Date(),
			},
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Set user trusted contributor status
	 */
	async setUserTrustedStatus(
		userId: string,
		trusted: boolean,
		adminId: string
	): Promise<boolean> {
		const updateData: any = {
			trustedContributor: trusted,
		};

		if (trusted) {
			updateData.trustedAt = new Date();
			updateData.trustedBy = new mongoose.Types.ObjectId(adminId);
		} else {
			updateData.$unset = { trustedAt: '', trustedBy: '' };
		}

		const result = await User.findByIdAndUpdate(
			userId,
			trusted
				? updateData
				: {
						trustedContributor: false,
						$unset: { trustedAt: '', trustedBy: '' },
				  },
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Get trusted contributor products pending review
	 */
	async getTrustedProductsPendingReview(
		page: number = 1,
		pageSize: number = 20
	): Promise<{
		items: PendingProduct[];
		total: number;
		page: number;
		pageSize: number;
	}> {
		const skip = (page - 1) * pageSize;

		const [products, total] = await Promise.all([
			UserProduct.find({ needsReview: true, trustedContribution: true })
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(pageSize)
				.populate('userId', 'email displayName')
				.lean(),
			UserProduct.countDocuments({
				needsReview: true,
				trustedContribution: true,
			}),
		]);

		return {
			items: products.map((p: any) => ({
				id: p._id.toString(),
				name: p.name,
				brand: p.brand,
				categories: p.categories || [],
				imageUrl: p.imageUrl,
				userId: p.userId?._id?.toString() || '',
				userEmail: p.userId?.email || 'Unknown',
				createdAt: p.createdAt,
			})),
			total,
			page,
			pageSize,
		};
	},

	/**
	 * Get trusted contributor stores pending review
	 */
	async getTrustedStoresPendingReview(
		page: number = 1,
		pageSize: number = 20
	): Promise<{
		items: any[];
		total: number;
		page: number;
		pageSize: number;
	}> {
		const skip = (page - 1) * pageSize;

		const [stores, total] = await Promise.all([
			Store.find({ needsReview: true, trustedContribution: true })
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(pageSize)
				.populate('createdBy', 'email displayName')
				.lean(),
			Store.countDocuments({
				needsReview: true,
				trustedContribution: true,
			}),
		]);

		return {
			items: stores.map((s: any) => ({
				id: s._id.toString(),
				name: s.name,
				type: s.type,
				regionOrScope: s.regionOrScope,
				address: s.address,
				city: s.city,
				state: s.state,
				zipCode: s.zipCode,
				websiteUrl: s.websiteUrl,
				phoneNumber: s.phoneNumber,
				googlePlaceId: s.googlePlaceId,
				moderationStatus: s.moderationStatus,
				createdBy: s.createdBy
					? {
							id: (s.createdBy as any)._id?.toString(),
							email: (s.createdBy as any).email,
							displayName: (s.createdBy as any).displayName,
					  }
					: null,
				createdAt: s.createdAt,
			})),
			total,
			page,
			pageSize,
		};
	},

	/**
	 * Mark a product as reviewed (clear needsReview flag)
	 */
	async markProductReviewed(
		productId: string,
		adminId: string
	): Promise<boolean> {
		const result = await UserProduct.findByIdAndUpdate(
			productId,
			{
				needsReview: false,
				reviewedBy: new mongoose.Types.ObjectId(adminId),
				reviewedAt: new Date(),
			},
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Mark a store as reviewed (clear needsReview flag)
	 */
	async markStoreReviewed(
		storeId: string,
		adminId: string
	): Promise<boolean> {
		const result = await Store.findByIdAndUpdate(
			storeId,
			{
				needsReview: false,
				reviewedBy: new mongoose.Types.ObjectId(adminId),
				reviewedAt: new Date(),
			},
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Mark an availability report as reviewed (clear needsReview flag)
	 */
	async markAvailabilityReviewed(
		availabilityId: string,
		adminId: string
	): Promise<boolean> {
		const result = await Availability.findByIdAndUpdate(
			availabilityId,
			{
				needsReview: false,
				reviewedBy: new mongoose.Types.ObjectId(adminId),
				reviewedAt: new Date(),
			},
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Reject trusted contributor content (change status and clear needsReview)
	 */
	async rejectTrustedProduct(
		productId: string,
		adminId: string
	): Promise<boolean> {
		const result = await UserProduct.findByIdAndUpdate(
			productId,
			{
				status: 'rejected',
				needsReview: false,
				reviewedBy: new mongoose.Types.ObjectId(adminId),
				reviewedAt: new Date(),
			},
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Reject trusted contributor store (change status and clear needsReview)
	 */
	async rejectTrustedStore(
		storeId: string,
		adminId: string
	): Promise<boolean> {
		const result = await Store.findByIdAndUpdate(
			storeId,
			{
				moderationStatus: 'rejected',
				needsReview: false,
				reviewedBy: new mongoose.Types.ObjectId(adminId),
				reviewedAt: new Date(),
			},
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Reject trusted contributor availability (change status and clear needsReview)
	 */
	async rejectTrustedAvailability(
		availabilityId: string,
		adminId: string
	): Promise<boolean> {
		const result = await Availability.findByIdAndUpdate(
			availabilityId,
			{
				moderationStatus: 'rejected',
				needsReview: false,
				reviewedBy: new mongoose.Types.ObjectId(adminId),
				reviewedAt: new Date(),
			},
			{ new: true }
		);
		return !!result;
	},

	/**
	 * Archive a product (API or UserProduct)
	 */
	async archiveProduct(
		productId: string,
		archivedBy: string
	): Promise<boolean> {
		const productIdObj = new mongoose.Types.ObjectId(productId);
		const archivedById = new mongoose.Types.ObjectId(archivedBy);

		// Try to archive in UserProduct first (user-contributed or edited products)
		let result = await UserProduct.findByIdAndUpdate(
			productIdObj,
			{
				archived: true,
				archivedAt: new Date(),
				archivedBy: archivedById,
			},
			{ new: true }
		);

		// If not found in UserProduct, try Product (API-sourced)
		if (!result) {
			result = await Product.findByIdAndUpdate(
				productIdObj,
				{
					archived: true,
					archivedAt: new Date(),
					archivedBy: archivedById,
				},
				{ new: true }
			);
		}

		return !!result;
	},

	/**
	 * Unarchive a product (API or UserProduct)
	 */
	async unarchiveProduct(productId: string): Promise<boolean> {
		const productIdObj = new mongoose.Types.ObjectId(productId);

		// Try to unarchive in UserProduct first
		let result = await UserProduct.findByIdAndUpdate(
			productIdObj,
			{
				$set: { archived: false },
				$unset: { archivedAt: '', archivedBy: '' },
			},
			{ new: true }
		);

		// If not found in UserProduct, try Product
		if (!result) {
			result = await Product.findByIdAndUpdate(
				productIdObj,
				{
					$set: { archived: false },
					$unset: { archivedAt: '', archivedBy: '' },
				},
				{ new: true }
			);
		}

		return !!result;
	},

	/**
	 * Get archived products only
	 */
	async getArchivedProducts(
		page: number = 1,
		pageSize: number = 20
	): Promise<{
		items: any[];
		total: number;
		page: number;
		pageSize: number;
	}> {
		const skip = (page - 1) * pageSize;

		const [apiProducts, userProducts, apiCount, userCount] =
			await Promise.all([
				Product.find({ archived: true })
					.select(
						'name brand sizeOrVariant imageUrl categories tags archived archivedAt'
					)
					.sort({ archivedAt: -1 })
					.skip(skip)
					.limit(pageSize)
					.lean(),
				UserProduct.find({ archived: true, status: 'approved' })
					.select(
						'name brand sizeOrVariant imageUrl categories tags archived archivedAt'
					)
					.sort({ archivedAt: -1 })
					.skip(skip)
					.limit(pageSize)
					.lean(),
				Product.countDocuments({ archived: true }),
				UserProduct.countDocuments({
					archived: true,
					status: 'approved',
				}),
			]);

		// Combine products
		const allProducts = [
			...apiProducts.map((p) => ({
				id: p._id.toString(),
				name: p.name,
				brand: p.brand,
				sizeOrVariant: p.sizeOrVariant,
				imageUrl: p.imageUrl,
				categories: p.categories || [],
				tags: p.tags || [],
				archived: true,
				archivedAt: p.archivedAt,
				source: 'api' as const,
			})),
			...userProducts.map((p) => ({
				id: p._id.toString(),
				name: p.name,
				brand: p.brand,
				sizeOrVariant: p.sizeOrVariant,
				imageUrl: p.imageUrl,
				categories: p.categories || [],
				tags: p.tags || [],
				archived: true,
				archivedAt: p.archivedAt,
				source: 'user_contribution' as const,
			})),
		].sort((a, b) => {
			// Sort by archived date, most recent first
			return (
				(b.archivedAt?.getTime() || 0) - (a.archivedAt?.getTime() || 0)
			);
		});

		return {
			items: allProducts,
			total: apiCount + userCount,
			page,
			pageSize,
		};
	},

	/**
	 * Get user-generated products only
	 */
	async getUserGeneratedProducts(
		page: number = 1,
		pageSize: number = 20
	): Promise<{
		items: any[];
		total: number;
		page: number;
		pageSize: number;
	}> {
		const skip = (page - 1) * pageSize;

		const [userProducts, userCount] = await Promise.all([
			UserProduct.find({
				status: 'approved',
				archived: { $ne: true }, // Exclude archived
			})
				.select(
					'name brand sizeOrVariant imageUrl categories tags archived archivedAt userId createdAt'
				)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(pageSize)
				.lean(),
			UserProduct.countDocuments({
				status: 'approved',
				archived: { $ne: true },
			}),
		]);

		// Get user emails for the products
		const userIds = [
			...new Set(userProducts.map((p) => p.userId.toString())),
		];
		const users = await User.find({ _id: { $in: userIds } })
			.select('_id email displayName')
			.lean();
		const userMap = new Map(users.map((u) => [u._id.toString(), u]));

		const items = userProducts.map((p) => {
			const user = userMap.get(p.userId.toString());
			return {
				id: p._id.toString(),
				name: p.name,
				brand: p.brand,
				sizeOrVariant: p.sizeOrVariant,
				imageUrl: p.imageUrl,
				categories: p.categories || [],
				tags: p.tags || [],
				archived: p.archived || false,
				archivedAt: p.archivedAt,
				source: 'user_contribution' as const,
				userId: p.userId.toString(),
				userEmail: user?.email,
				userDisplayName: user?.displayName,
				createdAt: p.createdAt,
			};
		});

		return {
			items,
			total: userCount,
			page,
			pageSize,
		};
	},

	/**
	 * Get all filters (categories and tags) for admin management
	 */
	async getAllFilters(
		type: FilterType,
		page: number = 1,
		pageSize: number = 50
	): Promise<{
		items: Array<{
			value: string;
			displayName?: string;
			archived: boolean;
			archivedAt?: Date;
		}>;
		total: number;
		page: number;
		pageSize: number;
	}> {
		const skip = (page - 1) * pageSize;

		// System tags that are hardcoded in the frontend UI and should always be manageable
		const SYSTEM_TAGS = [
			'organic',
			'gluten-free',
			'no-sugar-added',
			'fair-trade',
			'palm-oil-free',
			'raw',
			'vegan',
		];

		// Get all unique filter values from both Product and UserProduct collections
		const field = type === 'category' ? 'categories' : 'tags';
		const [productFilters, userProductFilters] = await Promise.all([
			Product.distinct(field, { archived: { $ne: true } }),
			UserProduct.distinct(field, { archived: { $ne: true } }),
		]);

		// Combine filters from both collections, plus system tags for tags type
		const baseFilters = [...productFilters, ...userProductFilters];
		const allFilters =
			type === 'tag'
				? [...new Set([...baseFilters, ...SYSTEM_TAGS])]
				: [...new Set(baseFilters)];

		// Get archived filters and display names
		const [archivedFilters, displayNames] = await Promise.all([
			ArchivedFilter.find({ type }).select('value archivedAt').lean(),
			FilterDisplayName.find({ type }).select('value displayName').lean(),
		]);

		// Normalize archived filter values for comparison (remove en: prefix, replace dashes with spaces)
		const normalizedArchivedFilters = archivedFilters.map((f) => ({
			original: f.value,
			normalized: f.value.replace(/^en:/, '').replace(/-/g, ' '),
			archivedAt: f.archivedAt,
		}));

		// Create sets/maps with both original and normalized values for lookup
		const archivedSet = new Set<string>();
		const archivedMap = new Map<string, Date>();
		normalizedArchivedFilters.forEach((f) => {
			archivedSet.add(f.original);
			archivedSet.add(f.normalized);
			archivedMap.set(f.original, f.archivedAt);
			archivedMap.set(f.normalized, f.archivedAt);
		});
		const displayNameMap = new Map<string, string>();
		displayNames.forEach((dn) => {
			const cleaned = dn.value.replace(/^en:/, '').replace(/-/g, ' ');
			displayNameMap.set(cleaned, dn.displayName);
			displayNameMap.set(dn.value.replace(/^en:/, ''), dn.displayName);
		});

		// Language prefixes to filter out (non-English)
		const nonEnglishPrefixes = /^(de|el|es|fr|nl|pt|zh):/i;

		// Filter out non-English language prefixes
		let uniqueFilters = [...new Set(allFilters)];
		uniqueFilters = uniqueFilters.filter(
			(f) => !nonEnglishPrefixes.test(f)
		);

		// Also include archived filters that might not be in products anymore
		archivedFilters.forEach((archived) => {
			const cleaned = archived.value
				.replace(/^en:/, '')
				.replace(/-/g, ' ');
			if (
				!nonEnglishPrefixes.test(archived.value) &&
				!uniqueFilters.includes(cleaned)
			) {
				uniqueFilters.push(cleaned);
			}
		});

		// Combine and deduplicate, then clean "en:" prefix and dashes
		uniqueFilters = uniqueFilters.map((f) => {
			// If f already has spaces, it's already cleaned; otherwise clean it
			if (typeof f === 'string' && !f.includes(' ')) {
				return f.replace(/^en:/, '').replace(/-/g, ' ');
			}
			return f;
		});
		uniqueFilters = [...new Set(uniqueFilters)];

		// Create items with archived status and display names
		const items = uniqueFilters
			.map((value) => {
				const originalValue = value; // This is the cleaned value
				const displayName = displayNameMap.get(value);
				// Check if archived (value is already normalized, so we can check directly)
				const isArchived = archivedSet.has(value);
				const archivedAt = archivedMap.get(value);

				return {
					value: originalValue,
					displayName,
					archived: isArchived,
					archivedAt: archivedAt
						? archivedAt instanceof Date
							? archivedAt
							: new Date(archivedAt)
						: undefined,
				};
			})
			.sort((a, b) => {
				// Sort archived items to the bottom
				if (a.archived && !b.archived) return 1;
				if (!a.archived && b.archived) return -1;
				const aName = a.displayName || a.value;
				const bName = b.displayName || b.value;
				return aName.localeCompare(bName);
			});

		const total = items.length;
		const paginatedItems = items.slice(skip, skip + pageSize);

		return {
			items: paginatedItems,
			total,
			page,
			pageSize,
		};
	},

	/**
	 * Archive a filter (category or tag)
	 * Stores the normalized value (spaces, no en: prefix) for consistent lookup
	 */
	async archiveFilter(
		type: FilterType,
		value: string,
		archivedBy: string
	): Promise<boolean> {
		const archivedById = new mongoose.Types.ObjectId(archivedBy);

		// Normalize the value (remove en: prefix, replace dashes with spaces)
		const normalizedValue = value.replace(/^en:/, '').replace(/-/g, ' ');

		// Also archive variations to catch all possible formats
		const valuesToArchive = [
			normalizedValue, // Normalized: "animal fat"
			normalizedValue.replace(/ /g, '-'), // With dashes: "animal-fat"
			`en:${normalizedValue.replace(/ /g, '-')}`, // With en: prefix: "en:animal-fat"
		];

		for (const val of valuesToArchive) {
			try {
				await ArchivedFilter.create({
					type,
					value: val,
					archivedBy: archivedById,
				});
			} catch (error: any) {
				// If already exists, that's fine - it's already archived
				if (error.code !== 11000) {
					throw error;
				}
			}
		}

		return true;
	},

	/**
	 * Unarchive a filter
	 * Unarchives both the cleaned value and the "en:" prefixed version
	 */
	async unarchiveFilter(type: FilterType, value: string): Promise<boolean> {
		// Unarchive both the cleaned value and the "en:" prefixed version
		// Also check for dash-separated versions
		const dashVersion = value.replace(/ /g, '-');
		const result = await ArchivedFilter.deleteMany({
			type,
			value: {
				$in: [value, `en:${value}`, dashVersion, `en:${dashVersion}`],
			},
		});
		return result.deletedCount > 0;
	},

	/**
	 * Set or update a filter display name
	 */
	async setFilterDisplayName(
		type: FilterType,
		value: string,
		displayName: string,
		updatedBy: string
	): Promise<boolean> {
		const updatedById = new mongoose.Types.ObjectId(updatedBy);

		// Normalize the value (remove en: prefix and replace dashes with spaces for storage)
		const normalizedValue = value.replace(/^en:/, '').replace(/-/g, ' ');

		await FilterDisplayName.findOneAndUpdate(
			{ type, value: normalizedValue },
			{
				type,
				value: normalizedValue,
				displayName: displayName.trim(),
				updatedBy: updatedById,
			},
			{ upsert: true, new: true }
		);

		return true;
	},

	/**
	 * Remove a filter display name (revert to default)
	 */
	async removeFilterDisplayName(
		type: FilterType,
		value: string
	): Promise<boolean> {
		const normalizedValue = value.replace(/^en:/, '').replace(/-/g, ' ');
		const result = await FilterDisplayName.deleteOne({
			type,
			value: normalizedValue,
		});
		return result.deletedCount > 0;
	},
};
