import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductList, SearchBar, FilterSidebar, Pagination } from '../components';
import { useProducts, useCategories } from '../hooks';
import './HomeScreen.css';

export function HomeScreen() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || null;
  const initialTag = searchParams.get('tag') || null;
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag);
  
  // Initialize useProducts with filters from URL
  const { products, loading, error, totalCount, page, totalPages, goToPage, fetchProducts } = useProducts({
    q: initialQuery || undefined,
    category: initialCategory || undefined,
    tag: initialTag || undefined,
    page: initialPage,
  });
  const { categories, loading: categoriesLoading } = useCategories();

  // Track previous URL params to detect changes
  const prevParamsRef = useRef<string>('');
  const isMountedRef = useRef(false);
  const isPageChangeRef = useRef(false);
  
  useEffect(() => {
    // Skip if we're programmatically changing the page
    if (isPageChangeRef.current) {
      isPageChangeRef.current = false;
      return;
    }
    
    const queryParam = searchParams.get('q') || '';
    const categoryParam = searchParams.get('category') || null;
    const tagParam = searchParams.get('tag') || null;
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    
    // Create a string representation of current params for comparison (excluding page)
    const currentParams = `${queryParam}|${categoryParam}|${tagParam}`;
    
    // On initial mount, just set the ref and mark as mounted
    if (!isMountedRef.current) {
      prevParamsRef.current = currentParams;
      isMountedRef.current = true;
      return;
    }
    
    // Only update if filters (not page) actually changed
    if (prevParamsRef.current !== currentParams) {
      setSearchQuery(queryParam);
      setSelectedCategory(categoryParam);
      setSelectedTag(tagParam);
      
      // Fetch with new filters (this resets to page 1)
      fetchProducts({ 
        q: queryParam || undefined, 
        category: categoryParam || undefined,
        tag: tagParam || undefined,
        page: 1,
      });
      
      prevParamsRef.current = currentParams;
    } else if (pageParam !== page && pageParam >= 1) {
      // Only page changed (e.g., browser back/forward), navigate to that page
      goToPage(pageParam);
    }
  }, [searchParams, fetchProducts, goToPage, page]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      // Update URL with search query (reset to page 1)
      const newParams = new URLSearchParams(searchParams);
      if (query.trim()) {
        newParams.set('q', query.trim());
      } else {
        newParams.delete('q');
      }
      // Preserve category and tag if they exist
      if (selectedCategory) newParams.set('category', selectedCategory);
      if (selectedTag) newParams.set('tag', selectedTag);
      newParams.delete('page'); // Reset to page 1
      
      const newSearch = newParams.toString();
      window.history.replaceState({}, '', newSearch ? `/?${newSearch}` : '/');
      
      fetchProducts({ 
        q: query || undefined, 
        category: selectedCategory || undefined,
        tag: selectedTag || undefined,
        page: 1,
      });
    },
    [fetchProducts, selectedCategory, selectedTag, searchParams]
  );

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      setSelectedCategory(category);
      // Update URL (reset to page 1)
      const newParams = new URLSearchParams(searchParams);
      if (category) {
        newParams.set('category', category);
      } else {
        newParams.delete('category');
      }
      if (searchQuery) newParams.set('q', searchQuery);
      if (selectedTag) newParams.set('tag', selectedTag);
      newParams.delete('page'); // Reset to page 1
      
      const newSearch = newParams.toString();
      window.history.replaceState({}, '', newSearch ? `/?${newSearch}` : '/');
      
      fetchProducts({ 
        q: searchQuery || undefined, 
        category: category || undefined,
        tag: selectedTag || undefined,
        page: 1,
      });
    },
    [fetchProducts, searchQuery, selectedTag, searchParams]
  );

  const handleTagSelect = useCallback(
    (tag: string | null) => {
      setSelectedTag(tag);
      // Update URL (reset to page 1)
      const newParams = new URLSearchParams(searchParams);
      if (tag) {
        newParams.set('tag', tag);
      } else {
        newParams.delete('tag');
      }
      if (searchQuery) newParams.set('q', searchQuery);
      if (selectedCategory) newParams.set('category', selectedCategory);
      newParams.delete('page'); // Reset to page 1
      
      const newSearch = newParams.toString();
      window.history.replaceState({}, '', newSearch ? `/?${newSearch}` : '/');
      
      fetchProducts({ 
        q: searchQuery || undefined, 
        category: selectedCategory || undefined,
        tag: tag || undefined,
        page: 1,
      });
    },
    [fetchProducts, searchQuery, selectedCategory, searchParams]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      // Mark that we're programmatically changing the page
      isPageChangeRef.current = true;
      
      // Update URL with new page
      const newParams = new URLSearchParams(searchParams);
      if (searchQuery) newParams.set('q', searchQuery);
      if (selectedCategory) newParams.set('category', selectedCategory);
      if (selectedTag) newParams.set('tag', selectedTag);
      if (newPage > 1) {
        newParams.set('page', newPage.toString());
      } else {
        newParams.delete('page');
      }
      
      const newSearch = newParams.toString();
      window.history.replaceState({}, '', newSearch ? `/?${newSearch}` : '/');
      
      // Call goToPage to fetch the new page
      goToPage(newPage);
    },
    [goToPage, searchQuery, selectedCategory, selectedTag, searchParams]
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

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                loading={loading}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

