import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { productsApi, citiesApi } from "../api";
import { ProductSummary } from "../types";
import { CityPageData } from "../api/citiesApi";
import { SearchBar, ProductCard, SEO } from "../components";
import { productEvents } from "../utils/productEvents";
import "./LandingScreen.css";

// Storage key for tracking when we last fetched landing page data
const LANDING_FETCH_KEY = "landingLastFetched";

// Calculate how many items fit per row based on container width
// Grid uses minmax(250px, 1fr) with gap of var(--spacing-lg) which is typically 24px
function calculateItemsPerRow(containerWidth: number): number {
  const minItemWidth = 250;
  const gap = 24;
  // Calculate how many items fit: (width + gap) / (minItemWidth + gap)
  const itemsPerRow = Math.floor((containerWidth + gap) / (minItemWidth + gap));
  // Clamp between 1 and 5
  return Math.max(1, Math.min(5, itemsPerRow));
}

// Custom hook to track grid columns based on container width
function useDiscoverGridCount(
  containerRef: React.RefObject<HTMLDivElement | null>,
): number {
  const [itemsPerRow, setItemsPerRow] = useState(3); // Default to 3

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateCount = () => {
      const width = container.offsetWidth;
      setItemsPerRow(calculateItemsPerRow(width));
    };

    // Initial calculation
    updateCount();

    // Use ResizeObserver to track container size changes
    const resizeObserver = new ResizeObserver(updateCount);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  return itemsPerRow * 4; // Always 4 rows
}

function getLastFetchTime(): number {
  const stored = sessionStorage.getItem(LANDING_FETCH_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function setLastFetchTime(time: number): void {
  sessionStorage.setItem(LANDING_FETCH_KEY, time.toString());
}

// Utility to shuffle an array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function LandingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const discoverContainerRef = useRef<HTMLDivElement>(null);
  const discoverCount = useDiscoverGridCount(discoverContainerRef);
  const [featuredProducts, setFeaturedProducts] = useState<ProductSummary[]>(
    [],
  );
  const [discoverProducts, setDiscoverProducts] = useState<ProductSummary[]>(
    [],
  );
  const [activeCities, setActiveCities] = useState<CityPageData[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [displayedCategories, setDisplayedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const lastDiscoverCountRef = useRef<number>(discoverCount);

  const fetchData = useCallback(
    async (bustCache = false, overrideDiscoverCount?: number) => {
      const count = overrideDiscoverCount ?? discoverCount;
      try {
        console.log(
          "[LandingScreen] Fetching data, bustCache:",
          bustCache,
          "discoverCount:",
          count,
        );
        const [featuredRes, discoverRes, citiesRes, categoriesRes] =
          await Promise.all([
            productsApi.getFeaturedProducts(8, bustCache),
            productsApi.getDiscoverProducts(count, bustCache),
            citiesApi.getActiveCities(),
            productsApi.getCategories(),
          ]);

        setFeaturedProducts(featuredRes.products);
        setDiscoverProducts(discoverRes.products);
        setActiveCities(citiesRes.cities);
        // Store all categories and display a random selection
        const allCats = categoriesRes.categories;
        setAllCategories(allCats);
        setDisplayedCategories(shuffleArray(allCats).slice(0, 12));
        setLastFetchTime(Date.now());
        setHasFetched(true);
        lastDiscoverCountRef.current = count;
        console.log(
          "[LandingScreen] Fetch complete, featured count:",
          featuredRes.products.length,
          "discover count:",
          discoverRes.products.length,
        );
      } catch (error) {
        console.error("Error fetching landing page data:", error);
      } finally {
        setLoading(false);
      }
    },
    [discoverCount],
  );

  // Check if we need to fetch/refetch on mount or navigation
  useEffect(() => {
    const lastFetch = getLastFetchTime();
    const needsRefresh = productEvents.hasUpdatedSince(lastFetch);

    // Always bust cache if there's been an update, even on first render
    // This handles the case where component remounts after navigating away
    if (!hasFetched || needsRefresh) {
      fetchData(needsRefresh); // Bust cache if products were updated
    }
  }, [location.key, fetchData, hasFetched]);

  // Listen for product update events (works when component stays mounted)
  useEffect(() => {
    const unsubscribe = productEvents.on("product:updated", () => {
      fetchData(true); // Bust cache when triggered by event
    });

    return unsubscribe;
  }, [fetchData]);

  // Also check when window regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const lastFetch = getLastFetchTime();
        if (productEvents.hasUpdatedSince(lastFetch)) {
          fetchData(true); // Bust cache when returning to tab
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData]);

  // Refetch discover products when grid count changes
  useEffect(() => {
    if (hasFetched && discoverCount !== lastDiscoverCountRef.current) {
      const fetchDiscoverOnly = async () => {
        try {
          const discoverRes =
            await productsApi.getDiscoverProducts(discoverCount);
          setDiscoverProducts(discoverRes.products);
          lastDiscoverCountRef.current = discoverCount;
        } catch (error) {
          console.error("Error refetching discover products:", error);
        }
      };
      fetchDiscoverOnly();
    }
  }, [discoverCount, hasFetched]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate("/search");
    }
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/search?category=${encodeURIComponent(category)}`);
  };

  const refreshDiscover = async () => {
    try {
      const discoverRes = await productsApi.getDiscoverProducts(discoverCount);
      setDiscoverProducts(discoverRes.products);
    } catch (error) {
      console.error("Error refreshing discover products:", error);
    }
  };

  const refreshCategories = () => {
    if (allCategories.length > 0) {
      setDisplayedCategories(shuffleArray(allCategories).slice(0, 12));
    }
  };

  return (
    <div className="landing-screen">
      {/* SEO - Homepage uses default values from index.html but we add canonical */}
      <SEO canonicalPath="/" />
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-background">
          <div className="hero-gradient"></div>
          <div className="hero-pattern"></div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            Find <span className="highlight">Plant-Based</span> Products
            <br />
            Near You
          </h1>
          <p className="hero-subtitle">
            Discover thousands of vegan groceries and find where to buy them in
            your area
          </p>

          <div className="hero-search">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search for products, brands, or categories..."
            />
          </div>

          <div className="hero-actions">
            <Link to="/search" className="browse-all-btn">
              Browse All Products
            </Link>
          </div>
        </div>

        <div className="hero-decoration">
          <span className="floating-icon icon-1">🥬</span>
          <span className="floating-icon icon-2">🥑</span>
          <span className="floating-icon icon-3">🌿</span>
          <span className="floating-icon icon-4">🥕</span>
          <span className="floating-icon icon-5">🍃</span>
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="landing-section featured-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">
                <span className="title-icon">⭐</span>
                Featured Products
              </h2>
              <p className="section-subtitle">
                Handpicked favorites from our community
              </p>
            </div>

            <div className="products-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse by Category Section */}
      {displayedCategories.length > 0 && (
        <section className="landing-section categories-section">
          <div className="section-container">
            <div className="section-header">
              <div className="section-header-row">
                <div>
                  <h2 className="section-title">
                    <span className="title-icon">📁</span>
                    Browse by Category
                  </h2>
                  <p className="section-subtitle">
                    Find exactly what you're looking for
                  </p>
                </div>
                <button
                  className="refresh-btn"
                  onClick={refreshCategories}
                  title="Show different categories"
                >
                  <span className="refresh-icon">🔄</span>
                  Refresh
                </button>
              </div>
            </div>

            <div className="categories-grid">
              {displayedCategories.map((category) => (
                <button
                  key={category}
                  className="category-card"
                  onClick={() => handleCategoryClick(category)}
                >
                  <span className="category-name">{category}</span>
                  <span className="category-arrow">→</span>
                </button>
              ))}
            </div>

            <div className="section-footer">
              <Link to="/search" className="view-all-link">
                View all categories →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Discover Section */}
      {discoverProducts.length > 0 && (
        <section className="landing-section discover-section">
          <div className="section-container">
            <div className="section-header">
              <div className="section-header-row">
                <div>
                  <h2 className="section-title">
                    <span className="title-icon">🎲</span>
                    Discover Something New
                  </h2>
                  <p className="section-subtitle">
                    Random picks to inspire your next shopping trip
                  </p>
                </div>
                <button
                  className="refresh-btn"
                  onClick={refreshDiscover}
                  title="Show different products"
                >
                  <span className="refresh-icon">🔄</span>
                  Refresh
                </button>
              </div>
            </div>

            <div
              ref={discoverContainerRef}
              className="products-grid discover-grid"
            >
              {discoverProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* City Spotlights Section */}
      {activeCities.length > 0 && (
        <section className="landing-section cities-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">
                <span className="title-icon">📍</span>
                Shop Local
              </h2>
              <p className="section-subtitle">
                Explore vegan options in your city
              </p>
            </div>

            <div className="cities-grid">
              {activeCities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/cities/${city.slug}`}
                  className="city-card"
                >
                  <div className="city-info">
                    <h3 className="city-name">
                      {city.cityName}, {city.state}
                    </h3>
                    <p className="city-tagline">{city.headline}</p>
                  </div>
                  <span className="city-arrow">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="landing-section cta-section">
        <div className="section-container">
          <div className="cta-card">
            <div className="cta-content">
              <h2 className="cta-title">Can't find what you're looking for?</h2>
              <p className="cta-text">
                Help grow our database by adding products you've discovered in
                stores.
              </p>
            </div>
            <Link to="/add-product" className="cta-button">
              Add a Product
            </Link>
          </div>
        </div>
      </section>

      {loading && (
        <div className="landing-loading">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
}
