import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { AvailabilityInfo } from "../../types/product";
import { useLocation } from "../../context/LocationContext";
import "./IndependentStoresCard.css";

interface IndependentStoresCardProps {
  stores: AvailabilityInfo[];
  title?: string;
  icon?: string;
}

export function IndependentStoresCard({
  stores,
  title = "Independent Stores",
  icon = "🏪",
}: IndependentStoresCardProps) {
  const { location } = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);

  const storeTypeLabels: Record<string, string> = {
    brick_and_mortar: "🏪 Store",
    online_retailer: "🌐 Online Store",
    brand_direct: "🏷️ Brand Direct Website",
  };

  const availabilityStatusLabels: Record<string, string> = {
    known: "Available",
    user_reported: "Available",
    discontinued: "Discontinued",
    seasonal: "Seasonal",
  };

  // Auto-search when expanded if user has a location set
  useEffect(() => {
    if (isExpanded && location && !hasAutoSearched && !hasSearched) {
      setHasAutoSearched(true);
      setHasSearched(true);
      // Pre-fill search query with user's location
      setSearchQuery(`${location.city}, ${location.state}`);
    }
  }, [isExpanded, location, hasAutoSearched, hasSearched]);

  // Filter stores based on search query
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) {
      return hasSearched ? stores.slice(0, 10) : [];
    }

    const query = searchQuery.toLowerCase().trim();

    return stores.filter((store) => {
      const cityMatch = store.city?.toLowerCase().includes(query);
      const stateMatch = store.state?.toLowerCase().includes(query);
      const zipMatch = store.zipCode?.includes(query);
      const addressMatch = store.address?.toLowerCase().includes(query);
      const nameMatch = store.storeName?.toLowerCase().includes(query);
      const regionMatch = store.regionOrScope?.toLowerCase().includes(query);

      return (
        cityMatch ||
        stateMatch ||
        zipMatch ||
        addressMatch ||
        nameMatch ||
        regionMatch
      );
    });
  }, [stores, searchQuery, hasSearched]);

  const handleSearch = useCallback(() => {
    setHasSearched(true);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleShowAll = useCallback(() => {
    setHasSearched(true);
    setSearchQuery("");
  }, []);

  // Get unique locations for summary
  const locationSummary = useMemo(() => {
    const cities = new Set<string>();
    const states = new Set<string>();

    stores.forEach((store) => {
      if (store.city) cities.add(store.city);
      if (store.state) states.add(store.state);
    });

    if (states.size <= 3) {
      return Array.from(states).join(", ");
    }
    return `${states.size} states`;
  }, [stores]);

  return (
    <div className="independent-stores-card">
      <div
        className="independent-card-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="independent-card-main">
          <span className="independent-icon">{icon}</span>
          <div className="independent-card-info">
            <span className="independent-card-title">{title}</span>
            <div className="independent-card-meta">
              <span className="independent-store-count">
                {stores.length} store
                {stores.length !== 1 ? "s" : ""}
              </span>
              {locationSummary && (
                <span className="independent-locations">
                  in {locationSummary}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="independent-card-actions">
          <span className="independent-available-badge">✓ Available</span>
          <span className="independent-expand-icon">
            {isExpanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="independent-card-expanded">
          <div className="independent-location-search">
            <p className="search-hint">Find stores near you:</p>
            <div className="search-input-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setHasSearched(true);
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter city, state or ZIP code..."
                className="location-search-input"
              />
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="search-btn"
              >
                Search
              </button>
            </div>
            {stores.length <= 10 ? (
              <button onClick={handleShowAll} className="show-all-link">
                Or view all {stores.length} stores
              </button>
            ) : (
              <button onClick={handleShowAll} className="show-all-link">
                Or browse first 10 stores
              </button>
            )}
          </div>

          {hasSearched && filteredStores.length === 0 && (
            <div className="independent-no-results">
              <p>No stores found matching your search.</p>
              <p className="no-results-hint">
                Try a different city, state, or ZIP code.
              </p>
            </div>
          )}

          {filteredStores.length > 0 && (
            <div className="independent-stores-results">
              <p className="results-count">
                {searchQuery.trim()
                  ? `${filteredStores.length} store${
                      filteredStores.length !== 1 ? "s" : ""
                    } found`
                  : `Showing ${Math.min(
                      10,
                      stores.length,
                    )} of ${stores.length} stores`}
              </p>
              <div className="independent-stores-list">
                {filteredStores.map((store) => (
                  <div key={store.storeId} className="independent-store-item">
                    <div className="store-item-header">
                      <span className="store-item-type">
                        {storeTypeLabels[store.storeType] || store.storeType}
                      </span>
                      <span
                        className={`store-item-status status-${store.status}`}
                      >
                        {availabilityStatusLabels[store.status] || store.status}
                      </span>
                    </div>
                    <div className="store-item-info">
                      <Link
                        to={`/retailers/store/${store.storeId}`}
                        className="store-item-name"
                      >
                        {store.storeName}
                      </Link>
                      <span className="store-item-address">
                        {store.address
                          ? `${store.address}${
                              store.city ? `, ${store.city}` : ""
                            }${store.state ? `, ${store.state}` : ""}`
                          : store.regionOrScope}
                      </span>
                      {store.priceRange && (
                        <span className="store-item-price">
                          {store.priceRange}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasSearched && (
            <div className="independent-search-prompt">
              <p>
                Enter a location above to find independent stores near you, or
                browse all stores.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
