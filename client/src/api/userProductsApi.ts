import { httpClient } from './httpClient';
import { ProductDetail, ProductListResponse, CreateUserProductInput } from '../types/product';

export const userProductsApi = {
  createProduct(input: CreateUserProductInput): Promise<{ product: ProductDetail }> {
    return httpClient.post<{ product: ProductDetail }>('/user-products', input);
  },

  getUserProducts(): Promise<ProductListResponse> {
    return httpClient.get<ProductListResponse>('/user-products');
  },

  getUserProductById(id: string): Promise<{ product: ProductDetail }> {
    return httpClient.get<{ product: ProductDetail }>(`/user-products/${id}`);
  },

  updateProduct(id: string, input: Partial<CreateUserProductInput>): Promise<{ product: ProductDetail }> {
    return httpClient.put<{ product: ProductDetail }>(`/user-products/${id}`, input);
  },

  deleteProduct(id: string): Promise<{ message: string }> {
    return httpClient.delete<{ message: string }>(`/user-products/${id}`);
  },
};

