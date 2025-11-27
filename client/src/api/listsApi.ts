import { httpClient } from './httpClient';
import {
  ShoppingListsResponse,
  ShoppingListSummary,
  ShoppingListDetail,
  AddItemInput,
} from '../types';

interface CreateListResponse {
  list: ShoppingListSummary;
}

interface AddItemResponse {
  item: {
    itemId: string;
    productId: string;
    quantity: number;
    note?: string;
    addedAt: string;
  };
}

interface DeleteItemResponse {
  success: boolean;
}

export const listsApi = {
  getLists(): Promise<ShoppingListsResponse> {
    return httpClient.get<ShoppingListsResponse>('/lists');
  },
  
  getDefaultList(): Promise<CreateListResponse> {
    return httpClient.get<CreateListResponse>('/lists/default');
  },
  
  createList(name: string): Promise<CreateListResponse> {
    return httpClient.post<CreateListResponse>('/lists', { name });
  },
  
  getListById(id: string): Promise<ShoppingListDetail> {
    return httpClient.get<ShoppingListDetail>(`/lists/${id}`);
  },
  
  addItemToList(listId: string, input: AddItemInput): Promise<AddItemResponse> {
    return httpClient.post<AddItemResponse>(`/lists/${listId}/items`, input);
  },
  
  removeItemFromList(listId: string, itemId: string): Promise<DeleteItemResponse> {
    return httpClient.delete<DeleteItemResponse>(`/lists/${listId}/items/${itemId}`);
  },
};

