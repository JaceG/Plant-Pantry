import mongoose from "mongoose";
import { UserProduct, Availability, Store, User } from "../models";
import {
  ProductSummary,
  ProductDetail,
  AvailabilityInfo,
} from "./productService";

export interface StoreAvailabilityInput {
  storeId: string;
  priceRange?: string;
  status?: "known" | "user_reported" | "unknown";
}

export interface ChainAvailabilityInput {
  chainId: string;
  includeRelatedCompany?: boolean;
  priceRange?: string;
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
  chainAvailabilities?: ChainAvailabilityInput[];
  sourceProductId?: string; // If editing an API product
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
  status?: "pending" | "approved" | "rejected";
  storeAvailabilities?: StoreAvailabilityInput[];
  chainAvailabilities?: ChainAvailabilityInput[];
}

function normalizeCompanyKey(input: string): string {
  const raw = input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    // remove common store-variant descriptors, keep the owning retailer
    .replace(
      /\b(supercenter|neighborhood|market|marketplace|fresh|fare|greatland|super|pharmacy|store)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  // Special-case a few known tricky brand stylings
  if (raw === "wal mart") return "walmart";
  if (raw === "h e b" || raw === "heb") return "h-e-b";
  return raw.replace(/\s+/g, " ");
}

async function getRelatedChainIds(
  chainId: string,
  includeRelatedCompany: boolean,
): Promise<mongoose.Types.ObjectId[]> {
  if (!mongoose.Types.ObjectId.isValid(chainId)) return [];

  const { StoreChain } = await import("../models");
  const chain = await StoreChain.findById(chainId).select("name").lean();
  if (!chain) return [];

  if (!includeRelatedCompany) {
    return [new mongoose.Types.ObjectId(chainId)];
  }

  const companyKey = normalizeCompanyKey(chain.name);
  if (!companyKey) return [new mongoose.Types.ObjectId(chainId)];

  // Robust approach: scan active chains and group by normalized company key.
  // This avoids false positives from regex prefix matching.
  const all = await StoreChain.find({ isActive: true })
    .select("_id name")
    .lean();

  return all
    .filter((c: any) => normalizeCompanyKey(c.name) === companyKey)
    .map((c: any) => c._id as mongoose.Types.ObjectId);
}

export const userProductService = {
  /**
   * Check if a user is trusted (their contributions bypass moderation)
   */
  async isUserTrusted(userId: string): Promise<boolean> {
    const user = await User.findById(userId)
      .select("trustedContributor role")
      .lean();
    if (!user) return false;
    // Admins and moderators are automatically trusted
    if (user.role === "admin" || user.role === "moderator") return true;
    return user.trustedContributor === true;
  },

  /**
   * Check if a user is an admin (their edits need no review at all)
   */
  async isUserAdmin(userId: string): Promise<boolean> {
    const user = await User.findById(userId).select("role").lean();
    return user?.role === "admin";
  },

  /**
   * Get user trust level for content moderation
   * Returns: { isTrusted: boolean, needsReview: boolean }
   * - Admin: trusted, no review needed
   * - Moderator/Trusted contributor: trusted, needs review by admin later
   * - Regular user: not trusted, stays pending until approved
   */
  async getUserTrustLevel(
    userId: string,
  ): Promise<{ isTrusted: boolean; needsReview: boolean }> {
    const user = await User.findById(userId)
      .select("trustedContributor role")
      .lean();
    if (!user) return { isTrusted: false, needsReview: true };

    // Admins: content applied immediately, NO review needed
    if (user.role === "admin") {
      return { isTrusted: true, needsReview: false };
    }
    // Moderators: content applied immediately, but can be reviewed by admin later
    if (user.role === "moderator") {
      return { isTrusted: true, needsReview: true };
    }
    // Trusted contributors: content applied immediately, but reviewed by admin later
    if (user.trustedContributor) {
      return { isTrusted: true, needsReview: true };
    }
    // Regular users: content needs approval before going live
    return { isTrusted: false, needsReview: true };
  },

  /**
   * Create a new user-contributed product or edit of an API product
   */
  async createProduct(input: CreateUserProductInput): Promise<ProductDetail> {
    // Check user trust level for moderation decisions
    const { isTrusted, needsReview } = await this.getUserTrustLevel(
      input.userId,
    );

    // Check if this is an edit of an existing API product
    let existingEdit = null;
    if (input.sourceProductId) {
      existingEdit = await UserProduct.findOne({
        sourceProductId: new mongoose.Types.ObjectId(input.sourceProductId),
        status: "approved",
      });
    }

    // Explicitly set empty strings for optional fields to preserve deletions
    // This ensures that when a user clears a field, the empty value is saved
    const productData: any = {
      userId: new mongoose.Types.ObjectId(input.userId),
      name: input.name,
      brand: input.brand,
      description: input.description ?? "", // Preserve empty string
      sizeOrVariant: input.sizeOrVariant ?? "",
      categories: input.categories || [],
      tags: input.tags || ["vegan"],
      isStrictVegan: input.isStrictVegan !== false,
      imageUrl: input.imageUrl ?? "", // Preserve empty string
      nutritionSummary: input.nutritionSummary ?? "", // Preserve empty string
      ingredientSummary: input.ingredientSummary ?? "", // Preserve empty string
      chainAvailabilities: (input.chainAvailabilities || []).map((c) => ({
        chainId: new mongoose.Types.ObjectId(c.chainId),
        includeRelatedCompany: c.includeRelatedCompany !== false,
        priceRange: c.priceRange,
      })),
      source: "user_contribution",
      status: isTrusted ? "approved" : "pending", // Trusted users' content goes live immediately
      needsReview: needsReview, // Admin edits don't need review; moderator/trusted edits do
      trustedContribution: isTrusted, // Track if from trusted contributor
    };

    if (input.sourceProductId) {
      productData.sourceProductId = new mongoose.Types.ObjectId(
        input.sourceProductId,
      );
      productData.editedBy = new mongoose.Types.ObjectId(input.userId);
    }

    // If editing an existing product, update it; otherwise create new
    let product;
    if (existingEdit) {
      product = await UserProduct.findByIdAndUpdate(
        existingEdit._id,
        { $set: productData },
        { new: true },
      );
    } else {
      product = await UserProduct.create(productData);
    }

    if (!product) {
      throw new Error("Failed to create or update product");
    }

    // Update availability entries if provided
    if (input.storeAvailabilities !== undefined) {
      // First, delete any existing availability entries for this product
      // This ensures we replace old entries rather than trying to insert duplicates
      await Availability.deleteMany({ productId: product._id });

      // Build combined store targets:
      // - explicit store selections
      // - all stores in selected chain(s), optionally including related company variants
      const storeToPrice = new Map<string, string | undefined>();

      for (const avail of input.storeAvailabilities || []) {
        if (!mongoose.Types.ObjectId.isValid(avail.storeId)) continue;
        storeToPrice.set(avail.storeId, avail.priceRange);
      }

      const chainAvails = input.chainAvailabilities || [];
      if (chainAvails.length > 0) {
        const chainIdsToFetch: mongoose.Types.ObjectId[] = [];
        const chainPriceByChainId = new Map<string, string | undefined>();

        for (const ca of chainAvails) {
          const includeRelatedCompany = ca.includeRelatedCompany !== false;
          const relatedChainIds = await getRelatedChainIds(
            ca.chainId,
            includeRelatedCompany,
          );
          relatedChainIds.forEach((id) => {
            chainIdsToFetch.push(id);
            chainPriceByChainId.set(id.toString(), ca.priceRange);
          });
        }

        const uniqueChainIds = [
          ...new Map(chainIdsToFetch.map((id) => [id.toString(), id])).values(),
        ];

        if (uniqueChainIds.length > 0) {
          const stores = await Store.find({
            chainId: { $in: uniqueChainIds },
            type: "brick_and_mortar",
          })
            .select("_id chainId")
            .lean();

          for (const s of stores as any[]) {
            const storeIdStr = s._id.toString();
            if (storeToPrice.has(storeIdStr)) continue; // explicit store selection wins
            const chainIdStr = s.chainId?.toString();
            const chainPrice = chainIdStr
              ? chainPriceByChainId.get(chainIdStr)
              : undefined;
            storeToPrice.set(storeIdStr, chainPrice);
          }
        }
      }

      const storeIds = Array.from(storeToPrice.keys());

      // Create new availability entries if any are provided/derived
      if (storeIds.length > 0) {
        const availabilityEntries = storeIds.map((storeId) => ({
          productId: product._id,
          storeId: new mongoose.Types.ObjectId(storeId),
          moderationStatus: isTrusted
            ? ("confirmed" as const)
            : ("pending" as const), // Trusted users' content goes live immediately
          priceRange: storeToPrice.get(storeId),
          lastConfirmedAt: new Date(),
          source: "user_contribution" as const,
          reportedBy: new mongoose.Types.ObjectId(input.userId),
          isStale: false,
          needsReview: needsReview, // Admin edits don't need review; moderator/trusted edits do
          trustedContribution: isTrusted, // Track if from trusted contributor
        }));

        await Availability.insertMany(availabilityEntries, {
          ordered: false,
        }).catch((error: any) => {
          // Ignore duplicate key errors (shouldn't happen now, but just in case)
          if (error.code !== 11000) {
            console.error("Error creating availability entries:", error);
          }
        });
      }
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
      status: "approved", // Only show approved products
    })
      .select("name brand sizeOrVariant imageUrl categories tags")
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
    input: UpdateUserProductInput,
    isAdmin: boolean = false,
  ): Promise<ProductDetail | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    // Check user trust level for moderation decisions
    const { isTrusted, needsReview } = await this.getUserTrustLevel(userId);

    // Build query: admins can edit any product, regular users can only edit their own
    const query: any = {
      _id: new mongoose.Types.ObjectId(id),
    };

    if (!isAdmin) {
      query.userId = new mongoose.Types.ObjectId(userId); // Ensure user owns it
    }

    // Separate availability payloads from other product fields
    const { storeAvailabilities, chainAvailabilities, ...productUpdateData } =
      input;

    // Persist chain availability selection on the product (so UI can show it later)
    if (chainAvailabilities !== undefined) {
      (productUpdateData as any).chainAvailabilities = chainAvailabilities.map(
        (c) => ({
          chainId: new mongoose.Types.ObjectId(c.chainId),
          includeRelatedCompany: c.includeRelatedCompany !== false,
          priceRange: c.priceRange,
        }),
      );
    }

    const product = await UserProduct.findOneAndUpdate(
      query,
      { $set: productUpdateData },
      { new: true, lean: true },
    );

    if (!product) {
      return null;
    }

    // Update availability entries if provided
    if (
      storeAvailabilities !== undefined ||
      chainAvailabilities !== undefined
    ) {
      const productId = new mongoose.Types.ObjectId(id);

      // Delete existing availability entries for this product
      await Availability.deleteMany({ productId });

      const storeToPrice = new Map<string, string | undefined>();
      for (const avail of storeAvailabilities || []) {
        if (!mongoose.Types.ObjectId.isValid(avail.storeId)) continue;
        storeToPrice.set(avail.storeId, avail.priceRange);
      }

      const chainAvails = chainAvailabilities || [];
      if (chainAvails.length > 0) {
        const chainIdsToFetch: mongoose.Types.ObjectId[] = [];
        const chainPriceByChainId = new Map<string, string | undefined>();

        for (const ca of chainAvails) {
          const includeRelatedCompany = ca.includeRelatedCompany !== false;
          const relatedChainIds = await getRelatedChainIds(
            ca.chainId,
            includeRelatedCompany,
          );
          relatedChainIds.forEach((id) => {
            chainIdsToFetch.push(id);
            chainPriceByChainId.set(id.toString(), ca.priceRange);
          });
        }

        const uniqueChainIds = [
          ...new Map(chainIdsToFetch.map((id) => [id.toString(), id])).values(),
        ];

        if (uniqueChainIds.length > 0) {
          const stores = await Store.find({
            chainId: { $in: uniqueChainIds },
            type: "brick_and_mortar",
          })
            .select("_id chainId")
            .lean();

          for (const s of stores as any[]) {
            const storeIdStr = s._id.toString();
            if (storeToPrice.has(storeIdStr)) continue;
            const chainIdStr = s.chainId?.toString();
            const chainPrice = chainIdStr
              ? chainPriceByChainId.get(chainIdStr)
              : undefined;
            storeToPrice.set(storeIdStr, chainPrice);
          }
        }
      }

      const storeIds = Array.from(storeToPrice.keys());

      if (storeIds.length > 0) {
        const availabilityEntries = storeIds.map((storeId) => ({
          productId,
          storeId: new mongoose.Types.ObjectId(storeId),
          moderationStatus: isTrusted
            ? ("confirmed" as const)
            : ("pending" as const),
          priceRange: storeToPrice.get(storeId),
          lastConfirmedAt: new Date(),
          source: "user_contribution" as const,
          reportedBy: new mongoose.Types.ObjectId(userId),
          isStale: false,
          needsReview: needsReview,
          trustedContribution: isTrusted,
        }));

        await Availability.insertMany(availabilityEntries, {
          ordered: false,
        }).catch((error: any) => {
          // Ignore duplicate key errors
          if (error.code !== 11000) {
            console.error("Error creating availability entries:", error);
          }
        });
      }
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
      productId:
        product._id instanceof mongoose.Types.ObjectId
          ? product._id
          : new mongoose.Types.ObjectId(product._id),
    }).lean();

    const storeIds = availabilities
      .map((a) => a.storeId)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const stores =
      storeIds.length > 0
        ? await Store.find({ _id: { $in: storeIds } }).lean()
        : [];

    const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

    // Get chain info for stores that have chains
    const chainIds = [
      ...new Set(
        stores
          .map((s) => s.chainId?.toString())
          .filter((id): id is string => !!id),
      ),
    ];

    let chainMap = new Map<
      string,
      { id: string; name: string; slug: string }
    >();
    if (chainIds.length > 0) {
      const { StoreChain } = await import("../models");
      const chains = await StoreChain.find({
        _id: { $in: chainIds },
      }).lean();

      chains.forEach((c) => {
        chainMap.set(c._id.toString(), {
          id: c._id.toString(),
          name: c.name,
          slug: c.slug,
        });
      });
    }

    const availabilityInfo: AvailabilityInfo[] = availabilities.map((avail) => {
      const storeIdStr = avail.storeId.toString();
      const store = storeMap.get(storeIdStr);
      const chainInfo = store?.chainId
        ? chainMap.get(store.chainId.toString())
        : undefined;

      return {
        storeId: storeIdStr,
        storeName: store?.name || "Unknown Store",
        storeType: store?.type || "unknown",
        regionOrScope: store?.regionOrScope || "Unknown",
        status: avail.moderationStatus || "pending",
        priceRange: avail.priceRange,
        lastConfirmedAt: avail.lastConfirmedAt,
        source: avail.source || "user_contribution",
        // Location details
        address: store?.address,
        city: store?.city,
        state: store?.state,
        zipCode: store?.zipCode,
        // Chain info
        chainId: store?.chainId?.toString(),
        locationIdentifier: store?.locationIdentifier,
        chain: chainInfo,
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
      _source: "user_contribution",
      _userId: product.userId?.toString(),
    };
  },
};
