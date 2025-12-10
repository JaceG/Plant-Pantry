import { httpClient } from './httpClient';

export interface DashboardStats {
	products: {
		total: number;
		apiSourced: number;
		userContributed: number;
		pendingApproval: number;
		trustedPendingReview: number;
	};
	stores: {
		total: number;
		physical: number;
		online: number;
		brandDirect: number;
		pendingApproval: number;
		trustedPendingReview: number;
	};
	users: {
		total: number;
		admins: number;
		moderators: number;
		regularUsers: number;
		trustedContributors: number;
	};
	availability: {
		total: number;
		userContributed: number;
		pendingApproval: number;
		trustedPendingReview: number;
	};
	reviews: {
		total: number;
		pendingApproval: number;
		approved: number;
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
	trustedContributor?: boolean;
}

export interface AdminStore {
	id: string;
	name: string;
	type: string;
	regionOrScope: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	phoneNumber?: string;
	websiteUrl?: string;
	createdAt: string;
	// Chain fields
	chainId?: string;
	locationIdentifier?: string;
	chain?: {
		id: string;
		name: string;
		slug: string;
		logoUrl?: string;
	};
}

export interface AdminStoreChain {
	id: string;
	name: string;
	slug: string;
	logoUrl?: string;
	websiteUrl?: string;
	type: 'national' | 'regional' | 'local';
	isActive: boolean;
	locationCount: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface StoresGroupedResponse {
	chains: Array<{
		chain: {
			id: string;
			name: string;
			slug: string;
			logoUrl?: string;
		};
		stores: AdminStore[];
		locationCount: number;
	}>;
	independentStores: AdminStore[];
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
	pendingCount?: number;
	totalCount?: number;
}

// Store product with full moderation details
export interface StoreProductWithModeration {
	availabilityId: string;
	productId: string;
	name: string;
	brand: string;
	sizeOrVariant: string;
	imageUrl?: string;
	categories: string[];
	productType: 'api' | 'user';
	archived?: boolean;
	// Availability details
	source:
		| 'admin'
		| 'user_contribution'
		| 'seed_data'
		| 'api_fetch'
		| 'store_api';
	moderationStatus: 'confirmed' | 'pending' | 'rejected';
	priceRange?: string;
	notes?: string;
	lastConfirmedAt?: string;
	createdAt?: string;
	// Reporter info
	reportedBy?: {
		id: string;
		email: string;
		displayName?: string;
	};
	// Moderator info
	moderatedBy?: {
		id: string;
		email: string;
		displayName?: string;
	};
	moderatedAt?: string;
}

export interface StoreProductsResponse {
	store: {
		id: string;
		name: string;
		type: string;
		address?: string;
		city?: string;
		state?: string;
		zipCode?: string;
		websiteUrl?: string;
		phoneNumber?: string;
	};
	products: StoreProductWithModeration[];
	statusCounts: {
		confirmed: number;
		pending: number;
		rejected: number;
	};
	totalCount: number;
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

	updateStore(
		storeId: string,
		updates: {
			name?: string;
			type?: 'brick_and_mortar' | 'online_retailer' | 'brand_direct';
			regionOrScope?: string;
			websiteUrl?: string;
			address?: string;
			city?: string;
			state?: string;
			zipCode?: string;
			country?: string;
			phoneNumber?: string;
			chainId?: string | null;
			locationIdentifier?: string;
		}
	): Promise<{ store: AdminStore }> {
		return httpClient.put<{ store: AdminStore }>(
			`/admin/stores/${storeId}`,
			updates
		);
	},

	// Store Chains
	getChains(includeInactive = false): Promise<{ chains: AdminStoreChain[] }> {
		const url = includeInactive
			? '/admin/chains?includeInactive=true'
			: '/admin/chains';
		return httpClient.get<{ chains: AdminStoreChain[] }>(url);
	},

	getChain(chainId: string): Promise<{ chain: AdminStoreChain }> {
		return httpClient.get<{ chain: AdminStoreChain }>(
			`/admin/chains/${chainId}`
		);
	},

	createChain(data: {
		name: string;
		slug?: string;
		logoUrl?: string;
		websiteUrl?: string;
		type?: 'national' | 'regional' | 'local';
	}): Promise<{ message: string; chain: AdminStoreChain }> {
		return httpClient.post<{ message: string; chain: AdminStoreChain }>(
			'/admin/chains',
			data
		);
	},

	updateChain(
		chainId: string,
		updates: {
			name?: string;
			slug?: string;
			logoUrl?: string;
			websiteUrl?: string;
			type?: 'national' | 'regional' | 'local';
			isActive?: boolean;
		}
	): Promise<{ message: string; chain: AdminStoreChain }> {
		return httpClient.put<{ message: string; chain: AdminStoreChain }>(
			`/admin/chains/${chainId}`,
			updates
		);
	},

	deleteChain(chainId: string): Promise<{ message: string }> {
		return httpClient.delete<{ message: string }>(
			`/admin/chains/${chainId}`
		);
	},

	getChainStores(
		chainId: string,
		filters?: { city?: string; state?: string }
	): Promise<{
		chain: AdminStoreChain;
		stores: AdminStore[];
		totalCount: number;
	}> {
		let url = `/admin/chains/${chainId}/stores`;
		const params = new URLSearchParams();
		if (filters?.city) params.append('city', filters.city);
		if (filters?.state) params.append('state', filters.state);
		if (params.toString()) url += `?${params.toString()}`;
		return httpClient.get<{
			chain: AdminStoreChain;
			stores: AdminStore[];
			totalCount: number;
		}>(url);
	},

	assignStoreToChain(
		storeId: string,
		chainId: string | null,
		locationIdentifier?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/stores/${storeId}/assign-chain`,
			{ chainId, locationIdentifier }
		);
	},

	bulkAssignStoresToChain(
		storeIds: string[],
		chainId: string | null
	): Promise<{ message: string; updated: number }> {
		return httpClient.post<{ message: string; updated: number }>(
			'/admin/stores/bulk-assign-chain',
			{ storeIds, chainId }
		);
	},

	getStoresGrouped(): Promise<StoresGroupedResponse> {
		return httpClient.get<StoresGroupedResponse>('/admin/stores/grouped');
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

	// Store Products with Moderation
	getStoreProducts(storeId: string): Promise<StoreProductsResponse> {
		return httpClient.get<StoreProductsResponse>(
			`/admin/stores/${storeId}/products`
		);
	},

	// Moderation
	moderateAvailability(
		availabilityId: string,
		status: 'confirmed' | 'rejected'
	): Promise<{ message: string; availability: any }> {
		return httpClient.put<{ message: string; availability: any }>(
			`/admin/availability/${availabilityId}/moderate`,
			{ status }
		);
	},

	// Pending Reports Dashboard
	getPendingReports(): Promise<PendingReportsResponse> {
		return httpClient.get<PendingReportsResponse>('/admin/pending-reports');
	},

	bulkModerateReports(
		reportIds: string[],
		status: 'confirmed' | 'rejected'
	): Promise<{ message: string; modifiedCount: number }> {
		return httpClient.put<{ message: string; modifiedCount: number }>(
			'/admin/pending-reports/bulk-moderate',
			{ reportIds, status }
		);
	},

	// Pending Stores
	getPendingStores(
		page: number = 1,
		pageSize: number = 20
	): Promise<PaginatedResponse<PendingStore>> {
		return httpClient.get<PaginatedResponse<PendingStore>>(
			`/admin/stores/pending?page=${page}&pageSize=${pageSize}`
		);
	},

	approveStore(storeId: string): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/stores/${storeId}/approve`,
			{}
		);
	},

	rejectStore(
		storeId: string,
		reason?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/stores/${storeId}/reject`,
			{ reason }
		);
	},

	// Trusted User Management
	setUserTrustedStatus(
		userId: string,
		trusted: boolean
	): Promise<{ message: string }> {
		return httpClient.put<{ message: string }>(
			`/admin/users/${userId}/trusted`,
			{ trusted }
		);
	},

	// Trusted Review
	getTrustedProductsPendingReview(
		page: number = 1,
		pageSize: number = 20
	): Promise<PaginatedResponse<PendingProduct>> {
		return httpClient.get<PaginatedResponse<PendingProduct>>(
			`/admin/products/trusted-pending?page=${page}&pageSize=${pageSize}`
		);
	},

	getTrustedStoresPendingReview(
		page: number = 1,
		pageSize: number = 20
	): Promise<PaginatedResponse<PendingStore>> {
		return httpClient.get<PaginatedResponse<PendingStore>>(
			`/admin/stores/trusted-pending?page=${page}&pageSize=${pageSize}`
		);
	},

	approveTrustedProduct(productId: string): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/products/${productId}/approve-trusted`,
			{}
		);
	},

	rejectTrustedProduct(
		productId: string,
		reason?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/products/${productId}/reject-trusted`,
			{ reason }
		);
	},

	approveTrustedStore(storeId: string): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/stores/${storeId}/approve-trusted`,
			{}
		);
	},

	rejectTrustedStore(
		storeId: string,
		reason?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/stores/${storeId}/reject-trusted`,
			{ reason }
		);
	},

	// City Content Edits
	getCityContentEdits(
		page: number = 1,
		pageSize: number = 20,
		status?: 'pending' | 'all'
	): Promise<PaginatedResponse<CityContentEdit>> {
		let url = `/admin/city-content-edits?page=${page}&pageSize=${pageSize}`;
		if (status) url += `&status=${status}`;
		return httpClient.get<PaginatedResponse<CityContentEdit>>(url);
	},

	approveCityContentEdit(
		editId: string,
		note?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/city-content-edits/${editId}/approve`,
			{ note }
		);
	},

	rejectCityContentEdit(
		editId: string,
		note?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/city-content-edits/${editId}/reject`,
			{ note }
		);
	},

	bulkReviewCityContentEdits(
		editIds: string[],
		action: 'approve' | 'reject',
		note?: string
	): Promise<{ message: string; modifiedCount: number }> {
		return httpClient.put<{ message: string; modifiedCount: number }>(
			'/admin/city-content-edits/bulk-review',
			{ editIds, action, note }
		);
	},

	// Retailer Content Edits
	getRetailerContentEdits(
		page: number = 1,
		pageSize: number = 20,
		status?: 'pending' | 'all',
		retailerType?: 'store' | 'chain'
	): Promise<PaginatedResponse<RetailerContentEdit>> {
		let url = `/admin/retailer-content-edits?page=${page}&pageSize=${pageSize}`;
		if (status) url += `&status=${status}`;
		if (retailerType) url += `&retailerType=${retailerType}`;
		return httpClient.get<PaginatedResponse<RetailerContentEdit>>(url);
	},

	approveRetailerContentEdit(
		editId: string,
		note?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/retailer-content-edits/${editId}/approve`,
			{ reviewNote: note }
		);
	},

	rejectRetailerContentEdit(
		editId: string,
		note?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/retailer-content-edits/${editId}/reject`,
			{ reviewNote: note }
		);
	},

	// Brand Content Edits
	getBrandContentEdits(
		page: number = 1,
		pageSize: number = 20,
		status?: 'pending' | 'all'
	): Promise<PaginatedResponse<BrandContentEdit>> {
		let url = `/admin/brand-content-edits?page=${page}&pageSize=${pageSize}`;
		if (status) url += `&status=${status}`;
		return httpClient.get<PaginatedResponse<BrandContentEdit>>(url);
	},

	approveBrandContentEdit(
		editId: string,
		note?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/brand-content-edits/${editId}/approve`,
			{ reviewNote: note }
		);
	},

	rejectBrandContentEdit(
		editId: string,
		note?: string
	): Promise<{ message: string }> {
		return httpClient.post<{ message: string }>(
			`/admin/brand-content-edits/${editId}/reject`,
			{ reviewNote: note }
		);
	},
};

// Pending Reports types
export interface PendingReport {
	id: string;
	productId: string;
	productName: string;
	productBrand: string;
	productImageUrl?: string;
	productType: 'api' | 'user';
	storeId: string;
	storeName: string;
	storeAddress?: string;
	priceRange?: string;
	notes?: string;
	source: string;
	reportedBy?: {
		id: string;
		email: string;
		displayName?: string;
	};
	createdAt: string;
}

export interface PendingReportCity {
	city: string;
	reports: PendingReport[];
	count: number;
}

export interface PendingReportsResponse {
	totalPending: number;
	cities: PendingReportCity[];
}

export interface PendingStore {
	id: string;
	name: string;
	type: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	websiteUrl?: string;
	phoneNumber?: string;
	userId?: string;
	userEmail?: string;
	createdBy?: {
		id: string;
		email: string;
		displayName?: string;
	};
	createdAt: string;
}

export interface CityContentEdit {
	id: string;
	citySlug: string;
	cityName: string;
	state: string;
	field: 'cityName' | 'headline' | 'description';
	originalValue: string;
	suggestedValue: string;
	reason?: string;
	status: 'pending' | 'approved' | 'rejected';
	submittedBy?: {
		id: string;
		email: string;
		displayName?: string;
	};
	reviewedBy?: string;
	reviewedAt?: string;
	reviewNote?: string;
	createdAt: string;
}

export interface RetailerContentEdit {
	id: string;
	retailerType: 'store' | 'chain';
	storeId?: string;
	storeName?: string;
	storeAddress?: string;
	chainId?: string;
	chainName?: string;
	chainSlug?: string;
	field: 'name' | 'description' | 'websiteUrl';
	originalValue: string;
	suggestedValue: string;
	reason?: string;
	status: 'pending' | 'approved' | 'rejected';
	trustedContribution: boolean;
	autoApplied: boolean;
	submittedBy?: {
		id: string;
		email: string;
		displayName?: string;
	};
	reviewedBy?: {
		id: string;
		email: string;
		displayName?: string;
	};
	reviewedAt?: string;
	reviewNote?: string;
	createdAt: string;
}

export interface BrandContentEdit {
	id: string;
	brandPageId?: string;
	brandName: string;
	brandSlug: string;
	field: 'displayName' | 'description' | 'websiteUrl';
	originalValue: string;
	suggestedValue: string;
	reason?: string;
	status: 'pending' | 'approved' | 'rejected';
	trustedContribution: boolean;
	autoApplied: boolean;
	submittedBy?: {
		id: string;
		email: string;
		displayName?: string;
	};
	reviewedBy?: {
		id: string;
		email: string;
		displayName?: string;
	};
	reviewedAt?: string;
	reviewNote?: string;
	createdAt: string;
}
