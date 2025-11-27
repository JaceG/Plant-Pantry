import './CategoryFilter.css';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
  loading?: boolean;
}

export function CategoryFilter({ categories, selectedCategory, onSelect, loading }: CategoryFilterProps) {
  if (loading) {
    return (
      <div className="category-filter loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="category-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="category-filter">
      <button
        className={`category-chip ${selectedCategory === null ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
          onClick={() => onSelect(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

