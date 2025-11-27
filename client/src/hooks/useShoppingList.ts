import { useState, useEffect, useCallback } from 'react';
import { listsApi } from '../api';
import { ShoppingListDetail, ShoppingListSummary, AddItemInput } from '../types';

interface UseShoppingListState {
  list: ShoppingListDetail | null;
  lists: ShoppingListSummary[];
  loading: boolean;
  error: string | null;
  addingItem: boolean;
  removingItemId: string | null;
}

interface UseShoppingListReturn extends UseShoppingListState {
  fetchLists: () => Promise<void>;
  fetchList: (listId: string) => Promise<void>;
  getOrCreateDefaultList: () => Promise<ShoppingListSummary | null>;
  addItem: (listId: string, input: AddItemInput) => Promise<boolean>;
  removeItem: (listId: string, itemId: string) => Promise<boolean>;
  createList: (name: string) => Promise<ShoppingListSummary | null>;
  refresh: () => Promise<void>;
}

export function useShoppingList(): UseShoppingListReturn {
  const [state, setState] = useState<UseShoppingListState>({
    list: null,
    lists: [],
    loading: false,
    error: null,
    addingItem: false,
    removingItemId: null,
  });

  const [currentListId, setCurrentListId] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await listsApi.getLists();
      setState((prev) => ({
        ...prev,
        lists: response.items,
        loading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch lists';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const fetchList = useCallback(async (listId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setCurrentListId(listId);
    
    try {
      const listDetail = await listsApi.getListById(listId);
      setState((prev) => ({
        ...prev,
        list: listDetail,
        loading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch list';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const getOrCreateDefaultList = useCallback(async (): Promise<ShoppingListSummary | null> => {
    try {
      const response = await listsApi.getDefaultList();
      return response.list;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get default list';
      setState((prev) => ({ ...prev, error: message }));
      return null;
    }
  }, []);

  const createList = useCallback(async (name: string): Promise<ShoppingListSummary | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await listsApi.createList(name);
      setState((prev) => ({
        ...prev,
        lists: [response.list, ...prev.lists],
        loading: false,
      }));
      return response.list;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create list';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return null;
    }
  }, []);

  const addItem = useCallback(async (listId: string, input: AddItemInput): Promise<boolean> => {
    setState((prev) => ({ ...prev, addingItem: true, error: null }));
    
    try {
      await listsApi.addItemToList(listId, input);
      
      // Refresh the list if we're viewing it
      if (currentListId === listId) {
        const listDetail = await listsApi.getListById(listId);
        setState((prev) => ({
          ...prev,
          list: listDetail,
          addingItem: false,
        }));
      } else {
        setState((prev) => ({ ...prev, addingItem: false }));
      }
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add item';
      setState((prev) => ({ ...prev, addingItem: false, error: message }));
      return false;
    }
  }, [currentListId]);

  const removeItem = useCallback(async (listId: string, itemId: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, removingItemId: itemId, error: null }));
    
    try {
      await listsApi.removeItemFromList(listId, itemId);
      
      // Update local state
      setState((prev) => ({
        ...prev,
        list: prev.list
          ? { ...prev.list, items: prev.list.items.filter((item) => item.itemId !== itemId) }
          : null,
        removingItemId: null,
      }));
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove item';
      setState((prev) => ({ ...prev, removingItemId: null, error: message }));
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (currentListId) {
      await fetchList(currentListId);
    }
    await fetchLists();
  }, [currentListId, fetchList, fetchLists]);

  useEffect(() => {
    fetchLists();
  }, []);

  return {
    ...state,
    fetchLists,
    fetchList,
    getOrCreateDefaultList,
    addItem,
    removeItem,
    createList,
    refresh,
  };
}

