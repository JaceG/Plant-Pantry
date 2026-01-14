import React from "react";
import { Review } from "../../types/review";
import ReviewCard from "./ReviewCard";
import { Pagination } from "../Products/Pagination";
import "./ReviewList.css";

interface ReviewListProps {
  reviews: Review[];
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange?: (page: number) => void;
  onEdit?: (review: Review) => void;
  onDelete?: (review: Review) => void;
  onVoteHelpful?: (review: Review) => void;
  sortBy?: "newest" | "oldest" | "helpful" | "rating";
  onSortChange?: (sortBy: "newest" | "oldest" | "helpful" | "rating") => void;
}

const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onEdit,
  onDelete,
  onVoteHelpful,
  sortBy = "newest",
  onSortChange,
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  if (reviews.length === 0) {
    return (
      <div className="review-list-empty">
        <p>No reviews yet. Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div className="review-list">
      {onSortChange && (
        <div className="review-list-header">
          <div className="review-count-info">
            {totalCount} {totalCount === 1 ? "review" : "reviews"}
          </div>
          <div className="review-sort">
            <label htmlFor="sort-select">Sort by:</label>
            <select
              id="sort-select"
              className="sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as typeof sortBy)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="helpful">Most Helpful</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      )}

      <div className="review-list-items">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onEdit={onEdit ? () => onEdit(review) : undefined}
            onDelete={onDelete ? () => onDelete(review) : undefined}
            onVoteHelpful={
              onVoteHelpful ? () => onVoteHelpful(review) : undefined
            }
          />
        ))}
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="review-list-pagination">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default ReviewList;
