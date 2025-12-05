export type StoreType = 'brick_and_mortar' | 'online_retailer' | 'brand_direct';

export interface Store {
	id: string;
	name: string;
	type: StoreType;
	regionOrScope: string;
	websiteUrl?: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	country?: string;
	latitude?: number;
	longitude?: number;
	googlePlaceId?: string;
	phoneNumber?: string;
}

export interface StoreListResponse {
	items: Store[];
}

export interface CreateStoreInput {
	name: string;
	type: StoreType;
	regionOrScope: string;
	websiteUrl?: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	country?: string;
	latitude?: number;
	longitude?: number;
	googlePlaceId?: string;
	phoneNumber?: string;
	skipDuplicateCheck?: boolean;
}

export interface CreateStoreResponse {
	store: Store | null;
	isDuplicate?: boolean;
	duplicateType?: 'exact' | 'similar';
	similarStores?: Store[];
	message?: string;
}

export interface GooglePlacePrediction {
	place_id: string;
	description: string;
	structured_formatting: {
		main_text: string;
		secondary_text: string;
	};
}

export interface GooglePlaceDetails {
	placeId: string;
	name: string;
	formattedAddress: string;
	website?: string;
	phoneNumber?: string;
	latitude?: number;
	longitude?: number;
	street?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	country?: string;
}
