export interface ProductSummary {
  id: string;
  name: string;
  brand: string;
  sizeOrVariant: string;
  imageUrl?: string;
  categories: string[];
  tags: string[];
  averageRating?: number;
  reviewCount?: number;
  // Availability summary
  storeCount?: number;
  chainNames?: string[];
}

export interface ProductListResponse {
  items: ProductSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AvailabilityChainInfo {
  id: string;
  name: string;
  slug: string;
}

// Crowd-sourced stock status (GasBuddy-style)
export type StockStatus = "in_stock" | "out_of_stock" | "unknown";

export interface AvailabilityInfo {
  storeId: string;
  storeName: string;
  storeType: string;
  regionOrScope: string;
  status: string;
  priceRange?: string;
  lastConfirmedAt?: string;
  source: string;
  // Store location details
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // Chain info
  chainId?: string;
  locationIdentifier?: string;
  chain?: AvailabilityChainInfo;
  // Crowd-sourced stock status
  stockStatus?: StockStatus;
  lastStockReportAt?: string;
  recentInStockCount?: number;
  recentOutOfStockCount?: number;
}

// Individual stock status report from a user
export interface StockStatusReport {
  id: string;
  status: "in_stock" | "out_of_stock";
  reportedAt: string;
  reportedBy: string;
  notes?: string;
}

// Response from the stock status endpoint
export interface StockStatusResponse {
  stockStatus: StockStatus;
  lastStockReportAt?: string;
  lastConfirmedAt?: string;
  recentInStockCount: number;
  recentOutOfStockCount: number;
  recentReports: StockStatusReport[];
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
  chainAvailabilities?: Array<{
    chainId: string;
    chainName: string;
    chainSlug: string;
    chainLogoUrl?: string;
    chainType?: "national" | "regional" | "local";
    locationCount: number;
    includeRelatedCompany: boolean;
    priceRange?: string;
  }>;
  averageRating?: number;
  reviewCount?: number;
  _source?: "api" | "user_contribution";
  _userId?: string;
  _archived?: boolean;
  _archivedAt?: string;
  _status?: "pending" | "approved" | "rejected"; // Moderation status for user products
}

export interface StoreAvailabilityInput {
  storeId: string;
  priceRange?: string;
  status?: "known" | "user_reported" | "unknown";
}

export interface ChainAvailabilityInput {
  chainId: string;
  /**
   * If true, treat this as "company-wide" and apply to related chain variants
   * (e.g. Walmart + Walmart Supercenter) when the backend expands it.
   */
  includeRelatedCompany?: boolean;
  priceRange?: string;
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
  chainAvailabilities?: ChainAvailabilityInput[];
}

export interface ProductFilters {
  q?: string;
  category?: string;
  tag?: string;
  brand?: string;
  minRating?: number;
  page?: number;
  pageSize?: number;
  // Location-based filtering
  city?: string;
  state?: string;
}

export interface CategoriesResponse {
  categories: string[];
}

export interface TagsResponse {
  tags: string[];
}
