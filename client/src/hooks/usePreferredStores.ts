import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "preferred_stores";

interface PreferredStore {
  id: string;
  name: string;
  chainId?: string;
  chainName?: string;
  address?: string;
  city?: string;
  state?: string;
  addedAt: string;
}

interface UsePreferredStoresReturn {
  preferredStores: PreferredStore[];
  isPreferred: (storeId: string) => boolean;
  addPreferred: (store: {
    id: string;
    name: string;
    chainId?: string;
    chainName?: string;
    address?: string;
    city?: string;
    state?: string;
  }) => void;
  removePreferred: (storeId: string) => void;
  togglePreferred: (store: {
    id: string;
    name: string;
    chainId?: string;
    chainName?: string;
    address?: string;
    city?: string;
    state?: string;
  }) => void;
  clearAll: () => void;
}

export function usePreferredStores(): UsePreferredStoresReturn {
  const [preferredStores, setPreferredStores] = useState<PreferredStore[]>(
    () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    },
  );

  // Persist to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferredStores));
    } catch (error) {
      console.error("Failed to save preferred stores:", error);
    }
  }, [preferredStores]);

  const isPreferred = useCallback(
    (storeId: string) => {
      return preferredStores.some((s) => s.id === storeId);
    },
    [preferredStores],
  );

  const addPreferred = useCallback(
    (store: {
      id: string;
      name: string;
      chainId?: string;
      chainName?: string;
      address?: string;
      city?: string;
      state?: string;
    }) => {
      setPreferredStores((prev) => {
        // Don't add duplicates
        if (prev.some((s) => s.id === store.id)) {
          return prev;
        }
        return [
          ...prev,
          {
            ...store,
            addedAt: new Date().toISOString(),
          },
        ];
      });
    },
    [],
  );

  const removePreferred = useCallback((storeId: string) => {
    setPreferredStores((prev) => prev.filter((s) => s.id !== storeId));
  }, []);

  const togglePreferred = useCallback(
    (store: {
      id: string;
      name: string;
      chainId?: string;
      chainName?: string;
      address?: string;
      city?: string;
      state?: string;
    }) => {
      if (preferredStores.some((s) => s.id === store.id)) {
        removePreferred(store.id);
      } else {
        addPreferred(store);
      }
    },
    [preferredStores, addPreferred, removePreferred],
  );

  const clearAll = useCallback(() => {
    setPreferredStores([]);
  }, []);

  return {
    preferredStores,
    isPreferred,
    addPreferred,
    removePreferred,
    togglePreferred,
    clearAll,
  };
}
