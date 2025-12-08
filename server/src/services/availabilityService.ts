/**
 * Availability Service
 *
 * Handles fetching and updating product availability from various sources.
 * Supports both cached database data and real-time API fetching.
 */

import mongoose from 'mongoose';
import { Availability, Store, Product } from '../models';

const STALE_THRESHOLD_HOURS = 24; // Consider data stale after 24 hours

export interface StoreAvailability {
	storeId: string;
	storeName: string;
	available: boolean;
	price?: string;
	priceRange?: string;
	lastUpdated?: Date;
}

export interface AvailabilityFetchResult {
	productId: string;
	availabilities: StoreAvailability[];
	fetchedAt: Date;
	source: 'api' | 'cache' | 'seed';
}

export const availabilityService = {
	/**
	 * Get availability for a product
	 *
	 * For API-sourced products: Always fetch fresh from APIs (no caching)
	 * For user-contributed products: Return saved availability from database
	 *
	 * @param productId - The product ID
	 * @param options.forceRefresh - Force refresh from API
	 * @param options.isUserProduct - Whether this is a user-contributed product
	 * @param options.userId - Current user ID (to show their pending availability)
	 */
	async getProductAvailability(
		productId: string,
		options: {
			forceRefresh?: boolean;
			isUserProduct?: boolean;
			userId?: string;
		} = {}
	): Promise<StoreAvailability[]> {
		const { forceRefresh = false, isUserProduct = false, userId } = options;

		// Validate productId is a valid ObjectId
		if (!mongoose.Types.ObjectId.isValid(productId)) {
			console.error(`Invalid productId: ${productId}`);
			return [];
		}

		// For user-contributed products, return saved availability from database
		// Include all sources (admin, user_contribution, etc.) since admins can add availability too
		// Also include pending availability reported by the current user
		if (isUserProduct) {
			// Build query: confirmed availability OR pending availability created by current user
			const query: any = {
				productId: new mongoose.Types.ObjectId(productId),
				$or: [
					{ moderationStatus: 'confirmed' },
					{ moderationStatus: { $exists: false } }, // Legacy entries
					// Include pending entries if user ID provided and they reported it
					...(userId
						? [
								{
									moderationStatus: 'pending',
									reportedBy: new mongoose.Types.ObjectId(
										userId
									),
								},
						  ]
						: []),
				],
			};

			const userAvailability = await Availability.find(query).lean();

			if (userAvailability.length === 0) {
				return [];
			}

			const storeIds = userAvailability
				.map((a) => {
					if (
						a.storeId &&
						typeof a.storeId === 'object' &&
						'_id' in a.storeId
					) {
						return (a.storeId as any)._id || a.storeId;
					}
					return a.storeId;
				})
				.filter((id) => id && mongoose.Types.ObjectId.isValid(id))
				.map((id) => new mongoose.Types.ObjectId(id));

			const stores =
				storeIds.length > 0
					? await Store.find({ _id: { $in: storeIds } }).lean()
					: [];

			const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

			return userAvailability.map((a) => {
				let storeIdStr: string;
				if (
					a.storeId &&
					typeof a.storeId === 'object' &&
					'_id' in a.storeId
				) {
					storeIdStr =
						(a.storeId as any)._id?.toString() || String(a.storeId);
				} else {
					storeIdStr =
						(a.storeId as any)?.toString() || String(a.storeId);
				}

				const store = storeMap.get(storeIdStr);
				return {
					storeId: storeIdStr,
					storeName: store?.name || 'Unknown Store',
					available: a.moderationStatus === 'confirmed',
					priceRange: a.priceRange,
					lastUpdated: a.lastFetchedAt || a.lastConfirmedAt,
				};
			});
		}

		// For API-sourced products: Always fetch fresh from APIs (no caching)
		// Don't check database, don't cache results
		const freshData = await this.fetchFromStoreAPIs(productId);
		if (freshData && freshData.length > 0) {
			// Return fresh data without saving to database
			const validStoreIds = freshData
				.map((a) => a.storeId)
				.filter((id) => id && mongoose.Types.ObjectId.isValid(id))
				.map((id) => new mongoose.Types.ObjectId(id));

			const stores =
				validStoreIds.length > 0
					? await Store.find({ _id: { $in: validStoreIds } }).lean()
					: [];
			const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

			return freshData.map((avail) => {
				const store = storeMap.get(avail.storeId);
				return {
					storeId: avail.storeId,
					storeName:
						avail.storeName || store?.name || 'Unknown Store',
					available: avail.available,
					priceRange: avail.priceRange,
					lastUpdated: avail.lastUpdated || new Date(),
				};
			});
		}

		// No availability found from APIs
		return [];
	},

	/**
	 * REMOVED: createOnDemandAvailability
	 *
	 * This function was removed because we no longer cache API-sourced availability.
	 * We now fetch fresh data from APIs on each product view.
	 * Only user-contributed availability is stored in the database.
	 */

	/**
	 * Fetch availability from store APIs
	 *
	 * This is where you'd integrate with:
	 * - Store APIs (Whole Foods, Target, etc.)
	 * - Third-party services (Instacart API, etc.)
	 * - Web scraping (as last resort, with proper rate limiting)
	 *
	 * For MVP, this returns null to use on-demand created data
	 * In production, implement real API calls here
	 */
	async fetchFromStoreAPIs(
		productId: string
	): Promise<StoreAvailability[] | null> {
		// TODO: Implement real API fetching
		// Example structure:
		// 1. Get product details (barcode, name, brand) from Product model
		// 2. For each store, check if they have an API
		// 3. Query each store API for product availability
		// 4. Return aggregated results

		// For MVP, return null to use on-demand created data
		// When you implement real APIs, replace this with actual API calls
		return null;
	},

	/**
	 * Update availability in database
	 *
	 * NOTE: This is only used for user-contributed availability.
	 * API-sourced availability is NOT cached in the database.
	 */
	async updateAvailability(
		productId: string,
		availabilities: StoreAvailability[],
		source: 'user_contribution' = 'user_contribution'
	): Promise<void> {
		const productObjectId = new mongoose.Types.ObjectId(productId);
		const now = new Date();

		// Only update if source is user_contribution
		// API data should not be cached
		if (source !== 'user_contribution') {
			console.warn(
				'Attempted to cache API availability - this is not allowed'
			);
			return;
		}

		// Update or create availability entries
		for (const avail of availabilities) {
			await Availability.findOneAndUpdate(
				{
					productId: productObjectId,
					storeId: new mongoose.Types.ObjectId(avail.storeId),
				},
				{
					productId: productObjectId,
					storeId: new mongoose.Types.ObjectId(avail.storeId),
					status: avail.available ? 'known' : 'unknown',
					priceRange: avail.priceRange || avail.price,
					lastFetchedAt: now,
					lastConfirmedAt: now,
					source: 'user_contribution',
					isStale: false,
				},
				{ upsert: true, new: true }
			);
		}
	},

	/**
	 * Mark availability as stale (useful for background jobs)
	 */
	async markStale(productId?: string): Promise<void> {
		const query: any = {
			lastFetchedAt: {
				$lt: new Date(
					Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000
				),
			},
		};

		if (productId) {
			query.productId = new mongoose.Types.ObjectId(productId);
		}

		await Availability.updateMany(query, { isStale: true });
	},
};
