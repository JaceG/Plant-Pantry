import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
	productsApi,
	BrandStoresResponse,
	BrandStore,
	BrandChainGroup,
} from '../api';
import { ProductSummary } from '../types';
import { Store } from '../types/store';
import { ProductCard, Pagination, StoreMap } from '../components';
import './BrandScreen.css';

export function BrandScreen() {
	const { brandName } = useParams<{ brandName: string }>();
	const decodedBrandName = brandName ? decodeURIComponent(brandName) : '';

	// Products state
	const [products, setProducts] = useState<ProductSummary[]>([]);
	const [loadingProducts, setLoadingProducts] = useState(true);
	const [page, setPage] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const pageSize = 12;

	// Stores state
	const [storesData, setStoresData] = useState<BrandStoresResponse | null>(
		null
	);
	const [loadingStores, setLoadingStores] = useState(true);
	const [expandedChains, setExpandedChains] = useState<Set<string>>(
		new Set()
	);

	// UI state
	const [activeTab, setActiveTab] = useState<'products' | 'stores'>(
		'products'
	);
	const [error, setError] = useState<string | null>(null);

	const fetchProducts = useCallback(async () => {
		if (!decodedBrandName) return;

		setLoadingProducts(true);
		try {
			const res = await productsApi.getProducts({
				brand: decodedBrandName,
				page,
				pageSize,
			});
			setProducts(res.items);
			setTotalCount(res.totalCount);
		} catch (err) {
			console.error('Error fetching brand products:', err);
			setError('Failed to load products');
		} finally {
			setLoadingProducts(false);
		}
	}, [decodedBrandName, page]);

	const fetchStores = useCallback(async () => {
		if (!decodedBrandName) return;

		setLoadingStores(true);
		try {
			const res = await productsApi.getBrandStores(decodedBrandName);
			setStoresData(res);

			// Auto-expand chains with few locations
			const autoExpand = new Set<string>();
			res.chainGroups.forEach((group) => {
				if (group.stores.length <= 3) {
					autoExpand.add(group.chain.id);
				}
			});
			setExpandedChains(autoExpand);
		} catch (err) {
			console.error('Error fetching brand stores:', err);
		} finally {
			setLoadingStores(false);
		}
	}, [decodedBrandName]);

	useEffect(() => {
		fetchProducts();
	}, [fetchProducts]);

	useEffect(() => {
		fetchStores();
	}, [fetchStores]);

	const totalPages = Math.ceil(totalCount / pageSize);

	// Convert stores to format expected by StoreMap
	const mapStores: Store[] = useMemo(() => {
		if (!storesData) return [];

		const allStores: BrandStore[] = [
			...storesData.chainGroups.flatMap((g) => g.stores),
			...storesData.independentStores,
		];

		return allStores
			.filter((s) => s.latitude && s.longitude)
			.map((s) => ({
				id: s.id,
				name: s.name,
				type: s.type as any,
				regionOrScope: s.state || 'Unknown',
				address: s.address,
				city: s.city,
				state: s.state,
				zipCode: s.zipCode,
				latitude: s.latitude,
				longitude: s.longitude,
			}));
	}, [storesData]);

	const toggleChain = (chainId: string) => {
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

	const physicalStoreCount = useMemo(() => {
		if (!storesData) return 0;
		return (
			storesData.chainGroups.reduce(
				(acc, g) => acc + g.stores.length,
				0
			) + storesData.independentStores.length
		);
	}, [storesData]);

	if (!decodedBrandName) {
		return (
			<div className='brand-screen'>
				<div className='brand-error'>
					<h2>Brand Not Found</h2>
					<p>No brand name was provided.</p>
					<Link to='/' className='back-home-btn'>
						← Back to Products
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className='brand-screen'>
			{/* Hero Section */}
			<div className='brand-hero'>
				<div className='brand-hero-content'>
					<nav className='breadcrumb'>
						<Link to='/'>Products</Link>
						<span className='separator'>/</span>
						<span>{decodedBrandName}</span>
					</nav>
					<h1 className='brand-title'>{decodedBrandName}</h1>
					<p className='brand-subtitle'>
						{loadingProducts
							? 'Loading...'
							: `${totalCount} product${
									totalCount !== 1 ? 's' : ''
							  }`}
						{!loadingStores &&
							storesData &&
							storesData.totalStores > 0 && (
								<>
									{' • '}
									{storesData.totalStores} store
									{storesData.totalStores !== 1 ? 's' : ''}
								</>
							)}
					</p>
				</div>
			</div>

			{/* Brand Description Section */}
			<div className='brand-description-section'>
				<div className='brand-description-content'>
					<div className='brand-description-placeholder'>
						<span className='brand-icon'>🏪</span>
						<h2>About {decodedBrandName}</h2>
						<p>
							Discover plant-based products from{' '}
							{decodedBrandName}. Browse their full product lineup
							and find where to buy near you.
						</p>
						<p className='brand-claim-notice'>
							Are you the brand owner? Contact us to claim this
							page and add your brand story, logo, and more.
						</p>
					</div>
				</div>
			</div>

			{/* Tab Navigation */}
			<div className='brand-tabs'>
				<button
					className={`brand-tab ${
						activeTab === 'products' ? 'active' : ''
					}`}
					onClick={() => setActiveTab('products')}>
					<span className='tab-icon'>📦</span>
					Products
					<span className='tab-count'>{totalCount}</span>
				</button>
				<button
					className={`brand-tab ${
						activeTab === 'stores' ? 'active' : ''
					}`}
					onClick={() => setActiveTab('stores')}>
					<span className='tab-icon'>📍</span>
					Where to Buy
					<span className='tab-count'>
						{storesData?.totalStores || 0}
					</span>
				</button>
			</div>

			{/* Main Content */}
			<div className='brand-content'>
				{activeTab === 'products' ? (
					<>
						{loadingProducts ? (
							<div className='brand-loading'>
								<div className='loading-spinner' />
								<span>Loading products...</span>
							</div>
						) : error ? (
							<div className='brand-error'>
								<h2>Error</h2>
								<p>{error}</p>
								<button
									onClick={fetchProducts}
									className='retry-btn'>
									Try Again
								</button>
							</div>
						) : products.length === 0 ? (
							<div className='brand-empty'>
								<p>No products found for this brand.</p>
								<Link to='/' className='back-home-btn'>
									← Browse All Products
								</Link>
							</div>
						) : (
							<>
								<div className='products-grid'>
									{products.map((product) => (
										<ProductCard
											key={product.id}
											product={product}
										/>
									))}
								</div>

								{totalPages > 1 && (
									<div className='pagination-container'>
										<Pagination
											currentPage={page}
											totalPages={totalPages}
											onPageChange={setPage}
										/>
									</div>
								)}
							</>
						)}
					</>
				) : (
					<div className='stores-section'>
						{loadingStores ? (
							<div className='brand-loading'>
								<div className='loading-spinner' />
								<span>Loading stores...</span>
							</div>
						) : !storesData || storesData.totalStores === 0 ? (
							<div className='brand-empty'>
								<p>
									No store locations found for this brand yet.
								</p>
								<p className='empty-note'>
									Know where to find {decodedBrandName}{' '}
									products? Help us by reporting availability
									on any product page!
								</p>
							</div>
						) : (
							<>
								{/* Map Section */}
								{mapStores.length > 0 && (
									<div className='stores-map-section'>
										<h2 className='section-title'>
											<span className='title-icon'>
												🗺️
											</span>
											Store Locations
										</h2>
										<div className='stores-map-container'>
											<StoreMap
												stores={mapStores}
												height='400px'
											/>
										</div>
									</div>
								)}

								{/* Store Chains */}
								{storesData.chainGroups.length > 0 && (
									<div className='stores-group'>
										<h2 className='section-title'>
											<span className='title-icon'>
												🏬
											</span>
											Retail Chains
											<span className='section-count'>
												{storesData.chainGroups.reduce(
													(acc, g) =>
														acc + g.stores.length,
													0
												)}{' '}
												locations
											</span>
										</h2>
										<div className='chain-groups'>
											{storesData.chainGroups.map(
												({ chain, stores }) => (
													<div
														key={chain.id}
														className='chain-group'>
														<div
															className='chain-header'
															onClick={() =>
																toggleChain(
																	chain.id
																)
															}>
															<span className='expand-icon'>
																{expandedChains.has(
																	chain.id
																)
																	? '▼'
																	: '▶'}
															</span>
															<div className='chain-info'>
																<h3 className='chain-name'>
																	{chain.name}
																</h3>
																<span className='chain-count'>
																	{
																		stores.length
																	}{' '}
																	location
																	{stores.length !==
																	1
																		? 's'
																		: ''}
																</span>
															</div>
														</div>
														{expandedChains.has(
															chain.id
														) && (
															<div className='chain-stores'>
																{stores.map(
																	(store) => (
																		<div
																			key={
																				store.id
																			}
																			className='store-card'>
																			<div className='store-info'>
																				<span className='store-name'>
																					{store.locationIdentifier ||
																						store.address ||
																						store.name}
																				</span>
																				{store.address && (
																					<span className='store-address'>
																						{
																							store.address
																						}
																						{store.city &&
																							`, ${store.city}`}
																						{store.state &&
																							`, ${store.state}`}
																					</span>
																				)}
																			</div>
																		</div>
																	)
																)}
															</div>
														)}
													</div>
												)
											)}
										</div>
									</div>
								)}

								{/* Independent Stores */}
								{storesData.independentStores.length > 0 && (
									<div className='stores-group'>
										<h2 className='section-title'>
											<span className='title-icon'>
												🏪
											</span>
											Independent Stores
											<span className='section-count'>
												{
													storesData.independentStores
														.length
												}{' '}
												locations
											</span>
										</h2>
										<div className='independent-stores'>
											{storesData.independentStores.map(
												(store) => (
													<div
														key={store.id}
														className='store-card'>
														<div className='store-info'>
															<span className='store-name'>
																{store.name}
															</span>
															{store.address && (
																<span className='store-address'>
																	{
																		store.address
																	}
																	{store.city &&
																		`, ${store.city}`}
																	{store.state &&
																		`, ${store.state}`}
																</span>
															)}
														</div>
													</div>
												)
											)}
										</div>
									</div>
								)}

								{/* Online Stores */}
								{storesData.onlineStores.length > 0 && (
									<div className='stores-group'>
										<h2 className='section-title'>
											<span className='title-icon'>
												🌐
											</span>
											Online Retailers
											<span className='section-count'>
												{storesData.onlineStores.length}{' '}
												stores
											</span>
										</h2>
										<div className='online-stores'>
											{storesData.onlineStores.map(
												(store) => (
													<div
														key={store.id}
														className='store-card online'>
														<div className='store-info'>
															<span className='store-name'>
																{store.name}
															</span>
														</div>
													</div>
												)
											)}
										</div>
									</div>
								)}
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
