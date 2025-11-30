import React from 'react';
import { ReviewStats as ReviewStatsType } from '../../types/review';
import './ReviewStats.css';

interface ReviewStatsProps {
  stats: ReviewStatsType;
}

const ReviewStats: React.FC<ReviewStatsProps> = ({ stats }) => {
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="star-rating">
        {Array(fullStars).fill(0).map((_, i) => (
          <span key={i} className="star star-full">★</span>
        ))}
        {hasHalfStar && <span className="star star-half">★</span>}
        {Array(emptyStars).fill(0).map((_, i) => (
          <span key={i} className="star star-empty">☆</span>
        ))}
      </div>
    );
  };

  if (stats.totalCount === 0) {
    return (
      <div className="review-stats">
        <p className="no-reviews">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="review-stats">
      <div className="review-stats-header">
        <div className="average-rating">
          <div className="rating-value">{stats.averageRating.toFixed(1)}</div>
          {renderStars(stats.averageRating)}
        </div>
        <div className="review-count">
          {stats.totalCount} {stats.totalCount === 1 ? 'review' : 'reviews'}
        </div>
      </div>

      <div className="rating-distribution">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = stats.distribution[rating as keyof typeof stats.distribution];
          const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;

          return (
            <div key={rating} className="distribution-row">
              <span className="distribution-rating">{rating} ★</span>
              <div className="distribution-bar-container">
                <div
                  className="distribution-bar"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="distribution-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewStats;

