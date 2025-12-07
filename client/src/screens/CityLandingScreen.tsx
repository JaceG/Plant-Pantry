import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { citiesApi } from '../api';
import {
	CityPageData,
	CityStore,
	CityStoresGrouped,
	StoreProduct,
} from '../api/citiesApi';
import { SearchBar } from '../components';
import './CityLandingScreen.css';

type View = 'stores' | 'store-detail';

export function CityLandingScreen() {
	const { slug } = useParams<{ slug: string }>();
	const navigate = useNavigate();

	const [cityData, setCityData] = useState<CityPageData | null>(null);
	const [groupedStores, setGroupedStores] =
		useState<CityStoresGrouped | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Expanded chain groups
	const [expandedChains, setExpandedChains] = useState<Set<string>>(
		new Set()
	);

	// Slide view state
	const [view, setView] = useState<View>('stores');
	const [selectedStore, setSelectedStore] = useState<CityStore | null>(null);
	const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
	const [loadingProducts, setLoadingProducts] = useState(false);

	// Computed values
	const stores = useMemo(() => {
		if (!groupedStores) return [];
		const allStores = [
			...groupedStores.chainGroups.flatMap((g) => g.stores),
			...groupedStores.independentStores,
		];
		return allStores;
	}, [groupedStores]);

	const totalChains = groupedStores?.chainGroups.length || 0;

	useEffect(() => {
		const fetchCityData = async () => {
			if (!slug) return;

			setLoading(true);
			setError(null);

			try {
				const [cityRes, storesRes] = await Promise.all([
					citiesApi.getCityPage(slug),
					citiesApi.getCityStoresGrouped(slug),
				]);

				setCityData(cityRes.city);
				setGroupedStores(storesRes);

				// Auto-expand chains with few locations
				const autoExpand = new Set<string>();
				storesRes.chainGroups.forEach((group) => {
					if (group.stores.length <= 3) {
						autoExpand.add(group.chain.id);
					}
				});
				setExpandedChains(autoExpand);
			} catch (err) {
				console.error('Error fetching city data:', err);
				setError('City page not found');
			} finally {
				setLoading(false);
			}
		};

		fetchCityData();
	}, [slug]);

	const toggleChainExpanded = (chainId: string) => {
		setExpandedChains((prev) => {
			const next = new Set(prev);
			if (next.has(chainId)) {
				next.delete(chainId);
			} else {
				next.add(chainId);
			}
			return next;
		});
	};

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
						{totalChains > 0 && (
							<div className='stat'>
								<span className='stat-value'>
									{totalChains}
								</span>
								<span className='stat-label'>
									{totalChains === 1 ? 'Chain' : 'Chains'}
								</span>
							</div>
						)}
						<div className='stat'>
							<span className='stat-value'>{stores.length}</span>
							<span className='stat-label'>
								{stores.length === 1 ? 'Location' : 'Locations'}
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

							{groupedStores &&
							(groupedStores.chainGroups.length > 0 ||
								groupedStores.independentStores.length > 0) ? (
								<div className='stores-list grouped'>
									{/* Chain Groups */}
									{groupedStores.chainGroups.map((group) => (
										<div
											key={group.chain.id}
											className='chain-group'>
											<div
												className='chain-header'
												onClick={() =>
													toggleChainExpanded(
														group.chain.id
													)
												}>
												<span className='chain-expand-icon'>
													{expandedChains.has(
														group.chain.id
													)
														? '▼'
														: '▶'}
												</span>
												<div className='chain-info'>
													<h3 className='chain-name'>
														{group.chain.name}
													</h3>
													<span className='chain-meta'>
														{group.stores.length}{' '}
														location
														{group.stores.length !==
														1
															? 's'
															: ''}{' '}
														•{' '}
														{
															group.totalProductCount
														}{' '}
														product
														{group.totalProductCount !==
														1
															? 's'
															: ''}
													</span>
												</div>
												<span className='chain-arrow'>
													→
												</span>
											</div>

											{expandedChains.has(
												group.chain.id
											) && (
												<div className='chain-stores'>
													{group.stores.map(
														(store) => (
															<div
																key={store.id}
																className='store-card chain-store'
																onClick={() =>
																	handleSelectStore(
																		store
																	)
																}>
																<div className='store-info'>
																	<h4 className='store-name'>
																		{store.locationIdentifier ||
																			store.address ||
																			store.name}
																	</h4>
																	{store.address &&
																		store.locationIdentifier && (
																			<p className='store-address'>
																				{
																					store.address
																				}
																				{store.zipCode &&
																					`, ${store.zipCode}`}
																			</p>
																		)}
																</div>
																<div className='store-meta'>
																	{store.productCount !==
																		undefined &&
																		store.productCount >
																			0 && (
																			<span className='product-badge'>
																				{
																					store.productCount
																				}
																			</span>
																		)}
																	<span className='arrow'>
																		→
																	</span>
																</div>
															</div>
														)
													)}
												</div>
											)}
										</div>
									))}

									{/* Independent Stores */}
									{groupedStores.independentStores.length >
										0 && (
										<>
											{groupedStores.chainGroups.length >
												0 && (
												<div className='stores-section-divider'>
													<span>
														Independent Stores
													</span>
												</div>
											)}
											{groupedStores.independentStores.map(
												(store) => (
													<div
														key={store.id}
														className='store-card'
														onClick={() =>
															handleSelectStore(
																store
															)
														}>
														<div className='store-info'>
															<h3 className='store-name'>
																{store.name}
															</h3>
															{store.address && (
																<p className='store-address'>
																	{
																		store.address
																	}
																	{store.zipCode &&
																		`, ${store.zipCode}`}
																</p>
															)}
														</div>
														<div className='store-meta'>
															{store.productCount !==
																undefined &&
																store.productCount >
																	0 && (
																	<span className='product-badge'>
																		{
																			store.productCount
																		}{' '}
																		{store.productCount ===
																		1
																			? 'product'
																			: 'products'}
																	</span>
																)}
															<span className='arrow'>
																→
															</span>
														</div>
													</div>
												)
											)}
										</>
									)}
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
