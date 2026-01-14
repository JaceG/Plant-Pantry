import { useState } from "react";
import "./Pagination.css";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  loading,
}: PaginationProps) {
  const [goToPageValue, setGoToPageValue] = useState("");

  if (totalPages <= 1) return null;

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageValue, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setGoToPageValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGoToPage();
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 8; // 1 + 5 visible + ellipsis + last

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage <= 4) {
        // Near the start: 1, 2, 3, 4, 5, ..., last
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end: 1, ..., n-4, n-3, n-2, n-1, n
        pages.push("ellipsis");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle: 1, ..., current-1, current, current+1, ..., last
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePrev5 = () => {
    const newPage = Math.max(1, currentPage - 5);
    onPageChange(newPage);
  };

  const handleNext5 = () => {
    const newPage = Math.min(totalPages, currentPage + 5);
    onPageChange(newPage);
  };

  return (
    <div className="pagination">
      <div className="pagination-nav-group">
        <button
          className="pagination-button pagination-jump"
          onClick={handlePrev5}
          disabled={currentPage <= 1 || loading}
          aria-label="Go back 5 pages"
        >
          «5
        </button>
        <button
          className="pagination-button pagination-prev"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          aria-label="Previous page"
        >
          ← Prev
        </button>
      </div>

      <div className="pagination-numbers">
        {pageNumbers.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                ...
              </span>
            );
          }

          const pageNum = page as number;
          return (
            <button
              key={pageNum}
              className={`pagination-number ${pageNum === currentPage ? "active" : ""}`}
              onClick={() => onPageChange(pageNum)}
              disabled={loading}
              aria-label={`Page ${pageNum}`}
              aria-current={pageNum === currentPage ? "page" : undefined}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <div className="pagination-nav-group">
        <button
          className="pagination-button pagination-next"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          aria-label="Next page"
        >
          Next →
        </button>
        <button
          className="pagination-button pagination-jump"
          onClick={handleNext5}
          disabled={currentPage >= totalPages || loading}
          aria-label="Go forward 5 pages"
        >
          5»
        </button>
      </div>

      <div className="pagination-goto">
        <span className="pagination-goto-label">Page</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={goToPageValue}
          onChange={(e) => setGoToPageValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pagination-goto-input"
          aria-label={`Go to page (1-${totalPages})`}
          disabled={loading}
        />
        <span className="pagination-goto-label">of {totalPages}</span>
        <button
          className="pagination-goto-button"
          onClick={handleGoToPage}
          disabled={
            loading ||
            !goToPageValue ||
            parseInt(goToPageValue, 10) < 1 ||
            parseInt(goToPageValue, 10) > totalPages
          }
          aria-label="Go to page"
        >
          Go
        </button>
      </div>
    </div>
  );
}
