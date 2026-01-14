import { httpClient } from "./httpClient";

export interface CityPageData {
  slug: string;
  cityName: string;
  state: string;
  headline: string;
  description: string;
  isActive: boolean;
}

export interface ChainInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface CityStore {
  id: string;
  name: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  websiteUrl?: string;
  phoneNumber?: string;
  productCount?: number;
  // Chain info
  chainId?: string;
  locationIdentifier?: string;
  chain?: ChainInfo;
}

export interface CityChainGroup {
  chain: ChainInfo;
  stores: CityStore[];
  totalProductCount: number;
}

export interface CityStoresGrouped {
  chainGroups: CityChainGroup[];
  independentStores: CityStore[];
}

export interface CityProduct {
  id: string;
  name: string;
  brand: string;
  sizeOrVariant: string;
  imageUrl?: string;
  categories: string[];
  tags: string[];
  averageRating?: number;
  reviewCount?: number;
  storeNames: string[];
}

export interface StoreProduct {
  id: string;
  name: string;
  brand: string;
  sizeOrVariant: string;
  imageUrl?: string;
  categories: string[];
  tags: string[];
  averageRating?: number;
  reviewCount?: number;
  priceRange?: string;
}

export interface CityProductsResponse {
  products: CityProduct[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export type CityContentEditField = "cityName" | "headline" | "description";

export interface ContentEditSubmission {
  field: CityContentEditField;
  suggestedValue: string;
  reason?: string;
}

export interface StoreSuggestion {
  name: string;
  type?: string;
  address?: string;
  zipCode?: string;
  websiteUrl?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
}

export interface ProductAvailabilityReport {
  productId: string;
  priceRange?: string;
  notes?: string;
}

export interface UserContributions {
  contentEdits: Array<{
    id: string;
    field: string;
    originalValue: string;
    suggestedValue: string;
    status: string;
    createdAt: string;
  }>;
  stores: Array<{
    id: string;
    name: string;
    moderationStatus: string;
    createdAt: string;
  }>;
  availabilityReports: Array<{
    id: string;
    productId: string;
    storeId: string;
    moderationStatus: string;
    createdAt: string;
  }>;
}

export const citiesApi = {
  /**
   * Reverse geocode coordinates to city/state using Google Maps API
   */
  reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<{ city: string | null; state: string | null }> {
    return httpClient.get<{ city: string | null; state: string | null }>(
      `/cities/geocode?lat=${lat}&lng=${lng}`,
    );
  },

  /**
   * Get all active city landing pages
   */
  getActiveCities(): Promise<{ cities: CityPageData[] }> {
    return httpClient.get<{ cities: CityPageData[] }>("/cities");
  },

  /**
   * Get city landing page data
   */
  getCityPage(slug: string): Promise<{ city: CityPageData }> {
    return httpClient.get<{ city: CityPageData }>(`/cities/${slug}`);
  },

  /**
   * Get stores in a city
   */
  getCityStores(slug: string): Promise<{ stores: CityStore[] }> {
    return httpClient.get<{ stores: CityStore[] }>(`/cities/${slug}/stores`);
  },

  /**
   * Get stores in a city grouped by chain
   */
  getCityStoresGrouped(slug: string): Promise<CityStoresGrouped> {
    return httpClient.get<CityStoresGrouped>(
      `/cities/${slug}/stores?grouped=true`,
    );
  },

  /**
   * Get products available at city stores
   */
  getCityProducts(
    slug: string,
    page?: number,
    limit?: number,
  ): Promise<CityProductsResponse> {
    const params = new URLSearchParams();
    if (page) params.set("page", page.toString());
    if (limit) params.set("limit", limit.toString());
    const query = params.toString();
    return httpClient.get<CityProductsResponse>(
      `/cities/${slug}/products${query ? `?${query}` : ""}`,
    );
  },

  /**
   * Get products at a specific store in a city
   */
  getStoreProducts(
    slug: string,
    storeId: string,
  ): Promise<{ products: StoreProduct[] }> {
    return httpClient.get<{ products: StoreProduct[] }>(
      `/cities/${slug}/stores/${storeId}/products`,
    );
  },

  // ============================================
  // USER CONTRIBUTION ENDPOINTS
  // ============================================

  /**
   * Submit a suggested edit to city page content
   */
  suggestEdit(
    slug: string,
    data: ContentEditSubmission,
  ): Promise<{
    message: string;
    edit: { id: string; field: string; status: string };
  }> {
    return httpClient.post(`/cities/${slug}/suggest-edit`, data);
  },

  /**
   * Suggest a new store in this city
   */
  suggestStore(
    slug: string,
    data: StoreSuggestion,
  ): Promise<{
    message: string;
    store: {
      id: string;
      name: string;
      city: string;
      state: string;
      moderationStatus: string;
    };
  }> {
    return httpClient.post(`/cities/${slug}/stores`, data);
  },

  /**
   * Report a product at a store
   */
  reportProductAtStore(
    slug: string,
    storeId: string,
    data: ProductAvailabilityReport,
  ): Promise<{
    message: string;
    isNew: boolean;
    availability?: { id: string; moderationStatus: string };
  }> {
    return httpClient.post(`/cities/${slug}/stores/${storeId}/products`, data);
  },

  /**
   * Get user's contributions for this city
   */
  getMyContributions(slug: string): Promise<UserContributions> {
    return httpClient.get<UserContributions>(
      `/cities/${slug}/my-contributions`,
    );
  },
};
