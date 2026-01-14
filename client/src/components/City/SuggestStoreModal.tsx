import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { storesApi } from "../../api/storesApi";
import { citiesApi } from "../../api/citiesApi";
import { useAuth } from "../../context/AuthContext";
import "./SuggestStoreModal.css";

interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface SuggestStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  citySlug: string;
  cityName: string;
  state: string;
  onSuccess?: () => void;
}

export function SuggestStoreModal({
  isOpen,
  onClose,
  citySlug,
  cityName,
  state,
  onSuccess,
}: SuggestStoreModalProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [placePredictions, setPlacePredictions] = useState<
    GooglePlacePrediction[]
  >([]);
  const [searching, setSearching] = useState(false);

  // Selected place state
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phoneNumber?: string;
    websiteUrl?: string;
    latitude?: number;
    longitude?: number;
    googlePlaceId: string;
  } | null>(null);

  // Manual entry mode
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualZipCode, setManualZipCode] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualWebsite, setManualWebsite] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search Google Places with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2 || manualMode) {
      setPlacePredictions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        // Search for establishments near the city
        const response = await storesApi.searchPlaces(
          `${searchQuery} ${cityName} ${state}`,
          { types: ["establishment"] },
        );
        setPlacePredictions(response.predictions);
      } catch (err) {
        console.error("Places search failed:", err);
        setPlacePredictions([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, cityName, state, manualMode]);

  const handlePlaceSelect = async (placeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await storesApi.getPlaceDetails(placeId);
      const place = response.place;

      setSelectedPlace({
        name: place.name,
        address: place.street || place.formattedAddress,
        city: place.city || cityName,
        state: place.state || state,
        zipCode: place.zipCode || "",
        phoneNumber: place.phoneNumber,
        websiteUrl: place.website,
        latitude: place.latitude,
        longitude: place.longitude,
        googlePlaceId: place.placeId,
      });

      setSearchQuery("");
      setPlacePredictions([]);
    } catch (err: any) {
      setError("Failed to get place details");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (manualMode) {
      if (!manualName.trim()) {
        setError("Store name is required");
        return;
      }
    } else if (!selectedPlace) {
      setError("Please select a store from the search results");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const storeData = manualMode
        ? {
            name: manualName.trim(),
            address: manualAddress.trim() || undefined,
            zipCode: manualZipCode.trim() || undefined,
            phoneNumber: manualPhone.trim() || undefined,
            websiteUrl: manualWebsite.trim() || undefined,
          }
        : {
            name: selectedPlace!.name,
            address: selectedPlace!.address,
            zipCode: selectedPlace!.zipCode,
            phoneNumber: selectedPlace!.phoneNumber,
            websiteUrl: selectedPlace!.websiteUrl,
            latitude: selectedPlace!.latitude,
            longitude: selectedPlace!.longitude,
            googlePlaceId: selectedPlace!.googlePlaceId,
          };

      const res = await citiesApi.suggestStore(citySlug, storeData);

      setSuccess(res.message);

      setTimeout(() => {
        onClose();
        resetForm();
        onSuccess?.();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to suggest store");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = useCallback(() => {
    setSearchQuery("");
    setPlacePredictions([]);
    setSelectedPlace(null);
    setManualMode(false);
    setManualName("");
    setManualAddress("");
    setManualZipCode("");
    setManualPhone("");
    setManualWebsite("");
    setError(null);
    setSuccess(null);
  }, []);

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div
          className="suggest-store-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
          <h2>Sign In Required</h2>
          <p>You need to be logged in to suggest a store.</p>
          <div className="form-actions">
            <button className="cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button className="submit-btn" onClick={() => navigate("/login")}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="suggest-store-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={handleClose}>
          ×
        </button>

        <h2>Suggest a Store</h2>
        <p className="modal-subtitle">
          Add a store in {cityName}, {state} that sells plant-based products
        </p>

        {success ? (
          <div className="success-message">
            <span className="success-icon">✓</span>
            {success}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}

            {/* Mode Toggle */}
            <div className="mode-toggle">
              <button
                type="button"
                className={`mode-btn ${!manualMode ? "active" : ""}`}
                onClick={() => {
                  setManualMode(false);
                  setSelectedPlace(null);
                }}
              >
                📍 Search Google
              </button>
              <button
                type="button"
                className={`mode-btn ${manualMode ? "active" : ""}`}
                onClick={() => {
                  setManualMode(true);
                  setSelectedPlace(null);
                  setSearchQuery("");
                  setPlacePredictions([]);
                }}
              >
                ✏️ Enter Manually
              </button>
            </div>

            {!manualMode ? (
              <>
                {/* Google Places Search */}
                {!selectedPlace ? (
                  <>
                    <div className="form-group">
                      <label>Search for a Store</label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g., Kroger, Whole Foods, Local Market..."
                        autoFocus
                      />
                    </div>

                    {searching && (
                      <div className="search-loading">Searching...</div>
                    )}

                    {placePredictions.length > 0 && (
                      <div className="place-results">
                        {placePredictions.map((prediction) => (
                          <div
                            key={prediction.place_id}
                            className="place-result-item"
                            onClick={() =>
                              handlePlaceSelect(prediction.place_id)
                            }
                          >
                            <div className="place-main">
                              {prediction.structured_formatting.main_text}
                            </div>
                            <div className="place-secondary">
                              {prediction.structured_formatting.secondary_text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchQuery.length >= 2 &&
                      !searching &&
                      placePredictions.length === 0 && (
                        <div className="no-results">
                          <p>No stores found</p>
                          <button
                            type="button"
                            className="manual-btn"
                            onClick={() => setManualMode(true)}
                          >
                            Enter store details manually
                          </button>
                        </div>
                      )}
                  </>
                ) : (
                  /* Selected Place Display */
                  <div className="selected-place">
                    <div className="selected-place-info">
                      <h3>{selectedPlace.name}</h3>
                      {selectedPlace.address && (
                        <p className="place-address">
                          {selectedPlace.address}
                          {selectedPlace.city && `, ${selectedPlace.city}`}
                          {selectedPlace.state && `, ${selectedPlace.state}`}
                          {selectedPlace.zipCode && ` ${selectedPlace.zipCode}`}
                        </p>
                      )}
                      {selectedPlace.phoneNumber && (
                        <p className="place-phone">
                          📞 {selectedPlace.phoneNumber}
                        </p>
                      )}
                      {selectedPlace.websiteUrl && (
                        <a
                          href={selectedPlace.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="place-website"
                        >
                          🌐 Visit Website
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      className="change-place-btn"
                      onClick={() => setSelectedPlace(null)}
                    >
                      Change
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Manual Entry Form */
              <>
                <div className="form-group">
                  <label>Store Name *</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Store name"
                    autoFocus
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder="Street address"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      value={manualZipCode}
                      onChange={(e) => setManualZipCode(e.target.value)}
                      placeholder="ZIP"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    value={manualWebsite}
                    onChange={(e) => setManualWebsite(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </>
            )}

            {/* Submit Actions */}
            {(selectedPlace || manualMode) && (
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleClose}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (manualMode && !manualName.trim())}
                  className="submit-btn"
                >
                  {loading ? "Submitting..." : "Suggest Store"}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
