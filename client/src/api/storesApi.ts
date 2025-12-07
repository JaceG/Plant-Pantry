import { httpClient } from './httpClient';
import {
	Store,
	StoreChain,
	ChainInfo,
	StoreListResponse,
	CreateStoreInput,
	CreateStoreResponse,
	GooglePlacePrediction,
	GooglePlaceDetails,
} from '../types/store';

export interface StoresGroupedResponse {
	chains: Array<{
		chain: ChainInfo;
		stores: Store[];
		locationCount: number;
	}>;
	independentStores: Store[];
}

export const storesApi = {
	getStores(
		query?: string,
		includeChains = false
	): Promise<StoreListResponse> {
		const params = new URLSearchParams();
		if (query) params.set('q', query);
		if (includeChains) params.set('includeChains', 'true');
		const url = params.toString()
			? `/stores?${params.toString()}`
			: '/stores';
		return httpClient.get<StoreListResponse>(url);
	},

	getStoreById(id: string): Promise<{ store: Store }> {
		return httpClient.get<{ store: Store }>(`/stores/${id}`);
	},

	createStore(input: CreateStoreInput): Promise<CreateStoreResponse> {
		return httpClient.post<CreateStoreResponse>('/stores', input);
	},

	// Grouped stores by chain
	getStoresGrouped(): Promise<StoresGroupedResponse> {
		return httpClient.get<StoresGroupedResponse>('/stores/grouped');
	},

	// Chain methods
	getChains(): Promise<{ chains: StoreChain[] }> {
		return httpClient.get<{ chains: StoreChain[] }>('/stores/chains');
	},

	getChainById(id: string): Promise<{ chain: StoreChain }> {
		return httpClient.get<{ chain: StoreChain }>(`/stores/chains/${id}`);
	},

	getChainLocations(
		chainId: string,
		filters?: { city?: string; state?: string }
	): Promise<{ chain: StoreChain; stores: Store[]; totalCount: number }> {
		const params = new URLSearchParams();
		if (filters?.city) params.set('city', filters.city);
		if (filters?.state) params.set('state', filters.state);
		const queryStr = params.toString();
		const url = `/stores/chains/${chainId}/locations${
			queryStr ? `?${queryStr}` : ''
		}`;
		return httpClient.get<{
			chain: StoreChain;
			stores: Store[];
			totalCount: number;
		}>(url);
	},

	searchPlaces(
		input: string,
		options?: {
			types?: string[];
			location?: { lat: number; lng: number };
			radius?: number;
		}
	): Promise<{ predictions: GooglePlacePrediction[] }> {
		const params = new URLSearchParams({ input });
		if (options?.types) params.set('types', options.types.join(','));
		if (options?.location) {
			params.set('lat', options.location.lat.toString());
			params.set('lng', options.location.lng.toString());
		}
		if (options?.radius) params.set('radius', options.radius.toString());

		return httpClient.get<{ predictions: GooglePlacePrediction[] }>(
			`/stores/places/autocomplete?${params.toString()}`
		);
	},

	getPlaceDetails(placeId: string): Promise<{ place: GooglePlaceDetails }> {
		return httpClient.get<{ place: GooglePlaceDetails }>(
			`/stores/places/details/${placeId}`
		);
	},
};
