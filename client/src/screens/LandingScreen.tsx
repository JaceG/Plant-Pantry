import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { productsApi, citiesApi } from '../api';
import { ProductSummary } from '../types';
import { CityPageData } from '../api/citiesApi';
import { SearchBar, ProductCard } from '../components';
import { productEvents } from '../utils/productEvents';
import './LandingScreen.css';

// Storage key for tracking when we last fetched landing page data
const LANDING_FETCH_KEY = 'landingLastFetched';

function getLastFetchTime(): number {
	const stored = sessionStorage.getItem(LANDING_FETCH_KEY);
	return stored ? parseInt(stored, 10) : 0;
}

function setLastFetchTime(time: number): void {
	sessionStorage.setItem(LANDING_FETCH_KEY, time.toString());
}

export function LandingScreen() {
	const navigate = useNavigate();
	const location = useLocation();
	const [featuredProducts, setFeaturedProducts] = useState<ProductSummary[]>(
		[]
	);
	const [discoverProducts, setDiscoverProducts] = useState<ProductSummary[]>(
		[]
	);
	const [activeCities, setActiveCities] = useState<CityPageData[]>([]);
	const [categories, setCategories] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [hasFetched, setHasFetched] = useState(false);

	const fetchData = useCallback(async (bustCache = false) => {
		try {
			console.log('[LandingScreen] Fetching data, bustCache:', bustCache);
			const [featuredRes, discoverRes, citiesRes, categoriesRes] =
				await Promise.all([
					productsApi.getFeaturedProducts(8, bustCache),
					productsApi.getDiscoverProducts(6, bustCache),
					citiesApi.getActiveCities(),
					productsApi.getCategories(),
				]);

			setFeaturedProducts(featuredRes.products);
			setDiscoverProducts(discoverRes.products);
			setActiveCities(citiesRes.cities);
			setCategories(categoriesRes.categories.slice(0, 12));
			setLastFetchTime(Date.now());
			setHasFetched(true);
			console.log(
				'[LandingScreen] Fetch complete, featured count:',
				featuredRes.products.length
			);
		} catch (error) {
			console.error('Error fetching landing page data:', error);
		} finally {
			setLoading(false);
		}
	}, []);

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
		const unsubscribe = productEvents.on('product:updated', () => {
			fetchData(true); // Bust cache when triggered by event
		});

		return unsubscribe;
	}, [fetchData]);

	// Also check when window regains focus
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				const lastFetch = getLastFetchTime();
				if (productEvents.hasUpdatedSince(lastFetch)) {
					fetchData(true); // Bust cache when returning to tab
				}
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener(
				'visibilitychange',
				handleVisibilityChange
			);
		};
	}, [fetchData]);

	const handleSearch = (query: string) => {
		if (query.trim()) {
			navigate(`/search?q=${encodeURIComponent(query.trim())}`);
		} else {
			navigate('/search');
		}
	};

	const handleCategoryClick = (category: string) => {
		navigate(`/search?category=${encodeURIComponent(category)}`);
	};

	const refreshDiscover = async () => {
		try {
			const discoverRes = await productsApi.getDiscoverProducts(6);
			setDiscoverProducts(discoverRes.products);
		} catch (error) {
			console.error('Error refreshing discover products:', error);
		}
	};

	return (
		<div className='landing-screen'>
			{/* Hero Section */}
			<section className='landing-hero'>
				<div className='hero-background'>
					<div className='hero-gradient'></div>
					<div className='hero-pattern'></div>
				</div>

				<div className='hero-content'>
					<h1 className='hero-title'>
						Find <span className='highlight'>Plant-Based</span>{' '}
						Products
						<br />
						Near You
					</h1>
					<p className='hero-subtitle'>
						Discover thousands of vegan groceries and find where to
						buy them in your area
					</p>

					<div className='hero-search'>
						<SearchBar
							onSearch={handleSearch}
							placeholder='Search for products, brands, or categories...'
						/>
					</div>

					<div className='hero-actions'>
						<Link to='/search' className='browse-all-btn'>
							Browse All Products
						</Link>
					</div>
				</div>

				<div className='hero-decoration'>
					<span className='floating-icon icon-1'>🥬</span>
					<span className='floating-icon icon-2'>🥑</span>
					<span className='floating-icon icon-3'>🌿</span>
					<span className='floating-icon icon-4'>🥕</span>
					<span className='floating-icon icon-5'>🍃</span>
				</div>
			</section>

			{/* Featured Products Section */}
			{featuredProducts.length > 0 && (
				<section className='landing-section featured-section'>
					<div className='section-container'>
						<div className='section-header'>
							<h2 className='section-title'>
								<span className='title-icon'>⭐</span>
								Featured Products
							</h2>
							<p className='section-subtitle'>
								Handpicked favorites from our community
							</p>
						</div>

						<div className='products-grid'>
							{featuredProducts.map((product) => (
								<ProductCard
									key={product.id}
									product={product}
								/>
							))}
						</div>
					</div>
				</section>
			)}

			{/* Browse by Category Section */}
			{categories.length > 0 && (
				<section className='landing-section categories-section'>
					<div className='section-container'>
						<div className='section-header'>
							<h2 className='section-title'>
								<span className='title-icon'>📁</span>
								Browse by Category
							</h2>
							<p className='section-subtitle'>
								Find exactly what you're looking for
							</p>
						</div>

						<div className='categories-grid'>
							{categories.map((category) => (
								<button
									key={category}
									className='category-card'
									onClick={() =>
										handleCategoryClick(category)
									}>
									<span className='category-name'>
										{category}
									</span>
									<span className='category-arrow'>→</span>
								</button>
							))}
						</div>

						<div className='section-footer'>
							<Link to='/search' className='view-all-link'>
								View all categories →
							</Link>
						</div>
					</div>
				</section>
			)}

			{/* Discover Section */}
			{discoverProducts.length > 0 && (
				<section className='landing-section discover-section'>
					<div className='section-container'>
						<div className='section-header'>
							<div className='section-header-row'>
								<div>
									<h2 className='section-title'>
										<span className='title-icon'>🎲</span>
										Discover Something New
									</h2>
									<p className='section-subtitle'>
										Random picks to inspire your next
										shopping trip
									</p>
								</div>
								<button
									className='refresh-btn'
									onClick={refreshDiscover}
									title='Show different products'>
									<span className='refresh-icon'>🔄</span>
									Refresh
								</button>
							</div>
						</div>

						<div className='products-grid discover-grid'>
							{discoverProducts.map((product) => (
								<ProductCard
									key={product.id}
									product={product}
								/>
							))}
						</div>
					</div>
				</section>
			)}

			{/* City Spotlights Section */}
			{activeCities.length > 0 && (
				<section className='landing-section cities-section'>
					<div className='section-container'>
						<div className='section-header'>
							<h2 className='section-title'>
								<span className='title-icon'>📍</span>
								Shop Local
							</h2>
							<p className='section-subtitle'>
								Explore vegan options in your city
							</p>
						</div>

						<div className='cities-grid'>
							{activeCities.map((city) => (
								<Link
									key={city.slug}
									to={`/cities/${city.slug}`}
									className='city-card'>
									<div className='city-info'>
										<h3 className='city-name'>
											{city.cityName}, {city.state}
										</h3>
										<p className='city-tagline'>
											{city.headline}
										</p>
									</div>
									<span className='city-arrow'>→</span>
								</Link>
							))}
						</div>
					</div>
				</section>
			)}

			{/* CTA Section */}
			<section className='landing-section cta-section'>
				<div className='section-container'>
					<div className='cta-card'>
						<div className='cta-content'>
							<h2 className='cta-title'>
								Can't find what you're looking for?
							</h2>
							<p className='cta-text'>
								Help grow our database by adding products you've
								discovered in stores.
							</p>
						</div>
						<Link to='/add-product' className='cta-button'>
							Add a Product
						</Link>
					</div>
				</div>
			</section>

			{loading && (
				<div className='landing-loading'>
					<div className='loading-spinner'></div>
				</div>
			)}
		</div>
	);
}
