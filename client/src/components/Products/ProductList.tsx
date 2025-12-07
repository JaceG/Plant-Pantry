import { ProductSummary } from '../../types';
import { ProductCard } from './ProductCard';
import './ProductList.css';

interface ProductListProps {
	products: ProductSummary[];
	loading?: boolean;
	emptyMessage?: string;
	showNearYou?: boolean;
}

export function ProductList({
	products,
	loading,
	emptyMessage = 'No products found',
	showNearYou,
}: ProductListProps) {
	if (loading && products.length === 0) {
		return (
			<div className='product-list-loading'>
				<div className='loading-grid'>
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className='skeleton-card'>
							<div className='skeleton-image' />
							<div className='skeleton-content'>
								<div className='skeleton-line short' />
								<div className='skeleton-line' />
								<div className='skeleton-line medium' />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (products.length === 0) {
		return (
			<div className='product-list-empty'>
				<span className='empty-icon'>🌿</span>
				<p className='empty-message'>{emptyMessage}</p>
			</div>
		);
	}

	return (
		<div className='product-list'>
			{products.map((product, index) => (
				<div
					key={product.id}
					className='product-list-item'
					style={{ animationDelay: `${index * 50}ms` }}>
					<ProductCard product={product} showNearYou={showNearYou} />
				</div>
			))}
		</div>
	);
}
