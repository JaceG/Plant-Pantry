import { useState, useEffect, useCallback } from 'react';
import { adminApi, PendingProduct, AdminProduct } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import { Link } from 'react-router-dom';
import './AdminProducts.css';

type TabType = 'pending' | 'user-generated' | 'archived';

export function AdminProducts() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [userGeneratedProducts, setUserGeneratedProducts] = useState<AdminProduct[]>([]);
  const [archivedProducts, setArchivedProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [userGeneratedTotal, setUserGeneratedTotal] = useState(0);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(1);
  const [userGeneratedPage, setUserGeneratedPage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchPendingProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPendingProducts(pendingPage, 20);
      setPendingProducts(response.items);
      setPendingTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [pendingPage]);

  const fetchUserGeneratedProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUserGeneratedProducts(userGeneratedPage, 20);
      setUserGeneratedProducts(response.items);
      setUserGeneratedTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [userGeneratedPage]);

  const fetchArchivedProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getArchivedProducts(archivedPage, 20);
      setArchivedProducts(response.items);
      setArchivedTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [archivedPage]);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingProducts();
    } else if (activeTab === 'user-generated') {
      fetchUserGeneratedProducts();
    } else if (activeTab === 'archived') {
      fetchArchivedProducts();
    }
  }, [activeTab, fetchPendingProducts, fetchUserGeneratedProducts, fetchArchivedProducts]);

  const handleApprove = async (productId: string) => {
    setActionLoading(productId);
    try {
      await adminApi.approveProduct(productId);
      setPendingProducts(pendingProducts.filter(p => p.id !== productId));
      setPendingTotal(pendingTotal - 1);
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
      setPendingProducts(pendingProducts.filter(p => p.id !== productId));
      setPendingTotal(pendingTotal - 1);
      setToast({ message: 'Product rejected', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to reject product', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (productId: string) => {
    if (!window.confirm('Are you sure you want to archive this product? It will no longer appear on the main site.')) {
      return;
    }

    setActionLoading(productId);
    try {
      await adminApi.archiveProduct(productId);
      setToast({ message: 'Product archived successfully', type: 'success' });
      // Refresh current tab
      if (activeTab === 'user-generated') {
        fetchUserGeneratedProducts();
      }
    } catch (err) {
      setToast({ message: 'Failed to archive product', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnarchive = async (productId: string) => {
    setActionLoading(productId);
    try {
      await adminApi.unarchiveProduct(productId);
      setToast({ message: 'Product unarchived successfully', type: 'success' });
      fetchArchivedProducts(); // Refresh archived list
    } catch (err) {
      setToast({ message: 'Failed to unarchive product', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const getCurrentProducts = () => {
    if (activeTab === 'pending') return pendingProducts;
    if (activeTab === 'user-generated') return userGeneratedProducts;
    return archivedProducts;
  };

  const getCurrentTotal = () => {
    if (activeTab === 'pending') return pendingTotal;
    if (activeTab === 'user-generated') return userGeneratedTotal;
    return archivedTotal;
  };

  const getCurrentPage = () => {
    if (activeTab === 'pending') return pendingPage;
    if (activeTab === 'user-generated') return userGeneratedPage;
    return archivedPage;
  };

  const setCurrentPage = (page: number) => {
    if (activeTab === 'pending') setPendingPage(page);
    else if (activeTab === 'user-generated') setUserGeneratedPage(page);
    else setArchivedPage(page);
  };

  const currentProducts = getCurrentProducts();
  const currentTotal = getCurrentTotal();
  const currentPage = getCurrentPage();

  if (loading && currentProducts.length === 0) {
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
            <h1>Product Management</h1>
            <p className="page-subtitle">
              {activeTab === 'pending' 
                ? (pendingTotal > 0 
                    ? `${pendingTotal} product${pendingTotal !== 1 ? 's' : ''} pending approval`
                    : 'No products pending approval')
                : activeTab === 'user-generated'
                ? `${userGeneratedTotal} user-generated product${userGeneratedTotal !== 1 ? 's' : ''}`
                : `${archivedTotal} archived product${archivedTotal !== 1 ? 's' : ''}`
              }
            </p>
          </div>
        </header>

        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Approval
          </button>
          <button
            className={`tab-button ${activeTab === 'user-generated' ? 'active' : ''}`}
            onClick={() => setActiveTab('user-generated')}
          >
            User Generated
          </button>
          <button
            className={`tab-button ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
          >
            Archived Items
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {currentProducts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              {activeTab === 'pending' ? '✅' : activeTab === 'user-generated' ? '👤' : '📦'}
            </span>
            <h2>
              {activeTab === 'pending' 
                ? 'All Caught Up!' 
                : activeTab === 'user-generated'
                ? 'No User Generated Products'
                : 'No Archived Products'}
            </h2>
            <p>
              {activeTab === 'pending' 
                ? 'No products are waiting for approval.'
                : activeTab === 'user-generated'
                ? 'No user-generated products found.'
                : 'No archived products found.'}
            </p>
          </div>
        ) : (
          <div className="products-list">
            {activeTab === 'pending' ? (
              // Pending products view
              pendingProducts.map((product) => (
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
                      size="sm"
                      isLoading={actionLoading === product.id}
                      disabled={actionLoading !== null}
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(product.id)}
                      variant="secondary"
                      size="sm"
                      disabled={actionLoading !== null}
                    >
                      ✗ Reject
                    </Button>
                  </div>
                </div>
              ))
            ) : activeTab === 'user-generated' ? (
              // User-generated products view
              userGeneratedProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="product-card"
                >
                  <div className="product-image">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : (
                      <div className="product-image-placeholder">📦</div>
                    )}
                  </div>
                  
                  <div className="product-info">
                    <h3 className="product-name">
                      <Link to={`/products/${product.id}`} target="_blank">
                        {product.name}
                      </Link>
                    </h3>
                    <p className="product-brand">{product.brand}</p>
                    <p className="product-size">{product.sizeOrVariant}</p>
                    
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
                        👤 {product.userEmail || product.userDisplayName || 'Unknown user'}
                      </span>
                      {product.createdAt && (
                        <span className="meta-item">
                          📅 {new Date(product.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="product-actions">
                    <Button
                      onClick={() => handleArchive(product.id)}
                      variant="secondary"
                      size="sm"
                      isLoading={actionLoading === product.id}
                      disabled={actionLoading !== null}
                    >
                      📦 Archive
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              // Archived products view
              archivedProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="product-card archived"
                >
                  <div className="product-image">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : (
                      <div className="product-image-placeholder">📦</div>
                    )}
                    <div className="archived-badge">📦 Archived</div>
                  </div>
                  
                  <div className="product-info">
                    <h3 className="product-name">
                      <Link to={`/products/${product.id}`} target="_blank">
                        {product.name}
                      </Link>
                    </h3>
                    <p className="product-brand">{product.brand}</p>
                    <p className="product-size">{product.sizeOrVariant}</p>
                    
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
                        {product.source === 'api' ? '🌐 API' : '👤 User'}
                      </span>
                      {product.archivedAt && (
                        <span className="meta-item">
                          📦 Archived {new Date(product.archivedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="product-actions">
                    <Button
                      onClick={() => handleUnarchive(product.id)}
                      variant="primary"
                      size="sm"
                      isLoading={actionLoading === product.id}
                      disabled={actionLoading !== null}
                    >
                      ↻ Unarchive
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {currentTotal > 20 && (
          <div className="pagination">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              variant="secondary"
              size="sm"
            >
              ← Previous
            </Button>
            <span className="page-info">
              Page {currentPage} of {Math.ceil(currentTotal / 20)}
            </span>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= Math.ceil(currentTotal / 20)}
              variant="secondary"
              size="sm"
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
