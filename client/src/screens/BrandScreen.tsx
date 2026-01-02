import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
	productsApi,
	brandsApi,
	BrandStoresResponse,
	BrandStore,
	BrandChainGroup,
	BrandPageData,
	BrandEditField,
} from '../api';
import { ProductSummary } from '../types';
import { Store } from '../types/store';
import { ProductCard, Pagination, StoreMap } from '../components';
import { useAuth } from '../context/AuthContext';
import { productEvents } from '../utils/productEvents';
import './BrandScreen.css';

export function BrandScreen() {
	const { brandName } = useParams<{ brandName: string }>();
	const decodedBrandName = brandName ? decodeURIComponent(brandName) : '';
	const { isAuthenticated } = useAuth();

	// Products state
	const [products, setProducts] = useState<ProductSummary[]>([]);
	const [loadingProducts, setLoadingProducts] = useState(true);
	const [page, setPage] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const pageSize = 12;

	// Brand page state
	const [brandPageData, setBrandPageData] = useState<BrandPageData | null>(
		null
	);
	const [, setLoadingBrandPage] = useState(true);

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

	// Edit mode state
	const [editMode, setEditMode] = useState(false);
	const [editingField, setEditingField] = useState<BrandEditField | null>(
		null
	);
	const [editValue, setEditValue] = useState('');
	const [editReason, setEditReason] = useState('');
	const [submittingEdit, setSubmittingEdit] = useState(false);
	const [editMessage, setEditMessage] = useState<{
		type: 'success' | 'error';
		text: string;
	} | null>(null);

	const fetchProducts = useCallback(async (bustCache: boolean = false) => {
		if (!decodedBrandName) return;

		setLoadingProducts(true);
		try {
			const res = await productsApi.getProducts({
				brand: decodedBrandName,
				page,
				pageSize,
			}, bustCache);
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

	const fetchBrandPage = useCallback(async () => {
		if (!decodedBrandName) return;

		setLoadingBrandPage(true);
		try {
			const res = await brandsApi.getBrandPage(decodedBrandName);
			setBrandPageData(res.brandPage);
		} catch (err) {
			console.error('Error fetching brand page:', err);
		} finally {
			setLoadingBrandPage(false);
		}
	}, [decodedBrandName]);

	useEffect(() => {
		fetchProducts();
	}, [fetchProducts]);

	useEffect(() => {
		fetchStores();
	}, [fetchStores]);

	useEffect(() => {
		fetchBrandPage();
	}, [fetchBrandPage]);

	// Listen for product update events and refetch
	const lastFetchTimeRef = useRef<number>(Date.now());
	useEffect(() => {
		const unsubscribe = productEvents.on('product:updated', (detail) => {
			// Refetch products if update happened after our last fetch
			if (detail.timestamp > lastFetchTimeRef.current) {
				fetchProducts(true); // Bust cache when refetching after update
				lastFetchTimeRef.current = Date.now();
			}
		});

		return unsubscribe;
	}, [fetchProducts]);

	const totalPages = Math.ceil(totalCount / pageSize);

	// Convert stores to format expected by StoreMap
	const mapStores: Store[] = useMemo(() => {
		if (!storesData) return [];

		const allStores: BrandStore[] = [
			...storesData.chainGroups.flatMap((g: BrandChainGroup) => g.stores),
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

	// Edit handlers
	const handleStartEdit = useCallback(
		(field: BrandEditField) => {
			setEditingField(field);
			let currentValue = '';
			if (brandPageData) {
				currentValue =
					(brandPageData[
						field as keyof typeof brandPageData
					] as string) || '';
			}
			setEditValue(currentValue);
			setEditReason('');
			setEditMessage(null);
		},
		[brandPageData]
	);

	const handleCancelEdit = useCallback(() => {
		setEditingField(null);
		setEditValue('');
		setEditReason('');
		setEditMessage(null);
	}, []);

	const handleSubmitEdit = useCallback(async () => {
		if (!decodedBrandName || !editingField) return;

		setSubmittingEdit(true);
		setEditMessage(null);

		try {
			const response = await brandsApi.suggestEdit(decodedBrandName, {
				field: editingField,
				suggestedValue: editValue.trim(),
				reason: editReason.trim() || undefined,
			});

			const messageText = response.autoApplied
				? 'Your edit has been applied!'
				: 'Your edit suggestion has been submitted for review!';

			setEditMessage({
				type: 'success',
				text: messageText,
			});

			// If auto-applied, update local state
			if (response.autoApplied && brandPageData) {
				setBrandPageData({
					...brandPageData,
					[editingField]: editValue.trim(),
				});
			}

			setTimeout(() => {
				handleCancelEdit();
			}, 2000);
		} catch (err: any) {
			setEditMessage({
				type: 'error',
				text: err.message || 'Failed to submit edit',
			});
		} finally {
			setSubmittingEdit(false);
		}
	}, [
		decodedBrandName,
		editingField,
		editValue,
		editReason,
		brandPageData,
		handleCancelEdit,
	]);

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
			{/* Sub-brand banner - shown when this brand has a parent */}
			{brandPageData?.parentBrand && (
				<div className='sub-brand-banner'>
					<span className='banner-icon'>🔗</span>
					<span className='banner-text'>
						This is part of the{' '}
						<Link
							to={`/brands/${encodeURIComponent(
								brandPageData.parentBrand.slug
							)}`}
							className='parent-brand-link'>
							{brandPageData.parentBrand.displayName}
						</Link>{' '}
						brand family
					</span>
					<Link
						to={`/brands/${encodeURIComponent(
							brandPageData.parentBrand.slug
						)}`}
						className='view-official-btn'>
						View Official Page →
					</Link>
				</div>
			)}

			{/* Hero Section */}
			<div className='brand-hero'>
				<div className='brand-hero-content'>
					<nav className='breadcrumb'>
						<Link to='/'>Products</Link>
						<span className='separator'>/</span>
						{brandPageData?.parentBrand && (
							<>
								<Link
									to={`/brands/${encodeURIComponent(
										brandPageData.parentBrand.slug
									)}`}>
									{brandPageData.parentBrand.displayName}
								</Link>
								<span className='separator'>/</span>
							</>
						)}
						<span>
							{brandPageData?.displayName || decodedBrandName}
						</span>
						{isAuthenticated && (
							<button
								className='edit-page-toggle'
								onClick={() => setEditMode(!editMode)}
								title={
									editMode
										? 'Exit edit mode'
										: 'Suggest edits to this page'
								}>
								{editMode ? '✓ Done' : '✏️ Edit'}
							</button>
						)}
					</nav>

					{/* Official badge for official brands */}
					{brandPageData?.isOfficial && (
						<span className='official-brand-badge'>
							✓ Official Brand Page
						</span>
					)}

					{/* Brand Title - Editable */}
					{editMode && editingField === 'displayName' ? (
						<div className='edit-field-container'>
							<input
								type='text'
								className='edit-input edit-title-input'
								value={editValue}
								onChange={(e) => setEditValue(e.target.value)}
								placeholder='Brand Name'
							/>
							<input
								type='text'
								className='edit-reason-input'
								value={editReason}
								onChange={(e) => setEditReason(e.target.value)}
								placeholder='Why this change? (optional)'
							/>
							{editMessage && (
								<div
									className={`edit-message ${editMessage.type}`}>
									{editMessage.text}
								</div>
							)}
							<div className='edit-actions'>
								<button
									className='edit-cancel'
									onClick={handleCancelEdit}>
									Cancel
								</button>
								<button
									className='edit-submit'
									onClick={handleSubmitEdit}
									disabled={
										submittingEdit ||
										editValue ===
											(brandPageData?.displayName ||
												decodedBrandName)
									}>
									{submittingEdit
										? 'Submitting...'
										: 'Submit'}
								</button>
							</div>
						</div>
					) : (
						<h1 className='brand-title'>
							{brandPageData?.displayName || decodedBrandName}
							{editMode && (
								<button
									className='edit-btn'
									onClick={() =>
										handleStartEdit('displayName')
									}
									title='Suggest edit'>
									✏️
								</button>
							)}
						</h1>
					)}

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
						<h2>
							About{' '}
							{brandPageData?.displayName || decodedBrandName}
						</h2>

						{/* Description - Editable */}
						{editMode && editingField === 'description' ? (
							<div className='edit-field-container edit-description-container'>
								<textarea
									className='edit-input edit-description-input'
									value={editValue}
									onChange={(e) =>
										setEditValue(e.target.value)
									}
									placeholder='Write a description for this brand...'
									rows={4}
								/>
								<input
									type='text'
									className='edit-reason-input'
									value={editReason}
									onChange={(e) =>
										setEditReason(e.target.value)
									}
									placeholder='Why this change? (optional)'
								/>
								{editMessage && (
									<div
										className={`edit-message ${editMessage.type}`}>
										{editMessage.text}
									</div>
								)}
								<div className='edit-actions'>
									<button
										className='edit-cancel'
										onClick={handleCancelEdit}>
										Cancel
									</button>
									<button
										className='edit-submit'
										onClick={handleSubmitEdit}
										disabled={
											submittingEdit ||
											editValue ===
												(brandPageData?.description ||
													'')
										}>
										{submittingEdit
											? 'Submitting...'
											: 'Submit'}
									</button>
								</div>
							</div>
						) : (
							<div className='brand-description-text'>
								<p>
									{brandPageData?.description ||
										`Discover plant-based products from ${
											brandPageData?.displayName ||
											decodedBrandName
										}. Browse their full product lineup and find where to buy near you.`}
								</p>
								{editMode && (
									<button
										className='edit-btn edit-btn-inline'
										onClick={() =>
											handleStartEdit('description')
										}
										title='Suggest edit'>
										✏️
									</button>
								)}
							</div>
						)}

						{/* Website URL - Editable */}
						{editMode && editingField === 'websiteUrl' ? (
							<div className='edit-field-container'>
								<input
									type='url'
									className='edit-input'
									value={editValue}
									onChange={(e) =>
										setEditValue(e.target.value)
									}
									placeholder='https://example.com'
								/>
								<input
									type='text'
									className='edit-reason-input'
									value={editReason}
									onChange={(e) =>
										setEditReason(e.target.value)
									}
									placeholder='Why this change? (optional)'
								/>
								{editMessage && (
									<div
										className={`edit-message ${editMessage.type}`}>
										{editMessage.text}
									</div>
								)}
								<div className='edit-actions'>
									<button
										className='edit-cancel'
										onClick={handleCancelEdit}>
										Cancel
									</button>
									<button
										className='edit-submit'
										onClick={handleSubmitEdit}
										disabled={
											submittingEdit ||
											editValue ===
												(brandPageData?.websiteUrl ||
													'')
										}>
										{submittingEdit
											? 'Submitting...'
											: 'Submit'}
									</button>
								</div>
							</div>
						) : (
							<div className='brand-website-row'>
								{brandPageData?.websiteUrl ? (
									<a
										href={brandPageData.websiteUrl}
										target='_blank'
										rel='noopener noreferrer'
										className='brand-website-link'>
										Visit Website →
									</a>
								) : editMode ? (
									<span className='no-website-text'>
										No website added yet
									</span>
								) : null}
								{editMode && (
									<button
										className='edit-btn edit-btn-inline'
										onClick={() =>
											handleStartEdit('websiteUrl')
										}
										title='Suggest edit'>
										✏️
									</button>
								)}
							</div>
						)}

						{/* Also known as - for official brands with child brands */}
						{brandPageData?.isOfficial &&
							brandPageData.childBrands &&
							brandPageData.childBrands.length > 0 && (
								<div className='also-known-as'>
									<span className='aka-label'>
										Also known as:
									</span>
									<div className='aka-brands'>
										{brandPageData.childBrands.map(
											(child, index) => (
												<span
													key={child.id}
													className='aka-brand'>
													{child.displayName}
													{index <
													brandPageData.childBrands!
														.length -
														1
														? ', '
														: ''}
												</span>
											)
										)}
									</div>
								</div>
							)}

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
													(
														acc: number,
														g: BrandChainGroup
													) => acc + g.stores.length,
													0
												)}{' '}
												locations
											</span>
										</h2>
										<div className='chain-groups'>
											{storesData.chainGroups.map(
												({
													chain,
													stores,
												}: BrandChainGroup) => (
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
																	(
																		store: BrandStore
																	) => (
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
												(store: BrandStore) => (
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
												(store: BrandStore) => (
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
