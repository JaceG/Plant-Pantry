export interface ProductSummary {
  id: string;
  name: string;
  brand: string;
  sizeOrVariant: string;
  imageUrl?: string;
  categories: string[];
  tags: string[];
}

export interface ProductListResponse {
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
  lastConfirmedAt?: string;
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
  createdAt: string;
  updatedAt: string;
  availability: AvailabilityInfo[];
  _source?: 'api' | 'user_contribution';
  _userId?: string;
  _archived?: boolean;
  _archivedAt?: string;
}

export interface StoreAvailabilityInput {
  storeId: string;
  priceRange?: string;
  status?: 'known' | 'user_reported' | 'unknown';
}

export interface CreateUserProductInput {
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

export interface ProductFilters {
  q?: string;
  category?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export interface CategoriesResponse {
  categories: string[];
}

export interface TagsResponse {
  tags: string[];
}

