import { httpClient } from './httpClient';

export interface CityPageData {
	slug: string;
	cityName: string;
	state: string;
	headline: string;
	description: string;
	isActive: boolean;
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

export const citiesApi = {
	/**
	 * Get all active city landing pages
	 */
	getActiveCities(): Promise<{ cities: CityPageData[] }> {
		return httpClient.get<{ cities: CityPageData[] }>('/cities');
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
		return httpClient.get<{ stores: CityStore[] }>(
			`/cities/${slug}/stores`
		);
	},

	/**
	 * Get products available at city stores
	 */
	getCityProducts(
		slug: string,
		page?: number,
		limit?: number
	): Promise<CityProductsResponse> {
		const params = new URLSearchParams();
		if (page) params.set('page', page.toString());
		if (limit) params.set('limit', limit.toString());
		const query = params.toString();
		return httpClient.get<CityProductsResponse>(
			`/cities/${slug}/products${query ? `?${query}` : ''}`
		);
	},

	/**
	 * Get products at a specific store in a city
	 */
	getStoreProducts(
		slug: string,
		storeId: string
	): Promise<{ products: StoreProduct[] }> {
		return httpClient.get<{ products: StoreProduct[] }>(
			`/cities/${slug}/stores/${storeId}/products`
		);
	},
};
