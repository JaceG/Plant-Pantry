import { httpClient } from './httpClient';
import { ProductListResponse, ProductDetail, ProductFilters, CategoriesResponse, TagsResponse } from '../types';

function buildQueryString(filters: ProductFilters): string {
  const params = new URLSearchParams();
  
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const productsApi = {
  getProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
    const query = buildQueryString(filters);
    return httpClient.get<ProductListResponse>(`/products${query}`);
  },
  
  getProductById(id: string, refreshAvailability?: boolean): Promise<{ product: ProductDetail }> {
    const query = refreshAvailability ? '?refresh=true' : '';
    return httpClient.get<{ product: ProductDetail }>(`/products/${id}${query}`);
  },
  
  getCategories(): Promise<CategoriesResponse> {
    return httpClient.get<CategoriesResponse>('/products/categories');
  },
  
  getTags(): Promise<TagsResponse> {
    return httpClient.get<TagsResponse>('/products/tags');
  },
};

