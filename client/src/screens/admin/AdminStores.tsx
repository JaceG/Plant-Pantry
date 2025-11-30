import { useState, useEffect, useCallback } from 'react';
import { adminApi, AdminStore } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import './AdminStores.css';

type StoreFilter = 'all' | 'brick_and_mortar' | 'online_retailer' | 'brand_direct';

export function AdminStores() {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<StoreFilter>('all');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getStores(
        page, 
        20, 
        filter === 'all' ? undefined : filter
      );
      setStores(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleDelete = async (storeId: string, storeName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${storeName}"? This will also remove all associated availability data.`)) {
      return;
    }

    setDeleteLoading(storeId);
    try {
      await adminApi.deleteStore(storeId);
      setStores(stores.filter(s => s.id !== storeId));
      setTotal(total - 1);
      setToast({ message: 'Store deleted successfully', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to delete store', type: 'error' });
    } finally {
      setDeleteLoading(null);
    }
  };

  const getStoreTypeIcon = (type: string) => {
    switch (type) {
      case 'brick_and_mortar': return '🏪';
      case 'online_retailer': return '🌐';
      case 'brand_direct': return '🏷️';
      default: return '📍';
    }
  };

  const getStoreTypeLabel = (type: string) => {
    switch (type) {
      case 'brick_and_mortar': return 'Physical';
      case 'online_retailer': return 'Online';
      case 'brand_direct': return 'Brand Direct';
      default: return type;
    }
  };

  if (loading && stores.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <div className="loading-spinner" />
          <span>Loading stores...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-stores">
        <header className="page-header">
          <div>
            <h1>Store Management</h1>
            <p className="page-subtitle">{total} store{total !== 1 ? 's' : ''} total</p>
          </div>
        </header>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => { setFilter('all'); setPage(1); }}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'brick_and_mortar' ? 'active' : ''}`}
              onClick={() => { setFilter('brick_and_mortar'); setPage(1); }}
            >
              🏪 Physical
            </button>
            <button
              className={`filter-btn ${filter === 'online_retailer' ? 'active' : ''}`}
              onClick={() => { setFilter('online_retailer'); setPage(1); }}
            >
              🌐 Online
            </button>
            <button
              className={`filter-btn ${filter === 'brand_direct' ? 'active' : ''}`}
              onClick={() => { setFilter('brand_direct'); setPage(1); }}
            >
              🏷️ Brand Direct
            </button>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {stores.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🏪</span>
            <h2>No Stores Found</h2>
            <p>
              {filter !== 'all' 
                ? `No ${getStoreTypeLabel(filter).toLowerCase()} stores found.`
                : 'No stores have been added yet.'
              }
            </p>
          </div>
        ) : (
          <div className="stores-table-container">
            <table className="stores-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Type</th>
                  <th>Region</th>
                  <th>Website</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id}>
                    <td className="store-name-cell">
                      <span className="store-icon">{getStoreTypeIcon(store.type)}</span>
                      <div className="store-name-info">
                        <span className="store-name">{store.name}</span>
                        {store.address && (
                          <span className="store-address">
                            {store.address}
                            {store.city && `, ${store.city}`}
                            {store.state && `, ${store.state}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`type-badge type-${store.type}`}>
                        {getStoreTypeLabel(store.type)}
                      </span>
                    </td>
                    <td className="region-cell">{store.regionOrScope}</td>
                    <td>
                      {store.websiteUrl ? (
                        <a 
                          href={store.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="website-link"
                        >
                          Visit →
                        </a>
                      ) : (
                        <span className="no-website">—</span>
                      )}
                    </td>
                    <td className="date-cell">
                      {new Date(store.createdAt).toLocaleDateString()}
                    </td>
                    <td className="actions-cell">
                      <Button
                        onClick={() => handleDelete(store.id, store.name)}
                        variant="secondary"
                        size="sm"
                        isLoading={deleteLoading === store.id}
                        disabled={deleteLoading !== null}
                      >
                        🗑️
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="pagination">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="secondary"
              size="sm"
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

