import { useState, useEffect, useCallback, useRef } from "react";
import { productsApi } from "../api";
import { ProductSummary, ProductFilters } from "../types";

interface UseProductsState {
  products: ProductSummary[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalCount: number;
}

interface UseProductsReturn extends UseProductsState {
  fetchProducts: (filters?: ProductFilters) => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  refresh: () => Promise<void>;
  totalPages: number;
}

export function useProducts(
  initialFilters: ProductFilters = {},
): UseProductsReturn {
  const [state, setState] = useState<UseProductsState>({
    products: [],
    loading: false,
    error: null,
    page: 1,
    pageSize: 20,
    totalCount: 0,
  });

  const [currentFilters, setCurrentFilters] =
    useState<ProductFilters>(initialFilters);
  const filtersRef = useRef<ProductFilters>(initialFilters);
  const pageSizeRef = useRef(initialFilters.pageSize || 20);

  // Keep filtersRef in sync with currentFilters
  useEffect(() => {
    filtersRef.current = currentFilters;
  }, [currentFilters]);

  // Keep pageSizeRef in sync with state
  useEffect(() => {
    pageSizeRef.current = state.pageSize;
  }, [state.pageSize]);

  const fetchProducts = useCallback(async (filters: ProductFilters = {}) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setCurrentFilters(filters);
    filtersRef.current = filters;

    // Always start at page 1 when filters change
    const pageToFetch = filters.page || 1;

    try {
      const response = await productsApi.getProducts({
        ...filters,
        page: pageToFetch,
        pageSize: filters.pageSize || 20,
      });

      setState({
        products: response.items,
        loading: false,
        error: null,
        page: response.page,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
      });
    } catch (err: any) {
      console.error("Error fetching products:", err);
      const message = err?.message || err?.error || "Failed to fetch products";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const goToPage = useCallback(async (page: number) => {
    if (page < 1) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Use filtersRef to ensure we have the latest filters
      const filtersToUse = filtersRef.current;

      // Use pageSizeRef to get current pageSize
      const response = await productsApi.getProducts({
        ...filtersToUse,
        page: page,
        pageSize: pageSizeRef.current,
      });

      setState({
        products: response.items,
        loading: false,
        error: null,
        page: response.page,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load page";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchProducts(filtersRef.current);
  }, [fetchProducts]);

  useEffect(() => {
    // Fetch on mount with initial filters
    fetchProducts(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(state.totalCount / state.pageSize);

  return {
    ...state,
    fetchProducts,
    goToPage,
    refresh,
    totalPages,
  };
}
