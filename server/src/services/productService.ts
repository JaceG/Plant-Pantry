import mongoose from 'mongoose';
import { Product, IProduct, Availability, Store, UserProduct } from '../models';
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
        query.categories = category;
      }

      if (tag) {
        query.tags = tag;
      }

      // Query both Product and UserProduct collections
      // Only include approved user products
      const userProductQuery = {
        ...query,
        status: 'approved', // Only show approved user products
      };

      const [apiProducts, userProducts, apiCount, userCount] = await Promise.all([
        Product.find(query)
          .select('name brand sizeOrVariant imageUrl categories tags')
          .lean(),
        UserProduct.find(userProductQuery)
          .select('name brand sizeOrVariant imageUrl categories tags')
          .lean(),
        Product.countDocuments(query),
        UserProduct.countDocuments(userProductQuery),
      ]);

      // Combine and sort all products
      const allProducts = [
        ...apiProducts.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          brand: p.brand,
          sizeOrVariant: p.sizeOrVariant,
          imageUrl: p.imageUrl,
          categories: p.categories || [],
          tags: p.tags || [],
        })),
        ...userProducts.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          brand: p.brand,
          sizeOrVariant: p.sizeOrVariant,
          imageUrl: p.imageUrl,
          categories: p.categories || [],
          tags: p.tags || [],
        })),
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

  async getProductById(id: string, options: { refreshAvailability?: boolean } = {}): Promise<ProductDetail | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    // Try to find in Product collection first (API-sourced products)
    let product = await Product.findById(id).lean();
    let isUserProduct = false;

    // If not found, try UserProduct collection (user-contributed products)
    if (!product) {
      const userProduct = await UserProduct.findById(id).lean();
      if (userProduct) {
        product = userProduct as any;
        isUserProduct = true;
      } else {
        return null;
      }
    }

    // Get availability
    // For user products: fetch from database (user-contributed)
    // For API products: always fetch fresh from APIs (no caching)
    const storeAvailabilities = await availabilityService.getProductAvailability(
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
      _source: isUserProduct ? 'user_contribution' : 'api',
      _userId: isUserProduct ? (product as any).userId?.toString() : undefined,
    };
  },

  async getCategories(): Promise<string[]> {
    // Get categories from both Product and approved UserProduct collections
    const [apiCategories, userCategories] = await Promise.all([
      Product.distinct('categories'),
      UserProduct.distinct('categories', { status: 'approved' }),
    ]);
    
    // Combine and deduplicate
    const allCategories = [...new Set([...apiCategories, ...userCategories])];
    return allCategories.sort();
  },

  async getTags(): Promise<string[]> {
    // Get tags from both Product and approved UserProduct collections
    const [apiTags, userTags] = await Promise.all([
      Product.distinct('tags'),
      UserProduct.distinct('tags', { status: 'approved' }),
    ]);
    
    // Combine and deduplicate
    const allTags = [...new Set([...apiTags, ...userTags])];
    return allTags.sort();
  },
};

