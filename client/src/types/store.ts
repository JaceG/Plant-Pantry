export interface Store {
  id: string;
  name: string;
  type: 'brick_and_mortar' | 'online_retailer' | 'brand_direct';
  regionOrScope: string;
  websiteUrl?: string;
}

export interface StoreListResponse {
  items: Store[];
}

