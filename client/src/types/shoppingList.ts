export interface ShoppingListSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSummaryForList {
  id: string;
  name: string;
  brand: string;
  sizeOrVariant: string;
  imageUrl?: string;
}

export interface AvailabilityHint {
  storeName: string;
  storeType: string;
}

export interface ShoppingListItem {
  itemId: string;
  productId: string;
  quantity: number;
  note?: string;
  addedAt: string;
  productSummary: ProductSummaryForList;
  availabilityHints: AvailabilityHint[];
}

export interface ShoppingListDetail {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: ShoppingListItem[];
}

export interface ShoppingListsResponse {
  items: ShoppingListSummary[];
}

export interface AddItemInput {
  productId: string;
  quantity?: number;
  note?: string;
}

