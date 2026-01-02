import { httpClient } from './httpClient';
import {
	ProductListResponse,
	ProductDetail,
	ProductFilters,
	CategoriesResponse,
	TagsResponse,
	ProductSummary,
} from '../types';

function buildQueryString(filters: ProductFilters): string {
	const params = new URLSearchParams();

	if (filters.q) params.set('q', filters.q);
	if (filters.category) params.set('category', filters.category);
	if (filters.tag) params.set('tag', filters.tag);
	if (filters.brand) params.set('brand', filters.brand);
	if (filters.minRating)
		params.set('minRating', filters.minRating.toString());
	if (filters.page) params.set('page', filters.page.toString());
	if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());
	// Location-based filtering
	if (filters.city) params.set('city', filters.city);
	if (filters.state) params.set('state', filters.state);

	const queryString = params.toString();
	return queryString ? `?${queryString}` : '';
}

export const productsApi = {
	getProducts(filters: ProductFilters = {}, bustCache?: boolean): Promise<ProductListResponse> {
		const params = new URLSearchParams(buildQueryString(filters).replace('?', ''));
		if (bustCache) params.set('_t', Date.now().toString());
		const query = params.toString() ? `?${params.toString()}` : '';
		return httpClient.get<ProductListResponse>(`/products${query}`);
	},

	getProductById(
		id: string,
		options?: { refreshAvailability?: boolean; bustCache?: boolean }
	): Promise<{ product: ProductDetail }> {
		const params = new URLSearchParams();
		if (options?.refreshAvailability) params.set('refresh', 'true');
		if (options?.bustCache) params.set('_t', Date.now().toString());
		const query = params.toString() ? `?${params.toString()}` : '';
		return httpClient.get<{ product: ProductDetail }>(
			`/products/${id}${query}`
		);
	},

	getCategories(): Promise<CategoriesResponse> {
		return httpClient.get<CategoriesResponse>('/products/categories');
	},

	getAllCategories(): Promise<CategoriesResponse> {
		return httpClient.get<CategoriesResponse>('/products/categories/all');
	},

	getTags(): Promise<TagsResponse> {
		return httpClient.get<TagsResponse>('/products/tags');
	},

	getAllTags(): Promise<TagsResponse> {
		return httpClient.get<TagsResponse>('/products/tags/all');
	},

	getFeaturedProducts(
		limit?: number,
		bustCache?: boolean
	): Promise<{ products: ProductSummary[] }> {
		const params = new URLSearchParams();
		if (limit) params.set('limit', limit.toString());
		if (bustCache) params.set('_t', Date.now().toString());
		const query = params.toString() ? `?${params.toString()}` : '';
		return httpClient.get<{ products: ProductSummary[] }>(
			`/products/featured${query}`
		);
	},

	getDiscoverProducts(
		limit?: number,
		bustCache?: boolean
	): Promise<{ products: ProductSummary[] }> {
		const params = new URLSearchParams();
		if (limit) params.set('limit', limit.toString());
		if (bustCache) params.set('_t', Date.now().toString());
		const query = params.toString() ? `?${params.toString()}` : '';
		return httpClient.get<{ products: ProductSummary[] }>(
			`/products/discover${query}`
		);
	},

	// Report availability
	reportAvailability(
		productId: string,
		storeId: string,
		priceRange?: string,
		notes?: string
	): Promise<{ message: string; isUpdate: boolean }> {
		return httpClient.post<{ message: string; isUpdate: boolean }>(
			`/products/${productId}/report-availability`,
			{ storeId, priceRange, notes }
		);
	},

	// Confirm availability (user confirms product is still at store)
	confirmAvailability(
		productId: string,
		storeId: string
	): Promise<{ message: string; lastConfirmedAt: string }> {
		return httpClient.post<{ message: string; lastConfirmedAt: string }>(
			`/products/${productId}/confirm-availability`,
			{ storeId }
		);
	},

	// Get stores grouped by city for availability reporting
	getStoresByCity(
		city?: string,
		state?: string
	): Promise<StoresByCityResponse> {
		const params = new URLSearchParams();
		if (city) params.set('city', city);
		if (state) params.set('state', state);
		const query = params.toString() ? `?${params.toString()}` : '';
		return httpClient.get<StoresByCityResponse>(
			`/products/stores-by-city${query}`
		);
	},

	// Get stores where a brand's products are available
	getBrandStores(brandName: string): Promise<BrandStoresResponse> {
		return httpClient.get<BrandStoresResponse>(
			`/products/brand/${encodeURIComponent(brandName)}/stores`
		);
	},
};

// Types for stores by city
export interface StoreLocation {
	city: string;
	state: string; // Can be empty for "Online Retailers" or "Other Locations"
	stores: {
		id: string;
		name: string;
		address?: string;
		chainName?: string;
	}[];
}

export interface StoresByCityResponse {
	locations: StoreLocation[];
}

// Types for brand stores
export interface BrandStore {
	id: string;
	name: string;
	type: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	latitude?: number;
	longitude?: number;
	locationIdentifier?: string;
}

export interface BrandChainGroup {
	chain: {
		id: string;
		name: string;
		slug: string;
		logoUrl?: string;
	};
	stores: BrandStore[];
}

export interface BrandStoresResponse {
	chainGroups: BrandChainGroup[];
	independentStores: BrandStore[];
	onlineStores: BrandStore[];
	totalStores: number;
}
