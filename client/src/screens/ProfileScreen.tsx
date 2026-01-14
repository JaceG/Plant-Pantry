import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../context/LocationContext";
import { authApi, LinkedAccounts } from "../api/authApi";
import "./ProfileScreen.css";

// Apple Sign-In configuration
const APPLE_CLIENT_ID =
  import.meta.env.VITE_APPLE_CLIENT_ID || "com.theveganaisle.web";
const APPLE_REDIRECT_URI =
  typeof window !== "undefined" ? window.location.origin : "";

// Apple Sign-In only works on HTTPS with verified domains (not localhost)
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");
const canUseAppleSignIn = !isLocalhost && window.location.protocol === "https:";

// Declare Apple's global type
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            id_token: string;
            code: string;
          };
          user?: {
            email?: string;
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
        }>;
      };
    };
  }
}

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();
  const {
    location: userLocation,
    cities,
    isGeolocating,
    setLocationByCity,
    useGeolocation,
    clearLocation,
    locationDisplay,
  } = useLocation();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Linked accounts state
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccounts | null>(
    null,
  );
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  // Fetch linked accounts
  const fetchLinkedAccounts = useCallback(async () => {
    try {
      const accounts = await authApi.getLinkedAccounts();
      setLinkedAccounts(accounts);
    } catch (err) {
      console.error("Failed to fetch linked accounts:", err);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLinkedAccounts();
    }
  }, [isAuthenticated, fetchLinkedAccounts]);

  // Update form when user loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      if (user.preferredCity && user.preferredState) {
        setSelectedCity(user.preferredCity);
        setSelectedState(user.preferredState);
      } else if (userLocation) {
        setSelectedCity(userLocation.city);
        setSelectedState(userLocation.state);
      }
    }
  }, [user, userLocation]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Apple Sign-In SDK state
  const [isAppleReady, setIsAppleReady] = useState(false);

  // Load Apple's Sign In JS SDK
  useEffect(() => {
    if (!canUseAppleSignIn) return;

    const loadAppleScript = () => {
      if (window.AppleID) {
        initAppleAuth();
        return;
      }

      if (document.querySelector('script[src*="appleid.auth.js"]')) {
        // Script already loading, wait for it
        const checkApple = setInterval(() => {
          if (window.AppleID) {
            clearInterval(checkApple);
            initAppleAuth();
          }
        }, 100);
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
      script.async = true;
      script.onload = () => initAppleAuth();
      document.head.appendChild(script);
    };

    const initAppleAuth = () => {
      if (window.AppleID) {
        try {
          window.AppleID.auth.init({
            clientId: APPLE_CLIENT_ID,
            scope: "name email",
            redirectURI: APPLE_REDIRECT_URI,
            usePopup: true,
          });
          setIsAppleReady(true);
        } catch (error) {
          console.error("Failed to initialize Apple Sign In:", error);
        }
      }
    };

    loadAppleScript();
  }, []);

  // Google login for linking
  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      setLinkingProvider("google");
      try {
        await authApi.linkGoogle(response.access_token);
        setMessage({
          type: "success",
          text: "Google account linked successfully!",
        });
        fetchLinkedAccounts();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to link Google account";
        setMessage({ type: "error", text: errorMessage });
      } finally {
        setLinkingProvider(null);
      }
    },
    onError: () => {
      setMessage({ type: "error", text: "Google sign-in was cancelled" });
      setLinkingProvider(null);
    },
  });

  // Apple login for linking
  const handleLinkApple = useCallback(async () => {
    if (!canUseAppleSignIn) {
      setMessage({
        type: "error",
        text: "Apple Sign-In requires HTTPS and only works on the production domain.",
      });
      return;
    }

    if (!window.AppleID) {
      setMessage({
        type: "error",
        text: "Apple Sign-In is not available. Please try again later.",
      });
      return;
    }

    setLinkingProvider("apple");
    try {
      const response = await window.AppleID.auth.signIn();

      const userName = response.user?.name
        ? `${response.user.name.firstName || ""} ${
            response.user.name.lastName || ""
          }`.trim()
        : undefined;
      const userEmail = response.user?.email;

      await authApi.linkApple(response.authorization.id_token, {
        name: userName,
        email: userEmail,
      });

      setMessage({
        type: "success",
        text: "Apple account linked successfully!",
      });
      fetchLinkedAccounts();
    } catch (error) {
      if (error && typeof error === "object" && "error" in error) {
        const appleError = error as { error: string };
        if (
          appleError.error === "popup_closed_by_user" ||
          appleError.error === "user_cancelled_authorize"
        ) {
          // User cancelled - no error needed
        } else {
          setMessage({
            type: "error",
            text: `Apple sign-in failed: ${appleError.error}`,
          });
        }
      } else {
        setMessage({
          type: "error",
          text: "Failed to link Apple account",
        });
      }
    } finally {
      setLinkingProvider(null);
    }
  }, [fetchLinkedAccounts]);

  const handleUnlinkProvider = async (provider: "google" | "apple") => {
    if (
      !confirm(
        `Are you sure you want to unlink your ${
          provider === "google" ? "Google" : "Apple"
        } account?`,
      )
    ) {
      return;
    }

    setLinkingProvider(provider);
    try {
      await authApi.unlinkProvider(provider);
      setMessage({
        type: "success",
        text: `${
          provider === "google" ? "Google" : "Apple"
        } account unlinked successfully!`,
      });
      fetchLinkedAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Failed to unlink ${provider} account`;
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleSetPassword = async () => {
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    if (!/[a-zA-Z]/.test(newPassword)) {
      setPasswordError("Password must contain at least one letter");
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError("Password must contain at least one number");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.setPassword(newPassword);
      setMessage({
        type: "success",
        text: "Password set successfully! You can now log in with email and password.",
      });
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      fetchLinkedAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to set password";
      setPasswordError(errorMessage);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRemovePassword = async () => {
    if (
      !confirm(
        "Are you sure you want to remove your password? You will only be able to log in with linked social accounts.",
      )
    ) {
      return;
    }

    try {
      await authApi.removePassword();
      setMessage({
        type: "success",
        text: "Password removed successfully.",
      });
      fetchLinkedAccounts();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to remove password";
      setMessage({ type: "error", text: errorMessage });
    }
  };

  const handleCityChange = (value: string) => {
    const [city, state] = value.split("|");
    setSelectedCity(city || "");
    setSelectedState(state || "");
  };

  const handleUseMyLocation = async () => {
    await useGeolocation();
    // After geolocation, update the form with the detected location
    if (userLocation) {
      setSelectedCity(userLocation.city);
      setSelectedState(userLocation.state);
    }
  };

  const handleClearLocation = () => {
    setSelectedCity("");
    setSelectedState("");
    clearLocation();
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const updates: {
        displayName?: string;
        preferredCity?: string;
        preferredState?: string;
        latitude?: number;
        longitude?: number;
      } = {};

      if (displayName !== user.displayName) {
        updates.displayName = displayName;
      }

      // Save location to profile
      if (selectedCity && selectedState) {
        updates.preferredCity = selectedCity;
        updates.preferredState = selectedState;

        // Also save coordinates if we have them from geolocation
        if (userLocation?.lat && userLocation?.lng) {
          updates.latitude = userLocation.lat;
          updates.longitude = userLocation.lng;
        }

        // Update the location context as well
        setLocationByCity(selectedCity, selectedState);
      } else if (!selectedCity && user.preferredCity) {
        // User is clearing their location
        updates.preferredCity = "";
        updates.preferredState = "";
      }

      if (Object.keys(updates).length === 0) {
        setMessage({ type: "success", text: "No changes to save" });
        setSaving(false);
        return;
      }

      const response = await authApi.updateProfile(updates);
      updateUser(response.user);

      setMessage({
        type: "success",
        text: "Profile updated successfully!",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update profile";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-screen">
        <div className="profile-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="profile-screen">
      <div className="profile-container">
        <div className="profile-header">
          <Link to="/" className="back-link">
            ← Back to Browse
          </Link>
          <h1>Profile Settings</h1>
          <p>Manage your account and location preferences</p>
        </div>

        {message && (
          <div className={`profile-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="profile-sections">
          {/* Account Info Section */}
          <section className="profile-section">
            <h2>
              <span className="section-icon">👤</span>
              Account Information
            </h2>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={user.email}
                disabled
                className="input-disabled"
              />
              <span className="field-hint">Email cannot be changed</span>
            </div>
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
              <span className="field-hint">
                This is how you'll appear to other users
              </span>
            </div>
          </section>

          {/* Linked Accounts Section */}
          <section className="profile-section">
            <h2>
              <span className="section-icon">🔗</span>
              Linked Accounts
            </h2>
            <p className="section-description">
              Connect multiple sign-in methods to your account for easier access
              and backup options.
            </p>

            {loadingAccounts ? (
              <div className="loading-accounts">Loading linked accounts...</div>
            ) : linkedAccounts ? (
              <div className="linked-accounts-list">
                {/* Password */}
                <div className="linked-account-item">
                  <div className="account-info">
                    <span className="account-icon">🔐</span>
                    <div className="account-details">
                      <span className="account-name">Email & Password</span>
                      <span className="account-status">
                        {linkedAccounts.hasPassword ? "Connected" : "Not set"}
                      </span>
                    </div>
                  </div>
                  <div className="account-action">
                    {linkedAccounts.hasPassword ? (
                      <button
                        className="unlink-btn"
                        onClick={handleRemovePassword}
                        disabled={
                          !linkedAccounts.hasGoogle && !linkedAccounts.hasApple
                        }
                        title={
                          !linkedAccounts.hasGoogle && !linkedAccounts.hasApple
                            ? "Cannot remove - this is your only login method"
                            : "Remove password"
                        }
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        className="link-btn"
                        onClick={() => setShowPasswordModal(true)}
                      >
                        Set Password
                      </button>
                    )}
                  </div>
                </div>

                {/* Google */}
                <div className="linked-account-item">
                  <div className="account-info">
                    <span className="account-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </span>
                    <div className="account-details">
                      <span className="account-name">Google</span>
                      <span className="account-status">
                        {linkedAccounts.hasGoogle
                          ? "Connected"
                          : "Not connected"}
                      </span>
                    </div>
                  </div>
                  <div className="account-action">
                    {linkedAccounts.hasGoogle ? (
                      <button
                        className="unlink-btn"
                        onClick={() => handleUnlinkProvider("google")}
                        disabled={
                          linkingProvider === "google" ||
                          (!linkedAccounts.hasPassword &&
                            !linkedAccounts.hasApple)
                        }
                        title={
                          !linkedAccounts.hasPassword &&
                          !linkedAccounts.hasApple
                            ? "Cannot unlink - this is your only login method"
                            : "Unlink Google"
                        }
                      >
                        {linkingProvider === "google"
                          ? "Unlinking..."
                          : "Unlink"}
                      </button>
                    ) : (
                      <button
                        className="link-btn"
                        onClick={() => googleLogin()}
                        disabled={linkingProvider === "google"}
                      >
                        {linkingProvider === "google"
                          ? "Linking..."
                          : "Link Google"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Apple */}
                <div className="linked-account-item">
                  <div className="account-info">
                    <span className="account-icon">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                    </span>
                    <div className="account-details">
                      <span className="account-name">Apple</span>
                      <span className="account-status">
                        {linkedAccounts.hasApple
                          ? "Connected"
                          : !canUseAppleSignIn
                            ? "HTTPS required"
                            : "Not connected"}
                      </span>
                    </div>
                  </div>
                  <div className="account-action">
                    {linkedAccounts.hasApple ? (
                      <button
                        className="unlink-btn"
                        onClick={() => handleUnlinkProvider("apple")}
                        disabled={
                          linkingProvider === "apple" ||
                          (!linkedAccounts.hasPassword &&
                            !linkedAccounts.hasGoogle)
                        }
                        title={
                          !linkedAccounts.hasPassword &&
                          !linkedAccounts.hasGoogle
                            ? "Cannot unlink - this is your only login method"
                            : "Unlink Apple"
                        }
                      >
                        {linkingProvider === "apple"
                          ? "Unlinking..."
                          : "Unlink"}
                      </button>
                    ) : (
                      <button
                        className="link-btn apple-link-btn"
                        onClick={handleLinkApple}
                        disabled={
                          linkingProvider === "apple" ||
                          !canUseAppleSignIn ||
                          !isAppleReady
                        }
                        title={
                          !canUseAppleSignIn
                            ? "Apple Sign-In only works on HTTPS (production)"
                            : "Link Apple account"
                        }
                      >
                        {linkingProvider === "apple"
                          ? "Linking..."
                          : "Link Apple"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="loading-accounts">
                Failed to load linked accounts
              </div>
            )}
          </section>

          {/* Location Section */}
          <section className="profile-section">
            <h2>
              <span className="section-icon">📍</span>
              Location Preferences
            </h2>
            <p className="section-description">
              Set your location to see products available near you and get
              personalized recommendations.
            </p>

            <div className="location-actions">
              <button
                type="button"
                className="geolocation-btn"
                onClick={handleUseMyLocation}
                disabled={isGeolocating}
              >
                {isGeolocating ? (
                  <>
                    <span className="spinner"></span>
                    Finding location...
                  </>
                ) : (
                  <>
                    <span className="geo-icon">🎯</span>
                    Use my current location
                  </>
                )}
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="city">Preferred City</label>
              <select
                id="city"
                value={
                  selectedCity && selectedState
                    ? `${selectedCity}|${selectedState}`
                    : ""
                }
                onChange={(e) => handleCityChange(e.target.value)}
              >
                <option value="">Select a city...</option>
                {cities.map((city) => (
                  <option
                    key={city.slug}
                    value={`${city.cityName}|${city.state}`}
                  >
                    {city.cityName}, {city.state}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Products will be filtered to show availability in this area
              </span>
            </div>

            {(selectedCity || locationDisplay) && (
              <div className="current-location">
                <span className="location-label">Current location:</span>
                <span className="location-value">
                  {selectedCity && selectedState
                    ? `${selectedCity}, ${selectedState}`
                    : locationDisplay || "Not set"}
                </span>
                <button
                  type="button"
                  className="clear-btn"
                  onClick={handleClearLocation}
                >
                  Clear
                </button>
              </div>
            )}
          </section>

          {/* Contributions Section */}
          <section className="profile-section">
            <h2>
              <span className="section-icon">🌱</span>
              Your Contributions
            </h2>
            <div className="contributions-summary">
              <p>Thank you for helping build The Vegan Aisle community!</p>
              <div className="contribution-links">
                <Link to="/add-product" className="contrib-link">
                  ➕ Add a new product
                </Link>
              </div>
            </div>
          </section>
        </div>

        <div className="profile-actions">
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Set Password Modal */}
      {showPasswordModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPasswordModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Set Password</h3>
            <p className="modal-description">
              Create a password to enable email & password login as an
              additional sign-in method.
            </p>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>

            <div className="password-requirements">
              <span className={newPassword.length >= 8 ? "met" : ""}>
                At least 8 characters
              </span>
              <span className={/[a-zA-Z]/.test(newPassword) ? "met" : ""}>
                Contains a letter
              </span>
              <span className={/[0-9]/.test(newPassword) ? "met" : ""}>
                Contains a number
              </span>
            </div>

            {passwordError && (
              <div className="modal-error">{passwordError}</div>
            )}

            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError(null);
                }}
              >
                Cancel
              </button>
              <button
                className="modal-save-btn"
                onClick={handleSetPassword}
                disabled={savingPassword}
              >
                {savingPassword ? "Setting..." : "Set Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
