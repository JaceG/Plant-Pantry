import { useState, useEffect, useCallback } from 'react';
import { adminApi, PendingProduct } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import './AdminProducts.css';

export function AdminProducts() {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPendingProducts(page, 20);
      setProducts(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleApprove = async (productId: string) => {
    setActionLoading(productId);
    try {
      await adminApi.approveProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
      setTotal(total - 1);
      setToast({ message: 'Product approved successfully', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to approve product', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (productId: string) => {
    const reason = window.prompt('Rejection reason (optional):');
    
    setActionLoading(productId);
    try {
      await adminApi.rejectProduct(productId, reason || undefined);
      setProducts(products.filter(p => p.id !== productId));
      setTotal(total - 1);
      setToast({ message: 'Product rejected', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to reject product', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && products.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <div className="loading-spinner" />
          <span>Loading products...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-products">
        <header className="page-header">
          <div>
            <h1>Product Moderation</h1>
            <p className="page-subtitle">
              {total > 0 
                ? `${total} product${total !== 1 ? 's' : ''} pending approval`
                : 'No products pending approval'
              }
            </p>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {products.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✅</span>
            <h2>All Caught Up!</h2>
            <p>No products are waiting for approval.</p>
          </div>
        ) : (
          <div className="products-list">
            {products.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} />
                  ) : (
                    <div className="product-image-placeholder">📦</div>
                  )}
                </div>
                
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-brand">{product.brand}</p>
                  
                  {product.categories.length > 0 && (
                    <div className="product-categories">
                      {product.categories.slice(0, 3).map((cat) => (
                        <span key={cat} className="category-tag">{cat}</span>
                      ))}
                      {product.categories.length > 3 && (
                        <span className="category-more">+{product.categories.length - 3}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="product-meta">
                    <span className="meta-item">
                      👤 {product.userEmail || 'Unknown user'}
                    </span>
                    <span className="meta-item">
                      📅 {new Date(product.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="product-actions">
                  <Button
                    onClick={() => handleApprove(product.id)}
                    variant="primary"
                    size="small"
                    isLoading={actionLoading === product.id}
                    disabled={actionLoading !== null}
                  >
                    ✓ Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(product.id)}
                    variant="secondary"
                    size="small"
                    disabled={actionLoading !== null}
                  >
                    ✗ Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="pagination">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="secondary"
              size="small"
            >
              ← Previous
            </Button>
            <span className="page-info">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <Button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              variant="secondary"
              size="small"
            >
              Next →
            </Button>
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AdminLayout>
  );
}

