import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import './AdminFilters.css';

type FilterType = 'category' | 'tag';

export function AdminFilters() {
  const [activeTab, setActiveTab] = useState<FilterType>('category');
  const [filters, setFilters] = useState<Array<{ value: string; displayName?: string; archived: boolean; archivedAt?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editingFilter, setEditingFilter] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');

  const fetchFilters = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getFilters(activeTab, page, 100);
      setFilters(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleArchive = async (value: string) => {
    setActionLoading(value);
    try {
      await adminApi.archiveFilter(activeTab, value);
      setToast({ message: 'Filter archived successfully', type: 'success' });
      fetchFilters(); // Refresh list
    } catch (err) {
      setToast({ message: 'Failed to archive filter', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnarchive = async (value: string) => {
    setActionLoading(value);
    try {
      await adminApi.unarchiveFilter(activeTab, value);
      setToast({ message: 'Filter unarchived successfully', type: 'success' });
      fetchFilters(); // Refresh list
    } catch (err) {
      setToast({ message: 'Failed to unarchive filter', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditDisplayName = (filter: { value: string; displayName?: string }) => {
    setEditingFilter(filter.value);
    setEditDisplayName(filter.displayName || filter.value);
  };

  const handleSaveDisplayName = async (value: string) => {
    setActionLoading(value);
    try {
      if (editDisplayName.trim() === value) {
        // If display name matches the value, remove the custom display name
        await adminApi.removeFilterDisplayName(activeTab, value);
      } else {
        await adminApi.setFilterDisplayName(activeTab, value, editDisplayName.trim());
      }
      setToast({ message: 'Display name updated successfully', type: 'success' });
      setEditingFilter(null);
      fetchFilters(); // Refresh list
    } catch (err) {
      setToast({ message: 'Failed to update display name', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingFilter(null);
    setEditDisplayName('');
  };

  const displayedFilters = showArchived
    ? filters
    : filters.filter(f => !f.archived);

  if (loading && filters.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <div className="loading-spinner" />
          <span>Loading filters...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-filters">
        <header className="page-header">
          <div>
            <h1>Filter Management</h1>
            <p className="page-subtitle">
              Manage categories and tags that appear in filters
            </p>
          </div>
          <div className="header-actions">
            <label className="toggle-archived">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              <span>Show archived</span>
            </label>
          </div>
        </header>

        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === 'category' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('category');
              setPage(1);
            }}
          >
            Categories
          </button>
          <button
            className={`tab-button ${activeTab === 'tag' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('tag');
              setPage(1);
            }}
          >
            Tags
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {displayedFilters.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🏷️</span>
            <h2>No Filters Found</h2>
            <p>{showArchived ? 'No archived filters found.' : 'No active filters found.'}</p>
          </div>
        ) : (
          <div className="filters-list">
            {displayedFilters.map((filter) => (
              <div
                key={filter.value}
                className={`filter-item ${filter.archived ? 'archived' : ''}`}
              >
                <div className="filter-info">
                  {editingFilter === filter.value ? (
                    <div className="filter-edit-form">
                      <input
                        type="text"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        className="filter-edit-input"
                        placeholder="Display name"
                        autoFocus
                      />
                      <div className="filter-edit-actions">
                        <Button
                          onClick={() => handleSaveDisplayName(filter.value)}
                          variant="primary"
                          size="small"
                          isLoading={actionLoading === filter.value}
                          disabled={actionLoading !== null}
                        >
                          ✓ Save
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="secondary"
                          size="small"
                          disabled={actionLoading !== null}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="filter-display">
                        <span className="filter-display-name">
                          {filter.displayName || filter.value}
                        </span>
                        {filter.displayName && (
                          <span className="filter-database-value">
                            (DB: {filter.value})
                          </span>
                        )}
                      </div>
                      {filter.archived && filter.archivedAt && (
                        <span className="filter-meta">
                          Archived {new Date(filter.archivedAt).toLocaleDateString()}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {editingFilter !== filter.value && (
                  <div className="filter-actions">
                    <Button
                      onClick={() => handleEditDisplayName(filter)}
                      variant="secondary"
                      size="small"
                      disabled={actionLoading !== null}
                    >
                      ✏️ Edit Name
                    </Button>
                    {filter.archived ? (
                      <Button
                        onClick={() => handleUnarchive(filter.value)}
                        variant="primary"
                        size="small"
                        isLoading={actionLoading === filter.value}
                        disabled={actionLoading !== null}
                      >
                        ↻ Unarchive
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleArchive(filter.value)}
                        variant="secondary"
                        size="small"
                        isLoading={actionLoading === filter.value}
                        disabled={actionLoading !== null}
                      >
                        📦 Archive
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 100 && (
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
              Page {page} of {Math.ceil(total / 100)}
            </span>
            <Button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 100)}
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

