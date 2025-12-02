import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import {
	adminApi,
	StoreAvailabilityProduct,
	AdminStore,
} from '../../api/adminApi';
import { productsApi } from '../../api/productsApi';
import { ProductSummary } from '../../types';
import './AdminStoreAvailability.css';

export function AdminStoreAvailability() {
	const [stores, setStores] = useState<AdminStore[]>([]);
	const [selectedStore, setSelectedStore] = useState<AdminStore | null>(null);
	const [storeProducts, setStoreProducts] = useState<
		StoreAvailabilityProduct[]
	>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<ProductSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingProducts, setLoadingProducts] = useState(false);
	const [searching, setSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [storeFilter, setStoreFilter] = useState('');

	// Fetch all stores on mount
	useEffect(() => {
		const fetchStores = async () => {
			try {
				const response = await adminApi.getStores(1, 500);
				setStores(response.items);
			} catch (err) {
				setError('Failed to load stores');
				console.error(err);
			} finally {
				setLoading(false);
			}
		};
		fetchStores();
	}, []);

	// Fetch products when a store is selected
	const fetchStoreProducts = useCallback(async (storeId: string) => {
		setLoadingProducts(true);
		try {
			const response = await adminApi.getStoreAvailability(storeId);
			setStoreProducts(response.products);
		} catch (err) {
			setError('Failed to load store products');
			console.error(err);
		} finally {
			setLoadingProducts(false);
		}
	}, []);

	useEffect(() => {
		if (selectedStore) {
			fetchStoreProducts(selectedStore.id);
			setSearchQuery('');
			setSearchResults([]);
		}
	}, [selectedStore, fetchStoreProducts]);

	const handleSearch = async () => {
		if (!searchQuery.trim() || !selectedStore) {
			setSearchResults([]);
			return;
		}

		setSearching(true);
		try {
			const response = await productsApi.getProducts({
				q: searchQuery,
				pageSize: 15,
			});
			// Filter out products already at this store
			const existingIds = new Set(storeProducts.map((p) => p.productId));
			setSearchResults(
				response.items.filter((p) => !existingIds.has(p.id))
			);
		} catch (err) {
			console.error('Search failed:', err);
		} finally {
			setSearching(false);
		}
	};

	const handleAddProduct = async (productId: string) => {
		if (!selectedStore) return;

		try {
			await adminApi.addProductToStore(selectedStore.id, productId);
			setSuccessMessage('Product added to store');
			setSearchResults((prev) => prev.filter((p) => p.id !== productId));
			await fetchStoreProducts(selectedStore.id);
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err: any) {
			if (err.message?.includes('already available')) {
				setError('Product is already available at this store');
			} else {
				setError('Failed to add product');
			}
			setTimeout(() => setError(null), 3000);
		}
	};

	const handleRemoveProduct = async (productId: string) => {
		if (!selectedStore) return;

		if (!confirm('Remove this product from the store?')) return;

		try {
			await adminApi.removeProductFromStore(selectedStore.id, productId);
			setSuccessMessage('Product removed from store');
			await fetchStoreProducts(selectedStore.id);
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err) {
			setError('Failed to remove product');
			setTimeout(() => setError(null), 3000);
		}
	};

	const filteredStores = stores.filter((store) => {
		if (!storeFilter) return true;
		const searchLower = storeFilter.toLowerCase();
		return (
			store.name.toLowerCase().includes(searchLower) ||
			store.city?.toLowerCase().includes(searchLower) ||
			store.state?.toLowerCase().includes(searchLower)
		);
	});

	if (loading) {
		return (
			<AdminLayout>
				<div className='admin-loading'>
					<div className='loading-spinner' />
					<span>Loading stores...</span>
				</div>
			</AdminLayout>
		);
	}

	return (
		<AdminLayout>
			<div className='admin-store-availability'>
				<header className='page-header'>
					<h1>Store Availability</h1>
					<p className='page-subtitle'>
						Manage which products are available at each store
					</p>
				</header>

				{error && (
					<div className='message error-message'>
						<span className='message-icon'>⚠️</span>
						{error}
					</div>
				)}

				{successMessage && (
					<div className='message success-message'>
						<span className='message-icon'>✓</span>
						{successMessage}
					</div>
				)}

				<div className='availability-layout'>
					{/* Store Selection Panel */}
					<aside className='store-selection-panel'>
						<h2>Select Store</h2>
						<input
							type='text'
							placeholder='Filter stores...'
							value={storeFilter}
							onChange={(e) => setStoreFilter(e.target.value)}
							className='store-filter-input'
						/>
						<div className='store-list'>
							{filteredStores.length === 0 ? (
								<p className='no-stores'>No stores found</p>
							) : (
								filteredStores.map((store) => (
									<button
										key={store.id}
										className={`store-item ${
											selectedStore?.id === store.id
												? 'selected'
												: ''
										}`}
										onClick={() => setSelectedStore(store)}>
										<span className='store-name'>
											{store.name}
										</span>
										<span className='store-location'>
											{store.city && store.state
												? `${store.city}, ${store.state}`
												: store.regionOrScope}
										</span>
									</button>
								))
							)}
						</div>
					</aside>

					{/* Main Content */}
					<main className='availability-main'>
						{!selectedStore ? (
							<div className='no-store-selected'>
								<div className='empty-state'>
									<span className='empty-icon'>🏪</span>
									<h3>Select a Store</h3>
									<p>
										Choose a store from the list to manage
										its product availability
									</p>
								</div>
							</div>
						) : (
							<>
								<div className='selected-store-header'>
									<h2>{selectedStore.name}</h2>
									<p className='store-details'>
										{selectedStore.city &&
										selectedStore.state
											? `${selectedStore.city}, ${selectedStore.state}`
											: selectedStore.regionOrScope}
										{selectedStore.address &&
											` • ${selectedStore.address}`}
									</p>
								</div>

								{/* Add Products Section */}
								<section className='add-products-section'>
									<h3>Add Products</h3>
									<div className='search-box'>
										<input
											type='text'
											placeholder='Search for products to add...'
											value={searchQuery}
											onChange={(e) =>
												setSearchQuery(e.target.value)
											}
											onKeyDown={(e) =>
												e.key === 'Enter' &&
												handleSearch()
											}
											className='search-input'
										/>
										<button
											onClick={handleSearch}
											className='search-button'
											disabled={searching}>
											{searching
												? 'Searching...'
												: 'Search'}
										</button>
									</div>

									{searchResults.length > 0 && (
										<div className='search-results'>
											{searchResults.map((product) => (
												<div
													key={product.id}
													className='search-result-item'>
													<div className='result-image'>
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
													<div className='result-info'>
														<span className='result-name'>
															{product.name}
														</span>
														<span className='result-brand'>
															{product.brand}
														</span>
													</div>
													<button
														onClick={() =>
															handleAddProduct(
																product.id
															)
														}
														className='add-button'>
														+ Add
													</button>
												</div>
											))}
										</div>
									)}
								</section>

								{/* Current Products Section */}
								<section className='current-products-section'>
									<h3>
										Products at this Store (
										{storeProducts.length})
									</h3>

									{loadingProducts ? (
										<div className='loading-products'>
											<div className='loading-spinner' />
											<span>Loading products...</span>
										</div>
									) : storeProducts.length === 0 ? (
										<div className='empty-products'>
											<p>
												No products at this store yet.
											</p>
											<p className='hint'>
												Use the search above to add
												products.
											</p>
										</div>
									) : (
										<div className='products-list'>
											{storeProducts.map((product) => (
												<div
													key={product.productId}
													className='product-item'>
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
														<span className='product-name'>
															{product.name}
														</span>
														<span className='product-brand'>
															{product.brand}
														</span>
														{product.priceRange && (
															<span className='product-price'>
																{
																	product.priceRange
																}
															</span>
														)}
													</div>
													<div className='product-meta'>
														<span
															className={`status-badge status-${product.status}`}>
															{product.status}
														</span>
														<span className='source-badge'>
															{product.source ===
															'user_contribution'
																? 'Manual'
																: product.source}
														</span>
													</div>
													<button
														onClick={() =>
															handleRemoveProduct(
																product.productId
															)
														}
														className='remove-button'
														title='Remove from store'>
														×
													</button>
												</div>
											))}
										</div>
									)}
								</section>
							</>
						)}
					</main>
				</div>
			</div>
		</AdminLayout>
	);
}
