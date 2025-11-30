import React from 'react';
import { Review } from '../../types/review';
import { useAuth } from '../../context/AuthContext';
import './ReviewCard.css';

interface ReviewCardProps {
  review: Review;
  onEdit?: () => void;
  onDelete?: () => void;
  onVoteHelpful?: () => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onEdit,
  onDelete,
  onVoteHelpful,
}) => {
  const { user } = useAuth();
  const isOwnReview = user?.id === review.userId;

  const renderStars = (rating: number) => {
    return (
      <div className="review-stars">
        {Array(5).fill(0).map((_, i) => (
          <span
            key={i}
            className={i < rating ? 'star star-full' : 'star star-empty'}
          >
            {i < rating ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="review-card">
      <div className="review-header">
        <div className="review-user-info">
          <div className="review-user-avatar">
            {review.userName.charAt(0).toUpperCase()}
          </div>
          <div className="review-user-details">
            <div className="review-user-name">{review.userName}</div>
            <div className="review-date">{formatDate(review.reviewedAt)}</div>
          </div>
        </div>
        {renderStars(review.rating)}
      </div>

      {review.title && (
        <h4 className="review-title">{review.title}</h4>
      )}

      <p className="review-comment">{review.comment}</p>

      {review.photoUrls && review.photoUrls.length > 0 && (
        <div className="review-photos">
          {review.photoUrls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Review photo ${index + 1}`}
              className="review-photo"
              onClick={() => window.open(url, '_blank')}
            />
          ))}
        </div>
      )}

      <div className="review-footer">
        <button
          className={`helpful-button ${review.isHelpful ? 'active' : ''}`}
          onClick={onVoteHelpful}
          disabled={!onVoteHelpful}
        >
          👍 Helpful ({review.helpfulCount})
        </button>

        {isOwnReview && (
          <div className="review-actions">
            {onEdit && (
              <button className="edit-button" onClick={onEdit}>
                Edit
              </button>
            )}
            {onDelete && (
              <button className="delete-button" onClick={onDelete}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewCard;

