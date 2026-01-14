import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  storesApi,
  ChainPageStore,
  ChainPageProduct,
  RetailerEditField,
} from "../api/storesApi";
import { Store } from "../types/store";
import { ProductCard, Pagination, StoreMap, SEO } from "../components";
import { ProductSummary } from "../types";
import { useAuth } from "../context/AuthContext";
import "./RetailerScreen.css";

type RetailerType = "chain" | "store";

interface RetailerData {
  type: RetailerType;
  id: string; // Store ID or Chain ID
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  storeType?: string;
  locationCount: number;
  stores: ChainPageStore[];
  products: ChainPageProduct[];
  totalProducts: number;
  page: number;
  totalPages: number;
}

export function RetailerScreen() {
  const { identifier } = useParams<{ identifier: string }>();
  const location = window.location.pathname;
  const { isAuthenticated } = useAuth();

  // Determine type from URL path
  const type: "chain" | "store" = location.includes("/retailers/chain/")
    ? "chain"
    : "store";

  const [retailerData, setRetailerData] = useState<RetailerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"products" | "locations">(
    "products",
  );
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editingField, setEditingField] = useState<RetailerEditField | null>(
    null,
  );
  const [editValue, setEditValue] = useState("");
  const [editReason, setEditReason] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const pageSize = 24;

  const fetchData = useCallback(async () => {
    if (!type || !identifier) return;

    setLoading(true);
    setError(null);

    try {
      if (type === "chain") {
        const res = await storesApi.getChainPage(identifier, page, pageSize);
        setRetailerData({
          type: "chain",
          id: res.chain.id,
          name: res.chain.name,
          slug: res.chain.slug,
          description: (res.chain as any).description,
          logoUrl: res.chain.logoUrl,
          websiteUrl: res.chain.websiteUrl,
          locationCount: res.stores.length,
          stores: res.stores,
          products: res.products,
          totalProducts: res.totalProducts,
          page: res.page,
          totalPages: res.totalPages,
        });
      } else {
        const res = await storesApi.getStorePage(identifier, page, pageSize);
        setRetailerData({
          type: "store",
          id: res.store.id,
          name: res.store.name,
          description: (res.store as any).description,
          storeType: res.store.type,
          websiteUrl: res.store.websiteUrl,
          locationCount: 1,
          stores: [
            {
              id: res.store.id,
              name: res.store.name,
              type: res.store.type,
              address: res.store.address,
              city: res.store.city,
              state: res.store.state,
              zipCode: res.store.zipCode,
              latitude: res.store.latitude,
              longitude: res.store.longitude,
            },
          ],
          products: res.products,
          totalProducts: res.totalProducts,
          page: res.page,
          totalPages: res.totalPages,
        });
      }
    } catch (err: any) {
      console.error("Error fetching retailer data:", err);
      setError(err.message || "Failed to load retailer");
    } finally {
      setLoading(false);
    }
  }, [type, identifier, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert stores to format expected by StoreMap
  const mapStores: Store[] = useMemo(() => {
    if (!retailerData) return [];

    return retailerData.stores
      .filter((s) => s.latitude && s.longitude)
      .map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type as any,
        regionOrScope: s.state || "Unknown",
        address: s.address,
        city: s.city,
        state: s.state,
        zipCode: s.zipCode,
        latitude: s.latitude,
        longitude: s.longitude,
      }));
  }, [retailerData]);

  // Group stores by state
  const storesByState = useMemo(() => {
    if (!retailerData) return new Map<string, ChainPageStore[]>();

    const grouped = new Map<string, ChainPageStore[]>();
    retailerData.stores.forEach((store) => {
      const state = store.state || "Other";
      if (!grouped.has(state)) {
        grouped.set(state, []);
      }
      grouped.get(state)!.push(store);
    });

    // Sort by state name
    return new Map(
      [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    );
  }, [retailerData]);

  const toggleState = (state: string) => {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(state)) {
        next.delete(state);
      } else {
        next.add(state);
      }
      return next;
    });
  };

  // Edit handlers
  const handleStartEdit = useCallback(
    (field: RetailerEditField) => {
      if (!retailerData) return;
      setEditingField(field);
      setEditValue(
        (retailerData[field as keyof typeof retailerData] as string) || "",
      );
      setEditReason("");
      setEditMessage(null);
    },
    [retailerData],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue("");
    setEditReason("");
    setEditMessage(null);
  }, []);

  const handleSubmitEdit = useCallback(async () => {
    if (!retailerData || !editingField) return;

    setSubmittingEdit(true);
    setEditMessage(null);

    try {
      let response;
      if (retailerData.type === "chain") {
        response = await storesApi.suggestChainEdit(retailerData.id, {
          field: editingField,
          suggestedValue: editValue.trim(),
          reason: editReason.trim() || undefined,
        });
      } else {
        response = await storesApi.suggestStoreEdit(retailerData.id, {
          field: editingField,
          suggestedValue: editValue.trim(),
          reason: editReason.trim() || undefined,
        });
      }

      const messageText = response.autoApplied
        ? "Your edit has been applied!"
        : "Your edit suggestion has been submitted for review!";

      setEditMessage({
        type: "success",
        text: messageText,
      });

      // If auto-applied, update local state
      if (response.autoApplied) {
        setRetailerData((prev) =>
          prev
            ? {
                ...prev,
                [editingField]: editValue.trim(),
              }
            : prev,
        );
      }

      setTimeout(() => {
        handleCancelEdit();
      }, 2000);
    } catch (err: any) {
      setEditMessage({
        type: "error",
        text: err.message || "Failed to submit edit",
      });
    } finally {
      setSubmittingEdit(false);
    }
  }, [retailerData, editingField, editValue, editReason, handleCancelEdit]);

  // Convert products to ProductSummary format for ProductCard
  const productSummaries: ProductSummary[] = useMemo(() => {
    if (!retailerData) return [];
    return retailerData.products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      sizeOrVariant: p.sizeOrVariant,
      imageUrl: p.imageUrl,
      categories: p.categories,
      tags: p.tags,
    }));
  }, [retailerData]);

  const getStoreTypeIcon = (storeType?: string) => {
    switch (storeType) {
      case "online_retailer":
        return "🌐";
      case "brick_and_mortar":
        return "🏪";
      default:
        return "🏬";
    }
  };

  const getStoreTypeLabel = (storeType?: string) => {
    switch (storeType) {
      case "online_retailer":
        return "Online Retailer";
      case "brick_and_mortar":
        return "Physical Store";
      default:
        return "Retailer";
    }
  };

  const isOnlineOnly =
    retailerData?.type === "store" &&
    retailerData?.storeType === "online_retailer";

  if (loading) {
    return (
      <div className="retailer-screen">
        <div className="retailer-loading">
          <div className="loading-spinner" />
          <span>Loading retailer...</span>
        </div>
      </div>
    );
  }

  if (error || !retailerData) {
    return (
      <div className="retailer-screen">
        {/* noindex prevents Google from indexing this as a soft 404 */}
        <SEO
          title="Retailer Not Found"
          description="This retailer page could not be found. It may have been removed or the URL is incorrect."
          noindex={true}
        />
        <div className="retailer-error">
          <h2>Retailer Not Found</h2>
          <p>{error || "The requested retailer could not be found."}</p>
          <Link to="/" className="back-home-btn">
            ← Back to Products
          </Link>
        </div>
      </div>
    );
  }

  // Build SEO description
  const seoDescription = retailerData.description
    ? retailerData.description.slice(0, 155)
    : `Find vegan products at ${retailerData.name}. Browse ${
        retailerData.totalProducts
      } plant-based products${
        retailerData.type === "chain"
          ? ` across ${retailerData.locationCount} locations`
          : ""
      }.`;

  // Determine canonical path based on type
  const canonicalPath =
    retailerData.type === "chain"
      ? `/retailers/chain/${retailerData.slug || identifier}`
      : `/retailers/store/${identifier}`;

  // Build structured data
  const retailerStructuredData = {
    "@context": "https://schema.org/",
    "@type": retailerData.type === "chain" ? "Organization" : "Store",
    name: retailerData.name,
    description: seoDescription,
    url: retailerData.websiteUrl || undefined,
    logo: retailerData.logoUrl || undefined,
  };

  return (
    <div className="retailer-screen">
      <SEO
        title={`${retailerData.name} - Vegan Products`}
        description={seoDescription}
        canonicalPath={canonicalPath}
        structuredData={retailerStructuredData}
      />
      {/* Hero Section */}
      <div className="retailer-hero">
        <div className="retailer-hero-content">
          <nav className="breadcrumb">
            <Link to="/">Products</Link>
            <span className="separator">/</span>
            <span>Retailers</span>
            <span className="separator">/</span>
            <span>{retailerData.name}</span>
            {isAuthenticated && (
              <button
                className="edit-page-toggle"
                onClick={() => setEditMode(!editMode)}
                title={
                  editMode ? "Exit edit mode" : "Suggest edits to this page"
                }
              >
                {editMode ? "✓ Done" : "✏️ Edit"}
              </button>
            )}
          </nav>
          <div className="retailer-header">
            <span className="retailer-icon">
              {getStoreTypeIcon(retailerData.storeType)}
            </span>
            <div className="retailer-info">
              {/* Retailer Name - Editable */}
              {editMode && editingField === "name" ? (
                <div className="edit-field-container">
                  <input
                    type="text"
                    className="edit-input edit-title-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Retailer Name"
                  />
                  <input
                    type="text"
                    className="edit-reason-input"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Why this change? (optional)"
                  />
                  {editMessage && (
                    <div className={`edit-message ${editMessage.type}`}>
                      {editMessage.text}
                    </div>
                  )}
                  <div className="edit-actions">
                    <button className="edit-cancel" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                    <button
                      className="edit-submit"
                      onClick={handleSubmitEdit}
                      disabled={
                        submittingEdit || editValue === retailerData.name
                      }
                    >
                      {submittingEdit ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </div>
              ) : (
                <h1 className="retailer-title">
                  {retailerData.name}
                  {editMode && (
                    <button
                      className="edit-btn"
                      onClick={() => handleStartEdit("name")}
                      title="Suggest edit"
                    >
                      ✏️
                    </button>
                  )}
                </h1>
              )}
              <p className="retailer-subtitle">
                {retailerData.type === "chain"
                  ? `${retailerData.locationCount} location${
                      retailerData.locationCount !== 1 ? "s" : ""
                    }`
                  : getStoreTypeLabel(retailerData.storeType)}
                {retailerData.totalProducts > 0 && (
                  <>
                    {" • "}
                    {retailerData.totalProducts} product
                    {retailerData.totalProducts !== 1 ? "s" : ""}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="retailer-description-section">
        <div className="retailer-description-content">
          <div className="retailer-description-placeholder">
            <h2>About {retailerData.name}</h2>

            {/* Description - Editable */}
            {editMode && editingField === "description" ? (
              <div className="edit-field-container edit-description-container">
                <textarea
                  className="edit-input edit-description-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Write a description for this retailer..."
                  rows={4}
                />
                <input
                  type="text"
                  className="edit-reason-input"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Why this change? (optional)"
                />
                {editMessage && (
                  <div className={`edit-message ${editMessage.type}`}>
                    {editMessage.text}
                  </div>
                )}
                <div className="edit-actions">
                  <button className="edit-cancel" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                  <button
                    className="edit-submit"
                    onClick={handleSubmitEdit}
                    disabled={
                      submittingEdit ||
                      editValue === (retailerData.description || "")
                    }
                  >
                    {submittingEdit ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="retailer-description-text">
                <p>
                  {retailerData.description ||
                    `Find plant-based products at ${retailerData.name}.${
                      retailerData.type === "chain"
                        ? ` Browse products available across their ${retailerData.locationCount} locations.`
                        : " Browse their selection of vegan-friendly products."
                    }`}
                </p>
                {editMode && (
                  <button
                    className="edit-btn edit-btn-inline"
                    onClick={() => handleStartEdit("description")}
                    title="Suggest edit"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}

            {/* Website URL - Editable */}
            {editMode && editingField === "websiteUrl" ? (
              <div className="edit-field-container">
                <input
                  type="url"
                  className="edit-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="https://example.com"
                />
                <input
                  type="text"
                  className="edit-reason-input"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Why this change? (optional)"
                />
                {editMessage && (
                  <div className={`edit-message ${editMessage.type}`}>
                    {editMessage.text}
                  </div>
                )}
                <div className="edit-actions">
                  <button className="edit-cancel" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                  <button
                    className="edit-submit"
                    onClick={handleSubmitEdit}
                    disabled={
                      submittingEdit ||
                      editValue === (retailerData.websiteUrl || "")
                    }
                  >
                    {submittingEdit ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="retailer-website-row">
                {retailerData.websiteUrl ? (
                  <a
                    href={retailerData.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="retailer-website-link"
                  >
                    Visit Website →
                  </a>
                ) : editMode ? (
                  <span className="no-website-text">No website added yet</span>
                ) : null}
                {editMode && (
                  <button
                    className="edit-btn edit-btn-inline"
                    onClick={() => handleStartEdit("websiteUrl")}
                    title="Suggest edit"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}

            <p className="retailer-claim-notice">
              Are you the store owner? Contact us to claim this page and add
              your store's information.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="retailer-tabs">
        <button
          className={`retailer-tab ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          <span className="tab-icon">📦</span>
          Products
          <span className="tab-count">{retailerData.totalProducts}</span>
        </button>
        {!isOnlineOnly && retailerData.stores.length > 0 && (
          <button
            className={`retailer-tab ${
              activeTab === "locations" ? "active" : ""
            }`}
            onClick={() => setActiveTab("locations")}
          >
            <span className="tab-icon">📍</span>
            Locations
            <span className="tab-count">{retailerData.locationCount}</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="retailer-content">
        {activeTab === "products" ? (
          <>
            {productSummaries.length === 0 ? (
              <div className="retailer-empty">
                <p>No products found at this retailer yet.</p>
                <p className="empty-note">
                  Know what products are available here? Help us by reporting
                  availability on any product page!
                </p>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {productSummaries.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {retailerData.totalPages > 1 && (
                  <div className="pagination-container">
                    <Pagination
                      currentPage={page}
                      totalPages={retailerData.totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="locations-section">
            {/* Map */}
            {mapStores.length > 0 && (
              <div className="locations-map-section">
                <h2 className="section-title">
                  <span className="title-icon">🗺️</span>
                  Store Locations
                </h2>
                <div className="locations-map-container">
                  <StoreMap stores={mapStores} height="400px" />
                </div>
              </div>
            )}

            {/* Locations by State */}
            <div className="locations-list-section">
              <h2 className="section-title">
                <span className="title-icon">📍</span>
                All Locations
                <span className="section-count">
                  {retailerData.stores.length} stores
                </span>
              </h2>

              <div className="state-groups">
                {Array.from(storesByState.entries()).map(([state, stores]) => (
                  <div key={state} className="state-group">
                    <div
                      className="state-header"
                      onClick={() => toggleState(state)}
                    >
                      <span className="expand-icon">
                        {expandedStates.has(state) ? "▼" : "▶"}
                      </span>
                      <div className="state-info">
                        <h3 className="state-name">{state}</h3>
                        <span className="state-count">
                          {stores.length} location
                          {stores.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {expandedStates.has(state) && (
                      <div className="state-stores">
                        {stores.map((store) => (
                          <div key={store.id} className="location-card">
                            <div className="location-info">
                              <span className="location-name">
                                {store.locationIdentifier || store.name}
                              </span>
                              {store.address && (
                                <span className="location-address">
                                  {store.address}
                                  {store.city && `, ${store.city}`}
                                  {store.zipCode && ` ${store.zipCode}`}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
