import { useState, useEffect, useCallback } from 'react';
import { productsApi } from '../api';
import { ProductSummary, ProductFilters } from '../types';

interface UseProductsState {
  products: ProductSummary[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

interface UseProductsReturn extends UseProductsState {
  fetchProducts: (filters?: ProductFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProducts(initialFilters: ProductFilters = {}): UseProductsReturn {
  const [state, setState] = useState<UseProductsState>({
    products: [],
    loading: false,
    error: null,
    page: 1,
    pageSize: 20,
    totalCount: 0,
    hasMore: false,
  });
  
  const [currentFilters, setCurrentFilters] = useState<ProductFilters>(initialFilters);

  const fetchProducts = useCallback(async (filters: ProductFilters = {}) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setCurrentFilters(filters);
    
    try {
      const response = await productsApi.getProducts({
        ...filters,
        page: 1,
        pageSize: filters.pageSize || 20,
      });
      
      setState({
        products: response.items,
        loading: false,
        error: null,
        page: response.page,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        hasMore: response.items.length < response.totalCount,
      });
    } catch (err: any) {
      console.error('Error fetching products:', err);
      const message = err?.message || err?.error || 'Failed to fetch products';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;
    
    const nextPage = state.page + 1;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await productsApi.getProducts({
        ...currentFilters,
        page: nextPage,
        pageSize: state.pageSize,
      });
      
      setState((prev) => ({
        ...prev,
        products: [...prev.products, ...response.items],
        loading: false,
        page: response.page,
        hasMore: prev.products.length + response.items.length < response.totalCount,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load more products';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [state.loading, state.hasMore, state.page, state.pageSize, currentFilters]);

  const refresh = useCallback(async () => {
    await fetchProducts(currentFilters);
  }, [fetchProducts, currentFilters]);

  useEffect(() => {
    // Fetch on mount with initial filters
    fetchProducts(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    fetchProducts,
    loadMore,
    refresh,
  };
}

