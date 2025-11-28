import mongoose from 'mongoose';
import { Product, IProduct, Availability, Store } from '../models';
import { availabilityService } from './availabilityService';

export interface ProductFilters {
  q?: string;
  category?: string;
  tag?: string;
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
  _source?: 'api' | 'user_contribution'; // Metadata to distinguish sources
  _userId?: string; // For user products
}

export const productService = {
  async getProducts(filters: ProductFilters): Promise<ProductListResult> {
    try {
      const { q, category, tag, page = 1, pageSize = 20 } = filters;
      const skip = (page - 1) * pageSize;

      // Build query
      const query: Record<string, unknown> = {};

      if (q) {
        // Use regex for simple search (text index requires special handling)
        query.$or = [
          { name: { $regex: q, $options: 'i' } },
          { brand: { $regex: q, $options: 'i' } },
        ];
      }

      if (category) {
        query.categories = category;
      }

      if (tag) {
        query.tags = tag;
      }

      const [products, totalCount] = await Promise.all([
        Product.find(query)
          .select('name brand sizeOrVariant imageUrl categories tags')
          .skip(skip)
          .limit(pageSize)
          .sort({ name: 1 })
          .lean(),
        Product.countDocuments(query),
      ]);

      const items: ProductSummary[] = products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        brand: p.brand,
        sizeOrVariant: p.sizeOrVariant,
        imageUrl: p.imageUrl,
        categories: p.categories || [],
        tags: p.tags || [],
      }));

      return {
        items,
        page,
        pageSize,
        totalCount,
      };
    } catch (error) {
      console.error('Error in productService.getProducts:', error);
      throw error;
    }
  },

  async getProductById(id: string, options: { refreshAvailability?: boolean } = {}): Promise<ProductDetail | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const product = await Product.findById(id).lean();
    if (!product) {
      return null;
    }

    // Get availability - will fetch from API if stale or if force refresh requested
    const storeAvailabilities = await availabilityService.getProductAvailability(
      product._id.toString(),
      { forceRefresh: options.refreshAvailability }
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
    const availabilityInfo: AvailabilityInfo[] = storeAvailabilities.map((avail) => {
      const store = storeMap.get(avail.storeId);
      return {
        storeId: avail.storeId,
        storeName: avail.storeName || store?.name || 'Unknown Store',
        storeType: store?.type || 'unknown',
        regionOrScope: store?.regionOrScope || 'Unknown',
        status: avail.available ? 'known' : 'unknown',
        priceRange: avail.priceRange,
        lastConfirmedAt: avail.lastUpdated,
        source: 'api_fetch', // Will be updated based on actual source
      };
    });

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
    };
  },

  async getCategories(): Promise<string[]> {
    const categories = await Product.distinct('categories');
    return categories.sort();
  },
};

