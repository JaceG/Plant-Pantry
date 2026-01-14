import { useState, useEffect, useCallback } from "react";
import { adminApi, FeaturedProduct, productsApi } from "../../api";
import { ProductSummary } from "../../types";
import { AdminLayout } from "./AdminLayout";
import {
  ProductPreviewModal,
  ProductPreviewData,
} from "../../components/Common";
import "./AdminFeaturedProducts.css";

export function AdminFeaturedProducts() {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>(
    [],
  );
  const [searchResults, setSearchResults] = useState<ProductSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] =
    useState<ProductPreviewData | null>(null);

  const fetchFeaturedProducts = useCallback(async () => {
    try {
      const response = await adminApi.getFeaturedProducts();
      setFeaturedProducts(response.products);
    } catch (err) {
      setError("Failed to load featured products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedProducts();
  }, [fetchFeaturedProducts]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await productsApi.getProducts({
        q: searchQuery,
        pageSize: 10,
      });
      // Filter out already featured products
      const featuredIds = new Set(featuredProducts.map((p) => p.id));
      setSearchResults(response.items.filter((p) => !featuredIds.has(p.id)));
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleFeature = async (productId: string) => {
    try {
      await adminApi.featureProduct(productId, true);
      setSuccessMessage("Product featured successfully");
      setSearchResults((prev) => prev.filter((p) => p.id !== productId));
      await fetchFeaturedProducts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to feature product");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUnfeature = async (productId: string) => {
    try {
      await adminApi.featureProduct(productId, false);
      setSuccessMessage("Product removed from featured");
      await fetchFeaturedProducts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to unfeature product");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newOrder = [...featuredProducts];
    [newOrder[index], newOrder[index - 1]] = [
      newOrder[index - 1],
      newOrder[index],
    ];

    const productIds = newOrder.map((p) => p.id);

    try {
      await adminApi.reorderFeaturedProducts(productIds);
      setFeaturedProducts(newOrder);
    } catch (err) {
      setError("Failed to reorder products");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === featuredProducts.length - 1) return;

    const newOrder = [...featuredProducts];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1],
      newOrder[index],
    ];

    const productIds = newOrder.map((p) => p.id);

    try {
      await adminApi.reorderFeaturedProducts(productIds);
      setFeaturedProducts(newOrder);
    } catch (err) {
      setError("Failed to reorder products");
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <div className="loading-spinner" />
          <span>Loading featured products...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-featured-products">
        <header className="page-header">
          <h1>Featured Products</h1>
          <p className="page-subtitle">
            Manage which products appear on the homepage featured section
          </p>
        </header>

        {error && (
          <div className="message error-message">
            <span className="message-icon">⚠️</span>
            {error}
          </div>
        )}

        {successMessage && (
          <div className="message success-message">
            <span className="message-icon">✓</span>
            {successMessage}
          </div>
        )}

        {/* Search Section */}
        <section className="search-section">
          <h2>Add Featured Products</h2>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search for products to feature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="search-input"
            />
            <button
              onClick={handleSearch}
              className="search-button"
              disabled={searching}
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((product) => (
                <div key={product.id} className="search-result-item">
                  <div className="result-image">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : (
                      <span className="placeholder">🌱</span>
                    )}
                  </div>
                  <div className="result-info">
                    <span className="result-name">{product.name}</span>
                    <span className="result-brand">{product.brand}</span>
                  </div>
                  <button
                    onClick={() => handleFeature(product.id)}
                    className="feature-button"
                  >
                    + Feature
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Featured Products List */}
        <section className="featured-list-section">
          <h2>Current Featured Products ({featuredProducts.length})</h2>

          {featuredProducts.length === 0 ? (
            <div className="empty-state">
              <p>No featured products yet. Use the search above to add some!</p>
            </div>
          ) : (
            <div className="featured-list">
              {featuredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="featured-item"
                  onClick={(e) => {
                    // Don't open preview if clicking interactive elements
                    const target = e.target as HTMLElement;
                    if (
                      target.closest(".order-controls") ||
                      target.closest(".unfeature-button") ||
                      target.tagName === "BUTTON"
                    ) {
                      return;
                    }
                    setPreviewProduct({
                      id: product.id,
                      name: product.name,
                      brand: product.brand,
                      imageUrl: product.imageUrl,
                    });
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPreviewProduct({
                        id: product.id,
                        name: product.name,
                        brand: product.brand,
                        imageUrl: product.imageUrl,
                      });
                    }
                  }}
                >
                  <div className="item-order">
                    <span className="order-number">{index + 1}</span>
                    <div className="order-controls">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveUp(index);
                        }}
                        disabled={index === 0}
                        className="order-btn"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveDown(index);
                        }}
                        disabled={index === featuredProducts.length - 1}
                        className="order-btn"
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  <div className="item-image">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : (
                      <span className="placeholder">🌱</span>
                    )}
                  </div>

                  <div className="item-info">
                    <span className="item-name">{product.name}</span>
                    <span className="item-brand">{product.brand}</span>
                    {product.featuredAt && (
                      <span className="item-date">
                        Featured:{" "}
                        {new Date(product.featuredAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnfeature(product.id);
                    }}
                    className="unfeature-button"
                    title="Remove from featured"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ProductPreviewModal
        isOpen={!!previewProduct}
        onClose={() => setPreviewProduct(null)}
        product={previewProduct}
      />
    </AdminLayout>
  );
}
