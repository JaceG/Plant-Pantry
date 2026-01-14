import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import {
  adminApi,
  AdminCityPage,
  CityStore,
  StoreProductWithModeration,
  StoreProductsResponse,
} from "../../api/adminApi";
import { productsApi } from "../../api/productsApi";
import { ProductSummary } from "../../types";
import "./AdminCityPageEditor.css";

type Tab = "info" | "stores";
type StoreView = "list" | "detail";

export function AdminCityPageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNew = slug === "new";

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("info");

  // City info state
  const [cityPage, setCityPage] = useState<AdminCityPage | null>(null);
  const [form, setForm] = useState({
    slug: "",
    cityName: "",
    state: "",
    headline: "",
    description: "",
    isActive: false,
  });

  // Stores state
  const [stores, setStores] = useState<CityStore[]>([]);
  const [storeView, setStoreView] = useState<StoreView>("list");
  const [selectedStore, setSelectedStore] = useState<CityStore | null>(null);
  const [storeProducts, setStoreProducts] = useState<
    StoreProductWithModeration[]
  >([]);
  const [storeStatusCounts, setStoreStatusCounts] = useState({
    confirmed: 0,
    pending: 0,
    rejected: 0,
  });

  // Add store form
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStore, setNewStore] = useState({
    name: "",
    type: "brick_and_mortar",
    address: "",
    zipCode: "",
    websiteUrl: "",
    phoneNumber: "",
  });

  // Product search state
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<
    ProductSummary[]
  >([]);

  // UI state
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingStoreProducts, setLoadingStoreProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Generate slug from city name and state
  const generateSlug = (cityName: string, state: string) => {
    return `${cityName}-${state}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Fetch city data
  const fetchCityData = useCallback(async () => {
    if (isNew || !slug) return;

    try {
      const [pageRes, storesRes] = await Promise.all([
        adminApi.getCityPage(slug),
        adminApi.getCityStores(slug),
      ]);

      setCityPage(pageRes.cityPage);
      setForm({
        slug: pageRes.cityPage.slug,
        cityName: pageRes.cityPage.cityName,
        state: pageRes.cityPage.state,
        headline: pageRes.cityPage.headline,
        description: pageRes.cityPage.description,
        isActive: pageRes.cityPage.isActive,
      });
      setStores(storesRes.stores);
    } catch (err) {
      setError("Failed to load city page");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [slug, isNew]);

  useEffect(() => {
    fetchCityData();
  }, [fetchCityData]);

  // Refresh stores
  const refreshStores = async () => {
    if (!slug || isNew) return;
    try {
      const res = await adminApi.getCityStores(slug);
      setStores(res.stores);
    } catch (err) {
      console.error("Failed to refresh stores:", err);
    }
  };

  // Fetch store products
  const fetchStoreProducts = async (storeId: string) => {
    setLoadingStoreProducts(true);
    try {
      const res: StoreProductsResponse =
        await adminApi.getStoreProducts(storeId);
      setStoreProducts(res.products);
      setStoreStatusCounts(res.statusCounts);
    } catch (err) {
      console.error("Failed to fetch store products:", err);
      setError("Failed to load store products");
    } finally {
      setLoadingStoreProducts(false);
    }
  };

  // Handle store selection (slide to detail)
  const handleSelectStore = (store: CityStore) => {
    setSelectedStore(store);
    setStoreView("detail");
    setProductSearchQuery("");
    setProductSearchResults([]);
    fetchStoreProducts(store.id);
  };

  // Handle back to store list
  const handleBackToStores = () => {
    setStoreView("list");
    setSelectedStore(null);
    setStoreProducts([]);
    setProductSearchQuery("");
    setProductSearchResults([]);
    refreshStores();
  };

  // Handle city name change
  const handleCityNameChange = (cityName: string) => {
    setForm((prev) => ({
      ...prev,
      cityName,
      slug: isNew ? generateSlug(cityName, prev.state) : prev.slug,
    }));
  };

  // Handle state change
  const handleStateChange = (state: string) => {
    setForm((prev) => ({
      ...prev,
      state: state.toUpperCase(),
      slug: isNew ? generateSlug(prev.cityName, state) : prev.slug,
    }));
  };

  // Save city info
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isNew) {
        await adminApi.createCityPage(form);
        setSuccessMessage("City page created!");
        setTimeout(() => {
          navigate(`/admin/cities/${form.slug}`);
        }, 1000);
      } else {
        await adminApi.updateCityPage(slug!, {
          cityName: form.cityName,
          state: form.state,
          headline: form.headline,
          description: form.description,
          isActive: form.isActive,
        });
        setSuccessMessage("City page updated!");
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Add new store
  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || isNew) return;

    setSaving(true);
    try {
      await adminApi.addStoreToCity(slug, newStore);
      setSuccessMessage("Store added!");
      setNewStore({
        name: "",
        type: "brick_and_mortar",
        address: "",
        zipCode: "",
        websiteUrl: "",
        phoneNumber: "",
      });
      setShowAddStore(false);
      await refreshStores();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add store");
    } finally {
      setSaving(false);
    }
  };

  // Remove store from city
  const handleRemoveStore = async (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!slug || !confirm("Remove this store from the city?")) return;

    try {
      await adminApi.removeStoreFromCity(slug, storeId);
      setSuccessMessage("Store removed");
      await refreshStores();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to remove store");
    }
  };

  // Search products
  const handleProductSearch = async () => {
    if (!productSearchQuery.trim()) {
      setProductSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await productsApi.getProducts({
        q: productSearchQuery,
        pageSize: 15,
      });
      // Filter out products already at this store
      const existingIds = new Set(storeProducts.map((p) => p.productId));
      setProductSearchResults(res.items.filter((p) => !existingIds.has(p.id)));
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  // Add product to store
  const handleAddProduct = async (productId: string) => {
    if (!selectedStore) return;

    try {
      await adminApi.addProductToStore(selectedStore.id, productId);
      setSuccessMessage("Product added!");
      setProductSearchResults((prev) => prev.filter((p) => p.id !== productId));
      await fetchStoreProducts(selectedStore.id);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      if (err.message?.includes("already available")) {
        setError("Product is already at this store");
      } else {
        setError("Failed to add product");
      }
      setTimeout(() => setError(null), 3000);
    }
  };

  // Remove product from store
  const handleRemoveProduct = async (productId: string) => {
    if (!selectedStore) return;
    if (!confirm("Remove this product from the store?")) return;

    try {
      await adminApi.removeProductFromStore(selectedStore.id, productId);
      setSuccessMessage("Product removed");
      await fetchStoreProducts(selectedStore.id);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to remove product");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Moderate availability (approve/reject)
  const handleModerate = async (
    availabilityId: string,
    status: "confirmed" | "rejected",
  ) => {
    try {
      await adminApi.moderateAvailability(availabilityId, status);
      setSuccessMessage(status === "confirmed" ? "Approved!" : "Rejected");
      if (selectedStore) {
        await fetchStoreProducts(selectedStore.id);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to moderate");
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <div className="loading-spinner" />
          <span>Loading city page...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-city-editor">
        <header className="editor-header">
          <button
            onClick={() => navigate("/admin/cities")}
            className="back-button"
          >
            ← Back to City Pages
          </button>
          <h1>
            {isNew
              ? "Create City Page"
              : `Edit: ${cityPage?.cityName}, ${cityPage?.state}`}
          </h1>
          {!isNew && cityPage && (
            <a
              href={`/cities/${cityPage.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="preview-link"
            >
              Preview Page →
            </a>
          )}
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

        {/* Tabs */}
        <nav className="editor-tabs">
          <button
            className={`tab ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
          >
            <span className="tab-icon">📝</span>
            General Info
          </button>
          <button
            className={`tab ${activeTab === "stores" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("stores");
              setStoreView("list");
              setSelectedStore(null);
            }}
            disabled={isNew}
          >
            <span className="tab-icon">🏪</span>
            Stores & Products ({stores.length})
          </button>
        </nav>

        {/* Tab Content */}
        <div className="tab-content">
          {/* General Info Tab */}
          {activeTab === "info" && (
            <form onSubmit={handleSaveInfo} className="info-form">
              <div className="form-row">
                <div className="form-group">
                  <label>City Name</label>
                  <input
                    type="text"
                    value={form.cityName}
                    onChange={(e) => handleCityNameChange(e.target.value)}
                    placeholder="e.g., Delaware"
                    required
                  />
                </div>
                <div className="form-group state-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    placeholder="OH"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>URL Slug</label>
                <div className="slug-preview">
                  <span className="slug-prefix">/cities/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        slug: e.target.value,
                      }))
                    }
                    placeholder="delaware-oh"
                    required
                    disabled={!isNew}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Headline</label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      headline: e.target.value,
                    }))
                  }
                  placeholder="Discover vegan options in Central Ohio"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Write a brief introduction about the city..."
                  rows={4}
                  required
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  <span>Publish (make active)</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={saving} className="save-button">
                  {saving
                    ? "Saving..."
                    : isNew
                      ? "Create City Page"
                      : "Update City Page"}
                </button>
              </div>
            </form>
          )}

          {/* Stores Tab */}
          {activeTab === "stores" && (
            <div className="stores-tab">
              {/* Slide container */}
              <div
                className={`slide-container ${
                  storeView === "detail" ? "show-detail" : ""
                }`}
              >
                {/* Store List View */}
                <div className="slide-panel store-list-view">
                  <div className="tab-header">
                    <h2>
                      Stores in {form.cityName}, {form.state}
                    </h2>
                    <button
                      onClick={() => setShowAddStore(!showAddStore)}
                      className="add-btn"
                    >
                      {showAddStore ? "Cancel" : "+ Add Store"}
                    </button>
                  </div>

                  {/* Add Store Form */}
                  {showAddStore && (
                    <form onSubmit={handleAddStore} className="add-store-form">
                      <h3>Add New Store</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Store Name *</label>
                          <input
                            type="text"
                            value={newStore.name}
                            onChange={(e) =>
                              setNewStore((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            placeholder="e.g., Kroger - Delaware"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Type</label>
                          <select
                            value={newStore.type}
                            onChange={(e) =>
                              setNewStore((prev) => ({
                                ...prev,
                                type: e.target.value,
                              }))
                            }
                          >
                            <option value="brick_and_mortar">
                              Physical Store
                            </option>
                            <option value="online">Online</option>
                            <option value="brand_direct">Brand Direct</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Address</label>
                          <input
                            type="text"
                            value={newStore.address}
                            onChange={(e) =>
                              setNewStore((prev) => ({
                                ...prev,
                                address: e.target.value,
                              }))
                            }
                            placeholder="123 Main St"
                          />
                        </div>
                        <div className="form-group zip-group">
                          <label>ZIP Code</label>
                          <input
                            type="text"
                            value={newStore.zipCode}
                            onChange={(e) =>
                              setNewStore((prev) => ({
                                ...prev,
                                zipCode: e.target.value,
                              }))
                            }
                            placeholder="43015"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={saving}
                        className="submit-btn"
                      >
                        {saving ? "Adding..." : "Add Store"}
                      </button>
                    </form>
                  )}

                  {/* Stores List */}
                  {stores.length === 0 ? (
                    <div className="empty-state">
                      <p>No stores in this city yet.</p>
                      <p className="hint">
                        Add stores to start tracking products.
                      </p>
                    </div>
                  ) : (
                    <div className="stores-list">
                      {stores.map((store) => (
                        <div
                          key={store.id}
                          className="store-card clickable"
                          onClick={() => handleSelectStore(store)}
                        >
                          <div className="store-info">
                            <h3>{store.name}</h3>
                            <p className="store-address">
                              {store.address && `${store.address}, `}
                              {store.city}, {store.state}
                              {store.zipCode && ` ${store.zipCode}`}
                            </p>
                            <div className="store-meta">
                              <span className="product-count">
                                {store.productCount} products
                              </span>
                              {(store.pendingCount || 0) > 0 && (
                                <span className="pending-count">
                                  {store.pendingCount} pending
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="store-actions">
                            <button
                              onClick={(e) => handleRemoveStore(store.id, e)}
                              className="remove-btn"
                              title="Remove from city"
                            >
                              ×
                            </button>
                            <span className="arrow">→</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Store Detail View */}
                <div className="slide-panel store-detail-view">
                  {selectedStore && (
                    <>
                      <div className="detail-header">
                        <button
                          onClick={handleBackToStores}
                          className="back-btn"
                        >
                          ← Back to stores
                        </button>
                        <div className="store-title">
                          <h2>{selectedStore.name}</h2>
                          <p className="store-address">
                            {selectedStore.address &&
                              `${selectedStore.address}, `}
                            {selectedStore.city}, {selectedStore.state}
                            {selectedStore.zipCode &&
                              ` ${selectedStore.zipCode}`}
                          </p>
                        </div>
                      </div>

                      {/* Add Products Search */}
                      <div className="add-product-section">
                        <h3>Add Products</h3>
                        <div className="search-box">
                          <input
                            type="text"
                            placeholder="Search for products to add..."
                            value={productSearchQuery}
                            onChange={(e) =>
                              setProductSearchQuery(e.target.value)
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleProductSearch()
                            }
                          />
                          <button
                            onClick={handleProductSearch}
                            disabled={searching}
                          >
                            {searching ? "Searching..." : "Search"}
                          </button>
                        </div>

                        {productSearchResults.length > 0 && (
                          <div className="search-results">
                            {productSearchResults.map((product) => (
                              <div key={product.id} className="search-result">
                                <div className="result-image">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                    />
                                  ) : (
                                    <span>🌱</span>
                                  )}
                                </div>
                                <div className="result-info">
                                  <span className="name">{product.name}</span>
                                  <span className="brand">{product.brand}</span>
                                </div>
                                <button
                                  onClick={() => handleAddProduct(product.id)}
                                  className="add-product-btn"
                                >
                                  + Add
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Products at Store */}
                      <div className="products-section">
                        <div className="section-header">
                          <h3>
                            Products at this Store ({storeProducts.length})
                          </h3>
                          <div className="status-filters">
                            <span className="status-pill confirmed">
                              {storeStatusCounts.confirmed} confirmed
                            </span>
                            {storeStatusCounts.pending > 0 && (
                              <span className="status-pill pending">
                                {storeStatusCounts.pending} pending
                              </span>
                            )}
                          </div>
                        </div>

                        {loadingStoreProducts ? (
                          <div className="loading-products">
                            <div className="loading-spinner" />
                            <span>Loading products...</span>
                          </div>
                        ) : storeProducts.length === 0 ? (
                          <div className="empty-state">
                            <p>No products at this store yet.</p>
                            <p className="hint">
                              Use the search above to add products.
                            </p>
                          </div>
                        ) : (
                          <div className="products-list">
                            {storeProducts.map((product) => (
                              <div
                                key={product.availabilityId}
                                className={`product-card ${product.moderationStatus}`}
                              >
                                <div className="product-image">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                    />
                                  ) : (
                                    <span>🌱</span>
                                  )}
                                </div>
                                <div className="product-info">
                                  <h4>{product.name}</h4>
                                  <p className="brand">{product.brand}</p>
                                  <div className="product-badges">
                                    <span
                                      className={`source-badge ${product.source}`}
                                    >
                                      {product.source === "admin"
                                        ? "👤 Admin"
                                        : product.source === "user_contribution"
                                          ? "🙋 User Report"
                                          : product.source}
                                    </span>
                                    <span
                                      className={`status-badge ${product.moderationStatus}`}
                                    >
                                      {product.moderationStatus}
                                    </span>
                                  </div>
                                  {product.reportedBy && (
                                    <p className="reporter">
                                      Reported by:{" "}
                                      {product.reportedBy.displayName ||
                                        product.reportedBy.email}
                                    </p>
                                  )}
                                  {product.notes && (
                                    <p className="notes">"{product.notes}"</p>
                                  )}
                                </div>
                                <div className="product-actions">
                                  {product.moderationStatus === "pending" && (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleModerate(
                                            product.availabilityId,
                                            "confirmed",
                                          )
                                        }
                                        className="approve-btn"
                                        title="Approve"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleModerate(
                                            product.availabilityId,
                                            "rejected",
                                          )
                                        }
                                        className="reject-btn"
                                        title="Reject"
                                      >
                                        ×
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleRemoveProduct(product.productId)
                                    }
                                    className="remove-btn"
                                    title="Remove"
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
