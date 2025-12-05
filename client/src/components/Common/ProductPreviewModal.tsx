import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../../api';
import { Button } from './Button';
import './ProductPreviewModal.css';

// Flexible product data that can come from different sources
export interface ProductPreviewData {
	id: string;
	name: string;
	brand: string;
	sizeOrVariant?: string;
	imageUrl?: string;
	description?: string;
	tags?: string[];
	averageRating?: number;
	reviewCount?: number;
}

interface ProductPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	product: ProductPreviewData | null;
	showAddToList?: boolean;
	onAddToList?: () => void;
}

export function ProductPreviewModal({
	isOpen,
	onClose,
	product,
	showAddToList = false,
	onAddToList,
}: ProductPreviewModalProps) {
	const navigate = useNavigate();
	const [extraDetails, setExtraDetails] =
		useState<Partial<ProductPreviewData> | null>(null);
	const [loading, setLoading] = useState(false);

	// Fetch extra product details when modal opens
	useEffect(() => {
		if (isOpen && product?.id) {
			setLoading(true);
			setExtraDetails(null);
			productsApi
				.getProductById(product.id)
				.then((response) => {
					// API returns { product: ProductDetail }
					const fetchedProduct = response.product;
					// Only store extra details that we don't already have
					setExtraDetails({
						description: fetchedProduct.description,
						tags: fetchedProduct.tags,
						averageRating: fetchedProduct.averageRating,
						reviewCount: fetchedProduct.reviewCount,
						// Only use API imageUrl if we don't have one
						imageUrl: fetchedProduct.imageUrl,
					});
				})
				.catch((err) => {
					console.error('Failed to fetch product details:', err);
					setExtraDetails(null);
				})
				.finally(() => setLoading(false));
		} else {
			setExtraDetails(null);
		}
	}, [isOpen, product?.id]);

	if (!isOpen || !product) return null;

	// Merge: start with product data, overlay extra details, but prefer original imageUrl if exists
	const displayProduct: ProductPreviewData = {
		...product,
		...extraDetails,
		// Prefer original imageUrl if it exists, otherwise use fetched one
		imageUrl: product.imageUrl || extraDetails?.imageUrl,
	};

	const handleViewFullDetails = () => {
		onClose();
		navigate(`/products/${product.id}`);
	};

	const handleOverlayClick = (e: React.MouseEvent) => {
		// Only navigate if clicking the overlay itself, not children
		if (e.target === e.currentTarget) {
			handleViewFullDetails();
		}
	};

	const handleModalClick = (e: React.MouseEvent) => {
		// Check if the click target is an interactive element
		const target = e.target as HTMLElement;
		const isInteractive =
			target.tagName === 'BUTTON' ||
			target.tagName === 'A' ||
			target.closest('button') ||
			target.closest('a') ||
			target.classList.contains('modal-close') ||
			target.closest('.modal-close') ||
			target.classList.contains('preview-actions') ||
			target.closest('.preview-actions');

		if (!isInteractive) {
			handleViewFullDetails();
		}
	};

	const handleAddToListClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onAddToList?.();
	};

	return (
		<>
			<div
				className='preview-modal-overlay'
				onClick={handleOverlayClick}
			/>
			<div className='preview-modal-container' onClick={handleModalClick}>
				<button
					className='modal-close preview-modal-close'
					onClick={(e) => {
						e.stopPropagation();
						onClose();
					}}
					aria-label='Close'>
					×
				</button>

				<div className='preview-modal-content'>
					<div className='preview-modal-image'>
						{displayProduct.imageUrl ? (
							<img
								src={displayProduct.imageUrl}
								alt={displayProduct.name}
							/>
						) : (
							<div className='preview-image-placeholder'>🌿</div>
						)}
					</div>

					<div className='preview-modal-info'>
						<span className='preview-brand'>
							{displayProduct.brand}
						</span>
						<h2 className='preview-name'>{displayProduct.name}</h2>
						{displayProduct.sizeOrVariant && (
							<span className='preview-size'>
								{displayProduct.sizeOrVariant}
							</span>
						)}

						{loading ? (
							<div className='preview-loading'>
								<span>Loading details...</span>
							</div>
						) : (
							<>
								{displayProduct.averageRating &&
									displayProduct.reviewCount &&
									displayProduct.reviewCount > 0 && (
										<div className='preview-rating'>
											<div className='preview-rating-stars'>
												{Array(5)
													.fill(0)
													.map((_, i) => (
														<span
															key={i}
															className={
																i <
																Math.round(
																	displayProduct.averageRating!
																)
																	? 'star star-full'
																	: 'star star-empty'
															}>
															{i <
															Math.round(
																displayProduct.averageRating!
															)
																? '★'
																: '☆'}
														</span>
													))}
											</div>
											<span className='preview-rating-text'>
												{displayProduct.averageRating.toFixed(
													1
												)}{' '}
												({displayProduct.reviewCount}{' '}
												{displayProduct.reviewCount ===
												1
													? 'review'
													: 'reviews'}
												)
											</span>
										</div>
									)}

								{displayProduct.description && (
									<p className='preview-description'>
										{displayProduct.description}
									</p>
								)}

								{displayProduct.tags &&
									displayProduct.tags.length > 0 && (
										<div className='preview-tags'>
											{displayProduct.tags
												.slice(0, 5)
												.map((tag) => (
													<span
														key={tag}
														className='preview-tag'>
														{tag}
													</span>
												))}
										</div>
									)}
							</>
						)}
					</div>
				</div>

				<div className='preview-actions'>
					<Button
						variant='primary'
						size='md'
						onClick={(e) => {
							e.stopPropagation();
							handleViewFullDetails();
						}}>
						View Full Details →
					</Button>
					{showAddToList && onAddToList && (
						<Button
							variant='secondary'
							size='md'
							onClick={handleAddToListClick}>
							📝 Add to List
						</Button>
					)}
				</div>

				<p className='preview-hint'>
					Click anywhere to view full product page
				</p>
			</div>
		</>
	);
}
