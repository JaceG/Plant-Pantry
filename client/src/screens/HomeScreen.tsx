import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
	ProductList,
	SearchBar,
	FilterSidebar,
	Pagination,
} from '../components';
import { useProducts, useCategories } from '../hooks';
import { useLocation } from '../context/LocationContext';
import './HomeScreen.css';

export function HomeScreen() {
	const [searchParams] = useSearchParams();
	const initialQuery = searchParams.get('q') || '';
	const initialCategory = searchParams.get('category') || null;
	const initialTag = searchParams.get('tag') || null;
	const initialRating = searchParams.get('minRating')
		? parseFloat(searchParams.get('minRating')!)
		: undefined;
	const initialPage = parseInt(searchParams.get('page') || '1', 10);

	const [searchQuery, setSearchQuery] = useState(initialQuery);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(
		initialCategory
	);
	const [selectedTag, setSelectedTag] = useState<string | null>(initialTag);
	const [selectedRating, setSelectedRating] = useState<number | undefined>(
		initialRating
	);

	// Get location from context
	const {
		location: userLocation,
		hasLocation,
		locationDisplay,
		clearLocation,
		cities,
	} = useLocation();

	// Find the city slug for linking to city page
	const citySlug = userLocation
		? cities.find(
				(c) =>
					c.cityName === userLocation.city &&
					c.state === userLocation.state
		  )?.slug
		: undefined;

	// Initialize useProducts with filters from URL
	const {
		products,
		loading,
		error,
		totalCount,
		page,
		totalPages,
		goToPage,
		fetchProducts,
	} = useProducts({
		q: initialQuery || undefined,
		category: initialCategory || undefined,
		tag: initialTag || undefined,
		minRating: initialRating,
		page: initialPage,
		city: userLocation?.city,
		state: userLocation?.state,
	});
	const { categories, loading: categoriesLoading } = useCategories();

	// Track previous URL params to detect changes
	const prevParamsRef = useRef<string>('');
	const isMountedRef = useRef(false);
	const isPageChangeRef = useRef(false);
	const prevLocationRef = useRef<string | undefined>(undefined);

	// Refetch when location changes
	useEffect(() => {
		const currentLocationKey = userLocation
			? `${userLocation.city}|${userLocation.state}`
			: undefined;

		// Skip on initial mount - let the other effect handle initial load
		if (prevLocationRef.current === undefined) {
			prevLocationRef.current = currentLocationKey;
			return;
		}

		// Only refetch if location actually changed
		if (prevLocationRef.current !== currentLocationKey) {
			prevLocationRef.current = currentLocationKey;
			fetchProducts({
				q: searchQuery || undefined,
				category: selectedCategory || undefined,
				tag: selectedTag || undefined,
				minRating: selectedRating,
				page: 1,
				city: userLocation?.city,
				state: userLocation?.state,
			});
		}
	}, [
		userLocation,
		fetchProducts,
		searchQuery,
		selectedCategory,
		selectedTag,
		selectedRating,
	]);

	useEffect(() => {
		// Skip if we're programmatically changing the page
		if (isPageChangeRef.current) {
			isPageChangeRef.current = false;
			return;
		}

		const queryParam = searchParams.get('q') || '';
		const categoryParam = searchParams.get('category') || null;
		const tagParam = searchParams.get('tag') || null;
		const ratingParam = searchParams.get('minRating')
			? parseFloat(searchParams.get('minRating')!)
			: undefined;
		const pageParam = parseInt(searchParams.get('page') || '1', 10);

		// Create a string representation of current params for comparison (excluding page)
		const currentParams = `${queryParam}|${categoryParam}|${tagParam}|${
			ratingParam || ''
		}`;

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
			setSelectedRating(ratingParam);

			// Fetch with new filters (this resets to page 1)
			fetchProducts({
				q: queryParam || undefined,
				category: categoryParam || undefined,
				tag: tagParam || undefined,
				minRating: ratingParam,
				page: 1,
				city: userLocation?.city,
				state: userLocation?.state,
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
			// Preserve category, tag, and rating if they exist
			if (selectedCategory) newParams.set('category', selectedCategory);
			if (selectedTag) newParams.set('tag', selectedTag);
			if (selectedRating)
				newParams.set('minRating', selectedRating.toString());
			newParams.delete('page'); // Reset to page 1

			const newSearch = newParams.toString();
			window.history.replaceState(
				{},
				'',
				newSearch ? `/search?${newSearch}` : '/search'
			);

			fetchProducts({
				q: query || undefined,
				category: selectedCategory || undefined,
				tag: selectedTag || undefined,
				minRating: selectedRating,
				page: 1,
				city: userLocation?.city,
				state: userLocation?.state,
			});
		},
		[
			fetchProducts,
			selectedCategory,
			selectedTag,
			selectedRating,
			searchParams,
		]
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
			if (selectedRating)
				newParams.set('minRating', selectedRating.toString());
			newParams.delete('page'); // Reset to page 1

			const newSearch = newParams.toString();
			window.history.replaceState(
				{},
				'',
				newSearch ? `/search?${newSearch}` : '/search'
			);

			fetchProducts({
				q: searchQuery || undefined,
				category: category || undefined,
				tag: selectedTag || undefined,
				minRating: selectedRating,
				page: 1,
				city: userLocation?.city,
				state: userLocation?.state,
			});
		},
		[
			fetchProducts,
			searchQuery,
			selectedTag,
			selectedRating,
			searchParams,
			userLocation,
		]
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
			if (selectedRating)
				newParams.set('minRating', selectedRating.toString());
			newParams.delete('page'); // Reset to page 1

			const newSearch = newParams.toString();
			window.history.replaceState(
				{},
				'',
				newSearch ? `/search?${newSearch}` : '/search'
			);

			fetchProducts({
				q: searchQuery || undefined,
				category: selectedCategory || undefined,
				tag: tag || undefined,
				minRating: selectedRating,
				page: 1,
				city: userLocation?.city,
				state: userLocation?.state,
			});
		},
		[
			fetchProducts,
			searchQuery,
			selectedCategory,
			selectedRating,
			searchParams,
			userLocation,
		]
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
			if (selectedRating)
				newParams.set('minRating', selectedRating.toString());
			if (newPage > 1) {
				newParams.set('page', newPage.toString());
			} else {
				newParams.delete('page');
			}

			const newSearch = newParams.toString();
			window.history.replaceState(
				{},
				'',
				newSearch ? `/search?${newSearch}` : '/search'
			);

			// Call goToPage to fetch the new page
			goToPage(newPage);
		},
		[
			goToPage,
			searchQuery,
			selectedCategory,
			selectedTag,
			selectedRating,
			searchParams,
		]
	);

	return (
		<div className='home-screen search-page'>
			<section className='hero-section hero-compact'>
				<div className='hero-content'>
					<h1 className='hero-title'>
						Search <span className='highlight'>Products</span>
					</h1>

					<div className='hero-search'>
						<SearchBar
							initialValue={searchQuery}
							onSearch={handleSearch}
						/>
					</div>
				</div>
			</section>

			<main className='main-content'>
				<div className='content-layout'>
					<FilterSidebar
						categories={categories}
						selectedCategory={selectedCategory}
						selectedTag={selectedTag}
						selectedRating={selectedRating}
						onCategorySelect={handleCategorySelect}
						onTagSelect={handleTagSelect}
						onRatingChange={(rating) => {
							setSelectedRating(rating);
							// Update URL (reset to page 1)
							const newParams = new URLSearchParams(searchParams);
							if (searchQuery) newParams.set('q', searchQuery);
							if (selectedCategory)
								newParams.set('category', selectedCategory);
							if (selectedTag) newParams.set('tag', selectedTag);
							if (rating) {
								newParams.set('minRating', rating.toString());
							} else {
								newParams.delete('minRating');
							}
							newParams.delete('page'); // Reset to page 1

							const newSearch = newParams.toString();
							window.history.replaceState(
								{},
								'',
								newSearch ? `/search?${newSearch}` : '/search'
							);

							fetchProducts({
								q: searchQuery || undefined,
								category: selectedCategory || undefined,
								tag: selectedTag || undefined,
								minRating: rating,
								page: 1,
								city: userLocation?.city,
								state: userLocation?.state,
							});
						}}
						loading={categoriesLoading}
					/>

					<div className='products-section'>
						<div className='results-header'>
							<h2 className='results-title'>
								{searchQuery || selectedCategory
									? 'Search Results'
									: hasLocation
									? `Products in ${locationDisplay}`
									: 'All Products'}
							</h2>
							{!loading && (
								<span className='results-count'>
									{totalCount}{' '}
									{totalCount === 1 ? 'product' : 'products'}
								</span>
							)}
						</div>

						{hasLocation && (
							<div className='location-filter-banner'>
								<span className='location-icon'>📍</span>
								<span className='location-text'>
									Showing products available in{' '}
									<strong>{locationDisplay}</strong>
								</span>
								<button
									className='clear-location-btn'
									onClick={clearLocation}>
									Show all locations
								</button>
								{citySlug && (
									<Link
										to={`/cities/${citySlug}`}
										className='explore-city-link'>
										Explore {locationDisplay} →
									</Link>
								)}
							</div>
						)}

						{error && (
							<div className='error-banner'>
								<span className='error-icon'>⚠️</span>
								<span>{error}</span>
							</div>
						)}

						<ProductList
							products={products}
							loading={loading}
							showNearYou={hasLocation}
							emptyMessage={
								searchQuery ||
								selectedCategory ||
								selectedTag ||
								selectedRating
									? hasLocation
										? `No products found in ${locationDisplay} matching your filters`
										: `No products found matching your filters`
									: hasLocation
									? `No products available in ${locationDisplay}`
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
