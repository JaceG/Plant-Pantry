import { ShoppingListItem } from '../../types';
import { ProductPreviewData } from '../Common';
import './ShoppingListItemCard.css';

interface ShoppingListItemCardProps {
	item: ShoppingListItem;
	onRemove: (itemId: string) => void;
	isRemoving: boolean;
	onPreview?: (product: ProductPreviewData) => void;
}

export function ShoppingListItemCard({
	item,
	onRemove,
	isRemoving,
	onPreview,
}: ShoppingListItemCardProps) {
	const { productSummary, quantity, note, availabilityHints } = item;

	const handleCardClick = (e: React.MouseEvent) => {
		// Don't open modal if clicking the remove button
		const target = e.target as HTMLElement;
		if (target.closest('.list-item-remove')) {
			return;
		}
		onPreview?.({
			id: item.productId,
			name: productSummary.name,
			brand: productSummary.brand,
			sizeOrVariant: productSummary.sizeOrVariant,
			imageUrl: productSummary.imageUrl,
		});
	};

	return (
		<div
			className={`list-item-card ${isRemoving ? 'removing' : ''}`}
			onClick={handleCardClick}
			role='button'
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onPreview?.({
						id: item.productId,
						name: productSummary.name,
						brand: productSummary.brand,
						sizeOrVariant: productSummary.sizeOrVariant,
						imageUrl: productSummary.imageUrl,
					});
				}
			}}>
			<div className='list-item-image-container'>
				{productSummary.imageUrl ? (
					<img
						src={productSummary.imageUrl}
						alt={productSummary.name}
						className='list-item-image'
					/>
				) : (
					<div className='list-item-image-placeholder'>🌿</div>
				)}
			</div>

			<div className='list-item-content'>
				<div className='list-item-header'>
					<span className='list-item-brand'>
						{productSummary.brand}
					</span>
					<span className='list-item-quantity'>×{quantity}</span>
				</div>

				<h4 className='list-item-name'>{productSummary.name}</h4>
				<span className='list-item-size'>
					{productSummary.sizeOrVariant}
				</span>

				{note && <p className='list-item-note'>{note}</p>}

				{availabilityHints.length > 0 && (
					<div className='list-item-availability'>
						<span className='availability-label'>
							Available at:
						</span>
						<div className='availability-stores'>
							{availabilityHints.slice(0, 3).map((hint, idx) => (
								<span key={idx} className='availability-store'>
									{hint.storeName}
								</span>
							))}
							{availabilityHints.length > 3 && (
								<span className='availability-more'>
									+{availabilityHints.length - 3} more
								</span>
							)}
						</div>
					</div>
				)}
			</div>

			<button
				className='list-item-remove'
				onClick={(e) => {
					e.stopPropagation();
					onRemove(item.itemId);
				}}
				disabled={isRemoving}
				aria-label='Remove item'>
				<svg
					width='20'
					height='20'
					viewBox='0 0 24 24'
					fill='none'
					stroke='currentColor'
					strokeWidth='2'>
					<path d='M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2' />
				</svg>
			</button>
		</div>
	);
}
