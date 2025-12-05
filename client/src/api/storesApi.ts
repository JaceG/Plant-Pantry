import { httpClient } from './httpClient';
import {
	Store,
	StoreListResponse,
	CreateStoreInput,
	CreateStoreResponse,
	GooglePlacePrediction,
	GooglePlaceDetails,
} from '../types/store';

export const storesApi = {
	getStores(query?: string): Promise<StoreListResponse> {
		const url = query
			? `/stores?q=${encodeURIComponent(query)}`
			: '/stores';
		return httpClient.get<StoreListResponse>(url);
	},

	getStoreById(id: string): Promise<{ store: Store }> {
		return httpClient.get<{ store: Store }>(`/stores/${id}`);
	},

	createStore(input: CreateStoreInput): Promise<CreateStoreResponse> {
		return httpClient.post<CreateStoreResponse>('/stores', input);
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
