import { useState, useMemo } from 'react';
import { RatingFilter } from '../Reviews';
import './FilterSidebar.css';

interface FilterSidebarProps {
	categories: string[];
	selectedCategory: string | null;
	selectedTag: string | null;
	selectedRating?: number;
	onCategorySelect: (category: string | null) => void;
	onTagSelect: (tag: string | null) => void;
	onRatingChange: (rating: number | undefined) => void;
	loading?: boolean;
}

// Clean category name to readable English
function cleanCategoryName(category: string): string {
	// Remove "en:" prefix and replace dashes with spaces
	let cleaned = category.replace(/^en:/, '').replace(/-/g, ' ');

	// Capitalize words
	cleaned = cleaned
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

	return cleaned;
}

// Most useful tags (shown first)
const PRIORITY_TAGS = [
	{ value: 'organic', label: 'Organic' },
	{ value: 'gluten-free', label: 'Gluten Free' },
];

// Other tags (shown after priority)
const OTHER_TAGS = [
	{ value: 'no-sugar-added', label: 'No Sugar Added' },
	{ value: 'fair-trade', label: 'Fair Trade' },
	{ value: 'palm-oil-free', label: 'Palm Oil Free' },
	{ value: 'raw', label: 'Raw' },
];

// Organize and clean categories into groups with priority sorting
function organizeCategories(
	categories: string[]
): Record<string, Array<{ original: string; display: string }>> {
	const organized: Record<
		string,
		Array<{ original: string; display: string }>
	> = {
		'Food & Snacks': [],
		Beverages: [],
		'Dairy Alternatives': [],
		'Pantry Staples': [],
		Other: [],
	};

	// Priority categories (most common/useful) - shown first
	const priorityKeywords: Record<string, string[]> = {
		'Food & Snacks': [
			'snack',
			'cereal',
			'bar',
			'cracker',
			'chip',
			'cookie',
		],
		Beverages: ['beverage', 'drink', 'juice', 'tea', 'coffee', 'soda'],
		'Dairy Alternatives': [
			'milk',
			'cheese',
			'yogurt',
			'cream',
			'butter',
			'alternative',
		],
		'Pantry Staples': [
			'grain',
			'pasta',
			'rice',
			'flour',
			'spice',
			'oil',
			'sauce',
			'bean',
		],
	};

	categories.forEach((category) => {
		const lower = category.toLowerCase();
		const display = cleanCategoryName(category);

		let assigned = false;

		// Check priority categories first
		for (const [section, keywords] of Object.entries(priorityKeywords)) {
			if (keywords.some((keyword) => lower.includes(keyword))) {
				organized[section].push({ original: category, display });
				assigned = true;
				break;
			}
		}

		// If not assigned, check other patterns
		if (!assigned) {
			if (
				lower.includes('beverage') ||
				lower.includes('drink') ||
				lower.includes('juice') ||
				lower.includes('tea') ||
				lower.includes('coffee')
			) {
				organized['Beverages'].push({ original: category, display });
			} else if (
				lower.includes('milk') ||
				lower.includes('cheese') ||
				lower.includes('yogurt') ||
				lower.includes('cream') ||
				lower.includes('butter')
			) {
				organized['Dairy Alternatives'].push({
					original: category,
					display,
				});
			} else if (
				lower.includes('grain') ||
				lower.includes('pasta') ||
				lower.includes('rice') ||
				lower.includes('flour') ||
				lower.includes('spice') ||
				lower.includes('oil') ||
				lower.includes('sauce')
			) {
				organized['Pantry Staples'].push({
					original: category,
					display,
				});
			} else if (
				lower.includes('food') ||
				lower.includes('snack') ||
				lower.includes('cereal') ||
				lower.includes('bar') ||
				lower.includes('cracker')
			) {
				organized['Food & Snacks'].push({
					original: category,
					display,
				});
			} else {
				organized['Other'].push({ original: category, display });
			}
		}
	});

	// Sort each section: priority items first (by keyword match), then alphabetically
	Object.keys(organized).forEach((section) => {
		const keywords = priorityKeywords[section] || [];
		organized[section].sort((a, b) => {
			const aLower = a.original.toLowerCase();
			const bLower = b.original.toLowerCase();

			// Check if either matches priority keywords
			const aPriority = keywords.some((kw) => aLower.includes(kw));
			const bPriority = keywords.some((kw) => bLower.includes(kw));

			if (aPriority && !bPriority) return -1;
			if (!aPriority && bPriority) return 1;

			// Both same priority, sort alphabetically
			return a.display.localeCompare(b.display);
		});
	});

	// Remove empty sections
	Object.keys(organized).forEach((key) => {
		if (organized[key].length === 0) {
			delete organized[key];
		}
	});

	return organized;
}

// Component for expandable filter list
function ExpandableFilterList({
	items,
	selectedValue,
	onSelect,
	initialShow = 10,
}: {
	items: Array<{ value: string; label: string }>;
	selectedValue: string | null;
	onSelect: (value: string | null) => void;
	initialShow?: number;
}) {
	const [showCount, setShowCount] = useState(initialShow);
	const visibleItems = items.slice(0, showCount);
	const hasMore = items.length > showCount;

	return (
		<>
			<div className='filter-options'>
				{visibleItems.map((item) => (
					<button
						key={item.value}
						className={`filter-option ${
							selectedValue === item.value ? 'active' : ''
						}`}
						onClick={() =>
							onSelect(
								selectedValue === item.value ? null : item.value
							)
						}>
						{item.label}
					</button>
				))}
			</div>
			{hasMore && (
				<button
					className='filter-show-more'
					onClick={() =>
						setShowCount((prev) =>
							Math.min(prev + 10, items.length)
						)
					}>
					Show {Math.min(10, items.length - showCount)} more
				</button>
			)}
		</>
	);
}

export function FilterSidebar({
	categories,
	selectedCategory,
	selectedTag,
	selectedRating,
	onCategorySelect,
	onTagSelect,
	onRatingChange,
	loading,
}: FilterSidebarProps) {
	const [isOpen, setIsOpen] = useState(false);
	const organizedCategories = useMemo(
		() => organizeCategories(categories),
		[categories]
	);

	if (loading) {
		return (
			<div className='filter-sidebar loading'>
				<div className='filter-skeleton' />
				<div className='filter-skeleton' />
				<div className='filter-skeleton' />
			</div>
		);
	}

	return (
		<>
			{/* Mobile toggle button */}
			<button
				className='filter-toggle'
				onClick={() => setIsOpen(!isOpen)}
				aria-label='Toggle filters'>
				<svg
					width='20'
					height='20'
					viewBox='0 0 24 24'
					fill='none'
					stroke='currentColor'
					strokeWidth='2'>
					<path d='M3 6h18M7 12h10M11 18h2' />
				</svg>
				Filters
				{selectedCategory || selectedTag || selectedRating ? (
					<span className='filter-badge'>
						{(selectedCategory ? 1 : 0) +
							(selectedTag ? 1 : 0) +
							(selectedRating ? 1 : 0)}
					</span>
				) : null}
			</button>

			{/* Filter sidebar */}
			<aside className={`filter-sidebar ${isOpen ? 'open' : ''}`}>
				<div className='filter-header'>
					<h2 className='filter-title'>Filters</h2>
					<button
						className='filter-close'
						onClick={() => setIsOpen(false)}
						aria-label='Close filters'>
						<svg
							width='20'
							height='20'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'>
							<path d='M18 6L6 18M6 6l12 12' />
						</svg>
					</button>
				</div>

				<div className='filter-content'>
					{/* Clear all button */}
					{(selectedCategory || selectedTag || selectedRating) && (
						<button
							className='filter-clear-all'
							onClick={() => {
								onCategorySelect(null);
								onTagSelect(null);
								onRatingChange(undefined);
							}}>
							Clear all filters
						</button>
					)}

					{/* Rating Filter Section */}
					<div className='filter-section'>
						<RatingFilter
							selectedRating={selectedRating}
							onRatingChange={onRatingChange}
						/>
					</div>

					{/* Dietary & Labels Section */}
					<div className='filter-section'>
						<h3 className='filter-section-title'>
							Dietary & Labels
						</h3>
						<div className='filter-options'>
							<button
								className={`filter-option ${
									selectedTag === null ? 'active' : ''
								}`}
								onClick={() => onTagSelect(null)}>
								All
							</button>
						</div>
						<ExpandableFilterList
							items={[...PRIORITY_TAGS, ...OTHER_TAGS]}
							selectedValue={selectedTag}
							onSelect={onTagSelect}
							initialShow={10}
						/>
					</div>

					{/* Categories Section */}
					<div className='filter-section'>
						<h3 className='filter-section-title'>Categories</h3>
						<div className='filter-options'>
							<button
								className={`filter-option ${
									selectedCategory === null ? 'active' : ''
								}`}
								onClick={() => onCategorySelect(null)}>
								All Categories
							</button>
						</div>

						{Object.entries(organizedCategories).map(
							([sectionName, sectionCategories]) => (
								<div
									key={sectionName}
									className='filter-subsection'>
									<h4 className='filter-subsection-title'>
										{sectionName}
									</h4>
									<ExpandableFilterList
										items={sectionCategories.map((cat) => ({
											value: cat.original,
											label: cat.display,
										}))}
										selectedValue={selectedCategory}
										onSelect={onCategorySelect}
										initialShow={10}
									/>
								</div>
							)
						)}
					</div>
				</div>
			</aside>

			{/* Overlay for mobile */}
			{isOpen && (
				<div
					className='filter-overlay'
					onClick={() => setIsOpen(false)}
				/>
			)}
		</>
	);
}
