import mongoose from 'mongoose';
import {
	Product,
	IProduct,
	Availability,
	Store,
	UserProduct,
	ArchivedFilter,
	FilterDisplayName,
	Review,
} from '../models';
import { availabilityService } from './availabilityService';
// Temporarily comment out to test
// import { reviewService } from './reviewService';
let reviewService: any;
function getReviewService() {
	if (!reviewService) {
		reviewService = require('./reviewService').reviewService;
	}
	return reviewService;
}

export interface ProductFilters {
	q?: string;
	category?: string;
	tag?: string;
	minRating?: number;
	page?: number;
	pageSize?: number;
}

export interface ProductSummary {
	id: string;
	name: string;
	brand: string;
	sizeOrVariant: string;
	imageUrl?: string;
	categories: string[];
	tags: string[];
	averageRating?: number;
	reviewCount?: number;
}

export interface ProductListResult {
	items: ProductSummary[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface AvailabilityInfo {
	storeId: string;
	storeName: string;
	storeType: string;
	regionOrScope: string;
	status: string;
	priceRange?: string;
	lastConfirmedAt?: Date;
	source: string;
}

export interface ProductDetail {
	id: string;
	name: string;
	brand: string;
	description?: string;
	sizeOrVariant: string;
	categories: string[];
	tags: string[];
	isStrictVegan: boolean;
	imageUrl?: string;
	nutritionSummary?: string;
	ingredientSummary?: string;
	createdAt: Date;
	updatedAt: Date;
	availability: AvailabilityInfo[];
	averageRating?: number;
	reviewCount?: number;
	_source?: 'api' | 'user_contribution'; // Metadata to distinguish sources
	_userId?: string; // For user products
	_archived?: boolean; // For admin panel
	_archivedAt?: string; // For admin panel
}

export const productService = {
	async getProducts(filters: ProductFilters): Promise<ProductListResult> {
		try {
			const {
				q,
				category,
				tag,
				minRating,
				page = 1,
				pageSize = 20,
			} = filters;
			const skip = (page - 1) * pageSize;

			// Build query for both Product and UserProduct collections
			const query: Record<string, unknown> = {};

			if (q) {
				// Use regex for simple search (text index requires special handling)
				query.$or = [
					{ name: { $regex: q, $options: 'i' } },
					{ brand: { $regex: q, $options: 'i' } },
				];
			}

			if (category) {
				// Match against both display names and original database values
				// Normalize the incoming category (remove en: prefix, replace dashes with spaces)
				const normalizedCategory = category
					.replace(/^en:/, '')
					.replace(/-/g, ' ');

				// Get display name mappings to find original database values
				const displayNames = await FilterDisplayName.find({
					type: 'category',
				}).lean();
				const displayToDbValue = new Map<string, string>();
				displayNames.forEach((dn) => {
					const cleaned = dn.value
						.replace(/^en:/, '')
						.replace(/-/g, ' ');
					displayToDbValue.set(
						dn.displayName.toLowerCase(),
						dn.value
					);
					displayToDbValue.set(cleaned.toLowerCase(), dn.value);
				});

				// Find the database value(s) that match
				const dbValue = displayToDbValue.get(
					normalizedCategory.toLowerCase()
				);
				if (dbValue) {
					// Match against the original database value
					query.categories = dbValue;
				} else {
					// Try matching against normalized values in database
					// Use regex to match normalized category (with spaces) against database values (with dashes or spaces)
					const categoryRegex = new RegExp(
						`^en:?${normalizedCategory.replace(/ /g, '[- ]')}$`,
						'i'
					);
					query.categories = { $regex: categoryRegex };
				}
			}

			if (tag) {
				// Tags are stored in database as: 'organic', 'gluten-free', 'no-sugar-added', etc.
				// Frontend sends: 'organic', 'gluten-free', etc.
				// Remove en: prefix if present, but keep dashes (database uses dashes)
				const cleanTag = tag.replace(/^en:/, '').toLowerCase();

				// Check FilterDisplayName mapping first (for custom display names)
				const displayNames = await FilterDisplayName.find({
					type: 'tag',
				}).lean();
				const displayToDbValue = new Map<string, string>();
				displayNames.forEach((dn) => {
					const cleaned = dn.value.replace(/^en:/, '').toLowerCase();
					displayToDbValue.set(
						dn.displayName.toLowerCase(),
						dn.value
					);
					displayToDbValue.set(cleaned, dn.value);
				});

				// Check if we have a display name mapping
				const dbValue = displayToDbValue.get(cleanTag);
				if (dbValue) {
					// Use the mapped database value
					query.tags = dbValue;
				} else {
					// Direct match - tags are stored exactly as: 'organic', 'gluten-free', etc.
					// Match the tag directly (case-insensitive)
					query.tags = {
						$regex: new RegExp(
							`^${cleanTag.replace(
								/[.*+?^${}()|[\]\\]/g,
								'\\$&'
							)}$`,
							'i'
						),
					};
				}
			}

			// If minRating is provided, get product IDs that meet the rating requirement
			let productIdsWithRating: string[] = [];
			if (minRating && minRating >= 1 && minRating <= 5) {
				try {
					// Check if Review model is available
					if (!Review || typeof Review.find !== 'function') {
						console.warn(
							'Review model not available, returning empty results for minRating filter'
						);
						return {
							items: [],
							page,
							pageSize,
							totalCount: 0,
						};
					}

					// Get all approved reviews and calculate average ratings per product
					const reviews = await Review.find({
						status: 'approved',
					}).lean();

					// Calculate average rating per product
					const productRatings = new Map<
						string,
						{ total: number; count: number }
					>();
					reviews.forEach((review) => {
						const productId = review.productId.toString();
						const current = productRatings.get(productId) || {
							total: 0,
							count: 0,
						};
						productRatings.set(productId, {
							total: current.total + review.rating,
							count: current.count + 1,
						});
					});

					// Filter products that meet minRating requirement
					productIdsWithRating = Array.from(productRatings.entries())
						.filter(
							([_, stats]) =>
								stats.total / stats.count >= minRating
						)
						.map(([productId]) => productId);
				} catch (error: any) {
					// If Review collection doesn't exist or there's an error, treat as no products meet the rating
					console.warn(
						'Error fetching reviews for minRating filter (this is OK if Review collection is empty):',
						error?.message || error
					);
					console.warn('Error stack:', error?.stack);
					// Return empty results if minRating filter fails
					return {
						items: [],
						page,
						pageSize,
						totalCount: 0,
					};
				}
			}

			// Query both Product and UserProduct collections
			// Only include approved, non-archived user products
			// Exclude archived products from public listings
			const userProductQuery: any = {
				...query,
				status: 'approved', // Only show approved user products
				archived: { $ne: true }, // Exclude archived products
			};

			// Exclude archived API products
			// Simply use $ne: true which handles both cases: field doesn't exist OR field is false
			const apiProductQuery: any = {
				...query,
				archived: { $ne: true }, // This works for both missing field and false values
			};

			// If minRating filter is applied, only include products that meet the rating
			if (minRating && productIdsWithRating.length > 0) {
				const productObjectIds = productIdsWithRating.map(
					(id) => new mongoose.Types.ObjectId(id)
				);
				userProductQuery._id = { $in: productObjectIds };
				apiProductQuery._id = { $in: productObjectIds };
			} else if (minRating && productIdsWithRating.length === 0) {
				// No products meet the rating requirement
				return {
					items: [],
					page,
					pageSize,
					totalCount: 0,
				};
			}

			const [apiProducts, userProducts, apiCount, userCount] =
				await Promise.all([
					Product.find(apiProductQuery)
						.select(
							'name brand sizeOrVariant imageUrl categories tags'
						)
						.lean(),
					UserProduct.find(userProductQuery)
						.select(
							'name brand sizeOrVariant imageUrl categories tags'
						)
						.lean(),
					Product.countDocuments(apiProductQuery),
					UserProduct.countDocuments(userProductQuery),
				]);

			// Get all product IDs to fetch rating stats
			const allProductIds = [
				...apiProducts.map((p) => p._id.toString()),
				...userProducts.map((p) => p._id.toString()),
			];

			// Get rating stats for all products (with error handling)
			const ratingStatsMap = new Map<
				string,
				{ averageRating: number; reviewCount: number }
			>();

			if (allProductIds.length > 0) {
				try {
					// Check if Review model is available
					if (!Review || typeof Review.aggregate !== 'function') {
						console.warn(
							'Review model not available, skipping rating stats'
						);
					} else {
						// Use a single aggregation query to get all rating stats at once (more efficient)
						// Only query if we have valid ObjectIds
						const productObjectIds = allProductIds
							.filter((id) => mongoose.Types.ObjectId.isValid(id))
							.map((id) => new mongoose.Types.ObjectId(id));

						if (productObjectIds.length > 0) {
							const ratingAggregation = await Review.aggregate([
								{
									$match: {
										status: 'approved',
										productId: { $in: productObjectIds },
									},
								},
								{
									$group: {
										_id: '$productId',
										averageRating: { $avg: '$rating' },
										reviewCount: { $sum: 1 },
									},
								},
							]);

							ratingAggregation.forEach((agg: any) => {
								if (agg._id) {
									const productId = agg._id.toString();
									const avgRating =
										Math.round(agg.averageRating * 10) / 10;
									ratingStatsMap.set(productId, {
										averageRating: avgRating,
										reviewCount: agg.reviewCount,
									});
								}
							});
						}
					}
				} catch (error: any) {
					// If Review collection doesn't exist or there's an error, just continue without ratings
					console.warn(
						'Error fetching rating stats (this is OK if Review collection is empty):',
						error?.message || error
					);
					console.warn('Error stack:', error?.stack);
				}
			}

			// Combine and sort all products
			const allProducts = [
				...apiProducts.map((p) => {
					const id = p._id.toString();
					const stats = ratingStatsMap.get(id);
					return {
						id,
						name: p.name,
						brand: p.brand,
						sizeOrVariant: p.sizeOrVariant,
						imageUrl: p.imageUrl,
						categories: p.categories || [],
						tags: p.tags || [],
						averageRating: stats?.averageRating,
						reviewCount: stats?.reviewCount,
					};
				}),
				...userProducts.map((p) => {
					const id = p._id.toString();
					const stats = ratingStatsMap.get(id);
					return {
						id,
						name: p.name,
						brand: p.brand,
						sizeOrVariant: p.sizeOrVariant,
						imageUrl: p.imageUrl,
						categories: p.categories || [],
						tags: p.tags || [],
						averageRating: stats?.averageRating,
						reviewCount: stats?.reviewCount,
					};
				}),
			].sort((a, b) => a.name.localeCompare(b.name));

			// Apply pagination after sorting
			const totalCount = apiCount + userCount;
			const paginatedItems = allProducts.slice(skip, skip + pageSize);

			return {
				items: paginatedItems,
				page,
				pageSize,
				totalCount,
			};
		} catch (error) {
			console.error('Error in productService.getProducts:', error);
			throw error;
		}
	},

	async getProductById(
		id: string,
		options: { refreshAvailability?: boolean; allowArchived?: boolean } = {}
	): Promise<ProductDetail | null> {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return null;
		}

		const productId = new mongoose.Types.ObjectId(id);
		let product: any = null;
		let isUserProduct = false;

		// Build query conditions - allow archived if requested (for admins)
		const archivedCondition = options.allowArchived
			? {}
			: { archived: { $ne: true } };

		// First, check if there's an edited version (UserProduct with sourceProductId matching this ID)
		const editedProduct = await UserProduct.findOne({
			sourceProductId: productId,
			status: 'approved',
			...archivedCondition,
		}).lean();

		if (editedProduct) {
			// Return the edited version instead of the original
			product = editedProduct;
			isUserProduct = true;
		} else {
			// No edited version found, check Product collection (API-sourced)
			product = await Product.findOne({
				_id: productId,
				...archivedCondition,
			}).lean();

			// If not found in Product, try UserProduct by ID (user-contributed products)
			if (!product) {
				const userProduct = await UserProduct.findOne({
					_id: productId,
					...archivedCondition,
				}).lean();
				if (userProduct) {
					product = userProduct;
					isUserProduct = true;
				} else {
					return null;
				}
			}
		}

		// Get availability
		// For user products: fetch from database (user-contributed)
		// For API products: always fetch fresh from APIs (no caching)
		const storeAvailabilities =
			await availabilityService.getProductAvailability(
				product._id.toString(),
				{
					forceRefresh: options.refreshAvailability,
					isUserProduct: isUserProduct,
				}
			);

		// Get store details for all stores (only if we have availability)
		let stores: any[] = [];
		let storeMap = new Map<string, any>();

		if (storeAvailabilities.length > 0) {
			const storeIds = storeAvailabilities
				.map((a) => a.storeId)
				.filter((id) => id && mongoose.Types.ObjectId.isValid(id))
				.map((id) => new mongoose.Types.ObjectId(id));

			if (storeIds.length > 0) {
				stores = await Store.find({ _id: { $in: storeIds } }).lean();
				storeMap = new Map(stores.map((s) => [s._id.toString(), s]));
			}
		}

		// Convert to AvailabilityInfo format
		const availabilityInfo: AvailabilityInfo[] = storeAvailabilities.map(
			(avail) => {
				const store = storeMap.get(avail.storeId);
				return {
					storeId: avail.storeId,
					storeName:
						avail.storeName || store?.name || 'Unknown Store',
					storeType: store?.type || 'unknown',
					regionOrScope: store?.regionOrScope || 'Unknown',
					status: avail.available ? 'known' : 'unknown',
					priceRange: avail.priceRange,
					lastConfirmedAt: avail.lastUpdated,
					source: 'api_fetch', // Will be updated based on actual source
				};
			}
		);

		// Get rating stats for this product
		const ratingStats = await getReviewService().getProductRatingStats(
			product._id.toString()
		);

		return {
			id: product._id.toString(),
			name: product.name,
			brand: product.brand,
			description: product.description,
			sizeOrVariant: product.sizeOrVariant,
			categories: product.categories,
			tags: product.tags,
			isStrictVegan: product.isStrictVegan,
			imageUrl: product.imageUrl,
			nutritionSummary: product.nutritionSummary,
			ingredientSummary: product.ingredientSummary,
			createdAt: product.createdAt,
			updatedAt: product.updatedAt,
			availability: availabilityInfo,
			averageRating:
				ratingStats.totalCount > 0
					? ratingStats.averageRating
					: undefined,
			reviewCount:
				ratingStats.totalCount > 0 ? ratingStats.totalCount : undefined,
			_source: isUserProduct ? 'user_contribution' : 'api',
			_userId: isUserProduct
				? (product as any).userId?.toString()
				: undefined,
			_archived: product.archived || false,
			_archivedAt: product.archivedAt
				? product.archivedAt instanceof Date
					? product.archivedAt.toISOString()
					: product.archivedAt
				: undefined,
		};
	},

	/**
	 * Check if a category actually has products that match it
	 */
	async categoryHasProducts(category: string): Promise<boolean> {
		// Normalize the category (remove en: prefix, replace dashes with spaces)
		const normalizedCategory = category
			.replace(/^en:/, '')
			.replace(/-/g, ' ');

		// Get display name mappings to find original database values
		const displayNames = await FilterDisplayName.find({
			type: 'category',
		}).lean();
		const displayToDbValue = new Map<string, string>();
		displayNames.forEach((dn) => {
			const cleaned = dn.value.replace(/^en:/, '').replace(/-/g, ' ');
			displayToDbValue.set(dn.displayName.toLowerCase(), dn.value);
			displayToDbValue.set(cleaned.toLowerCase(), dn.value);
		});

		// Find the database value(s) that match
		const dbValue = displayToDbValue.get(normalizedCategory.toLowerCase());
		let categoryQuery: any;

		if (dbValue) {
			categoryQuery = dbValue;
		} else {
			// Try matching against normalized values in database
			const categoryRegex = new RegExp(
				`^en:?${normalizedCategory.replace(/ /g, '[- ]')}$`,
				'i'
			);
			categoryQuery = { $regex: categoryRegex };
		}

		// Check if any products match this category
		const [apiCount, userCount] = await Promise.all([
			Product.countDocuments({
				categories: categoryQuery,
				archived: { $ne: true },
			}),
			UserProduct.countDocuments({
				categories: categoryQuery,
				status: 'approved',
				archived: { $ne: true },
			}),
		]);

		return apiCount + userCount > 0;
	},

	/**
	 * Check if a tag actually has products that match it
	 */
	async tagHasProducts(tag: string): Promise<boolean> {
		// Normalize the tag (remove en: prefix, replace dashes with spaces)
		const normalizedTag = tag.replace(/^en:/, '').replace(/-/g, ' ');

		// Get display name mappings to find original database values
		const displayNames = await FilterDisplayName.find({
			type: 'tag',
		}).lean();
		const displayToDbValue = new Map<string, string>();
		displayNames.forEach((dn) => {
			const cleaned = dn.value.replace(/^en:/, '').replace(/-/g, ' ');
			displayToDbValue.set(dn.displayName.toLowerCase(), dn.value);
			displayToDbValue.set(cleaned.toLowerCase(), dn.value);
		});

		// Find the database value(s) that match
		const dbValue = displayToDbValue.get(normalizedTag.toLowerCase());
		let tagQuery: any;

		if (dbValue) {
			tagQuery = dbValue;
		} else {
			// Try matching against normalized values in database
			const tagRegex = new RegExp(
				`^en:?${normalizedTag.replace(/ /g, '[- ]')}$`,
				'i'
			);
			tagQuery = { $regex: tagRegex };
		}

		// Check if any products match this tag
		const [apiCount, userCount] = await Promise.all([
			Product.countDocuments({
				tags: tagQuery,
				archived: { $ne: true },
			}),
			UserProduct.countDocuments({
				tags: tagQuery,
				status: 'approved',
				archived: { $ne: true },
			}),
		]);

		return apiCount + userCount > 0;
	},

	async getCategories(): Promise<string[]> {
		try {
			// Get categories from both Product and approved, non-archived UserProduct collections
			const [
				apiCategories,
				userCategories,
				archivedFilters,
				displayNames,
			] = await Promise.all([
				Product.distinct('categories', { archived: { $ne: true } }),
				UserProduct.distinct('categories', {
					status: 'approved',
					archived: { $ne: true },
				}),
				ArchivedFilter.distinct('value', { type: 'category' }).catch(
					() => []
				),
				FilterDisplayName.find({ type: 'category' })
					.lean()
					.catch(() => []),
			]);

			// Language prefixes to filter out (non-English)
			const nonEnglishPrefixes = /^(de|el|es|fr|nl|pt|zh):/i;

			// Combine and deduplicate
			let allCategories = [
				...new Set([...apiCategories, ...userCategories]),
			];

			// Filter out non-English language prefixes
			allCategories = allCategories.filter(
				(cat) => !nonEnglishPrefixes.test(cat)
			);

			// Remove archived filters (check both with and without "en:" prefix)
			const archivedSet = new Set(archivedFilters);
			allCategories = allCategories.filter((cat) => {
				const cleaned = cat.replace(/^en:/, '');
				return !archivedSet.has(cat) && !archivedSet.has(cleaned);
			});

			// Simple cleanup: trim "en:" prefix and replace dashes with spaces
			allCategories = allCategories.map((cat) =>
				cat.replace(/^en:/, '').replace(/-/g, ' ')
			);

			// Remove duplicates after cleaning
			allCategories = [...new Set(allCategories)];

			// Create a map of display names (check both original and cleaned values)
			const displayNameMap = new Map<string, string>();
			displayNames.forEach((dn) => {
				const cleaned = dn.value.replace(/^en:/, '').replace(/-/g, ' ');
				displayNameMap.set(cleaned, dn.displayName);
				displayNameMap.set(
					dn.value.replace(/^en:/, ''),
					dn.displayName
				);
			});

			// Apply display names where available, otherwise use cleaned value
			allCategories = allCategories.map((cat) => {
				return displayNameMap.get(cat) || cat;
			});

			// Filter to only include categories that actually have products
			// Use aggregation to efficiently check which categories have products
			// Build a map of cleaned categories to their possible database values
			const categoryToDbValues = new Map<string, string[]>();

			// For each cleaned category, find all possible database values that could match it
			allCategories.forEach((cleanedCat) => {
				const possibleValues: string[] = [];

				// Check original categories for matches
				[...apiCategories, ...userCategories].forEach((origCat) => {
					const cleaned = origCat
						.replace(/^en:/, '')
						.replace(/-/g, ' ');
					if (
						cleaned === cleanedCat ||
						origCat.replace(/^en:/, '') === cleanedCat ||
						origCat === cleanedCat
					) {
						possibleValues.push(origCat);
					}
				});

				// Also check display names
				displayNames.forEach((dn) => {
					const cleaned = dn.value
						.replace(/^en:/, '')
						.replace(/-/g, ' ');
					if (cleaned === cleanedCat) {
						possibleValues.push(dn.value);
					}
				});

				if (possibleValues.length > 0) {
					categoryToDbValues.set(cleanedCat, [
						...new Set(possibleValues),
					]);
				}
			});

			// Get all unique database category values that have products
			const [apiCategoriesWithProducts, userCategoriesWithProducts] =
				await Promise.all([
					Product.distinct('categories', { archived: { $ne: true } }),
					UserProduct.distinct('categories', {
						status: 'approved',
						archived: { $ne: true },
					}),
				]);

			const allDbCategoriesWithProducts = new Set([
				...apiCategoriesWithProducts,
				...userCategoriesWithProducts,
			]);

			// Filter categories: only include if at least one of their database values has products
			const validCategories = allCategories.filter((cleanedCat) => {
				const dbValues = categoryToDbValues.get(cleanedCat);
				if (!dbValues || dbValues.length === 0) return false;
				return dbValues.some((dbValue) =>
					allDbCategoriesWithProducts.has(dbValue)
				);
			});

			return validCategories.sort();
		} catch (error: any) {
			console.error('Error in getCategories:', error);
			// Return empty array on error to prevent crashes
			return [];
		}
	},

	/**
	 * Get all available categories (including those with no products) for product creation
	 * This is used when creating/editing products so users can use any category
	 */
	async getAllAvailableCategories(): Promise<string[]> {
		// Get categories from both Product and approved, non-archived UserProduct collections
		const [apiCategories, userCategories, archivedFilters, displayNames] =
			await Promise.all([
				Product.distinct('categories', { archived: { $ne: true } }),
				UserProduct.distinct('categories', {
					status: 'approved',
					archived: { $ne: true },
				}),
				ArchivedFilter.distinct('value', { type: 'category' }),
				FilterDisplayName.find({ type: 'category' }).lean(),
			]);

		// Language prefixes to filter out (non-English)
		const nonEnglishPrefixes = /^(de|el|es|fr|nl|pt|zh):/i;

		// Combine and deduplicate
		let allCategories = [...new Set([...apiCategories, ...userCategories])];

		// Filter out non-English language prefixes
		allCategories = allCategories.filter(
			(cat) => !nonEnglishPrefixes.test(cat)
		);

		// Remove archived filters (check both with and without "en:" prefix)
		const archivedSet = new Set(archivedFilters);
		allCategories = allCategories.filter((cat) => {
			const cleaned = cat.replace(/^en:/, '');
			return !archivedSet.has(cat) && !archivedSet.has(cleaned);
		});

		// Simple cleanup: trim "en:" prefix and replace dashes with spaces
		allCategories = allCategories.map((cat) =>
			cat.replace(/^en:/, '').replace(/-/g, ' ')
		);

		// Remove duplicates after cleaning
		allCategories = [...new Set(allCategories)];

		// Create a map of display names (check both original and cleaned values)
		const displayNameMap = new Map<string, string>();
		displayNames.forEach((dn) => {
			const cleaned = dn.value.replace(/^en:/, '').replace(/-/g, ' ');
			displayNameMap.set(cleaned, dn.displayName);
			displayNameMap.set(dn.value.replace(/^en:/, ''), dn.displayName);
		});

		// Apply display names where available, otherwise use cleaned value
		allCategories = allCategories.map((cat) => {
			return displayNameMap.get(cat) || cat;
		});

		return allCategories.sort();
	},

	async getTags(): Promise<string[]> {
		// Get tags from both Product and approved, non-archived UserProduct collections
		const [apiTags, userTags, archivedFilters, displayNames] =
			await Promise.all([
				Product.distinct('tags', { archived: { $ne: true } }),
				UserProduct.distinct('tags', {
					status: 'approved',
					archived: { $ne: true },
				}),
				ArchivedFilter.distinct('value', { type: 'tag' }),
				FilterDisplayName.find({ type: 'tag' }).lean(),
			]);

		// Language prefixes to filter out (non-English)
		const nonEnglishPrefixes = /^(de|el|es|fr|nl|pt|zh):/i;

		// Combine and deduplicate
		let allTags = [...new Set([...apiTags, ...userTags])];

		// Filter out non-English language prefixes
		allTags = allTags.filter((tag) => !nonEnglishPrefixes.test(tag));

		// Remove archived filters (check both with and without "en:" prefix)
		const archivedSet = new Set(archivedFilters);
		allTags = allTags.filter((tag) => {
			const cleaned = tag.replace(/^en:/, '');
			return !archivedSet.has(tag) && !archivedSet.has(cleaned);
		});

		// Simple cleanup: trim "en:" prefix and replace dashes with spaces
		allTags = allTags.map((tag) =>
			tag.replace(/^en:/, '').replace(/-/g, ' ')
		);

		// Remove duplicates after cleaning
		allTags = [...new Set(allTags)];

		// Create a map of display names (check both original and cleaned values)
		const displayNameMap = new Map<string, string>();
		displayNames.forEach((dn) => {
			const cleaned = dn.value.replace(/^en:/, '').replace(/-/g, ' ');
			displayNameMap.set(cleaned, dn.displayName);
			displayNameMap.set(dn.value.replace(/^en:/, ''), dn.displayName);
		});

		// Apply display names where available, otherwise use cleaned value
		allTags = allTags.map((tag) => {
			return displayNameMap.get(tag) || tag;
		});

		// Filter to only include tags that actually have products
		// Use aggregation to efficiently check which tags have products
		// Build a map of cleaned tags to their possible database values
		const tagToDbValues = new Map<string, string[]>();

		// For each cleaned tag, find all possible database values that could match it
		allTags.forEach((cleanedTag) => {
			const possibleValues: string[] = [];

			// Check original tags for matches
			[...apiTags, ...userTags].forEach((origTag) => {
				const cleaned = origTag.replace(/^en:/, '').replace(/-/g, ' ');
				if (
					cleaned === cleanedTag ||
					origTag.replace(/^en:/, '') === cleanedTag ||
					origTag === cleanedTag
				) {
					possibleValues.push(origTag);
				}
			});

			// Also check display names
			displayNames.forEach((dn) => {
				const cleaned = dn.value.replace(/^en:/, '').replace(/-/g, ' ');
				if (cleaned === cleanedTag) {
					possibleValues.push(dn.value);
				}
			});

			if (possibleValues.length > 0) {
				tagToDbValues.set(cleanedTag, [...new Set(possibleValues)]);
			}
		});

		// Get all unique database tag values that have products
		const [apiTagsWithProducts, userTagsWithProducts] = await Promise.all([
			Product.distinct('tags', { archived: { $ne: true } }),
			UserProduct.distinct('tags', {
				status: 'approved',
				archived: { $ne: true },
			}),
		]);

		const allDbTagsWithProducts = new Set([
			...apiTagsWithProducts,
			...userTagsWithProducts,
		]);

		// Filter tags: only include if at least one of their database values has products
		const validTags = allTags.filter((cleanedTag) => {
			const dbValues = tagToDbValues.get(cleanedTag);
			if (!dbValues || dbValues.length === 0) return false;
			return dbValues.some((dbValue) =>
				allDbTagsWithProducts.has(dbValue)
			);
		});

		return validTags.sort();
	},

	/**
	 * Get featured products for the landing page
	 * Returns products marked as featured, sorted by featuredOrder
	 * Fetches from both Product and UserProduct collections
	 */
	async getFeaturedProducts(limit: number = 8): Promise<ProductSummary[]> {
		try {
			// Fetch featured products from both collections
			const [apiProducts, userProducts] = await Promise.all([
				Product.find({
					featured: true,
					archived: { $ne: true },
				})
					.select(
						'name brand sizeOrVariant imageUrl categories tags featuredOrder featuredAt'
					)
					.lean(),
				UserProduct.find({
					featured: true,
					archived: { $ne: true },
					status: 'approved',
				})
					.select(
						'name brand sizeOrVariant imageUrl categories tags featuredOrder featuredAt'
					)
					.lean(),
			]);

			// Combine and sort by featuredOrder, then featuredAt
			const allFeatured = [...apiProducts, ...userProducts].sort(
				(a, b) => {
					const orderA = (a as any).featuredOrder || 0;
					const orderB = (b as any).featuredOrder || 0;
					if (orderA !== orderB) {
						return orderA - orderB;
					}
					const timeA = (a as any).featuredAt
						? new Date((a as any).featuredAt).getTime()
						: 0;
					const timeB = (b as any).featuredAt
						? new Date((b as any).featuredAt).getTime()
						: 0;
					return timeB - timeA;
				}
			);

			// Take only the requested limit
			const featuredProducts = allFeatured.slice(0, limit);

			// Get rating stats for all featured products
			const productIds = featuredProducts.map((p) => p._id.toString());
			const ratingStatsMap = new Map<
				string,
				{ averageRating: number; reviewCount: number }
			>();

			if (
				productIds.length > 0 &&
				Review &&
				typeof Review.aggregate === 'function'
			) {
				try {
					const productObjectIds = productIds
						.filter((id) => mongoose.Types.ObjectId.isValid(id))
						.map((id) => new mongoose.Types.ObjectId(id));

					if (productObjectIds.length > 0) {
						const ratingAggregation = await Review.aggregate([
							{
								$match: {
									status: 'approved',
									productId: { $in: productObjectIds },
								},
							},
							{
								$group: {
									_id: '$productId',
									averageRating: { $avg: '$rating' },
									reviewCount: { $sum: 1 },
								},
							},
						]);

						ratingAggregation.forEach((agg: any) => {
							if (agg._id) {
								const productId = agg._id.toString();
								const avgRating =
									Math.round(agg.averageRating * 10) / 10;
								ratingStatsMap.set(productId, {
									averageRating: avgRating,
									reviewCount: agg.reviewCount,
								});
							}
						});
					}
				} catch (error) {
					console.warn(
						'Error fetching rating stats for featured products:',
						error
					);
				}
			}

			return featuredProducts.map((p) => {
				const id = p._id.toString();
				const stats = ratingStatsMap.get(id);
				return {
					id,
					name: p.name,
					brand: p.brand,
					sizeOrVariant: p.sizeOrVariant,
					imageUrl: p.imageUrl,
					categories: p.categories || [],
					tags: p.tags || [],
					averageRating: stats?.averageRating,
					reviewCount: stats?.reviewCount,
				};
			});
		} catch (error) {
			console.error(
				'Error in productService.getFeaturedProducts:',
				error
			);
			return [];
		}
	},

	/**
	 * Get random products for discovery section
	 * Returns a random selection of non-archived products
	 */
	async getDiscoverProducts(limit: number = 6): Promise<ProductSummary[]> {
		try {
			// Use MongoDB's $sample aggregation for random selection
			const [apiProducts, userProducts] = await Promise.all([
				Product.aggregate([
					{ $match: { archived: { $ne: true } } },
					{ $sample: { size: limit } },
					{
						$project: {
							name: 1,
							brand: 1,
							sizeOrVariant: 1,
							imageUrl: 1,
							categories: 1,
							tags: 1,
						},
					},
				]),
				UserProduct.aggregate([
					{ $match: { status: 'approved', archived: { $ne: true } } },
					{ $sample: { size: Math.floor(limit / 2) } },
					{
						$project: {
							name: 1,
							brand: 1,
							sizeOrVariant: 1,
							imageUrl: 1,
							categories: 1,
							tags: 1,
						},
					},
				]),
			]);

			// Combine and shuffle
			const allProducts = [...apiProducts, ...userProducts];

			// Fisher-Yates shuffle
			for (let i = allProducts.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[allProducts[i], allProducts[j]] = [
					allProducts[j],
					allProducts[i],
				];
			}

			// Take only the requested limit
			const selectedProducts = allProducts.slice(0, limit);

			// Get rating stats
			const productIds = selectedProducts.map((p) => p._id.toString());
			const ratingStatsMap = new Map<
				string,
				{ averageRating: number; reviewCount: number }
			>();

			if (
				productIds.length > 0 &&
				Review &&
				typeof Review.aggregate === 'function'
			) {
				try {
					const productObjectIds = productIds
						.filter((id) => mongoose.Types.ObjectId.isValid(id))
						.map((id) => new mongoose.Types.ObjectId(id));

					if (productObjectIds.length > 0) {
						const ratingAggregation = await Review.aggregate([
							{
								$match: {
									status: 'approved',
									productId: { $in: productObjectIds },
								},
							},
							{
								$group: {
									_id: '$productId',
									averageRating: { $avg: '$rating' },
									reviewCount: { $sum: 1 },
								},
							},
						]);

						ratingAggregation.forEach((agg: any) => {
							if (agg._id) {
								const productId = agg._id.toString();
								const avgRating =
									Math.round(agg.averageRating * 10) / 10;
								ratingStatsMap.set(productId, {
									averageRating: avgRating,
									reviewCount: agg.reviewCount,
								});
							}
						});
					}
				} catch (error) {
					console.warn(
						'Error fetching rating stats for discover products:',
						error
					);
				}
			}

			return selectedProducts.map((p) => {
				const id = p._id.toString();
				const stats = ratingStatsMap.get(id);
				return {
					id,
					name: p.name,
					brand: p.brand,
					sizeOrVariant: p.sizeOrVariant,
					imageUrl: p.imageUrl,
					categories: p.categories || [],
					tags: p.tags || [],
					averageRating: stats?.averageRating,
					reviewCount: stats?.reviewCount,
				};
			});
		} catch (error) {
			console.error(
				'Error in productService.getDiscoverProducts:',
				error
			);
			return [];
		}
	},

	/**
	 * Get all available tags (including those with no products) for product creation
	 * This is used when creating/editing products so users can use any tag
	 */
	async getAllAvailableTags(): Promise<string[]> {
		// Get tags from both Product and approved, non-archived UserProduct collections
		const [apiTags, userTags, archivedFilters, displayNames] =
			await Promise.all([
				Product.distinct('tags', { archived: { $ne: true } }),
				UserProduct.distinct('tags', {
					status: 'approved',
					archived: { $ne: true },
				}),
				ArchivedFilter.distinct('value', { type: 'tag' }),
				FilterDisplayName.find({ type: 'tag' }).lean(),
			]);

		// Language prefixes to filter out (non-English)
		const nonEnglishPrefixes = /^(de|el|es|fr|nl|pt|zh):/i;

		// Combine and deduplicate
		let allTags = [...new Set([...apiTags, ...userTags])];

		// Filter out non-English language prefixes
		allTags = allTags.filter((tag) => !nonEnglishPrefixes.test(tag));

		// Remove archived filters (check both with and without "en:" prefix)
		const archivedSet = new Set(archivedFilters);
		allTags = allTags.filter((tag) => {
			const cleaned = tag.replace(/^en:/, '');
			return !archivedSet.has(tag) && !archivedSet.has(cleaned);
		});

		// Simple cleanup: trim "en:" prefix and replace dashes with spaces
		allTags = allTags.map((tag) =>
			tag.replace(/^en:/, '').replace(/-/g, ' ')
		);

		// Remove duplicates after cleaning
		allTags = [...new Set(allTags)];

		// Create a map of display names (check both original and cleaned values)
		const displayNameMap = new Map<string, string>();
		displayNames.forEach((dn) => {
			const cleaned = dn.value.replace(/^en:/, '').replace(/-/g, ' ');
			displayNameMap.set(cleaned, dn.displayName);
			displayNameMap.set(dn.value.replace(/^en:/, ''), dn.displayName);
		});

		// Apply display names where available, otherwise use cleaned value
		allTags = allTags.map((tag) => {
			return displayNameMap.get(tag) || tag;
		});

		return allTags.sort();
	},
};
