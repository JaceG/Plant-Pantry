import mongoose from 'mongoose';
import { UserProduct, Availability, Store } from '../models';
import { ProductSummary, ProductDetail, AvailabilityInfo } from './productService';

export interface StoreAvailabilityInput {
  storeId: string;
  priceRange?: string;
  status?: 'known' | 'user_reported' | 'unknown';
}

export interface CreateUserProductInput {
  userId: string;
  name: string;
  brand: string;
  description?: string;
  sizeOrVariant?: string;
  categories?: string[];
  tags?: string[];
  isStrictVegan?: boolean;
  imageUrl?: string;
  nutritionSummary?: string;
  ingredientSummary?: string;
  storeAvailabilities?: StoreAvailabilityInput[];
}

export interface UpdateUserProductInput {
  name?: string;
  brand?: string;
  description?: string;
  sizeOrVariant?: string;
  categories?: string[];
  tags?: string[];
  isStrictVegan?: boolean;
  imageUrl?: string;
  nutritionSummary?: string;
  ingredientSummary?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export const userProductService = {
  /**
   * Create a new user-contributed product
   */
  async createProduct(input: CreateUserProductInput): Promise<ProductDetail> {
    const product = await UserProduct.create({
      userId: new mongoose.Types.ObjectId(input.userId),
      name: input.name,
      brand: input.brand,
      description: input.description,
      sizeOrVariant: input.sizeOrVariant || 'Standard',
      categories: input.categories || [],
      tags: input.tags || ['vegan'],
      isStrictVegan: input.isStrictVegan !== false,
      imageUrl: input.imageUrl,
      nutritionSummary: input.nutritionSummary,
      ingredientSummary: input.ingredientSummary,
      source: 'user_contribution',
      status: 'approved',
    });

    // Create availability entries if provided
    if (input.storeAvailabilities && input.storeAvailabilities.length > 0) {
      const availabilityEntries = input.storeAvailabilities.map((avail) => ({
        productId: product._id,
        storeId: new mongoose.Types.ObjectId(avail.storeId),
        status: (avail.status || 'user_reported') as 'known' | 'user_reported' | 'unknown',
        priceRange: avail.priceRange,
        lastConfirmedAt: new Date(),
        source: 'user_contribution' as const,
        isStale: false,
      }));

      await Availability.insertMany(availabilityEntries, { ordered: false }).catch((error: any) => {
        // Ignore duplicate key errors
        if (error.code !== 11000) {
          console.error('Error creating availability entries:', error);
        }
      });
    }

    return await this.mapToProductDetail(product);
  },

  /**
   * Get user product by ID
   */
  async getProductById(id: string): Promise<ProductDetail | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const product = await UserProduct.findById(id).lean();
    if (!product) {
      return null;
    }

    return await this.mapToProductDetail(product);
  },

  /**
   * Get all products by a user
   */
  async getProductsByUser(userId: string): Promise<ProductSummary[]> {
    const products = await UserProduct.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'approved', // Only show approved products
    })
      .select('name brand sizeOrVariant imageUrl categories tags')
      .sort({ createdAt: -1 })
      .lean();

    return products.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      brand: p.brand,
      sizeOrVariant: p.sizeOrVariant,
      imageUrl: p.imageUrl,
      categories: p.categories,
      tags: p.tags,
    }));
  },

  /**
   * Update a user product
   */
  async updateProduct(
    id: string,
    userId: string,
    input: UpdateUserProductInput
  ): Promise<ProductDetail | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const product = await UserProduct.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId), // Ensure user owns it
      },
      { $set: input },
      { new: true, lean: true }
    );

    if (!product) {
      return null;
    }

    return await this.mapToProductDetail(product);
  },

  /**
   * Delete a user product
   */
  async deleteProduct(id: string, userId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await UserProduct.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId), // Ensure user owns it
    });

    return result.deletedCount > 0;
  },

  /**
   * Map UserProduct to ProductDetail format
   */
  async mapToProductDetail(product: any): Promise<ProductDetail> {
    // Fetch availability for this product
    const availabilities = await Availability.find({
      productId: product._id instanceof mongoose.Types.ObjectId ? product._id : new mongoose.Types.ObjectId(product._id),
    }).lean();

    const storeIds = availabilities
      .map((a) => a.storeId)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const stores = storeIds.length > 0
      ? await Store.find({ _id: { $in: storeIds } }).lean()
      : [];

    const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

    const availabilityInfo: AvailabilityInfo[] = availabilities.map((avail) => {
      const storeIdStr = avail.storeId.toString();
      const store = storeMap.get(storeIdStr);
      return {
        storeId: storeIdStr,
        storeName: store?.name || 'Unknown Store',
        storeType: store?.type || 'unknown',
        regionOrScope: store?.regionOrScope || 'Unknown',
        status: avail.status || 'unknown',
        priceRange: avail.priceRange,
        lastConfirmedAt: avail.lastConfirmedAt,
        source: avail.source || 'user_contribution',
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
      // Add metadata to distinguish from API products
      _source: 'user_contribution',
      _userId: product.userId?.toString(),
    };
  },
};

