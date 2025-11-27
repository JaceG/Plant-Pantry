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
   * Get availability for a product, creating on-demand if it doesn't exist
   * In the future, this will fetch from store APIs
   */
  async getProductAvailability(
    productId: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<StoreAvailability[]> {
    const { forceRefresh = false } = options;

    // Validate productId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.error(`Invalid productId: ${productId}`);
      return [];
    }

    // Check if we have cached availability (don't populate to avoid ObjectId issues)
    let cached = await Availability.find({ productId: new mongoose.Types.ObjectId(productId) })
      .lean();

    // If no availability exists, create it on-demand
    if (cached.length === 0) {
      await this.createOnDemandAvailability(productId);
      // Fetch again after creating
      cached = await Availability.find({ productId: new mongoose.Types.ObjectId(productId) })
        .populate('storeId')
        .lean();
    }

    // Check if data is stale
    const isStale = cached.some(
      (a) =>
        !a.lastFetchedAt ||
        new Date().getTime() - new Date(a.lastFetchedAt).getTime() >
          STALE_THRESHOLD_HOURS * 60 * 60 * 1000
    );

    // If data is stale or force refresh, try to fetch from API
    if ((isStale || forceRefresh) && cached.length > 0) {
      // Try to fetch fresh data from store APIs
      const freshData = await this.fetchFromStoreAPIs(productId);
      if (freshData && freshData.length > 0) {
        await this.updateAvailability(productId, freshData);
        // Return fresh data
        const validStoreIds = freshData
          .map((a) => a.storeId)
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));
        
        const stores = validStoreIds.length > 0
          ? await Store.find({ _id: { $in: validStoreIds } }).lean()
          : [];
        const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));
        
        return freshData.map((avail) => {
          const store = storeMap.get(avail.storeId);
          return {
            storeId: avail.storeId,
            storeName: avail.storeName || store?.name || 'Unknown Store',
            available: avail.available,
            priceRange: avail.priceRange,
            lastUpdated: avail.lastUpdated || new Date(),
          };
        });
      }
    }

    // Return cached availability
    // Extract storeIds properly (handle both populated and non-populated cases)
    const storeIds = cached
      .map((a) => {
        // If populated, storeId is an object with _id
        if (a.storeId && typeof a.storeId === 'object' && '_id' in a.storeId) {
          return (a.storeId as any)._id || a.storeId;
        }
        // Otherwise it's already an ObjectId
        return a.storeId;
      })
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const stores = storeIds.length > 0
      ? await Store.find({ _id: { $in: storeIds } }).lean()
      : [];

    const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

    return cached.map((a) => {
      // Extract storeId properly
      let storeIdStr: string;
      if (a.storeId && typeof a.storeId === 'object' && '_id' in a.storeId) {
        storeIdStr = (a.storeId as any)._id?.toString() || String(a.storeId);
      } else {
        storeIdStr = (a.storeId as any)?.toString() || String(a.storeId);
      }

      const store = storeMap.get(storeIdStr);
      return {
        storeId: storeIdStr,
        storeName: store?.name || 'Unknown Store',
        available: a.status === 'known',
        priceRange: a.priceRange,
        lastUpdated: a.lastFetchedAt || a.lastConfirmedAt,
      };
    });
  },

  /**
   * Create availability on-demand when a product is viewed
   * This simulates what would come from store APIs
   */
  async createOnDemandAvailability(productId: string): Promise<void> {
    // Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.error(`Cannot create availability for invalid productId: ${productId}`);
      return;
    }

    // Ensure stores exist
    let stores = await Store.find();
    if (stores.length === 0) {
      // Create default stores if they don't exist
      stores = await Store.insertMany([
        {
          name: 'Whole Foods Market',
          type: 'brick_and_mortar',
          regionOrScope: 'US - Nationwide',
          websiteUrl: 'https://www.wholefoodsmarket.com',
        },
        {
          name: 'Target',
          type: 'brick_and_mortar',
          regionOrScope: 'US - Nationwide',
          websiteUrl: 'https://www.target.com',
        },
        {
          name: "Trader Joe's",
          type: 'brick_and_mortar',
          regionOrScope: 'US - Select Locations',
          websiteUrl: 'https://www.traderjoes.com',
        },
        {
          name: 'Sprouts Farmers Market',
          type: 'brick_and_mortar',
          regionOrScope: 'US - West & Southwest',
          websiteUrl: 'https://www.sprouts.com',
        },
        {
          name: 'Amazon Fresh',
          type: 'online_retailer',
          regionOrScope: 'US - Online',
          websiteUrl: 'https://www.amazon.com/fresh',
        },
        {
          name: 'Thrive Market',
          type: 'online_retailer',
          regionOrScope: 'US - Online',
          websiteUrl: 'https://thrivemarket.com',
        },
        {
          name: 'iHerb',
          type: 'online_retailer',
          regionOrScope: 'Worldwide - Online',
          websiteUrl: 'https://www.iherb.com',
        },
      ]);
    }

    // Randomly assign product to 2-5 stores
    const numStores = Math.floor(Math.random() * 4) + 2;
    const shuffledStores = [...stores].sort(() => Math.random() - 0.5);
    const selectedStores = shuffledStores.slice(0, numStores);

    const priceRanges = [
      '$3.99-$4.99',
      '$4.99-$6.99',
      '$5.99-$7.99',
      '$6.99-$9.99',
      '$8.99-$12.99',
    ];

    const availabilityEntries = selectedStores.map((store) => ({
      productId: new mongoose.Types.ObjectId(productId),
      storeId: store._id instanceof mongoose.Types.ObjectId ? store._id : new mongoose.Types.ObjectId(store._id),
      status: 'known' as const,
      priceRange: priceRanges[Math.floor(Math.random() * priceRanges.length)],
      lastConfirmedAt: new Date(),
      lastFetchedAt: new Date(),
      source: 'api_fetch' as const,
      isStale: false,
    }));

    // Insert availability entries (ignore duplicates)
    try {
      await Availability.insertMany(availabilityEntries, { ordered: false });
    } catch (error: any) {
      // Ignore duplicate key errors (product might have been viewed by another user)
      if (error.code !== 11000) {
        throw error;
      }
    }
  },

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
  async fetchFromStoreAPIs(productId: string): Promise<StoreAvailability[] | null> {
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

