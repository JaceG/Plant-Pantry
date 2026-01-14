import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, AdminBrand } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import './AdminBrands.css';

const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

export function AdminOfficialBrands() {
	const [officialBrands, setOfficialBrands] = useState<AdminBrand[]>([]);
	const [letterCounts, setLetterCounts] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedLetter, setSelectedLetter] = useState<string>('A');
	const [toast, setToast] = useState<{
		message: string;
		type: 'success' | 'error' | 'info';
	} | null>(null);

	// Search state
	const [searchQuery, setSearchQuery] = useState('');
	const prevSearchQueryRef = useRef<string>('');

	// Expanded official brands to show children
	const [expandedBrands, setExpandedBrands] = useState<Set<string>>(
		new Set()
	);

	// Create new official brand modal
	const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
	const [newBrandName, setNewBrandName] = useState('');
	const [createBrandLoading, setCreateBrandLoading] = useState(false);

	// Fetch brands
	const fetchBrands = useCallback(async () => {
		try {
			setLoading(true);
			const brandsRes = await adminApi.getBrands(
				searchQuery.trim()
					? { officialOnly: true }
					: { officialOnly: true, letter: selectedLetter }
			);

			setOfficialBrands(brandsRes.brands || brandsRes.officialBrands || []);
			setLetterCounts(brandsRes.letterCounts || {});
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to load brands'
			);
		} finally {
			setLoading(false);
		}
	}, [selectedLetter, searchQuery]);

	// Refetch when letter changes (only if search is empty)
	useEffect(() => {
		if (!searchQuery.trim()) {
			fetchBrands();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedLetter]);

	// Refetch when search transitions between empty and non-empty
	useEffect(() => {
		const searchWasEmpty = !prevSearchQueryRef.current.trim();
		const searchIsEmpty = !searchQuery.trim();
		const searchTransitioned =
			(searchWasEmpty && !searchIsEmpty) ||
			(!searchWasEmpty && searchIsEmpty);

		if (searchTransitioned || prevSearchQueryRef.current === '') {
			fetchBrands();
		}

		prevSearchQueryRef.current = searchQuery;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchQuery]);

	// Filter brands by search query
	const filteredOfficialBrands = officialBrands.filter(
		(brand) =>
			brand.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			brand.displayName.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Get unique key for a brand (use id if available, otherwise brandName)
	const getBrandKey = (brand: AdminBrand) => brand.id || brand.brandName;

	// Toggle official status (remove from official)
	const handleToggleOfficial = async (brand: AdminBrand) => {
		try {
			await adminApi.setBrandOfficial(
				brand.id,
				false,
				brand.id ? undefined : brand.brandName
			);
			setToast({
				message: `"${brand.displayName}" is no longer an official brand`,
				type: 'success',
			});
			fetchBrands();
		} catch (err) {
			setToast({
				message:
					err instanceof Error
						? err.message
						: 'Failed to update brand',
				type: 'error',
			});
		}
	};

	// Toggle expanded brand
	const toggleExpandBrand = (brandId: string) => {
		setExpandedBrands((prev) => {
			const next = new Set(prev);
			if (next.has(brandId)) {
				next.delete(brandId);
			} else {
				next.add(brandId);
			}
			return next;
		});
	};

	// Create new official brand from scratch
	const handleCreateBrand = async () => {
		if (!newBrandName.trim()) return;

		setCreateBrandLoading(true);
		try {
			await adminApi.createOfficialBrand(newBrandName.trim());
			setToast({
				message: `"${newBrandName}" created as an official brand`,
				type: 'success',
			});
			setShowCreateBrandModal(false);
			setNewBrandName('');
			fetchBrands();
		} catch (err) {
			setToast({
				message:
					err instanceof Error
						? err.message
						: 'Failed to create brand',
				type: 'error',
			});
		} finally {
			setCreateBrandLoading(false);
		}
	};

	// Calculate totals
	const totalOfficialBrands = Object.values(letterCounts).reduce(
		(sum, count) => sum + count,
		0
	);

	if (loading && officialBrands.length === 0) {
		return (
			<AdminLayout>
				<div className='admin-loading'>
					<div className='loading-spinner' />
					<span>Loading official brands...</span>
				</div>
			</AdminLayout>
		);
	}

	if (error) {
		return (
			<AdminLayout>
				<div className='admin-error'>
					<h2>Error</h2>
					<p>{error}</p>
					<Button onClick={fetchBrands}>Retry</Button>
				</div>
			</AdminLayout>
		);
	}

	return (
		<AdminLayout>
			<div className='admin-brands'>
				<header className='admin-header'>
					<div className='header-left'>
						<div className='breadcrumb'>
							<Link to='/admin/brands' className='breadcrumb-link'>
								Brands
							</Link>
							<span className='breadcrumb-separator'>›</span>
							<span className='breadcrumb-current'>Official Brands</span>
						</div>
						<h1>Official Brands</h1>
						<p className='header-subtitle'>
							Manage official brand pages and their sub-brands
						</p>
					</div>
					<div className='header-actions'>
						<Button
							variant='primary'
							onClick={() => setShowCreateBrandModal(true)}>
							+ Create Official Brand
						</Button>
					</div>
				</header>

				{/* Stats Row */}
				<div className='brands-stats'>
					<div className='stat-box official'>
						<span className='stat-value'>{totalOfficialBrands}</span>
						<span className='stat-label'>Official Brands</span>
					</div>
				</div>

				{/* Search */}
				<div className='brands-search'>
					<input
						type='text'
						className='search-input'
						placeholder='Search official brands...'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				{/* Letter Pagination */}
				{!searchQuery.trim() && (
					<div className='letter-pagination'>
						{LETTERS.map((letter) => (
							<button
								key={letter}
								className={`letter-tab ${
									selectedLetter === letter ? 'active' : ''
								} ${
									(letterCounts[letter] || 0) === 0
										? 'empty'
										: ''
								}`}
								onClick={() => setSelectedLetter(letter)}>
								<span className='letter-char'>{letter}</span>
								{(letterCounts[letter] || 0) > 0 && (
									<span className='letter-count'>
										{letterCounts[letter]}
									</span>
								)}
							</button>
						))}
					</div>
				)}

				{/* Official Brands List */}
				<section className='brands-section'>
					<div className='section-header'>
						<h2>
							{searchQuery.trim()
								? `Results (${filteredOfficialBrands.length})`
								: `${selectedLetter} (${letterCounts[selectedLetter] || 0})`}
						</h2>
					</div>

					<div className='brands-list'>
						{filteredOfficialBrands.length === 0 ? (
							<div className='empty-state'>
								<p>
									{searchQuery.trim()
										? `No official brands found matching "${searchQuery}"`
										: `No official brands starting with "${selectedLetter}"`}
								</p>
							</div>
						) : (
							filteredOfficialBrands.map((brand) => (
								<div
									key={getBrandKey(brand)}
									className='brand-row official'>
									<div className='brand-checkbox' />

									<div className='brand-info'>
										<div className='brand-name-row'>
											{brand.id && (
												<button
													className='expand-btn'
													onClick={() =>
														toggleExpandBrand(
															brand.id!
														)
													}>
													{expandedBrands.has(
														brand.id
													)
														? '▼'
														: '▶'}
												</button>
											)}
											<Link
												to={`/brands/${encodeURIComponent(
													brand.brandName
												)}`}
												className='brand-display-name brand-link'>
												{brand.displayName}
											</Link>
											<span className='product-count'>
												{brand.productCount} product
												{brand.productCount !== 1
													? 's'
													: ''}
											</span>
											{brand.childCount > 0 && (
												<>
													<span className='product-count total-count'>
														{brand.totalProductCount}{' '}
														total
													</span>
													<span className='child-count'>
														+{brand.childCount}{' '}
														sub-brand
														{brand.childCount !== 1
															? 's'
															: ''}
													</span>
												</>
											)}
										</div>
										{brand.brandName !== brand.displayName && (
											<span className='brand-name-raw'>
												DB: {brand.brandName}
											</span>
										)}
									</div>

									<div className='brand-actions'>
										<Button
											variant='secondary'
											size='sm'
											className='btn-danger'
											onClick={() =>
												handleToggleOfficial(brand)
											}>
											Remove Official
										</Button>
									</div>

									{/* Expanded children */}
									{brand.id && expandedBrands.has(brand.id) && (
										<div className='brand-children'>
											{brand.childCount === 0 ? (
												<p className='no-children'>
													No sub-brands assigned yet
												</p>
											) : (
												<ChildBrandsList
													parentId={brand.id}
													onUnassign={fetchBrands}
													setToast={setToast}
												/>
											)}
										</div>
									)}
								</div>
							))
						)}
					</div>
				</section>

				{/* Create Official Brand Modal */}
				{showCreateBrandModal && (
					<div
						className='modal-overlay'
						onClick={() => setShowCreateBrandModal(false)}>
						<div
							className='modal-content'
							onClick={(e) => e.stopPropagation()}>
							<h3>Create New Official Brand</h3>
							<p className='modal-description'>
								Create a brand that doesn't currently exist in
								the product database. This is useful for parent
								brands like "Amazon" to group sub-brands.
							</p>

							<input
								type='text'
								className='brand-name-input'
								placeholder='Enter brand name (e.g. Amazon)'
								value={newBrandName}
								onChange={(e) => setNewBrandName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && newBrandName.trim()) {
										handleCreateBrand();
									}
								}}
								autoFocus
							/>

							<div className='modal-actions'>
								<Button
									variant='secondary'
									onClick={() => {
										setShowCreateBrandModal(false);
										setNewBrandName('');
									}}>
									Cancel
								</Button>
								<Button
									variant='primary'
									onClick={handleCreateBrand}
									disabled={
										createBrandLoading || !newBrandName.trim()
									}>
									{createBrandLoading
										? 'Creating...'
										: 'Create Official Brand'}
								</Button>
							</div>
						</div>
					</div>
				)}

				{toast && (
					<Toast
						message={toast.message}
						type={toast.type}
						onClose={() => setToast(null)}
					/>
				)}
			</div>
		</AdminLayout>
	);
}

// Sub-component to load and display child brands
function ChildBrandsList({
	parentId,
	onUnassign,
	setToast,
}: {
	parentId: string;
	onUnassign: () => void;
	setToast: (toast: {
		message: string;
		type: 'success' | 'error' | 'info';
	}) => void;
}) {
	const [children, setChildren] = useState<AdminBrand[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchChildren = async () => {
			try {
				const result = await adminApi.getBrandChildren(parentId);
				setChildren(result.children);
			} catch (err) {
				console.error('Failed to load children:', err);
			} finally {
				setLoading(false);
			}
		};
		fetchChildren();
	}, [parentId]);

	const handleUnassign = async (childId: string, childName: string) => {
		try {
			await adminApi.assignBrandParent(childId, null);
			setToast({
				message: `"${childName}" unassigned from official brand`,
				type: 'success',
			});
			onUnassign();
		} catch (err) {
			setToast({
				message:
					err instanceof Error
						? err.message
						: 'Failed to unassign brand',
				type: 'error',
			});
		}
	};

	if (loading) {
		return <p className='loading-children'>Loading sub-brands...</p>;
	}

	return (
		<ul className='children-list'>
			{children.map((child) => (
				<li key={child.id || child.brandName} className='child-item'>
					<div className='child-info'>
						<span className='child-name'>{child.displayName}</span>
						<span className='child-product-count'>
							{child.productCount} product
							{child.productCount !== 1 ? 's' : ''}
						</span>
					</div>
					{child.id && (
						<button
							className='unassign-btn'
							onClick={() =>
								handleUnassign(child.id!, child.displayName)
							}>
							Unassign
						</button>
					)}
				</li>
			))}
		</ul>
	);
}
