import { useState, useEffect, useCallback } from 'react';
import { storesApi } from '../../api/storesApi';
import { Store, StoreAvailabilityInput, GooglePlacePrediction } from '../../types/store';
import { AutocompleteInput } from './AutocompleteInput';
import { StoreMap } from './StoreMap';
import { Button } from '../Common';
import './StoreAvailabilitySelector.css';

interface StoreAvailabilitySelectorProps {
  value: StoreAvailabilityInput[];
  onChange: (availabilities: StoreAvailabilityInput[]) => void;
}

type StoreInputMode = 'physical' | 'online';

export function StoreAvailabilitySelector({ value, onChange }: StoreAvailabilitySelectorProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [placePredictions, setPlacePredictions] = useState<GooglePlacePrediction[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [priceRange, setPriceRange] = useState('');
  const [, setLoadingStores] = useState(false);
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [storeMode, setStoreMode] = useState<StoreInputMode>('physical');
  
  // Online store form fields
  const [onlineStoreName, setOnlineStoreName] = useState('');
  const [onlineStoreUrl, setOnlineStoreUrl] = useState('');
  const [onlineStoreType, setOnlineStoreType] = useState<'online_retailer' | 'brand_direct'>('online_retailer');
  const [onlineStoreRegion, setOnlineStoreRegion] = useState('US - Online');

  // Load existing stores
  useEffect(() => {
    const loadStores = async () => {
      setLoadingStores(true);
      try {
        const response = await storesApi.getStores();
        setStores(response.items);
        
        // Load store details for any stores in value that we don't have yet
        const missingStoreIds = (value || [])
          .map((avail) => avail.storeId)
          .filter((id) => !response.items.some((s) => s.id === id));
        
        if (missingStoreIds.length > 0) {
          const storePromises = missingStoreIds.map((id) =>
            storesApi.getStoreById(id).catch(() => null)
          );
          const storeResults = await Promise.all(storePromises);
          const loadedStores = storeResults
            .filter((result): result is { store: Store } => result !== null)
            .map((result) => result.store);
          
          if (loadedStores.length > 0) {
            setStores((prev) => [...prev, ...loadedStores]);
          }
        }
      } catch (error) {
        console.error('Failed to load stores:', error);
      } finally {
        setLoadingStores(false);
      }
    };

    loadStores();
  }, [value]);

  // Search Google Places when user types (only for physical stores)
  useEffect(() => {
    if (storeMode === 'online') {
      setPlacePredictions([]);
      setShowPlaceSearch(false);
      return;
    }

    if (searchQuery.trim().length > 2) {
      const timeoutId = setTimeout(async () => {
        try {
          const response = await storesApi.searchPlaces(searchQuery);
          setPlacePredictions(response.predictions);
          setShowPlaceSearch(true);
        } catch (error) {
          console.error('Failed to search places:', error);
        }
      }, 300); // Debounce

      return () => clearTimeout(timeoutId);
    } else {
      setPlacePredictions([]);
      setShowPlaceSearch(false);
    }
  }, [searchQuery, storeMode]);

  const handleStoreNameSelect = useCallback((storeName: string) => {
    // User selected an existing store by name
    const store = stores.find((s) => s.name === storeName);
    if (store) {
      setSelectedStore(store);
      setSearchQuery('');
      setPlacePredictions([]);
      setShowPlaceSearch(false);
    }
  }, [stores]);

  const handlePlaceSelect = useCallback(async (placeId: string) => {
    // User selected a Google Place
    try {
      const placeDetails = await storesApi.getPlaceDetails(placeId);
      const newStore = await storesApi.createStore({
        name: placeDetails.place.name,
        type: 'brick_and_mortar', // Default, user can change
        regionOrScope: placeDetails.place.city 
          ? `${placeDetails.place.city}, ${placeDetails.place.state || ''}`.trim()
          : placeDetails.place.formattedAddress,
        websiteUrl: placeDetails.place.website,
        address: placeDetails.place.street || placeDetails.place.formattedAddress,
        city: placeDetails.place.city,
        state: placeDetails.place.state,
        zipCode: placeDetails.place.zipCode,
        country: placeDetails.place.country || 'US',
        latitude: placeDetails.place.latitude,
        longitude: placeDetails.place.longitude,
        googlePlaceId: placeDetails.place.placeId,
        phoneNumber: placeDetails.place.phoneNumber,
      });
      setSelectedStore(newStore.store);
      setStores((prev) => [...prev, newStore.store]); // Add to local list
      setSearchQuery('');
      setPlacePredictions([]);
      setShowPlaceSearch(false);
    } catch (error) {
      console.error('Failed to create store from place:', error);
    }
  }, []);

  const handleCreateOnlineStore = useCallback(async () => {
    if (!onlineStoreName.trim()) {
      return;
    }

    try {
      const newStore = await storesApi.createStore({
        name: onlineStoreName.trim(),
        type: onlineStoreType,
        regionOrScope: onlineStoreRegion.trim() || 'US - Online',
        websiteUrl: onlineStoreUrl.trim() || undefined,
      });

      setSelectedStore(newStore.store);
      setStores((prev) => [...prev, newStore.store]);
      setOnlineStoreName('');
      setOnlineStoreUrl('');
      setOnlineStoreRegion('US - Online');
    } catch (error) {
      console.error('Failed to create online store:', error);
    }
  }, [onlineStoreName, onlineStoreUrl, onlineStoreType, onlineStoreRegion]);

  const handleAddStore = () => {
    if (!selectedStore) return;

    // Check if store is already added
    if (value.some((avail) => avail.storeId === selectedStore.id)) {
      return;
    }

    const newAvailability: StoreAvailabilityInput = {
      storeId: selectedStore.id,
      priceRange: priceRange.trim() || undefined,
      status: 'user_reported',
    };

    onChange([...value, newAvailability]);
    setSelectedStore(null);
    setPriceRange('');
    // Reset online store form if it was used
    if (storeMode === 'online') {
      setOnlineStoreName('');
      setOnlineStoreUrl('');
      setOnlineStoreRegion('US - Online');
    }
  };

  const handleRemoveStore = (storeId: string) => {
    onChange(value.filter((avail) => avail.storeId !== storeId));
  };

  const handleUpdatePriceRange = (storeId: string, newPriceRange: string) => {
    onChange(
      value.map((avail) =>
        avail.storeId === storeId ? { ...avail, priceRange: newPriceRange } : avail
      )
    );
  };

  const storeNames = stores.map((s) => s.name);

  return (
    <div className="store-availability-selector">
      <div className="store-search-section">
        <div className="store-mode-toggle">
          <button
            type="button"
            className={`mode-button ${storeMode === 'physical' ? 'active' : ''}`}
            onClick={() => {
              setStoreMode('physical');
              setSelectedStore(null);
              setSearchQuery('');
              setOnlineStoreName('');
              setOnlineStoreUrl('');
            }}
          >
            🏪 Physical Store
          </button>
          <button
            type="button"
            className={`mode-button ${storeMode === 'online' ? 'active' : ''}`}
            onClick={() => {
              setStoreMode('online');
              setSelectedStore(null);
              setSearchQuery('');
              setPlacePredictions([]);
              setShowPlaceSearch(false);
            }}
          >
            🌐 Online Store
          </button>
        </div>

        {storeMode === 'physical' ? (
          <>
            <label>Search for a physical store or location</label>
            <div className="store-search-input-wrapper">
              <AutocompleteInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSelect={handleStoreNameSelect}
                options={storeNames}
                placeholder="Search stores or type to search Google Places..."
                allowNew={true}
                newItemLabel="Search Google Places for"
              />
              
              {showPlaceSearch && placePredictions.length > 0 && (
                <div className="google-places-dropdown">
                  <div className="places-header">📍 Google Places Results</div>
                  {placePredictions.map((prediction) => (
                    <div
                      key={prediction.place_id}
                      className="place-option"
                      onClick={() => handlePlaceSelect(prediction.place_id)}
                    >
                      <div className="place-main-text">{prediction.structured_formatting.main_text}</div>
                      <div className="place-secondary-text">{prediction.structured_formatting.secondary_text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="online-store-form">
            <label>Add an online store</label>
            <div className="form-group">
              <label htmlFor="online-store-name">
                Store Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="online-store-name"
                value={onlineStoreName}
                onChange={(e) => setOnlineStoreName(e.target.value)}
                placeholder="e.g., Amazon, Thrive Market, Brand Website"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="online-store-url">Website URL</label>
              <input
                type="url"
                id="online-store-url"
                value={onlineStoreUrl}
                onChange={(e) => setOnlineStoreUrl(e.target.value)}
                placeholder="https://example.com"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="online-store-type">Store Type</label>
              <select
                id="online-store-type"
                value={onlineStoreType}
                onChange={(e) => setOnlineStoreType(e.target.value as 'online_retailer' | 'brand_direct')}
                className="form-input"
              >
                <option value="online_retailer">Online Retailer (e.g., Amazon, Thrive Market)</option>
                <option value="brand_direct">Brand Direct (sold on brand's website)</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="online-store-region">Region/Scope</label>
              <input
                type="text"
                id="online-store-region"
                value={onlineStoreRegion}
                onChange={(e) => setOnlineStoreRegion(e.target.value)}
                placeholder="e.g., US - Online, Worldwide - Online"
                className="form-input"
              />
            </div>
            <Button
              type="button"
              onClick={handleCreateOnlineStore}
              variant="primary"
              size="sm"
              disabled={!onlineStoreName.trim()}
            >
              Create Store
            </Button>
          </div>
        )}

        {selectedStore && (
          <div className="selected-store-preview">
            <div className="store-preview-info">
              <strong>{selectedStore.name}</strong>
              {selectedStore.address && (
                <span className="store-address">
                  {selectedStore.address}
                  {selectedStore.city && `, ${selectedStore.city}`}
                  {selectedStore.state && `, ${selectedStore.state}`}
                </span>
              )}
              {selectedStore.websiteUrl && (
                <a
                  href={selectedStore.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-website"
                >
                  Visit Website →
                </a>
              )}
            </div>
            {selectedStore.latitude && selectedStore.longitude && (
              <div className="store-map-preview">
                <StoreMap stores={[selectedStore]} selectedStoreId={selectedStore.id} height="250px" />
              </div>
            )}
            <div className="store-price-input">
              <input
                type="text"
                placeholder="Price range (e.g., $5.99-$7.99)"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={handleAddStore}
              variant="primary"
              size="sm"
            >
              Add Store
            </Button>
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="selected-stores-list">
          <h3>Where to Buy</h3>
          {value.map((avail) => {
            const store = stores.find((s) => s.id === avail.storeId);
            
            return (
              <div key={avail.storeId} className="selected-store-item">
                <div className="store-item-info">
                  {store ? (
                    <>
                      <strong>{store.name}</strong>
                      {store.address && (
                        <span className="store-item-address">
                          {store.address}
                          {store.city && `, ${store.city}`}
                        </span>
                      )}
                      {store.websiteUrl && (
                        <a
                          href={store.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="store-item-link"
                        >
                          Website
                        </a>
                      )}
                    </>
                  ) : (
                    <span className="store-loading">Loading store details...</span>
                  )}
                </div>
                <div className="store-item-price">
                  <input
                    type="text"
                    placeholder="Price range"
                    value={avail.priceRange || ''}
                    onChange={(e) => handleUpdatePriceRange(avail.storeId, e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveStore(avail.storeId)}
                  className="store-item-remove"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

