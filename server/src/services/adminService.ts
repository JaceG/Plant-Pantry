import mongoose from 'mongoose';
import { Product, UserProduct, Store, User, Availability, ArchivedFilter, FilterDisplayName, FilterType } from '../models';

export interface DashboardStats {
  products: {
    total: number;
    apiSourced: number;
    userContributed: number;
    pendingApproval: number;
  };
  stores: {
    total: number;
    physical: number;
    online: number;
    brandDirect: number;
  };
  users: {
    total: number;
    admins: number;
    moderators: number;
    regularUsers: number;
  };
  availability: {
    total: number;
    userContributed: number;
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
  categories: string[];
  imageUrl?: string;
  userId: string;
  userEmail?: string;
  createdAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
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

    // Run all queries in parallel
    const [
      apiProductsCount,
      userProductsCount,
      pendingProductsCount,
      physicalStoresCount,
      onlineStoresCount,
      brandDirectStoresCount,
      adminsCount,
      moderatorsCount,
      totalUsersCount,
      totalAvailabilityCount,
      userContributedAvailabilityCount,
      newProductsThisWeek,
      newUsersThisWeek,
      newStoresThisWeek,
    ] = await Promise.all([
      Product.countDocuments(),
      UserProduct.countDocuments({ status: 'approved' }),
      UserProduct.countDocuments({ status: 'pending' }),
      Store.countDocuments({ type: 'brick_and_mortar' }),
      Store.countDocuments({ type: 'online_retailer' }),
      Store.countDocuments({ type: 'brand_direct' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'moderator' }),
      User.countDocuments(),
      Availability.countDocuments(),
      Availability.countDocuments({ source: 'user_contribution' }),
      UserProduct.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      Store.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
    ]);

    return {
      products: {
        total: apiProductsCount + userProductsCount,
        apiSourced: apiProductsCount,
        userContributed: userProductsCount,
        pendingApproval: pendingProductsCount,
      },
      stores: {
        total: physicalStoresCount + onlineStoresCount + brandDirectStoresCount,
        physical: physicalStoresCount,
        online: onlineStoresCount,
        brandDirect: brandDirectStoresCount,
      },
      users: {
        total: totalUsersCount,
        admins: adminsCount,
        moderators: moderatorsCount,
        regularUsers: totalUsersCount - adminsCount - moderatorsCount,
      },
      availability: {
        total: totalAvailabilityCount,
        userContributed: userContributedAvailabilityCount,
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
  async getPendingProducts(page: number = 1, pageSize: number = 20): Promise<{
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
    const userIds = [...new Set(products.map(p => p.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id email')
      .lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u.email]));

    const items: PendingProduct[] = products.map(p => ({
      id: p._id.toString(),
      name: p.name,
      brand: p.brand,
      categories: p.categories,
      imageUrl: p.imageUrl,
      userId: p.userId.toString(),
      userEmail: userMap.get(p.userId.toString()),
      createdAt: p.createdAt,
    }));

    return { items, total, page, pageSize };
  },

  /**
   * Approve a pending product
   */
  async approveProduct(productId: string): Promise<boolean> {
    const result = await UserProduct.findByIdAndUpdate(
      productId,
      { status: 'approved' },
      { new: true }
    );
    return !!result;
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
      },
      { new: true }
    );
    return !!result;
  },

  /**
   * Get all users for admin management
   */
  async getUsers(page: number = 1, pageSize: number = 20): Promise<{
    items: AdminUser[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      User.find()
        .select('email displayName role createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      User.countDocuments(),
    ]);

    // Get product counts for each user
    const userIds = users.map(u => u._id);
    const productCounts = await UserProduct.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(productCounts.map(pc => [pc._id.toString(), pc.count]));

    const items: AdminUser[] = users.map(u => ({
      id: u._id.toString(),
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      productsContributed: countMap.get(u._id.toString()) || 0,
    }));

    return { items, total, page, pageSize };
  },

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: 'user' | 'admin' | 'moderator'): Promise<boolean> {
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
  async getStores(page: number = 1, pageSize: number = 20, type?: string): Promise<{
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

    const items = stores.map(s => ({
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
   * Archive a product (API or UserProduct)
   */
  async archiveProduct(productId: string, archivedBy: string): Promise<boolean> {
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

    const [apiProducts, userProducts, apiCount, userCount] = await Promise.all([
      Product.find({ archived: true })
        .select('name brand sizeOrVariant imageUrl categories tags archived archivedAt')
        .sort({ archivedAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      UserProduct.find({ archived: true, status: 'approved' })
        .select('name brand sizeOrVariant imageUrl categories tags archived archivedAt')
        .sort({ archivedAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Product.countDocuments({ archived: true }),
      UserProduct.countDocuments({ archived: true, status: 'approved' }),
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
      return (b.archivedAt?.getTime() || 0) - (a.archivedAt?.getTime() || 0);
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
        .select('name brand sizeOrVariant imageUrl categories tags archived archivedAt userId createdAt')
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
    const userIds = [...new Set(userProducts.map(p => p.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id email displayName')
      .lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

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
    items: Array<{ value: string; displayName?: string; archived: boolean; archivedAt?: Date }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const skip = (page - 1) * pageSize;

    // Get all unique filter values from products
    const allFilters = type === 'category'
      ? await Product.distinct('categories', { archived: { $ne: true } })
      : await Product.distinct('tags', { archived: { $ne: true } });

    // Get archived filters and display names
    const [archivedFilters, displayNames] = await Promise.all([
      ArchivedFilter.find({ type })
        .select('value archivedAt')
        .lean(),
      FilterDisplayName.find({ type })
        .select('value displayName')
        .lean(),
    ]);

    // Normalize archived filter values for comparison (remove en: prefix, replace dashes with spaces)
    const normalizedArchivedFilters = archivedFilters.map(f => ({
      original: f.value,
      normalized: f.value.replace(/^en:/, '').replace(/-/g, ' '),
      archivedAt: f.archivedAt,
    }));
    
    // Create sets/maps with both original and normalized values for lookup
    const archivedSet = new Set<string>();
    const archivedMap = new Map<string, Date>();
    normalizedArchivedFilters.forEach(f => {
      archivedSet.add(f.original);
      archivedSet.add(f.normalized);
      archivedMap.set(f.original, f.archivedAt);
      archivedMap.set(f.normalized, f.archivedAt);
    });
    const displayNameMap = new Map<string, string>();
    displayNames.forEach(dn => {
      const cleaned = dn.value.replace(/^en:/, '').replace(/-/g, ' ');
      displayNameMap.set(cleaned, dn.displayName);
      displayNameMap.set(dn.value.replace(/^en:/, ''), dn.displayName);
    });

    // Language prefixes to filter out (non-English)
    const nonEnglishPrefixes = /^(de|el|es|fr|nl|pt|zh):/i;
    
    // Filter out non-English language prefixes
    let uniqueFilters = [...new Set(allFilters)];
    uniqueFilters = uniqueFilters.filter(f => !nonEnglishPrefixes.test(f));
    
    // Also include archived filters that might not be in products anymore
    archivedFilters.forEach(archived => {
      const cleaned = archived.value.replace(/^en:/, '').replace(/-/g, ' ');
      if (!nonEnglishPrefixes.test(archived.value) && !uniqueFilters.includes(cleaned)) {
        uniqueFilters.push(cleaned);
      }
    });
    
    // Combine and deduplicate, then clean "en:" prefix and dashes
    uniqueFilters = uniqueFilters.map(f => {
      // If f already has spaces, it's already cleaned; otherwise clean it
      if (typeof f === 'string' && !f.includes(' ')) {
        return f.replace(/^en:/, '').replace(/-/g, ' ');
      }
      return f;
    });
    uniqueFilters = [...new Set(uniqueFilters)];

    // Create items with archived status and display names
    const items = uniqueFilters
      .map(value => {
        const originalValue = value; // This is the cleaned value
        const displayName = displayNameMap.get(value);
        // Check if archived (value is already normalized, so we can check directly)
        const isArchived = archivedSet.has(value);
        const archivedAt = archivedMap.get(value);
        
        return {
          value: originalValue,
          displayName,
          archived: isArchived,
          archivedAt: archivedAt ? (archivedAt instanceof Date ? archivedAt : new Date(archivedAt)) : undefined,
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
  async archiveFilter(type: FilterType, value: string, archivedBy: string): Promise<boolean> {
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
      value: { $in: [value, `en:${value}`, dashVersion, `en:${dashVersion}`] },
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
  async removeFilterDisplayName(type: FilterType, value: string): Promise<boolean> {
    const normalizedValue = value.replace(/^en:/, '').replace(/-/g, ' ');
    const result = await FilterDisplayName.deleteOne({ type, value: normalizedValue });
    return result.deletedCount > 0;
  },
};

