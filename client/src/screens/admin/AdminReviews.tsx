import { useState, useEffect, useCallback } from 'react';
import { reviewsApi } from '../../api/reviewsApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import { Link } from 'react-router-dom';
import { PendingReview } from '../../types/review';
import './AdminReviews.css';

export function AdminReviews() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await reviewsApi.getPendingReviews(page, 20);
      setReviews(response.items);
      setTotalCount(response.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleApprove = async (reviewId: string) => {
    setActionLoading(reviewId);
    try {
      await reviewsApi.approveReview(reviewId);
      setReviews(reviews.filter(r => r.id !== reviewId));
      setTotalCount(totalCount - 1);
      setToast({ message: 'Review approved successfully', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to approve review', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reviewId: string) => {
    if (!confirm('Are you sure you want to reject this review?')) return;
    
    setActionLoading(reviewId);
    try {
      await reviewsApi.rejectReview(reviewId);
      setReviews(reviews.filter(r => r.id !== reviewId));
      setTotalCount(totalCount - 1);
      setToast({ message: 'Review rejected', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to reject review', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="review-rating-stars">
        {Array(5).fill(0).map((_, i) => (
          <span key={i} className={i < rating ? 'star star-full' : 'star star-empty'}>
            {i < rating ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout>
      <div className="admin-reviews">
        <div className="admin-header">
          <h1>Review Moderation</h1>
          <p className="admin-subtitle">
            {totalCount} {totalCount === 1 ? 'review' : 'reviews'} pending approval
          </p>
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            <p>No pending reviews</p>
            <p className="empty-state-subtitle">All reviews have been moderated</p>
          </div>
        ) : (
          <>
            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review.id} className="review-card-admin">
                  <div className="review-header-admin">
                    <div className="review-user-info-admin">
                      <div className="review-user-avatar-admin">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="review-user-name-admin">{review.userName}</div>
                        <div className="review-date-admin">{formatDate(review.reviewedAt)}</div>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>

                  <div className="review-product-info">
                    <Link to={`/products/${review.productId}`} className="product-link">
                      {review.productName || 'Product'} {review.productBrand ? `by ${review.productBrand}` : ''}
                    </Link>
                  </div>

                  {review.title && (
                    <h4 className="review-title-admin">{review.title}</h4>
                  )}

                  <p className="review-comment-admin">{review.comment}</p>

                  {review.photoUrls && review.photoUrls.length > 0 && (
                    <div className="review-photos-admin">
                      {review.photoUrls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Review photo ${index + 1}`}
                          className="review-photo-admin"
                          onClick={() => window.open(url, '_blank')}
                        />
                      ))}
                    </div>
                  )}

                  <div className="review-actions-admin">
                    <Button
                      onClick={() => handleApprove(review.id)}
                      isLoading={actionLoading === review.id}
                      variant="primary"
                      size="md"
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(review.id)}
                      isLoading={actionLoading === review.id}
                      variant="secondary"
                      size="md"
                    >
                      ✗ Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {totalCount > 20 && (
              <div className="pagination-controls">
                <Button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="secondary"
                >
                  Previous
                </Button>
                <span className="page-info">
                  Page {page} of {Math.ceil(totalCount / 20)}
                </span>
                <Button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(totalCount / 20)}
                  variant="secondary"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}

