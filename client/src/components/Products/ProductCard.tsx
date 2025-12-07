import { Link } from 'react-router-dom';
import { ProductSummary } from '../../types';
import './ProductCard.css';

interface ProductCardProps {
	product: ProductSummary;
}

export function ProductCard({ product }: ProductCardProps) {
	return (
		<Link to={`/products/${product.id}`} className='product-card'>
			<div className='product-image-container'>
				{product.imageUrl ? (
					<img
						src={product.imageUrl}
						alt={product.name}
						className='product-image'
						loading='lazy'
					/>
				) : (
					<div className='product-image-placeholder'>
						<span>🌿</span>
					</div>
				)}
				<div className='product-image-overlay' />
			</div>

			<div className='product-content'>
				<span className='product-brand'>{product.brand}</span>
				<h3 className='product-name'>{product.name}</h3>
				<span className='product-size'>{product.sizeOrVariant}</span>

				{product.averageRating &&
					product.reviewCount &&
					product.reviewCount > 0 && (
						<div className='product-rating'>
							<div className='product-rating-stars'>
								{Array(5)
									.fill(0)
									.map((_, i) => (
										<span
											key={i}
											className={
												i <
												Math.round(
													product.averageRating!
												)
													? 'star star-full'
													: 'star star-empty'
											}>
											{i <
											Math.round(product.averageRating!)
												? '★'
												: '☆'}
										</span>
									))}
							</div>
							<span className='product-rating-text'>
								{product.averageRating.toFixed(1)} (
								{product.reviewCount}{' '}
								{product.reviewCount === 1
									? 'review'
									: 'reviews'}
								)
							</span>
						</div>
					)}

				{/* Chain availability badges */}
				{product.chainNames && product.chainNames.length > 0 ? (
					<div className='product-availability'>
						<span className='availability-label'>
							Available at:
						</span>
						<div className='availability-chains'>
							{product.chainNames.slice(0, 2).map((chain) => (
								<span
									key={chain}
									className='availability-chain'>
									{chain}
								</span>
							))}
							{product.chainNames.length > 2 && (
								<span className='availability-more'>
									+{product.chainNames.length - 2}
								</span>
							)}
						</div>
					</div>
				) : product.storeCount && product.storeCount > 0 ? (
					<div className='product-availability'>
						<span className='availability-stores'>
							{product.storeCount} store
							{product.storeCount !== 1 ? 's' : ''}
						</span>
					</div>
				) : null}

				<div className='product-tags'>
					{product.tags.slice(0, 3).map((tag) => (
						<span key={tag} className='product-tag'>
							{tag}
						</span>
					))}
				</div>
			</div>
		</Link>
	);
}
