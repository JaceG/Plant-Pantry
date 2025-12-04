import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { citiesApi } from '../api';
import { CityPageData, CityStore, StoreProduct } from '../api/citiesApi';
import { SearchBar } from '../components';
import './CityLandingScreen.css';

type View = 'stores' | 'store-detail';

export function CityLandingScreen() {
	const { slug } = useParams<{ slug: string }>();
	const navigate = useNavigate();

	const [cityData, setCityData] = useState<CityPageData | null>(null);
	const [stores, setStores] = useState<CityStore[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Slide view state
	const [view, setView] = useState<View>('stores');
	const [selectedStore, setSelectedStore] = useState<CityStore | null>(null);
	const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
	const [loadingProducts, setLoadingProducts] = useState(false);

	useEffect(() => {
		const fetchCityData = async () => {
			if (!slug) return;

			setLoading(true);
			setError(null);

			try {
				const [cityRes, storesRes] = await Promise.all([
					citiesApi.getCityPage(slug),
					citiesApi.getCityStores(slug),
				]);

				setCityData(cityRes.city);
				setStores(storesRes.stores);
			} catch (err) {
				console.error('Error fetching city data:', err);
				setError('City page not found');
			} finally {
				setLoading(false);
			}
		};

		fetchCityData();
	}, [slug]);

	const handleSearch = (query: string) => {
		navigate(`/search?q=${encodeURIComponent(query.trim())}`);
	};

	const handleSelectStore = async (store: CityStore) => {
		setSelectedStore(store);
		setView('store-detail');
		setStoreProducts([]);

		if (slug) {
			setLoadingProducts(true);
			try {
				const res = await citiesApi.getStoreProducts(slug, store.id);
				setStoreProducts(res.products);
			} catch (err) {
				console.error('Error fetching store products:', err);
			} finally {
				setLoadingProducts(false);
			}
		}
	};

	const handleBackToStores = () => {
		setView('stores');
		setSelectedStore(null);
		setStoreProducts([]);
	};

	// Calculate total products across all stores
	const totalProducts = stores.reduce(
		(sum, store) => sum + (store.productCount || 0),
		0
	);

	if (loading) {
		return (
			<div className='city-landing-screen'>
				<div className='city-loading'>
					<div className='loading-spinner'></div>
					<p>Loading city data...</p>
				</div>
			</div>
		);
	}

	if (error || !cityData) {
		return (
			<div className='city-landing-screen'>
				<div className='city-error'>
					<h2>City Not Found</h2>
					<p>
						The city page you're looking for doesn't exist or isn't
						available yet.
					</p>
					<Link to='/' className='back-home-btn'>
						Back to Home
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className='city-landing-screen'>
			{/* City Hero */}
			<section className='city-hero'>
				<div className='city-hero-background'>
					<div className='city-hero-gradient'></div>
				</div>

				<div className='city-hero-content'>
					<div className='city-badge'>
						<span className='city-badge-icon'>📍</span>
						Local Guide
					</div>

					<h1 className='city-title'>
						{cityData.cityName}, {cityData.state}
					</h1>
					<p className='city-headline'>{cityData.headline}</p>
					<p className='city-description'>{cityData.description}</p>

					<div className='city-search'>
						<SearchBar
							onSearch={handleSearch}
							placeholder={`Search products in ${cityData.cityName}...`}
						/>
					</div>

					<div className='city-stats'>
						<div className='stat'>
							<span className='stat-value'>{stores.length}</span>
							<span className='stat-label'>
								{stores.length === 1 ? 'Store' : 'Stores'}
							</span>
						</div>
						<div className='stat'>
							<span className='stat-value'>{totalProducts}</span>
							<span className='stat-label'>
								{totalProducts === 1 ? 'Product' : 'Products'}
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* Slide Container */}
			<section className='city-content'>
				<div className='section-container'>
					<div
						className={`slide-container ${
							view === 'store-detail' ? 'show-detail' : ''
						}`}>
						{/* Stores List View */}
						<div className='slide-panel stores-view'>
							<div className='panel-header'>
								<h2 className='panel-title'>
									<span className='title-icon'>🏪</span>
									Local Stores
								</h2>
								<p className='panel-subtitle'>
									Tap a store to see available products
								</p>
							</div>

							{stores.length > 0 ? (
								<div className='stores-list'>
									{stores.map((store) => (
										<div
											key={store.id}
											className='store-card'
											onClick={() =>
												handleSelectStore(store)
											}>
											<div className='store-info'>
												<h3 className='store-name'>
													{store.name}
												</h3>
												{store.address && (
													<p className='store-address'>
														{store.address}
														{store.zipCode &&
															`, ${store.zipCode}`}
													</p>
												)}
											</div>
											<div className='store-meta'>
												{store.productCount !==
													undefined &&
													store.productCount > 0 && (
														<span className='product-badge'>
															{store.productCount}{' '}
															{store.productCount ===
															1
																? 'product'
																: 'products'}
														</span>
													)}
												<span className='arrow'>→</span>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className='empty-state'>
									<p>No stores found in this area yet.</p>
									<p className='empty-hint'>
										Know a store with vegan products? Help
										us grow our database!
									</p>
								</div>
							)}

							<div className='panel-footer'>
								<Link to='/' className='back-link'>
									← Explore other cities
								</Link>
							</div>
						</div>

						{/* Store Detail View */}
						<div className='slide-panel store-detail-view'>
							{selectedStore && (
								<>
									<div className='panel-header'>
										<button
											onClick={handleBackToStores}
											className='back-btn'>
											← Back to stores
										</button>
										<div className='store-detail-info'>
											<h2 className='panel-title'>
												{selectedStore.name}
											</h2>
											{selectedStore.address && (
												<p className='store-detail-address'>
													{selectedStore.address}
													{selectedStore.city &&
														`, ${selectedStore.city}`}
													{selectedStore.state &&
														`, ${selectedStore.state}`}
													{selectedStore.zipCode &&
														` ${selectedStore.zipCode}`}
												</p>
											)}
											<div className='store-detail-actions'>
												{selectedStore.websiteUrl && (
													<a
														href={
															selectedStore.websiteUrl
														}
														target='_blank'
														rel='noopener noreferrer'
														className='store-action-link'>
														🌐 Website
													</a>
												)}
												{selectedStore.phoneNumber && (
													<a
														href={`tel:${selectedStore.phoneNumber}`}
														className='store-action-link'>
														📞{' '}
														{
															selectedStore.phoneNumber
														}
													</a>
												)}
												{selectedStore.latitude &&
													selectedStore.longitude && (
														<a
															href={`https://www.google.com/maps/search/?api=1&query=${selectedStore.latitude},${selectedStore.longitude}`}
															target='_blank'
															rel='noopener noreferrer'
															className='store-action-link directions'>
															📍 Directions
														</a>
													)}
											</div>
										</div>
									</div>

									<div className='products-section'>
										<h3 className='products-title'>
											Available Products (
											{storeProducts.length})
										</h3>

										{loadingProducts ? (
											<div className='loading-products'>
												<div className='loading-spinner'></div>
												<span>Loading products...</span>
											</div>
										) : storeProducts.length > 0 ? (
											<div className='products-grid'>
												{storeProducts.map(
													(product) => (
														<Link
															key={product.id}
															to={`/products/${product.id}`}
															className='product-card'>
															<div className='product-image'>
																{product.imageUrl ? (
																	<img
																		src={
																			product.imageUrl
																		}
																		alt={
																			product.name
																		}
																	/>
																) : (
																	<span className='placeholder'>
																		🌱
																	</span>
																)}
															</div>
															<div className='product-info'>
																<h4 className='product-name'>
																	{
																		product.name
																	}
																</h4>
																<p className='product-brand'>
																	{
																		product.brand
																	}
																</p>
																{product.priceRange && (
																	<span className='product-price'>
																		{
																			product.priceRange
																		}
																	</span>
																)}
															</div>
															{product.averageRating && (
																<div className='product-rating'>
																	<span className='star'>
																		★
																	</span>
																	{product.averageRating.toFixed(
																		1
																	)}
																</div>
															)}
														</Link>
													)
												)}
											</div>
										) : (
											<div className='empty-products'>
												<p>
													No products listed at this
													store yet.
												</p>
												<p className='empty-hint'>
													Found something here?{' '}
													<Link to='/search'>
														Search for it
													</Link>{' '}
													and report availability!
												</p>
											</div>
										)}
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
