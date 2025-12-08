import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storesApi, ChainPageStore, ChainPageProduct } from '../api/storesApi';
import { Store } from '../types/store';
import { ProductCard, Pagination, StoreMap } from '../components';
import { ProductSummary } from '../types';
import './RetailerScreen.css';

type RetailerType = 'chain' | 'store';

interface RetailerData {
	type: RetailerType;
	name: string;
	slug?: string;
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

	// Determine type from URL path
	const type: 'chain' | 'store' = location.includes('/retailers/chain/')
		? 'chain'
		: 'store';

	const [retailerData, setRetailerData] = useState<RetailerData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [activeTab, setActiveTab] = useState<'products' | 'locations'>(
		'products'
	);
	const [expandedStates, setExpandedStates] = useState<Set<string>>(
		new Set()
	);

	const pageSize = 24;

	const fetchData = useCallback(async () => {
		if (!type || !identifier) return;

		setLoading(true);
		setError(null);

		try {
			if (type === 'chain') {
				const res = await storesApi.getChainPage(
					identifier,
					page,
					pageSize
				);
				setRetailerData({
					type: 'chain',
					name: res.chain.name,
					slug: res.chain.slug,
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
				const res = await storesApi.getStorePage(
					identifier,
					page,
					pageSize
				);
				setRetailerData({
					type: 'store',
					name: res.store.name,
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
			console.error('Error fetching retailer data:', err);
			setError(err.message || 'Failed to load retailer');
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
				regionOrScope: s.state || 'Unknown',
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
			const state = store.state || 'Other';
			if (!grouped.has(state)) {
				grouped.set(state, []);
			}
			grouped.get(state)!.push(store);
		});

		// Sort by state name
		return new Map(
			[...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))
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
			case 'online_retailer':
				return '🌐';
			case 'brick_and_mortar':
				return '🏪';
			default:
				return '🏬';
		}
	};

	const getStoreTypeLabel = (storeType?: string) => {
		switch (storeType) {
			case 'online_retailer':
				return 'Online Retailer';
			case 'brick_and_mortar':
				return 'Physical Store';
			default:
				return 'Retailer';
		}
	};

	const isOnlineOnly =
		retailerData?.type === 'store' &&
		retailerData?.storeType === 'online_retailer';

	if (loading) {
		return (
			<div className='retailer-screen'>
				<div className='retailer-loading'>
					<div className='loading-spinner' />
					<span>Loading retailer...</span>
				</div>
			</div>
		);
	}

	if (error || !retailerData) {
		return (
			<div className='retailer-screen'>
				<div className='retailer-error'>
					<h2>Retailer Not Found</h2>
					<p>
						{error || 'The requested retailer could not be found.'}
					</p>
					<Link to='/' className='back-home-btn'>
						← Back to Products
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className='retailer-screen'>
			{/* Hero Section */}
			<div className='retailer-hero'>
				<div className='retailer-hero-content'>
					<nav className='breadcrumb'>
						<Link to='/'>Products</Link>
						<span className='separator'>/</span>
						<span>Retailers</span>
						<span className='separator'>/</span>
						<span>{retailerData.name}</span>
					</nav>
					<div className='retailer-header'>
						<span className='retailer-icon'>
							{getStoreTypeIcon(retailerData.storeType)}
						</span>
						<div className='retailer-info'>
							<h1 className='retailer-title'>
								{retailerData.name}
							</h1>
							<p className='retailer-subtitle'>
								{retailerData.type === 'chain'
									? `${retailerData.locationCount} location${
											retailerData.locationCount !== 1
												? 's'
												: ''
									  }`
									: getStoreTypeLabel(retailerData.storeType)}
								{retailerData.totalProducts > 0 && (
									<>
										{' • '}
										{retailerData.totalProducts} product
										{retailerData.totalProducts !== 1
											? 's'
											: ''}
									</>
								)}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Description Section */}
			<div className='retailer-description-section'>
				<div className='retailer-description-content'>
					<div className='retailer-description-placeholder'>
						<h2>About {retailerData.name}</h2>
						<p>
							Find plant-based products at {retailerData.name}.
							{retailerData.type === 'chain'
								? ` Browse products available across their ${retailerData.locationCount} locations.`
								: ' Browse their selection of vegan-friendly products.'}
						</p>
						{retailerData.websiteUrl && (
							<a
								href={retailerData.websiteUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='retailer-website-link'>
								Visit Website →
							</a>
						)}
						<p className='retailer-claim-notice'>
							Are you the store owner? Contact us to claim this
							page and add your store's information.
						</p>
					</div>
				</div>
			</div>

			{/* Tab Navigation */}
			<div className='retailer-tabs'>
				<button
					className={`retailer-tab ${
						activeTab === 'products' ? 'active' : ''
					}`}
					onClick={() => setActiveTab('products')}>
					<span className='tab-icon'>📦</span>
					Products
					<span className='tab-count'>
						{retailerData.totalProducts}
					</span>
				</button>
				{!isOnlineOnly && retailerData.stores.length > 0 && (
					<button
						className={`retailer-tab ${
							activeTab === 'locations' ? 'active' : ''
						}`}
						onClick={() => setActiveTab('locations')}>
						<span className='tab-icon'>📍</span>
						Locations
						<span className='tab-count'>
							{retailerData.locationCount}
						</span>
					</button>
				)}
			</div>

			{/* Main Content */}
			<div className='retailer-content'>
				{activeTab === 'products' ? (
					<>
						{productSummaries.length === 0 ? (
							<div className='retailer-empty'>
								<p>No products found at this retailer yet.</p>
								<p className='empty-note'>
									Know what products are available here? Help
									us by reporting availability on any product
									page!
								</p>
							</div>
						) : (
							<>
								<div className='products-grid'>
									{productSummaries.map((product) => (
										<ProductCard
											key={product.id}
											product={product}
										/>
									))}
								</div>

								{retailerData.totalPages > 1 && (
									<div className='pagination-container'>
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
					<div className='locations-section'>
						{/* Map */}
						{mapStores.length > 0 && (
							<div className='locations-map-section'>
								<h2 className='section-title'>
									<span className='title-icon'>🗺️</span>
									Store Locations
								</h2>
								<div className='locations-map-container'>
									<StoreMap
										stores={mapStores}
										height='400px'
									/>
								</div>
							</div>
						)}

						{/* Locations by State */}
						<div className='locations-list-section'>
							<h2 className='section-title'>
								<span className='title-icon'>📍</span>
								All Locations
								<span className='section-count'>
									{retailerData.stores.length} stores
								</span>
							</h2>

							<div className='state-groups'>
								{Array.from(storesByState.entries()).map(
									([state, stores]) => (
										<div
											key={state}
											className='state-group'>
											<div
												className='state-header'
												onClick={() =>
													toggleState(state)
												}>
												<span className='expand-icon'>
													{expandedStates.has(state)
														? '▼'
														: '▶'}
												</span>
												<div className='state-info'>
													<h3 className='state-name'>
														{state}
													</h3>
													<span className='state-count'>
														{stores.length} location
														{stores.length !== 1
															? 's'
															: ''}
													</span>
												</div>
											</div>
											{expandedStates.has(state) && (
												<div className='state-stores'>
													{stores.map((store) => (
														<div
															key={store.id}
															className='location-card'>
															<div className='location-info'>
																<span className='location-name'>
																	{store.locationIdentifier ||
																		store.name}
																</span>
																{store.address && (
																	<span className='location-address'>
																		{
																			store.address
																		}
																		{store.city &&
																			`, ${store.city}`}
																		{store.zipCode &&
																			` ${store.zipCode}`}
																	</span>
																)}
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									)
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
