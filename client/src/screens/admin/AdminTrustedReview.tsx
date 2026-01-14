import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { Button } from "../../components/Common/Button";
import { Toast } from "../../components/Common/Toast";
import { adminApi, PendingProduct, PendingStore } from "../../api/adminApi";
import "./AdminTrustedReview.css";

type Tab = "products" | "stores";

export function AdminTrustedReview() {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [stores, setStores] = useState<PendingStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productTotal, setProductTotal] = useState(0);
  const [storeTotal, setStoreTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getTrustedProductsPendingReview(page, 20);
      setProducts(response.items);
      setProductTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getTrustedStoresPendingReview(page, 20);
      setStores(response.items);
      setStoreTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stores");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (activeTab === "products") {
      fetchProducts();
    } else {
      fetchStores();
    }
  }, [activeTab, fetchProducts, fetchStores]);

  // Also fetch counts for both on initial load
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [prodRes, storeRes] = await Promise.all([
          adminApi.getTrustedProductsPendingReview(1, 1),
          adminApi.getTrustedStoresPendingReview(1, 1),
        ]);
        setProductTotal(prodRes.total);
        setStoreTotal(storeRes.total);
      } catch {
        // Silently fail
      }
    };
    fetchCounts();
  }, []);

  const handleApproveProduct = async (productId: string) => {
    setActionLoading(productId);
    try {
      await adminApi.approveTrustedProduct(productId);
      setProducts(products.filter((p) => p.id !== productId));
      setProductTotal((prev) => prev - 1);
      setToast({ message: "Product approved", type: "success" });
    } catch {
      setToast({ message: "Failed to approve product", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectProduct = async (productId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to reject this product? It will be removed from public view.",
      )
    ) {
      return;
    }
    setActionLoading(productId);
    try {
      await adminApi.rejectTrustedProduct(productId);
      setProducts(products.filter((p) => p.id !== productId));
      setProductTotal((prev) => prev - 1);
      setToast({ message: "Product rejected", type: "success" });
    } catch {
      setToast({ message: "Failed to reject product", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveStore = async (storeId: string) => {
    setActionLoading(storeId);
    try {
      await adminApi.approveTrustedStore(storeId);
      setStores(stores.filter((s) => s.id !== storeId));
      setStoreTotal((prev) => prev - 1);
      setToast({ message: "Store approved", type: "success" });
    } catch {
      setToast({ message: "Failed to approve store", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectStore = async (storeId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to reject this store? It will be removed from public view.",
      )
    ) {
      return;
    }
    setActionLoading(storeId);
    try {
      await adminApi.rejectTrustedStore(storeId);
      setStores(stores.filter((s) => s.id !== storeId));
      setStoreTotal((prev) => prev - 1);
      setToast({ message: "Store rejected", type: "success" });
    } catch {
      setToast({ message: "Failed to reject store", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const currentTotal = activeTab === "products" ? productTotal : storeTotal;

  if (loading && products.length === 0 && stores.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <div className="loading-spinner" />
          <span>Loading trusted contributor content...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-trusted-review">
        <header className="page-header">
          <div>
            <h1>⭐ Trusted Contributor Review</h1>
            <p className="page-subtitle">
              Content from trusted contributors is live but needs review.
              Rejecting will remove it from public view.
            </p>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="review-tabs">
          <button
            className={`review-tab ${activeTab === "products" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("products");
              setPage(1);
            }}
          >
            📦 Products{" "}
            {productTotal > 0 && (
              <span className="tab-count">{productTotal}</span>
            )}
          </button>
          <button
            className={`review-tab ${activeTab === "stores" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("stores");
              setPage(1);
            }}
          >
            🏪 Stores{" "}
            {storeTotal > 0 && <span className="tab-count">{storeTotal}</span>}
          </button>
        </div>

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="review-content">
            {products.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✅</span>
                <h2>All Caught Up!</h2>
                <p>No trusted contributor products pending review.</p>
              </div>
            ) : (
              <div className="review-list">
                {products.map((product) => (
                  <div key={product.id} className="review-card">
                    <div className="review-card-header">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="product-image"
                        />
                      ) : (
                        <div className="product-image-placeholder">🌿</div>
                      )}
                      <div className="product-info">
                        <h3>
                          <Link to={`/products/${product.id}`} target="_blank">
                            {product.name}
                          </Link>
                        </h3>
                        <span className="product-brand">{product.brand}</span>
                      </div>
                    </div>

                    <div className="review-card-meta">
                      <span className="meta-item">👤 {product.userEmail}</span>
                      <span className="meta-item">
                        📅 {new Date(product.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="review-card-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveProduct(product.id)}
                        isLoading={actionLoading === product.id}
                        disabled={actionLoading !== null}
                      >
                        ✅ Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRejectProduct(product.id)}
                        isLoading={actionLoading === product.id}
                        disabled={actionLoading !== null}
                      >
                        ❌ Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stores Tab */}
        {activeTab === "stores" && (
          <div className="review-content">
            {stores.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✅</span>
                <h2>All Caught Up!</h2>
                <p>No trusted contributor stores pending review.</p>
              </div>
            ) : (
              <div className="review-list">
                {stores.map((store) => (
                  <div key={store.id} className="review-card">
                    <div className="review-card-header">
                      <span className="store-icon">
                        {store.type === "brick_and_mortar" && "🏪"}
                        {store.type === "online_retailer" && "🌐"}
                        {store.type === "brand_direct" && "🏷️"}
                      </span>
                      <div className="store-info">
                        <h3>{store.name}</h3>
                        <span className="store-type">
                          {store.type === "brick_and_mortar" &&
                            "Physical Store"}
                          {store.type === "online_retailer" &&
                            "Online Retailer"}
                          {store.type === "brand_direct" && "Brand Direct"}
                        </span>
                      </div>
                    </div>

                    <div className="review-card-details">
                      {store.address && (
                        <div className="detail-row">
                          <span className="detail-label">Address:</span>
                          <span className="detail-value">
                            {store.address}
                            {store.city && `, ${store.city}`}
                            {store.state && `, ${store.state}`}
                          </span>
                        </div>
                      )}
                      {store.websiteUrl && (
                        <div className="detail-row">
                          <span className="detail-label">Website:</span>
                          <a
                            href={store.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {store.websiteUrl}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="review-card-meta">
                      {store.createdBy && (
                        <span className="meta-item">
                          👤{" "}
                          {store.createdBy.displayName || store.createdBy.email}
                        </span>
                      )}
                      <span className="meta-item">
                        📅 {new Date(store.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="review-card-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveStore(store.id)}
                        isLoading={actionLoading === store.id}
                        disabled={actionLoading !== null}
                      >
                        ✅ Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRejectStore(store.id)}
                        isLoading={actionLoading === store.id}
                        disabled={actionLoading !== null}
                      >
                        ❌ Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {currentTotal > 20 && (
          <div className="pagination">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="secondary"
              size="sm"
            >
              ← Previous
            </Button>
            <span className="page-info">
              Page {page} of {Math.ceil(currentTotal / 20)}
            </span>
            <Button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(currentTotal / 20)}
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
