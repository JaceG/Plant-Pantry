import { useState, useCallback } from 'react';
import { ProductList, SearchBar, FilterSidebar } from '../components';
import { useProducts, useCategories } from '../hooks';
import './HomeScreen.css';

export function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const { products, loading, error, totalCount, fetchProducts } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      fetchProducts({ 
        q: query || undefined, 
        category: selectedCategory || undefined,
        tag: selectedTag || undefined,
      });
    },
    [fetchProducts, selectedCategory, selectedTag]
  );

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      setSelectedCategory(category);
      fetchProducts({ 
        q: searchQuery || undefined, 
        category: category || undefined,
        tag: selectedTag || undefined,
      });
    },
    [fetchProducts, searchQuery, selectedTag]
  );

  const handleTagSelect = useCallback(
    (tag: string | null) => {
      setSelectedTag(tag);
      fetchProducts({ 
        q: searchQuery || undefined, 
        category: selectedCategory || undefined,
        tag: tag || undefined,
      });
    },
    [fetchProducts, searchQuery, selectedCategory]
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
        <div className="content-layout">
          <FilterSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            selectedTag={selectedTag}
            onCategorySelect={handleCategorySelect}
            onTagSelect={handleTagSelect}
            loading={categoriesLoading}
          />

          <div className="products-section">
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
                searchQuery || selectedCategory || selectedTag
                  ? `No products found matching your filters`
                  : 'No products available'
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}

