import React, { useState } from "react";
import {
  CreateReviewInput,
  UpdateReviewInput,
  Review,
} from "../../types/review";
import "./ReviewForm.css";

interface ReviewFormProps {
  review?: Review;
  onSubmit: (input: CreateReviewInput | UpdateReviewInput) => Promise<void>;
  onCancel?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  review,
  onSubmit,
  onCancel,
}) => {
  const [rating, setRating] = useState<number>(review?.rating || 0);
  const [title, setTitle] = useState<string>(review?.title || "");
  const [comment, setComment] = useState<string>(review?.comment || "");
  const [photoUrls, setPhotoUrls] = useState<string[]>(review?.photoUrls || []);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (rating < 1 || rating > 5) {
      setError("Please select a rating");
      return;
    }

    if (!comment.trim()) {
      setError("Please write a comment");
      return;
    }

    if (photoUrls.length > 5) {
      setError("Maximum 5 photos allowed");
      return;
    }

    setIsSubmitting(true);
    try {
      const input: CreateReviewInput | UpdateReviewInput = {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        photoUrls: photoUrls.filter((url) => url.trim()),
      };

      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPhoto = () => {
    if (newPhotoUrl.trim() && photoUrls.length < 5) {
      setPhotoUrls([...photoUrls, newPhotoUrl.trim()]);
      setNewPhotoUrl("");
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  const renderStars = (selectedRating: number) => {
    return (
      <div className="rating-selector">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={`star-button ${value <= selectedRating ? "selected" : ""}`}
            onClick={() => setRating(value)}
            onMouseEnter={() => {
              // Optional: highlight on hover
            }}
          >
            {value <= selectedRating ? "★" : "☆"}
          </button>
        ))}
        {selectedRating > 0 && (
          <span className="rating-label">
            {selectedRating} {selectedRating === 1 ? "star" : "stars"}
          </span>
        )}
      </div>
    );
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3 className="form-title">
        {review ? "Edit Review" : "Write a Review"}
      </h3>

      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Rating *</label>
        {renderStars(rating)}
      </div>

      <div className="form-group">
        <label htmlFor="title" className="form-label">
          Title (optional)
        </label>
        <input
          id="title"
          type="text"
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief summary of your review"
          maxLength={200}
        />
      </div>

      <div className="form-group">
        <label htmlFor="comment" className="form-label">
          Review *
        </label>
        <textarea
          id="comment"
          className="form-textarea"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this product..."
          rows={6}
          required
          maxLength={2000}
        />
        <div className="char-count">{comment.length} / 2000</div>
      </div>

      <div className="form-group">
        <label className="form-label">Photos (optional, max 5)</label>
        <div className="photo-input-group">
          <input
            type="url"
            className="form-input photo-url-input"
            value={newPhotoUrl}
            onChange={(e) => setNewPhotoUrl(e.target.value)}
            placeholder="Enter image URL"
            disabled={photoUrls.length >= 5}
          />
          <button
            type="button"
            className="add-photo-button"
            onClick={handleAddPhoto}
            disabled={!newPhotoUrl.trim() || photoUrls.length >= 5}
          >
            Add
          </button>
        </div>

        {photoUrls.length > 0 && (
          <div className="photo-preview-list">
            {photoUrls.map((url, index) => (
              <div key={index} className="photo-preview-item">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="photo-preview"
                />
                <button
                  type="button"
                  className="remove-photo-button"
                  onClick={() => handleRemovePhoto(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting
            ? "Submitting..."
            : review
              ? "Update Review"
              : "Submit Review"}
        </button>
      </div>
    </form>
  );
};

export default ReviewForm;
