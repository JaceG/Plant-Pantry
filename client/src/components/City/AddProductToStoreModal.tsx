import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../../api/productsApi';
import { citiesApi } from '../../api/citiesApi';
import { useAuth } from '../../context/AuthContext';
import './AddProductToStoreModal.css';

interface ProductSearchResult {
	id: string;
	name: string;
	brand: string;
	sizeOrVariant?: string;
	imageUrl?: string;
}

interface AddProductToStoreModalProps {
	isOpen: boolean;
	onClose: () => void;
	citySlug: string;
	store: {
		id: string;
		name: string;
	};
	onSuccess?: () => void;
}

export function AddProductToStoreModal({
	isOpen,
	onClose,
	citySlug,
	store,
	onSuccess,
}: AddProductToStoreModalProps) {
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth();

	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<ProductSearchResult[]>(
		[]
	);
	const [searching, setSearching] = useState(false);
	const [selectedProduct, setSelectedProduct] =
		useState<ProductSearchResult | null>(null);

	// Form fields
	const [priceRange, setPriceRange] = useState('');
	const [notes, setNotes] = useState('');

	// UI state
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [showAddNew, setShowAddNew] = useState(false);

	// Debounced search
	useEffect(() => {
		if (!searchQuery.trim() || searchQuery.length < 2) {
			setSearchResults([]);
			return;
		}

		const timeoutId = setTimeout(async () => {
			setSearching(true);
			try {
				const res = await productsApi.searchProducts(searchQuery, {
					limit: 10,
				});
				setSearchResults(
					res.products.map((p) => ({
						id: p.id,
						name: p.name,
						brand: p.brand,
						sizeOrVariant: p.sizeOrVariant,
						imageUrl: p.imageUrl,
					}))
				);
			} catch (err) {
				console.error('Search failed:', err);
				setSearchResults([]);
			} finally {
				setSearching(false);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchQuery]);

	const handleSelectProduct = (product: ProductSearchResult) => {
		setSelectedProduct(product);
		setSearchQuery('');
		setSearchResults([]);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedProduct) {
			setError('Please select a product');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await citiesApi.reportProductAtStore(
				citySlug,
				store.id,
				{
					productId: selectedProduct.id,
					priceRange: priceRange || undefined,
					notes: notes || undefined,
				}
			);

			setSuccess(res.message);

			setTimeout(() => {
				onClose();
				resetForm();
				onSuccess?.();
			}, 1500);
		} catch (err: any) {
			setError(err.message || 'Failed to add product');
		} finally {
			setLoading(false);
		}
	};

	const resetForm = useCallback(() => {
		setSearchQuery('');
		setSearchResults([]);
		setSelectedProduct(null);
		setPriceRange('');
		setNotes('');
		setError(null);
		setSuccess(null);
		setShowAddNew(false);
	}, []);

	const handleClose = () => {
		onClose();
		resetForm();
	};

	const handleAddNewProduct = () => {
		onClose();
		navigate('/products/add', {
			state: {
				returnTo: `/cities/${citySlug}`,
				preselectedStore: store,
			},
		});
	};

	if (!isOpen) return null;

	if (!isAuthenticated) {
		return (
			<div className='modal-overlay' onClick={handleClose}>
				<div
					className='add-product-modal'
					onClick={(e) => e.stopPropagation()}>
					<button className='close-btn' onClick={handleClose}>
						×
					</button>
					<h2>Sign In Required</h2>
					<p>
						You need to be logged in to report product availability.
					</p>
					<div className='form-actions'>
						<button className='cancel-btn' onClick={handleClose}>
							Cancel
						</button>
						<button
							className='submit-btn'
							onClick={() => navigate('/login')}>
							Sign In
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='modal-overlay' onClick={handleClose}>
			<div
				className='add-product-modal'
				onClick={(e) => e.stopPropagation()}>
				<button className='close-btn' onClick={handleClose}>
					×
				</button>

				<h2>Add Product to {store.name}</h2>
				<p className='modal-subtitle'>
					Search for a product to report its availability at this
					store
				</p>

				{success ? (
					<div className='success-message'>
						<span className='success-icon'>✓</span>
						{success}
					</div>
				) : (
					<form onSubmit={handleSubmit}>
						{error && <div className='error-message'>{error}</div>}

						{!selectedProduct ? (
							<>
								{/* Product Search */}
								<div className='form-group'>
									<label>Search for a Product *</label>
									<input
										type='text'
										value={searchQuery}
										onChange={(e) =>
											setSearchQuery(e.target.value)
										}
										placeholder='Search by product name or brand...'
										autoFocus
									/>
								</div>

								{/* Search Results */}
								{searching && (
									<div className='search-loading'>
										Searching...
									</div>
								)}

								{searchResults.length > 0 && (
									<div className='search-results'>
										{searchResults.map((product) => (
											<div
												key={product.id}
												className='search-result-item'
												onClick={() =>
													handleSelectProduct(product)
												}>
												<div className='result-image'>
													{product.imageUrl ? (
														<img
															src={
																product.imageUrl
															}
															alt={product.name}
														/>
													) : (
														<span className='placeholder'>
															🌿
														</span>
													)}
												</div>
												<div className='result-info'>
													<span className='result-brand'>
														{product.brand}
													</span>
													<span className='result-name'>
														{product.name}
													</span>
													{product.sizeOrVariant && (
														<span className='result-size'>
															{
																product.sizeOrVariant
															}
														</span>
													)}
												</div>
											</div>
										))}
									</div>
								)}

								{searchQuery.length >= 2 &&
									!searching &&
									searchResults.length === 0 && (
										<div className='no-results'>
											<p>No products found</p>
											<button
												type='button'
												className='add-new-btn'
												onClick={handleAddNewProduct}>
												+ Add a new product
											</button>
										</div>
									)}

								{!searchQuery && (
									<div className='search-hint'>
										<p>Can't find the product?</p>
										<button
											type='button'
											className='add-new-btn'
											onClick={handleAddNewProduct}>
											+ Add a new product to the database
										</button>
									</div>
								)}
							</>
						) : (
							<>
								{/* Selected Product Display */}
								<div className='selected-product'>
									<div className='selected-product-info'>
										<div className='selected-image'>
											{selectedProduct.imageUrl ? (
												<img
													src={
														selectedProduct.imageUrl
													}
													alt={selectedProduct.name}
												/>
											) : (
												<span className='placeholder'>
													🌿
												</span>
											)}
										</div>
										<div className='selected-details'>
											<span className='selected-brand'>
												{selectedProduct.brand}
											</span>
											<span className='selected-name'>
												{selectedProduct.name}
											</span>
											{selectedProduct.sizeOrVariant && (
												<span className='selected-size'>
													{
														selectedProduct.sizeOrVariant
													}
												</span>
											)}
										</div>
									</div>
									<button
										type='button'
										className='change-product-btn'
										onClick={() =>
											setSelectedProduct(null)
										}>
										Change
									</button>
								</div>

								{/* Optional Fields */}
								<div className='form-group'>
									<label>Price (optional)</label>
									<input
										type='text'
										value={priceRange}
										onChange={(e) =>
											setPriceRange(e.target.value)
										}
										placeholder='e.g., $4.99 or $4-6'
									/>
								</div>

								<div className='form-group'>
									<label>Notes (optional)</label>
									<textarea
										value={notes}
										onChange={(e) =>
											setNotes(e.target.value)
										}
										placeholder='e.g., Found in the frozen section'
										rows={2}
										maxLength={500}
									/>
								</div>

								<div className='form-actions'>
									<button
										type='button'
										onClick={handleClose}
										className='cancel-btn'>
										Cancel
									</button>
									<button
										type='submit'
										disabled={loading}
										className='submit-btn'>
										{loading
											? 'Submitting...'
											: 'Report Availability'}
									</button>
								</div>
							</>
						)}
					</form>
				)}
			</div>
		</div>
	);
}
