export type StoreType = 'brick_and_mortar' | 'online_retailer' | 'brand_direct';
export type ChainType = 'national' | 'regional' | 'local';

export interface StoreChain {
	id: string;
	name: string;
	slug: string;
	logoUrl?: string;
	websiteUrl?: string;
	type: ChainType;
	isActive: boolean;
	locationCount: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface ChainInfo {
	id: string;
	name: string;
	slug: string;
	logoUrl?: string;
}

export type StoreModerationStatus = 'confirmed' | 'pending' | 'rejected';

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
	// Chain relationship
	chainId?: string;
	locationIdentifier?: string;
	chain?: ChainInfo;
	// Moderation
	moderationStatus?: StoreModerationStatus;
	createdBy?: string;
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
	chainId?: string;
	locationIdentifier?: string;
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
