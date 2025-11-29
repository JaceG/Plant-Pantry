import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductList, SearchBar, FilterSidebar } from '../components';
import { useProducts, useCategories } from '../hooks';
import './HomeScreen.css';

export function HomeScreen() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || null;
  const initialTag = searchParams.get('tag') || null;
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag);
  
  // Initialize useProducts with filters from URL
  const { products, loading, error, totalCount, fetchProducts } = useProducts({
    q: initialQuery || undefined,
    category: initialCategory || undefined,
    tag: initialTag || undefined,
  });
  const { categories, loading: categoriesLoading } = useCategories();

  // Track previous URL params to detect changes
  const prevParamsRef = useRef<string>('');
  const isMountedRef = useRef(false);
  
  useEffect(() => {
    const queryParam = searchParams.get('q') || '';
    const categoryParam = searchParams.get('category') || null;
    const tagParam = searchParams.get('tag') || null;
    
    // Create a string representation of current params for comparison
    const currentParams = `${queryParam}|${categoryParam}|${tagParam}`;
    
    // On initial mount, just set the ref and mark as mounted
    if (!isMountedRef.current) {
      prevParamsRef.current = currentParams;
      isMountedRef.current = true;
      return;
    }
    
    // Only update if params actually changed
    if (prevParamsRef.current !== currentParams) {
      setSearchQuery(queryParam);
      setSelectedCategory(categoryParam);
      setSelectedTag(tagParam);
      
      // Fetch with new filters
      fetchProducts({ 
        q: queryParam || undefined, 
        category: categoryParam || undefined,
        tag: tagParam || undefined,
      });
      
      prevParamsRef.current = currentParams;
    }
  }, [searchParams, fetchProducts]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      // Update URL with search query
      const newParams = new URLSearchParams(searchParams);
      if (query.trim()) {
        newParams.set('q', query.trim());
      } else {
        newParams.delete('q');
      }
      // Preserve category and tag if they exist
      if (selectedCategory) newParams.set('category', selectedCategory);
      if (selectedTag) newParams.set('tag', selectedTag);
      
      const newSearch = newParams.toString();
      window.history.replaceState({}, '', newSearch ? `/?${newSearch}` : '/');
      
      fetchProducts({ 
        q: query || undefined, 
        category: selectedCategory || undefined,
        tag: selectedTag || undefined,
      });
    },
    [fetchProducts, selectedCategory, selectedTag, searchParams]
  );

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      setSelectedCategory(category);
      // Update URL
      const newParams = new URLSearchParams(searchParams);
      if (category) {
        newParams.set('category', category);
      } else {
        newParams.delete('category');
      }
      if (searchQuery) newParams.set('q', searchQuery);
      if (selectedTag) newParams.set('tag', selectedTag);
      
      const newSearch = newParams.toString();
      window.history.replaceState({}, '', newSearch ? `/?${newSearch}` : '/');
      
      fetchProducts({ 
        q: searchQuery || undefined, 
        category: category || undefined,
        tag: selectedTag || undefined,
      });
    },
    [fetchProducts, searchQuery, selectedTag, searchParams]
  );

  const handleTagSelect = useCallback(
    (tag: string | null) => {
      setSelectedTag(tag);
      // Update URL
      const newParams = new URLSearchParams(searchParams);
      if (tag) {
        newParams.set('tag', tag);
      } else {
        newParams.delete('tag');
      }
      if (searchQuery) newParams.set('q', searchQuery);
      if (selectedCategory) newParams.set('category', selectedCategory);
      
      const newSearch = newParams.toString();
      window.history.replaceState({}, '', newSearch ? `/?${newSearch}` : '/');
      
      fetchProducts({ 
        q: searchQuery || undefined, 
        category: selectedCategory || undefined,
        tag: tag || undefined,
      });
    },
    [fetchProducts, searchQuery, selectedCategory, searchParams]
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

