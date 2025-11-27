import { useState, useCallback } from 'react';
import { ProductList, SearchBar, CategoryFilter } from '../components';
import { useProducts, useCategories } from '../hooks';
import './HomeScreen.css';

export function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { products, loading, error, totalCount, fetchProducts } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      fetchProducts({ q: query || undefined, category: selectedCategory || undefined });
    },
    [fetchProducts, selectedCategory]
  );

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      setSelectedCategory(category);
      fetchProducts({ q: searchQuery || undefined, category: category || undefined });
    },
    [fetchProducts, searchQuery]
  );

  return (
    <div className="home-screen">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Discover <span className="highlight">Vegan</span> Groceries
          </h1>
          <p className="hero-subtitle">
            Browse thousands of plant-based products and find where to buy them
          </p>
          
          <div className="hero-search">
            <SearchBar initialValue={searchQuery} onSearch={handleSearch} />
          </div>
        </div>
        
        <div className="hero-decoration">
          <span className="deco-leaf deco-1">🌿</span>
          <span className="deco-leaf deco-2">🥬</span>
          <span className="deco-leaf deco-3">🥑</span>
          <span className="deco-leaf deco-4">🍃</span>
        </div>
      </section>

      <main className="main-content">
        <div className="filters-section">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
            loading={categoriesLoading}
          />
        </div>

        <div className="results-header">
          <h2 className="results-title">
            {searchQuery || selectedCategory ? 'Search Results' : 'All Products'}
          </h2>
          {!loading && (
            <span className="results-count">
              {totalCount} {totalCount === 1 ? 'product' : 'products'}
            </span>
          )}
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <ProductList
          products={products}
          loading={loading}
          emptyMessage={
            searchQuery
              ? `No products found for "${searchQuery}"`
              : 'No products available'
          }
        />
      </main>
    </div>
  );
}

