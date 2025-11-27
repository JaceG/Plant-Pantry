import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingListItemCard, Button, Toast } from '../components';
import { useShoppingList } from '../hooks';
import './ShoppingListScreen.css';

export function ShoppingListScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    list,
    lists,
    loading,
    error,
    removingItemId,
    fetchList,
    fetchLists,
    removeItem,
    getOrCreateDefaultList,
  } = useShoppingList();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        await fetchList(id);
      } else {
        // No ID provided - get default list
        const defaultList = await getOrCreateDefaultList();
        if (defaultList) {
          navigate(`/lists/${defaultList.id}`, { replace: true });
        }
      }
    };
    loadData();
  }, [id, fetchList, getOrCreateDefaultList, navigate]);

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      if (!list) return;
      
      const success = await removeItem(list.id, itemId);
      if (success) {
        setToast({ message: 'Item removed from list', type: 'success' });
      } else {
        setToast({ message: 'Failed to remove item', type: 'error' });
      }
    },
    [list, removeItem]
  );

  if (loading && !list) {
    return (
      <div className="shopping-list-screen">
        <div className="list-container">
          <div className="list-loading">
            <div className="loading-spinner" />
            <span>Loading your list...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="shopping-list-screen">
        <div className="list-container">
          <div className="list-error">
            <span className="error-icon">📝</span>
            <h2>No Shopping List</h2>
            <p>{error || "You don't have any shopping lists yet."}</p>
            <Button onClick={() => navigate('/')}>Start Shopping</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shopping-list-screen">
      <div className="list-container">
        <header className="list-header">
          <div className="header-main">
            <span className="list-icon">📝</span>
            <div className="header-text">
              <h1 className="list-title">{list.name}</h1>
              <span className="list-meta">
                {list.items.length} {list.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>
        </header>

        {list.items.length === 0 ? (
          <div className="list-empty">
            <div className="empty-illustration">
              <span className="empty-icon">🛒</span>
              <div className="empty-leaves">
                <span>🌿</span>
                <span>🍃</span>
              </div>
            </div>
            <h2>Your list is empty</h2>
            <p>Start adding delicious vegan products to your shopping list!</p>
            <Button onClick={() => navigate('/')}>Browse Products</Button>
          </div>
        ) : (
          <div className="list-items">
            {list.items.map((item, index) => (
              <div
                key={item.itemId}
                className="list-item-wrapper"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ShoppingListItemCard
                  item={item}
                  onRemove={handleRemoveItem}
                  isRemoving={removingItemId === item.itemId}
                />
              </div>
            ))}
          </div>
        )}

        {list.items.length > 0 && (
          <div className="list-summary">
            <div className="summary-stores">
              <h3>Shop at</h3>
              <div className="store-badges">
                {Array.from(
                  new Set(
                    list.items.flatMap((item) =>
                      item.availabilityHints.map((h) => h.storeName)
                    )
                  )
                )
                  .slice(0, 5)
                  .map((store) => (
                    <span key={store} className="store-badge">
                      {store}
                    </span>
                  ))}
              </div>
            </div>
            
            <div className="summary-actions">
              <Button variant="secondary" onClick={() => navigate('/')}>
                Add More Items
              </Button>
            </div>
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
    </div>
  );
}

