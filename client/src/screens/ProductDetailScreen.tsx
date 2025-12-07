import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button, Toast } from '../components';
import { RegistrationModal } from '../components/Common/RegistrationModal';
import { StoreMap } from '../components/Products/StoreMap';
import { EditProductForm } from '../components/Products/EditProductForm';
import { ReportAvailability } from '../components/Products/ReportAvailability';
import { ReviewStats, ReviewList, ReviewForm } from '../components/Reviews';
import { useProductDetail, useShoppingList } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { storesApi } from '../api/storesApi';
import { adminApi } from '../api/adminApi';
import { reviewsApi } from '../api/reviewsApi';
import { productsApi } from '../api/productsApi';
import { Store } from '../types/store';
import { ProductDetail, AvailabilityInfo } from '../types/product';
import {
	Review,
	ReviewStats as ReviewStatsType,
	CreateReviewInput,
	UpdateReviewInput,
} from '../types/review';
import './ProductDetailScreen.css';

export function ProductDetailScreen() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { product, loading, error, refresh } = useProductDetail(id);
	const { getOrCreateDefaultList, addItem, addingItem } = useShoppingList();
	const { isAdmin, isAuthenticated } = useAuth();

	const [toast, setToast] = useState<{
		message: string;
		type: 'success' | 'error';
	} | null>(null);
	const [stores, setStores] = useState<Store[]>([]);
	const [isEditMode, setIsEditMode] = useState(false);
	const [archiving, setArchiving] = useState(false);
	const [showRegistrationModal, setShowRegistrationModal] = useState(false);

	// Review state
	const [reviewStats, setReviewStats] = useState<ReviewStatsType | null>(
		null
	);
	const [reviews, setReviews] = useState<Review[]>([]);
	const [userReview, setUserReview] = useState<Review | null>(null);
	const [reviewsPage, setReviewsPage] = useState(1);
	const [reviewsTotalCount, setReviewsTotalCount] = useState(0);
	const [, setReviewsLoading] = useState(false);
	const [showReviewForm, setShowReviewForm] = useState(false);
	const [editingReview, setEditingReview] = useState<Review | null>(null);

	// Availability confirmation state
	const [confirmingStoreId, setConfirmingStoreId] = useState<string | null>(
		null
	);
	const [confirmModalStore, setConfirmModalStore] = useState<{
		storeId: string;
		storeName: string;
	} | null>(null);
	const [reviewsSortBy, setReviewsSortBy] = useState<
		'newest' | 'oldest' | 'helpful' | 'rating'
	>('newest');

	// Load store details for availability
	useEffect(() => {
		if (
			!product ||
			!product.availability ||
			product.availability.length === 0
		) {
			setStores([]);
			return;
		}

		const loadStores = async () => {
			try {
				const storePromises = (product.availability || []).map(
					(avail) =>
						storesApi.getStoreById(avail.storeId).catch(() => null)
				);
				const storeResults = await Promise.all(storePromises);
				const loadedStores = storeResults
					.filter(
						(result): result is { store: Store } => result !== null
					)
					.map((result) => result.store);
				setStores(loadedStores);
			} catch (error) {
				console.error('Failed to load stores:', error);
			}
		};

		loadStores();
	}, [product]);

	// Group availability by chain
	const groupedAvailability = useMemo(() => {
		if (!product?.availability || product.availability.length === 0) {
			return { chainGroups: [], independentStores: [] };
		}

		const chainGroupsMap = new Map<
			string,
			{
				chain: { id: string; name: string; slug: string };
				items: AvailabilityInfo[];
			}
		>();
		const independentStores: AvailabilityInfo[] = [];

		for (const avail of product.availability) {
			if (avail.chain) {
				if (!chainGroupsMap.has(avail.chain.id)) {
					chainGroupsMap.set(avail.chain.id, {
						chain: avail.chain,
						items: [],
					});
				}
				chainGroupsMap.get(avail.chain.id)!.items.push(avail);
			} else {
				independentStores.push(avail);
			}
		}

		const chainGroups = Array.from(chainGroupsMap.values()).sort(
			(a, b) => b.items.length - a.items.length
		);

		return { chainGroups, independentStores };
	}, [product?.availability]);

	// State for expanded chain groups in availability
	const [expandedAvailChains, setExpandedAvailChains] = useState<Set<string>>(
		new Set()
	);

	const toggleAvailChainExpanded = (chainId: string) => {
		setExpandedAvailChains((prev) => {
			const next = new Set(prev);
			if (next.has(chainId)) {
				next.delete(chainId);
			} else {
				next.add(chainId);
			}
			return next;
		});
	};

	// Load review stats and reviews
	useEffect(() => {
		if (!id) return;

		const loadReviews = async () => {
			setReviewsLoading(true);
			try {
				const [statsResponse, reviewsResponse, userReviewResponse] =
					await Promise.all([
						reviewsApi.getReviewStats(id),
						reviewsApi.getReviews(id, 1, 10, reviewsSortBy),
						isAuthenticated
							? reviewsApi
									.getUserReview(id)
									.catch(() => ({ review: null }))
							: Promise.resolve({ review: null }),
					]);

				setReviewStats(statsResponse.stats);
				setReviews(reviewsResponse.items);
				setReviewsTotalCount(reviewsResponse.totalCount);
				setUserReview(userReviewResponse.review);
			} catch (error) {
				console.error('Failed to load reviews:', error);
			} finally {
				setReviewsLoading(false);
			}
		};

		loadReviews();
	}, [id, isAuthenticated, reviewsSortBy]);

	const handleReviewPageChange = useCallback(
		async (page: number) => {
			if (!id) return;
			setReviewsLoading(true);
			try {
				const response = await reviewsApi.getReviews(
					id,
					page,
					10,
					reviewsSortBy
				);
				setReviews(response.items);
				setReviewsPage(page);
			} catch (error) {
				console.error('Failed to load reviews:', error);
			} finally {
				setReviewsLoading(false);
			}
		},
		[id, reviewsSortBy]
	);

	const handleCreateReview = useCallback(
		async (input: CreateReviewInput | UpdateReviewInput) => {
			if (!id) return;
			try {
				await reviewsApi.createReview(id, input as CreateReviewInput);
				setToast({
					message:
						'Review submitted! It will be visible after admin approval.',
					type: 'success',
				});
				setShowReviewForm(false);
				// Reload reviews
				const [statsResponse, reviewsResponse, userReviewResponse] =
					await Promise.all([
						reviewsApi.getReviewStats(id),
						reviewsApi.getReviews(id, 1, 10, reviewsSortBy),
						reviewsApi
							.getUserReview(id)
							.catch(() => ({ review: null })),
					]);
				setReviewStats(statsResponse.stats);
				setReviews(reviewsResponse.items);
				setReviewsTotalCount(reviewsResponse.totalCount);
				setUserReview(userReviewResponse.review);
			} catch (error: any) {
				setToast({
					message: error?.message || 'Failed to submit review',
					type: 'error',
				});
			}
		},
		[id, reviewsSortBy]
	);

	const handleUpdateReview = useCallback(
		async (input: CreateReviewInput | UpdateReviewInput) => {
			if (!editingReview) return;
			try {
				await reviewsApi.updateReview(
					editingReview.id,
					input as UpdateReviewInput
				);
				setToast({
					message:
						'Review updated! It will be visible after admin approval.',
					type: 'success',
				});
				setShowReviewForm(false);
				setEditingReview(null);
				// Reload reviews
				if (!id) return;
				const [statsResponse, reviewsResponse, userReviewResponse] =
					await Promise.all([
						reviewsApi.getReviewStats(id),
						reviewsApi.getReviews(
							id,
							reviewsPage,
							10,
							reviewsSortBy
						),
						reviewsApi
							.getUserReview(id)
							.catch(() => ({ review: null })),
					]);
				setReviewStats(statsResponse.stats);
				setReviews(reviewsResponse.items);
				setReviewsTotalCount(reviewsResponse.totalCount);
				setUserReview(userReviewResponse.review);
			} catch (error: any) {
				setToast({
					message: error?.message || 'Failed to update review',
					type: 'error',
				});
			}
		},
		[editingReview, id, reviewsPage, reviewsSortBy]
	);

	const handleDeleteReview = useCallback(
		async (review: Review) => {
			if (!confirm('Are you sure you want to delete your review?'))
				return;
			try {
				await reviewsApi.deleteReview(review.id);
				setToast({ message: 'Review deleted', type: 'success' });
				setUserReview(null);
				// Reload reviews
				if (!id) return;
				const [statsResponse, reviewsResponse] = await Promise.all([
					reviewsApi.getReviewStats(id),
					reviewsApi.getReviews(id, reviewsPage, 10, reviewsSortBy),
				]);
				setReviewStats(statsResponse.stats);
				setReviews(reviewsResponse.items);
				setReviewsTotalCount(reviewsResponse.totalCount);
			} catch (error: any) {
				setToast({
					message: error?.message || 'Failed to delete review',
					type: 'error',
				});
			}
		},
		[id, reviewsPage, reviewsSortBy]
	);

	const handleVoteHelpful = useCallback(
		async (review: Review) => {
			if (!isAuthenticated) {
				setShowRegistrationModal(true);
				return;
			}
			try {
				const response = await reviewsApi.voteHelpful(review.id);
				// Update the review in the list
				setReviews((prev) =>
					prev.map((r) => (r.id === review.id ? response.review : r))
				);
			} catch (error: any) {
				setToast({
					message: error?.message || 'Failed to vote',
					type: 'error',
				});
			}
		},
		[isAuthenticated]
	);

	// Confirm availability handler
	const handleConfirmAvailability = useCallback(
		async (storeId: string) => {
			if (!isAuthenticated) {
				setConfirmModalStore(null);
				setShowRegistrationModal(true);
				return;
			}
			if (!id) return;

			setConfirmingStoreId(storeId);
			try {
				const response = await productsApi.confirmAvailability(
					id,
					storeId
				);
				setToast({ message: response.message, type: 'success' });
				setConfirmModalStore(null);
				// Refresh product to get updated availability
				refresh();
			} catch (error: any) {
				setToast({
					message: error?.message || 'Failed to confirm availability',
					type: 'error',
				});
			} finally {
				setConfirmingStoreId(null);
			}
		},
		[id, isAuthenticated, refresh]
	);

	// Open confirmation modal
	const openConfirmModal = useCallback(
		(storeId: string, storeName: string) => {
			setConfirmModalStore({ storeId, storeName });
		},
		[]
	);

	const handleAddToList = useCallback(async () => {
		if (!product) return;

		// If not authenticated, show registration modal
		if (!isAuthenticated) {
			setShowRegistrationModal(true);
			return;
		}

		try {
			const defaultList = await getOrCreateDefaultList();
			if (!defaultList) {
				setToast({
					message: 'Could not create shopping list',
					type: 'error',
				});
				return;
			}

			const success = await addItem(defaultList.id, {
				productId: product.id,
			});
			if (success) {
				setToast({
					message: `Added ${product.name} to your list!`,
					type: 'success',
				});
			} else {
				setToast({
					message: 'Failed to add item to list',
					type: 'error',
				});
			}
		} catch {
			setToast({ message: 'Something went wrong', type: 'error' });
		}
	}, [product, isAuthenticated, getOrCreateDefaultList, addItem]);

	const handleRegistrationSuccess = useCallback(async () => {
		// After successful registration/login, add the product to the list
		if (!product) return;

		try {
			const defaultList = await getOrCreateDefaultList();
			if (!defaultList) {
				setToast({
					message: 'Could not create shopping list',
					type: 'error',
				});
				return;
			}

			const success = await addItem(defaultList.id, {
				productId: product.id,
			});
			if (success) {
				setToast({
					message: `Added ${product.name} to your list!`,
					type: 'success',
				});
			} else {
				setToast({
					message: 'Failed to add item to list',
					type: 'error',
				});
			}
		} catch {
			setToast({ message: 'Something went wrong', type: 'error' });
		}
	}, [product, getOrCreateDefaultList, addItem]);

	const handleEditSave = useCallback(
		async (_updatedProduct: ProductDetail) => {
			setIsEditMode(false);
			await refresh();
			setToast({
				message: 'Product updated successfully!',
				type: 'success',
			});
		},
		[refresh]
	);

	const handleEditCancel = useCallback(() => {
		setIsEditMode(false);
	}, []);

	const handleArchive = useCallback(async () => {
		if (!product || !isAdmin) return;

		if (
			!window.confirm(
				'Are you sure you want to archive this product? It will no longer appear on the main site.'
			)
		) {
			return;
		}

		setArchiving(true);
		try {
			await adminApi.archiveProduct(product.id);
			setToast({
				message: 'Product archived successfully',
				type: 'success',
			});
			await refresh();
		} catch (err) {
			setToast({ message: 'Failed to archive product', type: 'error' });
		} finally {
			setArchiving(false);
		}
	}, [product, isAdmin, refresh]);

	const handleUnarchive = useCallback(async () => {
		if (!product || !isAdmin) return;

		setArchiving(true);
		try {
			await adminApi.unarchiveProduct(product.id);
			setToast({
				message: 'Product unarchived successfully',
				type: 'success',
			});
			await refresh();
		} catch (err) {
			setToast({ message: 'Failed to unarchive product', type: 'error' });
		} finally {
			setArchiving(false);
		}
	}, [product, isAdmin, refresh]);

	if (loading) {
		return (
			<div className='product-detail-screen'>
				<div className='detail-container'>
					<div className='detail-loading'>
						<div className='loading-spinner' />
						<span>Loading product...</span>
					</div>
				</div>
			</div>
		);
	}

	if (error || !product) {
		return (
			<div className='product-detail-screen'>
				<div className='detail-container'>
					<div className='detail-error'>
						<span className='error-icon'>😕</span>
						<h2>Product Not Found</h2>
						<p>
							{error ||
								"We couldn't find the product you're looking for."}
						</p>
						<Button onClick={() => navigate('/')}>
							Browse Products
						</Button>
					</div>
				</div>
			</div>
		);
	}

	// Show edit form if in edit mode
	if (isEditMode) {
		return (
			<div className='product-detail-screen'>
				<div className='detail-container'>
					<EditProductForm
						product={product}
						onSave={handleEditSave}
						onCancel={handleEditCancel}
					/>
				</div>
			</div>
		);
	}

	const storeTypeLabels: Record<string, string> = {
		brick_and_mortar: '🏪 Store',
		online_retailer: '🌐 Online',
		brand_direct: '🏷️ Direct',
	};

	const availabilityStatusLabels: Record<string, string> = {
		known: 'Available',
		user_reported: 'User Reported',
		unknown: 'Unconfirmed',
		pending: 'Pending',
	};

	return (
		<div className='product-detail-screen'>
			<div className='detail-container'>
				<nav className='breadcrumb'>
					<Link to='/'>Products</Link>
					<span className='separator'>/</span>
					<span>{product.brand}</span>
					{isAdmin && (
						<>
							<span className='separator'>/</span>
							<button
								onClick={() => setIsEditMode(true)}
								className='edit-button-link'
								title='Edit product'>
								✏️ Edit
							</button>
						</>
					)}
				</nav>

				<div className='detail-grid'>
					<div className='detail-image-section'>
						<div className='detail-image-container'>
							{product.imageUrl ? (
								<img
									src={product.imageUrl}
									alt={product.name}
									className='detail-image'
								/>
							) : (
								<div className='detail-image-placeholder'>
									<span>🌿</span>
								</div>
							)}
						</div>
					</div>

					<div className='detail-info-section'>
						<span className='detail-brand'>{product.brand}</span>
						<h1 className='detail-name'>{product.name}</h1>
						<span className='detail-size'>
							{product.sizeOrVariant}
						</span>
						{product._archived && (
							<div className='archived-badge-product'>
								<span className='badge-icon'>📦</span>
								<span>Archived</span>
								{product._archivedAt && (
									<span className='archived-date'>
										(Archived{' '}
										{new Date(
											product._archivedAt
										).toLocaleDateString()}
										)
									</span>
								)}
							</div>
						)}
						{product._source === 'user_contribution' && (
							<div className='user-contributed-badge'>
								<span className='badge-icon'>👤</span>
								<span>User Contributed</span>
							</div>
						)}
						{product._source === 'api' && isAdmin && (
							<div className='admin-edit-badge'>
								<span className='badge-icon'>⚙️</span>
								<span>API Product - Click Edit to modify</span>
							</div>
						)}

						<div className='detail-tags'>
							{(product.tags || []).map((tag) => (
								<span key={tag} className='detail-tag'>
									{tag}
								</span>
							))}
							{product.isStrictVegan && (
								<span className='detail-tag vegan-badge'>
									✓ Strict Vegan
								</span>
							)}
						</div>

						{product.description && (
							<div className='detail-section'>
								<h3>About</h3>
								<p>{product.description}</p>
							</div>
						)}

						{product.ingredientSummary && (
							<div className='detail-section'>
								<h3>Ingredients</h3>
								<p>{product.ingredientSummary}</p>
							</div>
						)}

						{product.nutritionSummary && (
							<div className='detail-section'>
								<h3>Nutrition</h3>
								<p>{product.nutritionSummary}</p>
							</div>
						)}

						<div className='detail-actions'>
							{isAdmin && (
								<>
									<Button
										onClick={() => setIsEditMode(true)}
										variant='secondary'
										size='lg'>
										✏️ Edit Product
									</Button>
									{product._archived ? (
										<Button
											onClick={handleUnarchive}
											isLoading={archiving}
											variant='primary'
											size='lg'>
											↻ Unarchive Product
										</Button>
									) : (
										<Button
											onClick={handleArchive}
											isLoading={archiving}
											variant='secondary'
											size='lg'>
											📦 Archive Product
										</Button>
									)}
								</>
							)}
							{!product._archived && (
								<Button
									onClick={handleAddToList}
									isLoading={addingItem}
									size='lg'>
									Add to Shopping List
								</Button>
							)}
							{isAuthenticated && (
								<Button
									onClick={() =>
										navigate('/add-product', {
											state: {
												template: {
													name: product.name,
													brand: product.brand,
													description:
														product.description,
													sizeOrVariant:
														product.sizeOrVariant,
													categories:
														product.categories,
													tags: product.tags,
													isStrictVegan:
														product.isStrictVegan,
													imageUrl: product.imageUrl,
													nutritionSummary:
														product.nutritionSummary,
													ingredientSummary:
														product.ingredientSummary,
												},
											},
										})
									}
									variant='secondary'
									size='lg'>
									📋 Use as Template
								</Button>
							)}
						</div>
					</div>
				</div>

				<section className='availability-section'>
					<h2 className='section-title'>
						<span className='title-icon'>📍</span>
						Where to Buy
					</h2>

					{(product.availability?.length || 0) > 0 ? (
						<>
							{/* Chain availability badges */}
							{groupedAvailability.chainGroups.length > 0 && (
								<div className='chain-availability-badges'>
									<span className='badges-label'>
										Available at:
									</span>
									<div className='chain-badges'>
										{groupedAvailability.chainGroups.map(
											({ chain, items }) => (
												<span
													key={chain.id}
													className='chain-avail-badge'
													title={`${
														items.length
													} location${
														items.length !== 1
															? 's'
															: ''
													}`}>
													✓ {chain.name}
													<span className='badge-count'>
														({items.length})
													</span>
												</span>
											)
										)}
									</div>
								</div>
							)}

							{stores.length > 0 &&
								stores.some(
									(s) => s.latitude && s.longitude
								) && (
									<div className='availability-map-container'>
										<StoreMap
											stores={stores}
											height='400px'
										/>
									</div>
								)}

							<div className='availability-grouped'>
								{/* Chain Groups */}
								{groupedAvailability.chainGroups.map(
									({ chain, items }) => (
										<div
											key={chain.id}
											className='availability-chain-group'>
											<div
												className='chain-group-header'
												onClick={() =>
													toggleAvailChainExpanded(
														chain.id
													)
												}>
												<span className='chain-expand'>
													{expandedAvailChains.has(
														chain.id
													)
														? '▼'
														: '▶'}
												</span>
												<div className='chain-group-info'>
													<h3 className='chain-group-name'>
														{chain.name}
													</h3>
													<span className='chain-group-count'>
														{items.length} location
														{items.length !== 1
															? 's'
															: ''}
													</span>
												</div>
											</div>

											{expandedAvailChains.has(
												chain.id
											) && (
												<div className='chain-locations'>
													{items.map((avail) => (
														<div
															key={avail.storeId}
															className='availability-card chain-location'>
															<div className='store-header'>
																<span className='store-type'>
																	{storeTypeLabels[
																		avail
																			.storeType
																	] ||
																		avail.storeType}
																</span>
																{avail.status ===
																'known' ? (
																	<span
																		className={`availability-status status-${avail.status}`}>
																		{availabilityStatusLabels[
																			avail
																				.status
																		] ||
																			avail.status}
																	</span>
																) : (
																	<button
																		type='button'
																		className={`availability-status status-${avail.status} clickable`}
																		onClick={(
																			e
																		) => {
																			e.stopPropagation();
																			openConfirmModal(
																				avail.storeId,
																				avail.locationIdentifier ||
																					avail.address ||
																					avail.storeName
																			);
																		}}
																		title='Click to confirm this product is still here'>
																		{availabilityStatusLabels[
																			avail
																				.status
																		] ||
																			avail.status}
																	</button>
																)}
															</div>
															<h4 className='store-name'>
																{avail.locationIdentifier ||
																	avail.address ||
																	avail.storeName}
															</h4>
															{avail.address && (
																<span className='store-address'>
																	{
																		avail.address
																	}
																	{avail.city &&
																		`, ${avail.city}`}
																	{avail.state &&
																		`, ${avail.state}`}
																</span>
															)}
															{avail.priceRange && (
																<span className='store-price'>
																	{
																		avail.priceRange
																	}
																</span>
															)}
														</div>
													))}
												</div>
											)}
										</div>
									)
								)}

								{/* Independent Stores */}
								{groupedAvailability.independentStores.length >
									0 && (
									<>
										{groupedAvailability.chainGroups
											.length > 0 && (
											<div className='availability-section-divider'>
												<span>Independent Stores</span>
											</div>
										)}
										<div className='availability-grid'>
											{groupedAvailability.independentStores.map(
												(avail) => (
													<div
														key={avail.storeId}
														className='availability-card'>
														<div className='store-header'>
															<span className='store-type'>
																{storeTypeLabels[
																	avail
																		.storeType
																] ||
																	avail.storeType}
															</span>
															{avail.status ===
															'known' ? (
																<span
																	className={`availability-status status-${avail.status}`}>
																	{availabilityStatusLabels[
																		avail
																			.status
																	] ||
																		avail.status}
																</span>
															) : (
																<button
																	type='button'
																	className={`availability-status status-${avail.status} clickable`}
																	onClick={(
																		e
																	) => {
																		e.stopPropagation();
																		openConfirmModal(
																			avail.storeId,
																			avail.storeName
																		);
																	}}
																	title='Click to confirm this product is still here'>
																	{availabilityStatusLabels[
																		avail
																			.status
																	] ||
																		avail.status}
																</button>
															)}
														</div>
														<h4 className='store-name'>
															{avail.storeName}
														</h4>
														<span className='store-region'>
															{avail.address
																? `${
																		avail.address
																  }${
																		avail.city
																			? `, ${avail.city}`
																			: ''
																  }`
																: avail.regionOrScope}
														</span>
														{avail.priceRange && (
															<span className='store-price'>
																{
																	avail.priceRange
																}
															</span>
														)}
													</div>
												)
											)}
										</div>
									</>
								)}
							</div>
						</>
					) : (
						<div className='availability-empty'>
							<p>
								Availability information is not yet available
								for this product.
							</p>
							<p className='availability-empty-note'>
								Help us grow our database by reporting where
								you've found this product!
							</p>
						</div>
					)}

					{/* Report Availability CTA */}
					{!product._archived && (
						<ReportAvailability
							productId={product.id}
							productName={product.name}
							onSuccess={refresh}
						/>
					)}
				</section>

				{/* Reviews Section */}
				<section className='reviews-section'>
					<h2 className='section-title'>
						<span className='title-icon'>⭐</span>
						Reviews
					</h2>

					{reviewStats && <ReviewStats stats={reviewStats} />}

					{isAuthenticated && !userReview && !showReviewForm && (
						<div className='review-action-buttons'>
							<Button
								onClick={() => setShowReviewForm(true)}
								variant='primary'
								size='lg'>
								Write a Review
							</Button>
						</div>
					)}

					{isAuthenticated && userReview && !showReviewForm && (
						<div className='review-action-buttons'>
							<Button
								onClick={() => {
									setEditingReview(userReview);
									setShowReviewForm(true);
								}}
								variant='secondary'
								size='lg'>
								Edit Your Review
							</Button>
							<Button
								onClick={() => handleDeleteReview(userReview)}
								variant='secondary'
								size='lg'>
								Delete Your Review
							</Button>
						</div>
					)}

					{showReviewForm && (
						<div className='review-form-container'>
							<ReviewForm
								review={editingReview || undefined}
								onSubmit={
									editingReview
										? handleUpdateReview
										: handleCreateReview
								}
								onCancel={() => {
									setShowReviewForm(false);
									setEditingReview(null);
								}}
							/>
						</div>
					)}

					{!showReviewForm && (
						<ReviewList
							reviews={reviews}
							page={reviewsPage}
							pageSize={10}
							totalCount={reviewsTotalCount}
							onPageChange={handleReviewPageChange}
							onEdit={
								isAuthenticated && userReview
									? (review) => {
											if (review.id === userReview.id) {
												setEditingReview(review);
												setShowReviewForm(true);
											}
									  }
									: undefined
							}
							onDelete={
								isAuthenticated && userReview
									? (review) => {
											if (review.id === userReview.id) {
												handleDeleteReview(review);
											}
									  }
									: undefined
							}
							onVoteHelpful={handleVoteHelpful}
							sortBy={reviewsSortBy}
							onSortChange={setReviewsSortBy}
						/>
					)}
				</section>
			</div>

			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}

			<RegistrationModal
				isOpen={showRegistrationModal}
				onClose={() => setShowRegistrationModal(false)}
				onSuccess={handleRegistrationSuccess}
			/>

			{/* Confirm Availability Modal */}
			{confirmModalStore && (
				<div
					className='confirm-modal-overlay'
					onClick={() => setConfirmModalStore(null)}>
					<div
						className='confirm-modal'
						onClick={(e) => e.stopPropagation()}>
						<button
							className='confirm-modal-close'
							onClick={() => setConfirmModalStore(null)}>
							×
						</button>
						<div className='confirm-modal-icon'>📍</div>
						<h3>Confirm Availability</h3>
						<p>
							Is <strong>{product?.name}</strong> still available
							at <strong>{confirmModalStore.storeName}</strong>?
						</p>
						<div className='confirm-modal-actions'>
							<button
								className='confirm-modal-cancel'
								onClick={() => setConfirmModalStore(null)}>
								Cancel
							</button>
							<button
								className='confirm-modal-confirm'
								onClick={() =>
									handleConfirmAvailability(
										confirmModalStore.storeId
									)
								}
								disabled={
									confirmingStoreId ===
									confirmModalStore.storeId
								}>
								{confirmingStoreId === confirmModalStore.storeId
									? 'Confirming...'
									: 'Yes, still here!'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
