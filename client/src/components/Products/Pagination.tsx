import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function Pagination({ currentPage, totalPages, onPageChange, loading }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Show up to 7 page numbers
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 3) {
        // Near the start: 1, 2, 3, 4, ..., last
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end: 1, ..., n-3, n-2, n-1, n
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle: 1, ..., current-1, current, current+1, ..., last
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination">
      <button
        className="pagination-button pagination-prev"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        aria-label="Previous page"
      >
        ← Previous
      </button>

      <div className="pagination-numbers">
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
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
              className={`pagination-number ${pageNum === currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(pageNum)}
              disabled={loading}
              aria-label={`Page ${pageNum}`}
              aria-current={pageNum === currentPage ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        className="pagination-button pagination-next"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        aria-label="Next page"
      >
        Next →
      </button>
    </div>
  );
}

