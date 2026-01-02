import { useState, useEffect, useCallback, useRef } from 'react';
import { productsApi } from '../api';
import { ProductDetail } from '../types';
import { productEvents } from '../utils/productEvents';

interface UseProductDetailState {
  product: ProductDetail | null;
  loading: boolean;
  error: string | null;
}

interface UseProductDetailReturn extends UseProductDetailState {
  refresh: () => Promise<void>;
  setProduct: (product: ProductDetail) => void;
}

export function useProductDetail(productId: string | undefined): UseProductDetailReturn {
  const [state, setState] = useState<UseProductDetailState>({
    product: null,
    loading: false,
    error: null,
  });
  const lastFetchTimeRef = useRef<number>(0);

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setState({ product: null, loading: false, error: null });
      return;
    }
    
    setState((prev) => ({ ...prev, loading: true, error: null }));
    
    try {
      // Always bust cache to ensure fresh data
      const response = await productsApi.getProductById(productId, { bustCache: true });
      setState({
        product: response.product,
        loading: false,
        error: null,
      });
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch product';
      setState({ product: null, loading: false, error: message });
    }
  }, [productId]);

  const refresh = useCallback(async () => {
    await fetchProduct();
  }, [fetchProduct]);

  // Allow directly setting the product (useful after edits to avoid refetching)
  const setProduct = useCallback((product: ProductDetail) => {
    setState({
      product,
      loading: false,
      error: null,
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Listen for product update events and refetch
  // Note: We always refetch because the emitted productId might be a UserProduct ID
  // while our productId is the original API product ID (for edited products)
  useEffect(() => {
    const unsubscribe = productEvents.on('product:updated', (detail) => {
      // Check if the update happened after our last fetch
      if (detail.timestamp > lastFetchTimeRef.current) {
        fetchProduct();
      }
    });

    return unsubscribe;
  }, [fetchProduct]);

  return {
    ...state,
    refresh,
    setProduct,
  };
}

