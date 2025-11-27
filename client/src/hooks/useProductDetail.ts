import { useState, useEffect, useCallback } from 'react';
import { productsApi } from '../api';
import { ProductDetail } from '../types';

interface UseProductDetailState {
  product: ProductDetail | null;
  loading: boolean;
  error: string | null;
}

interface UseProductDetailReturn extends UseProductDetailState {
  refresh: () => Promise<void>;
}

export function useProductDetail(productId: string | undefined): UseProductDetailReturn {
  const [state, setState] = useState<UseProductDetailState>({
    product: null,
    loading: false,
    error: null,
  });

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setState({ product: null, loading: false, error: null });
      return;
    }
    
    setState((prev) => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await productsApi.getProductById(productId);
      setState({
        product: response.product,
        loading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch product';
      setState({ product: null, loading: false, error: message });
    }
  }, [productId]);

  const refresh = useCallback(async () => {
    await fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return {
    ...state,
    refresh,
  };
}

