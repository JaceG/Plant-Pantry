import { Link } from 'react-router-dom';
import { ProductSummary } from '../../types';
import './ProductCard.css';

interface ProductCardProps {
  product: ProductSummary;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/products/${product.id}`} className="product-card">
      <div className="product-image-container">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="product-image"
            loading="lazy"
          />
        ) : (
          <div className="product-image-placeholder">
            <span>🌿</span>
          </div>
        )}
        <div className="product-image-overlay" />
      </div>
      
      <div className="product-content">
        <span className="product-brand">{product.brand}</span>
        <h3 className="product-name">{product.name}</h3>
        <span className="product-size">{product.sizeOrVariant}</span>
        
        {product.averageRating && product.reviewCount && product.reviewCount > 0 && (
          <div className="product-rating">
            <div className="product-rating-stars">
              {Array(5).fill(0).map((_, i) => (
                <span
                  key={i}
                  className={i < Math.round(product.averageRating!) ? 'star star-full' : 'star star-empty'}
                >
                  {i < Math.round(product.averageRating!) ? '★' : '☆'}
                </span>
              ))}
            </div>
            <span className="product-rating-text">
              {product.averageRating.toFixed(1)} ({product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
        
        <div className="product-tags">
          {product.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="product-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

