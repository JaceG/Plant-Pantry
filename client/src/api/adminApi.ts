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

export interface FeaturedProduct {
	id: string;
	name: string;
	brand: string;
	sizeOrVariant: string;
	imageUrl?: string;
	categories: string[];
	tags: string[];
	featured: boolean;
	featuredOrder: number;
	featuredAt?: string;
}

export interface AdminCityPage {
	slug: string;
	cityName: string;
	state: string;
	headline: string;
	description: string;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface StoreAvailabilityProduct {
	availabilityId: string;
	productId: string;
	name: string;
	brand: string;
	sizeOrVariant: string;
	imageUrl?: string;
	categories: string[];
	priceRange?: string;
	status: string;
	source: string;
	lastConfirmedAt?: string;
	createdAt?: string;
}

export interface StoreAvailabilityResponse {
	store: {
		id: string;
		name: string;
		city?: string;
		state?: string;
	};
	products: StoreAvailabilityProduct[];
	totalCount: number;
}

export interface CityStore {
	id: string;
	name: string;
	type: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	websiteUrl?: string;
	phoneNumber?: string;
	productCount: number;
}

export interface CityStoresResponse {
	stores: CityStore[];
	city: {
		cityName: string;
		state: string;
	};
}

export interface CityProductAvailability {
	storeId: string;
	storeName: string;
	priceRange?: string;
}

export interface CityProduct {
	id: string;
	name: string;
	brand: string;
	sizeOrVariant: string;
	imageUrl?: string;
	categories: string[];
	storeCount: number;
	storeNames: string[];
	availabilities: CityProductAvailability[];
}

export interface CityProductsResponse {
	products: CityProduct[];
	totalCount: number;
	city: {
		cityName: string;
		state: string;
	};
}

export interface CreateCityPageInput {
	slug: string;
	cityName: string;
	state: string;
	headline: string;
	description: string;
	isActive?: boolean;
	featuredStoreIds?: string[];
}

export interface UpdateCityPageInput {
	cityName?: string;
	state?: string;
	headline?: string;
	description?: string;
	isActive?: boolean;
	featuredStoreIds?: string[];
}

export const adminApi = {
	getDashboardStats(): Promise<{ stats: DashboardStats }> {
		return httpClient.get<{ stats: DashboardStats }>('/admin/dashboard');
	},

	getPendingProducts(
		page: number = 1,
		pageSize: number = 20
	): Promise<PaginatedResponse<PendingProduct>> {
		return httpClient.get<PaginatedResponse<PendingProduct>>(
			`/admin/products/pending?page=${page}&pageSize=${pageSize}`
		);
	},

	approveProduct(productId: string): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/products/${productId}/approve`,
			{}
		);
	},

	rejectProduct(
		productId: string,
		reason?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/products/${productId}/reject`,
			{ reason }
		);
	},

	getUsers(
		page: number = 1,
		pageSize: number = 20
	): Promise<PaginatedResponse<AdminUser>> {
		return httpClient.get<PaginatedResponse<AdminUser>>(
			`/admin/users?page=${page}&pageSize=${pageSize}`
		);
	},

	updateUserRole(
		userId: string,
		role: 'user' | 'admin' | 'moderator'
	): Promise<{ message: string }> {
		return httpClient.put<{ message: string }>(
			`/admin/users/${userId}/role`,
			{ role }
		);
	},

	getStores(
		page: number = 1,
		pageSize: number = 20,
		type?: string
	): Promise<PaginatedResponse<AdminStore>> {
		let url = `/admin/stores?page=${page}&pageSize=${pageSize}`;
		if (type) url += `&type=${type}`;
		return httpClient.get<PaginatedResponse<AdminStore>>(url);
	},

	deleteStore(storeId: string): Promise<{ message: string }> {
		return httpClient.delete<{ message: string }>(
			`/admin/stores/${storeId}`
		);
	},

	getArchivedProducts(
		page: number = 1,
		pageSize: number = 20
	): Promise<PaginatedResponse<AdminProduct>> {
		return httpClient.get<PaginatedResponse<AdminProduct>>(
			`/admin/products/archived?page=${page}&pageSize=${pageSize}`
		);
	},

	getUserGeneratedProducts(
		page: number = 1,
		pageSize: number = 20
	): Promise<PaginatedResponse<AdminProduct>> {
		return httpClient.get<PaginatedResponse<AdminProduct>>(
			`/admin/products/user-generated?page=${page}&pageSize=${pageSize}`
		);
	},

	archiveProduct(productId: string): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/products/${productId}/archive`,
			{}
		);
	},

	unarchiveProduct(productId: string): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/products/${productId}/unarchive`,
			{}
		);
	},

	getFilters(
		type: 'category' | 'tag',
		page: number = 1,
		pageSize: number = 50
	): Promise<
		PaginatedResponse<{
			value: string;
			displayName?: string;
			archived: boolean;
			archivedAt?: string;
		}>
	> {
		return httpClient.get<
			PaginatedResponse<{
				value: string;
				displayName?: string;
				archived: boolean;
				archivedAt?: string;
			}>
		>(`/admin/filters?type=${type}&page=${page}&pageSize=${pageSize}`);
	},

	archiveFilter(
		type: 'category' | 'tag',
		value: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>('/admin/filters/archive', {
			type,
			value,
		});
	},

	unarchiveFilter(
		type: 'category' | 'tag',
		value: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			'/admin/filters/unarchive',
			{ type, value }
		);
	},

	setFilterDisplayName(
		type: 'category' | 'tag',
		value: string,
		displayName: string
	): Promise<{ message: string }> {
		return httpClient.put<{ message: string }>(
			'/admin/filters/display-name',
			{ type, value, displayName }
		);
	},

	removeFilterDisplayName(
		type: 'category' | 'tag',
		value: string
	): Promise<{ message: string }> {
		const params = new URLSearchParams({ type, value });
		return httpClient.delete<{ message: string }>(
			`/admin/filters/display-name?${params.toString()}`
		);
	},

	// Featured Products
	getFeaturedProducts(): Promise<{ products: FeaturedProduct[] }> {
		return httpClient.get<{ products: FeaturedProduct[] }>(
			'/admin/featured-products'
		);
	},

	featureProduct(
		productId: string,
		featured: boolean
	): Promise<{ message: string }> {
		return httpClient.put<{ message: string }>(
			`/admin/products/${productId}/feature`,
			{ featured }
		);
	},

	updateFeatureOrder(
		productId: string,
		order: number
	): Promise<{ message: string }> {
		return httpClient.put<{ message: string }>(
			`/admin/products/${productId}/feature-order`,
			{ order }
		);
	},

	reorderFeaturedProducts(
		productIds: string[]
	): Promise<{ message: string }> {
		return httpClient.put<{ message: string }>(
			'/admin/featured-products/reorder',
			{ productIds }
		);
	},

	// City Landing Pages
	getCityPages(): Promise<{ cityPages: AdminCityPage[] }> {
		return httpClient.get<{ cityPages: AdminCityPage[] }>(
			'/admin/city-pages'
		);
	},

	getCityPage(slug: string): Promise<{ cityPage: AdminCityPage }> {
		return httpClient.get<{ cityPage: AdminCityPage }>(
			`/admin/city-pages/${slug}`
		);
	},

	createCityPage(
		data: CreateCityPageInput
	): Promise<{ message: string; cityPage: AdminCityPage }> {
		return httpClient.post<{ message: string; cityPage: AdminCityPage }>(
			'/admin/city-pages',
			data
		);
	},

	updateCityPage(
		slug: string,
		data: UpdateCityPageInput
	): Promise<{ message: string; cityPage: AdminCityPage }> {
		return httpClient.put<{ message: string; cityPage: AdminCityPage }>(
			`/admin/city-pages/${slug}`,
			data
		);
	},

	deleteCityPage(slug: string): Promise<{ message: string }> {
		return httpClient.delete<{ message: string }>(
			`/admin/city-pages/${slug}`
		);
	},

	// City Page Stores Management
	getCityStores(slug: string): Promise<CityStoresResponse> {
		return httpClient.get<CityStoresResponse>(
			`/admin/city-pages/${slug}/stores`
		);
	},

	addStoreToCity(
		slug: string,
		data: {
			storeId?: string;
			name?: string;
			type?: string;
			address?: string;
			zipCode?: string;
			websiteUrl?: string;
			phoneNumber?: string;
		}
	): Promise<{ message: string; store: any }> {
		return httpClient.post<{ message: string; store: any }>(
			`/admin/city-pages/${slug}/stores`,
			data
		);
	},

	removeStoreFromCity(
		slug: string,
		storeId: string
	): Promise<{ message: string }> {
		return httpClient.delete<{ message: string }>(
			`/admin/city-pages/${slug}/stores/${storeId}`
		);
	},

	getCityProducts(slug: string): Promise<CityProductsResponse> {
		return httpClient.get<CityProductsResponse>(
			`/admin/city-pages/${slug}/products`
		);
	},

	addProductToCity(
		slug: string,
		productId: string,
		storeId: string,
		priceRange?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/city-pages/${slug}/products`,
			{ productId, storeId, priceRange }
		);
	},

	removeProductFromCity(
		slug: string,
		productId: string,
		storeId?: string
	): Promise<{ message: string }> {
		const url = storeId
			? `/admin/city-pages/${slug}/products/${productId}?storeId=${storeId}`
			: `/admin/city-pages/${slug}/products/${productId}`;
		return httpClient.delete<{ message: string }>(url);
	},

	// Store Availability Management
	getStoreAvailability(storeId: string): Promise<StoreAvailabilityResponse> {
		return httpClient.get<StoreAvailabilityResponse>(
			`/admin/stores/${storeId}/availability`
		);
	},

	addProductToStore(
		storeId: string,
		productId: string,
		priceRange?: string
	): Promise<{ message: string; availability: any }> {
		return httpClient.post<{ message: string; availability: any }>(
			`/admin/stores/${storeId}/availability`,
			{ productId, priceRange }
		);
	},

	updateStoreAvailability(
		storeId: string,
		productId: string,
		data: { priceRange?: string; status?: string }
	): Promise<{ message: string; availability: any }> {
		return httpClient.put<{ message: string; availability: any }>(
			`/admin/stores/${storeId}/availability/${productId}`,
			data
		);
	},

	removeProductFromStore(
		storeId: string,
		productId: string
	): Promise<{ message: string }> {
		return httpClient.delete<{ message: string }>(
			`/admin/stores/${storeId}/availability/${productId}`
		);
	},

	addProductsToStoreBulk(
		storeId: string,
		productIds: string[]
	): Promise<{ message: string; added: number; skipped: number }> {
		return httpClient.post<{
			message: string;
			added: number;
			skipped: number;
		}>(`/admin/stores/${storeId}/availability/bulk`, { productIds });
	},
};
