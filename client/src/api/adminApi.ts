import { httpClient } from './httpClient';

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
  createdAt: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  brand: string;
  sizeOrVariant: string;
  categories: string[];
  tags: string[];
  imageUrl?: string;
  archived: boolean;
  archivedAt?: string;
  source: 'api' | 'user_contribution';
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  createdAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
  productsContributed: number;
}

export interface AdminStore {
  id: string;
  name: string;
  type: string;
  regionOrScope: string;
  address?: string;
  city?: string;
  state?: string;
  websiteUrl?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const adminApi = {
  getDashboardStats(): Promise<{ stats: DashboardStats }> {
    return httpClient.get<{ stats: DashboardStats }>('/admin/dashboard');
  },

  getPendingProducts(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<PendingProduct>> {
    return httpClient.get<PaginatedResponse<PendingProduct>>(`/admin/products/pending?page=${page}&pageSize=${pageSize}`);
  },

  approveProduct(productId: string): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>(`/admin/products/${productId}/approve`, {});
  },

  rejectProduct(productId: string, reason?: string): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>(`/admin/products/${productId}/reject`, { reason });
  },

  getUsers(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<AdminUser>> {
    return httpClient.get<PaginatedResponse<AdminUser>>(`/admin/users?page=${page}&pageSize=${pageSize}`);
  },

  updateUserRole(userId: string, role: 'user' | 'admin' | 'moderator'): Promise<{ message: string }> {
    return httpClient.put<{ message: string }>(`/admin/users/${userId}/role`, { role });
  },

  getStores(page: number = 1, pageSize: number = 20, type?: string): Promise<PaginatedResponse<AdminStore>> {
    let url = `/admin/stores?page=${page}&pageSize=${pageSize}`;
    if (type) url += `&type=${type}`;
    return httpClient.get<PaginatedResponse<AdminStore>>(url);
  },

  deleteStore(storeId: string): Promise<{ message: string }> {
    return httpClient.delete<{ message: string }>(`/admin/stores/${storeId}`);
  },

  getArchivedProducts(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<AdminProduct>> {
    return httpClient.get<PaginatedResponse<AdminProduct>>(`/admin/products/archived?page=${page}&pageSize=${pageSize}`);
  },

  getUserGeneratedProducts(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<AdminProduct>> {
    return httpClient.get<PaginatedResponse<AdminProduct>>(`/admin/products/user-generated?page=${page}&pageSize=${pageSize}`);
  },

  archiveProduct(productId: string): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>(`/admin/products/${productId}/archive`, {});
  },

  unarchiveProduct(productId: string): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>(`/admin/products/${productId}/unarchive`, {});
  },

  getFilters(type: 'category' | 'tag', page: number = 1, pageSize: number = 50): Promise<PaginatedResponse<{ value: string; displayName?: string; archived: boolean; archivedAt?: string }>> {
    return httpClient.get<PaginatedResponse<{ value: string; displayName?: string; archived: boolean; archivedAt?: string }>>(`/admin/filters?type=${type}&page=${page}&pageSize=${pageSize}`);
  },

  archiveFilter(type: 'category' | 'tag', value: string): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>('/admin/filters/archive', { type, value });
  },

  unarchiveFilter(type: 'category' | 'tag', value: string): Promise<{ message: string }> {
    return httpClient.post<{ message: string }>('/admin/filters/unarchive', { type, value });
  },

  setFilterDisplayName(type: 'category' | 'tag', value: string, displayName: string): Promise<{ message: string }> {
    return httpClient.put<{ message: string }>('/admin/filters/display-name', { type, value, displayName });
  },

  removeFilterDisplayName(type: 'category' | 'tag', value: string): Promise<{ message: string }> {
    return httpClient.delete<{ message: string }>('/admin/filters/display-name', { type, value });
  },
};

