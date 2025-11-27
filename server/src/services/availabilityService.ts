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
   * Get availability for a product, fetching from API if data is stale
   */
  async getProductAvailability(
    productId: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<StoreAvailability[]> {
    const { forceRefresh = false } = options;

    // Check if we have cached availability
    const cached = await Availability.find({ productId: new mongoose.Types.ObjectId(productId) })
      .populate('storeId')
      .lean();

    // Check if data is stale
    const isStale = cached.some(
      (a) =>
        !a.lastFetchedAt ||
        new Date().getTime() - new Date(a.lastFetchedAt).getTime() >
          STALE_THRESHOLD_HOURS * 60 * 60 * 1000
    );

    // If data is stale or force refresh, try to fetch from API
    if ((isStale || forceRefresh) && cached.length > 0) {
      // TODO: Implement API fetching logic here
      // For now, we'll return cached data but mark it as potentially stale
      // When you integrate store APIs, add them here:
      // const freshData = await this.fetchFromStoreAPIs(productId);
      // if (freshData) {
      //   await this.updateAvailability(productId, freshData);
      //   return freshData;
      // }
    }

    // Return cached availability
    const stores = await Store.find({
      _id: { $in: cached.map((a) => a.storeId) },
    }).lean();

    const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

    return cached.map((a) => {
      const store = storeMap.get((a.storeId as any).toString());
      return {
        storeId: (a.storeId as any).toString(),
        storeName: store?.name || 'Unknown Store',
        available: a.status === 'known',
        priceRange: a.priceRange,
        lastUpdated: a.lastFetchedAt || a.lastConfirmedAt,
      };
    });
  },

  /**
   * Fetch availability from store APIs (to be implemented)
   * 
   * This is where you'd integrate with:
   * - Store APIs (Whole Foods, Target, etc.)
   * - Third-party services (Instacart API, etc.)
   * - Web scraping (as last resort, with proper rate limiting)
   */
  async fetchFromStoreAPIs(productId: string): Promise<StoreAvailability[] | null> {
    // TODO: Implement API fetching
    // Example structure:
    // 1. Get product details (barcode, name, brand)
    // 2. For each store, check if they have an API
    // 3. Query each store API for product availability
    // 4. Return aggregated results
    
    // For now, return null to use cached data
    return null;
  },

  /**
   * Update availability in database after fetching from API
   */
  async updateAvailability(
    productId: string,
    availabilities: StoreAvailability[]
  ): Promise<void> {
    const productObjectId = new mongoose.Types.ObjectId(productId);
    const now = new Date();

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
          source: 'api_fetch',
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
        $lt: new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000),
      },
    };

    if (productId) {
      query.productId = new mongoose.Types.ObjectId(productId);
    }

    await Availability.updateMany(query, { isStale: true });
  },
};

