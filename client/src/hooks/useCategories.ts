import { useState, useEffect, useCallback } from "react";
import { productsApi } from "../api";

interface UseCategoriesState {
  categories: string[];
  loading: boolean;
  error: string | null;
}

interface UseCategoriesReturn extends UseCategoriesState {
  refresh: () => Promise<void>;
}

export function useCategories(): UseCategoriesReturn {
  const [state, setState] = useState<UseCategoriesState>({
    categories: [],
    loading: false,
    error: null,
  });

  const fetchCategories = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await productsApi.getCategories();
      setState({
        categories: response.categories,
        loading: false,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch categories";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    ...state,
    refresh,
  };
}
