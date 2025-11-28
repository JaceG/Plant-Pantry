import { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button, Toast } from '../components';
import { useProductDetail, useShoppingList } from '../hooks';
import './ProductDetailScreen.css';

export function ProductDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { product, loading, error } = useProductDetail(id);
  const { getOrCreateDefaultList, addItem, addingItem } = useShoppingList();
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleAddToList = useCallback(async () => {
    if (!product) return;
    
    try {
      const defaultList = await getOrCreateDefaultList();
      if (!defaultList) {
        setToast({ message: 'Could not create shopping list', type: 'error' });
        return;
      }
      
      const success = await addItem(defaultList.id, { productId: product.id });
      if (success) {
        setToast({ message: `Added ${product.name} to your list!`, type: 'success' });
      } else {
        setToast({ message: 'Failed to add item to list', type: 'error' });
      }
    } catch {
      setToast({ message: 'Something went wrong', type: 'error' });
    }
  }, [product, getOrCreateDefaultList, addItem]);

  if (loading) {
    return (
      <div className="product-detail-screen">
        <div className="detail-container">
          <div className="detail-loading">
            <div className="loading-spinner" />
            <span>Loading product...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-screen">
        <div className="detail-container">
          <div className="detail-error">
            <span className="error-icon">😕</span>
            <h2>Product Not Found</h2>
            <p>{error || "We couldn't find the product you're looking for."}</p>
            <Button onClick={() => navigate('/')}>Browse Products</Button>
          </div>
        </div>
      </div>
    );
  }

  const storeTypeLabels: Record<string, string> = {
    brick_and_mortar: '🏪 Store',
    online_retailer: '🌐 Online',
    brand_direct: '🏷️ Direct',
  };

  return (
    <div className="product-detail-screen">
      <div className="detail-container">
        <nav className="breadcrumb">
          <Link to="/">Products</Link>
          <span className="separator">/</span>
          <span>{product.brand}</span>
        </nav>

        <div className="detail-grid">
          <div className="detail-image-section">
            <div className="detail-image-container">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="detail-image" />
              ) : (
                <div className="detail-image-placeholder">
                  <span>🌿</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-info-section">
            <span className="detail-brand">{product.brand}</span>
            <h1 className="detail-name">{product.name}</h1>
            <span className="detail-size">{product.sizeOrVariant}</span>
            {product._source === 'user_contribution' && (
              <div className="user-contributed-badge">
                <span className="badge-icon">👤</span>
                <span>User Contributed</span>
              </div>
            )}

            <div className="detail-tags">
              {product.tags.map((tag) => (
                <span key={tag} className="detail-tag">
                  {tag}
                </span>
              ))}
              {product.isStrictVegan && (
                <span className="detail-tag vegan-badge">✓ Strict Vegan</span>
              )}
            </div>

            {product.description && (
              <div className="detail-section">
                <h3>About</h3>
                <p>{product.description}</p>
              </div>
            )}

            {product.ingredientSummary && (
              <div className="detail-section">
                <h3>Ingredients</h3>
                <p>{product.ingredientSummary}</p>
              </div>
            )}

            {product.nutritionSummary && (
              <div className="detail-section">
                <h3>Nutrition</h3>
                <p>{product.nutritionSummary}</p>
              </div>
            )}

            <div className="detail-actions">
              <Button onClick={handleAddToList} isLoading={addingItem} size="lg">
                Add to Shopping List
              </Button>
            </div>
          </div>
        </div>

        <section className="availability-section">
          <h2 className="section-title">
            <span className="title-icon">📍</span>
            Where to Buy
          </h2>
          
          {product.availability.length > 0 ? (
            <div className="availability-grid">
              {product.availability.map((avail) => (
                <div key={avail.storeId} className="availability-card">
                  <div className="store-header">
                    <span className="store-type">
                      {storeTypeLabels[avail.storeType] || avail.storeType}
                    </span>
                    <span className={`availability-status status-${avail.status}`}>
                      {avail.status === 'known' ? 'Available' : avail.status}
                    </span>
                  </div>
                  <h4 className="store-name">{avail.storeName}</h4>
                  <span className="store-region">{avail.regionOrScope}</span>
                  {avail.priceRange && (
                    <span className="store-price">{avail.priceRange}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="availability-empty">
              <p>Availability information is not yet available for this product.</p>
              <p className="availability-empty-note">
                Store availability data will be added soon. Check back later!
              </p>
            </div>
          )}
        </section>
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

