import React from "react";
import "./RatingFilter.css";

interface RatingFilterProps {
  selectedRating?: number;
  onRatingChange: (rating: number | undefined) => void;
}

const RatingFilter: React.FC<RatingFilterProps> = ({
  selectedRating,
  onRatingChange,
}) => {
  const options = [
    { value: 4, label: "4+ stars" },
    { value: 3, label: "3+ stars" },
    { value: 2, label: "2+ stars" },
    { value: 1, label: "1+ stars" },
  ];

  const renderStars = (count: number) => {
    return (
      <span className="filter-stars">
        {Array(count)
          .fill(0)
          .map((_, i) => (
            <span key={i} className="star">
              ★
            </span>
          ))}
      </span>
    );
  };

  return (
    <div className="rating-filter">
      <h3 className="filter-title">Minimum Rating</h3>
      <div className="rating-options">
        <button
          className={`rating-option ${selectedRating === undefined ? "active" : ""}`}
          onClick={() => onRatingChange(undefined)}
        >
          All Ratings
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            className={`rating-option ${selectedRating === option.value ? "active" : ""}`}
            onClick={() => onRatingChange(option.value)}
          >
            {renderStars(option.value)} {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RatingFilter;
