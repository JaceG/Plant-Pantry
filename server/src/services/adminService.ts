import { Product, UserProduct, Store, User, Availability } from '../models';

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
};

