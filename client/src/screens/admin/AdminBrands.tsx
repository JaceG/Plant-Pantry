import { useState, useEffect, useCallback } from 'react';
import { adminApi, AdminBrand, BrandRef } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import './AdminBrands.css';

type ViewMode = 'all' | 'official' | 'unassigned';

export function AdminBrands() {
	const [brands, setBrands] = useState<AdminBrand[]>([]);
	const [officialBrands, setOfficialBrands] = useState<BrandRef[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('all');
	const [toast, setToast] = useState<{
		message: string;
		type: 'success' | 'error';
	} | null>(null);

	// Search state
	const [searchQuery, setSearchQuery] = useState('');

	// Selected brands for bulk assignment
	const [selectedBrandIds, setSelectedBrandIds] = useState<Set<string>>(
		new Set()
	);
	const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
	const [bulkAssignParentId, setBulkAssignParentId] = useState('');
	const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

	// Single brand assignment modal
	const [assigningBrand, setAssigningBrand] = useState<AdminBrand | null>(
		null
	);
	const [assignParentId, setAssignParentId] = useState('');
	const [assignLoading, setAssignLoading] = useState(false);

	// Expanded official brands to show children
	const [expandedBrands, setExpandedBrands] = useState<Set<string>>(
		new Set()
	);

	// Fetch brands
	const fetchBrands = useCallback(async () => {
		try {
			setLoading(true);
			const [brandsRes, officialRes] = await Promise.all([
				adminApi.getBrands({
					officialOnly: viewMode === 'official',
					unassignedOnly: viewMode === 'unassigned',
				}),
				adminApi.getOfficialBrands(),
			]);
			setBrands(brandsRes.brands);
			setOfficialBrands(officialRes.brands);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to load brands'
			);
		} finally {
			setLoading(false);
		}
	}, [viewMode]);

	useEffect(() => {
		fetchBrands();
	}, [fetchBrands]);

	// Filter brands by search query
	const filteredBrands = brands.filter(
		(brand) =>
			brand.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			brand.displayName.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Get unique key for a brand (use id if available, otherwise brandName)
	const getBrandKey = (brand: AdminBrand) => brand.id || brand.brandName;

	// Toggle brand selection
	const toggleBrandSelection = (brand: AdminBrand) => {
		const key = getBrandKey(brand);
		setSelectedBrandIds((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	// Select all unassigned (non-official) brands
	const selectAllUnassigned = () => {
		const unassigned = filteredBrands.filter(
			(b) => !b.isOfficial && !b.parentBrand
		);
		setSelectedBrandIds(new Set(unassigned.map((b) => getBrandKey(b))));
	};

	// Clear selection
	const clearSelection = () => {
		setSelectedBrandIds(new Set());
	};

	// Toggle official status
	const handleToggleOfficial = async (brand: AdminBrand) => {
		try {
			// Pass brandName if brand has no BrandPage yet (id is null)
			await adminApi.setBrandOfficial(
				brand.id,
				!brand.isOfficial,
				brand.id ? undefined : brand.brandName
			);
			setToast({
				message: brand.isOfficial
					? `"${brand.displayName}" is no longer an official brand`
					: `"${brand.displayName}" is now an official brand`,
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

	// Open assign parent modal
	const openAssignModal = (brand: AdminBrand) => {
		setAssigningBrand(brand);
		setAssignParentId(brand.parentBrand?.id || '');
	};

	// Assign parent brand
	const handleAssignParent = async () => {
		if (!assigningBrand) return;

		setAssignLoading(true);
		try {
			// Pass brandName if brand has no BrandPage yet (id is null)
			await adminApi.assignBrandParent(
				assigningBrand.id,
				assignParentId || null,
				assigningBrand.id ? undefined : assigningBrand.brandName
			);
			setToast({
				message: assignParentId
					? `"${assigningBrand.displayName}" assigned to parent brand`
					: `"${assigningBrand.displayName}" unassigned from parent`,
				type: 'success',
			});
			setAssigningBrand(null);
			fetchBrands();
		} catch (err) {
			setToast({
				message:
					err instanceof Error
						? err.message
						: 'Failed to assign brand',
				type: 'error',
			});
		} finally {
			setAssignLoading(false);
		}
	};

	// Bulk assign brands
	const handleBulkAssign = async () => {
		if (!bulkAssignParentId || selectedBrandIds.size === 0) return;

		setBulkAssignLoading(true);
		try {
			const result = await adminApi.bulkAssignBrandChildren(
				bulkAssignParentId,
				Array.from(selectedBrandIds)
			);
			setToast({
				message: result.message,
				type: 'success',
			});
			setShowBulkAssignModal(false);
			setSelectedBrandIds(new Set());
			setBulkAssignParentId('');
			fetchBrands();
		} catch (err) {
			setToast({
				message:
					err instanceof Error
						? err.message
						: 'Failed to assign brands',
				type: 'error',
			});
		} finally {
			setBulkAssignLoading(false);
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

	// Get unassigned brands count
	const unassignedCount = brands.filter(
		(b) => !b.isOfficial && !b.parentBrand
	).length;

	if (loading && brands.length === 0) {
		return (
			<AdminLayout>
				<div className='admin-loading'>
					<div className='loading-spinner' />
					<span>Loading brands...</span>
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
						<h1>Brand Management</h1>
						<p className='header-subtitle'>
							Consolidate brand variations under official brands
						</p>
					</div>
				</header>

				{/* Stats Row */}
				<div className='brands-stats'>
					<div className='stat-box'>
						<span className='stat-value'>{brands.length}</span>
						<span className='stat-label'>Total Brands</span>
					</div>
					<div className='stat-box official'>
						<span className='stat-value'>
							{brands.filter((b) => b.isOfficial).length}
						</span>
						<span className='stat-label'>Official Brands</span>
					</div>
					<div className='stat-box warning'>
						<span className='stat-value'>{unassignedCount}</span>
						<span className='stat-label'>Unassigned</span>
					</div>
				</div>

				{/* Toolbar */}
				<div className='brands-toolbar'>
					<div className='toolbar-left'>
						<div className='view-tabs'>
							<button
								className={`view-tab ${
									viewMode === 'all' ? 'active' : ''
								}`}
								onClick={() => setViewMode('all')}>
								All Brands
							</button>
							<button
								className={`view-tab ${
									viewMode === 'official' ? 'active' : ''
								}`}
								onClick={() => setViewMode('official')}>
								Official Only
							</button>
							<button
								className={`view-tab ${
									viewMode === 'unassigned' ? 'active' : ''
								}`}
								onClick={() => setViewMode('unassigned')}>
								Unassigned ({unassignedCount})
							</button>
						</div>

						<input
							type='text'
							className='search-input'
							placeholder='Search brands...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					<div className='toolbar-right'>
						{selectedBrandIds.size > 0 && (
							<>
								<span className='selection-count'>
									{selectedBrandIds.size} selected
								</span>
								<Button
									variant='secondary'
									size='sm'
									onClick={clearSelection}>
									Clear
								</Button>
								<Button
									variant='primary'
									size='sm'
									onClick={() =>
										setShowBulkAssignModal(true)
									}>
									Assign to Official Brand
								</Button>
							</>
						)}
						{selectedBrandIds.size === 0 &&
							viewMode === 'unassigned' && (
								<Button
									variant='secondary'
									size='sm'
									onClick={selectAllUnassigned}>
									Select All
								</Button>
							)}
					</div>
				</div>

				{/* Brands List */}
				<div className='brands-list'>
					{filteredBrands.length === 0 ? (
						<div className='empty-state'>
							<p>No brands found</p>
						</div>
					) : (
						filteredBrands.map((brand) => (
							<div
								key={getBrandKey(brand)}
								className={`brand-row ${
									brand.isOfficial ? 'official' : ''
								} ${
									selectedBrandIds.has(getBrandKey(brand))
										? 'selected'
										: ''
								}`}>
								<div className='brand-checkbox'>
									{!brand.isOfficial && (
										<input
											type='checkbox'
											checked={selectedBrandIds.has(
												getBrandKey(brand)
											)}
											onChange={() =>
												toggleBrandSelection(brand)
											}
										/>
									)}
								</div>

								<div className='brand-info'>
									<div className='brand-name-row'>
										{brand.isOfficial && brand.id && (
											<button
												className='expand-btn'
												onClick={() =>
													toggleExpandBrand(brand.id!)
												}>
												{expandedBrands.has(brand.id)
													? '▼'
													: '▶'}
											</button>
										)}
										<span className='brand-display-name'>
											{brand.displayName}
										</span>
										{brand.isOfficial && (
											<span className='official-badge'>
												Official
											</span>
										)}
										{!brand.hasPage && (
											<span className='no-page-badge'>
												No page
											</span>
										)}
										{brand.childCount > 0 && (
											<span className='child-count'>
												+{brand.childCount} sub-brand
												{brand.childCount !== 1
													? 's'
													: ''}
											</span>
										)}
									</div>
									{brand.brandName !== brand.displayName && (
										<span className='brand-name-raw'>
											DB: {brand.brandName}
										</span>
									)}
									{brand.parentBrand && (
										<span className='parent-info'>
											→ Part of{' '}
											<strong>
												{brand.parentBrand.displayName}
											</strong>
										</span>
									)}
								</div>

								<div className='brand-actions'>
									{!brand.isOfficial && (
										<Button
											variant='secondary'
											size='sm'
											onClick={() =>
												openAssignModal(brand)
											}>
											{brand.parentBrand
												? 'Change'
												: 'Assign'}
										</Button>
									)}
								<Button
									variant={
										brand.isOfficial
											? 'secondary'
											: 'primary'
									}
									size='sm'
									className={brand.isOfficial ? 'btn-danger' : ''}
									onClick={() =>
										handleToggleOfficial(brand)
									}>
									{brand.isOfficial
										? 'Remove Official'
										: 'Make Official'}
								</Button>
								</div>

								{/* Expanded children */}
								{brand.isOfficial &&
									brand.id &&
									expandedBrands.has(brand.id) && (
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

				{/* Assign Parent Modal */}
				{assigningBrand && (
					<div
						className='modal-overlay'
						onClick={() => setAssigningBrand(null)}>
						<div
							className='modal-content'
							onClick={(e) => e.stopPropagation()}>
							<h3>
								Assign "{assigningBrand.displayName}" to
								Official Brand
							</h3>
							<p className='modal-description'>
								Products from this brand will appear on the
								official brand's page.
							</p>

							<select
								value={assignParentId}
								onChange={(e) =>
									setAssignParentId(e.target.value)
								}
								className='parent-select'>
								<option value=''>
									-- No parent (unassign) --
								</option>
								{officialBrands
									.filter((ob) => ob.id !== assigningBrand.id)
									.map((ob) => (
										<option key={ob.id} value={ob.id}>
											{ob.displayName}
										</option>
									))}
							</select>

							<div className='modal-actions'>
								<Button
									variant='secondary'
									onClick={() => setAssigningBrand(null)}>
									Cancel
								</Button>
								<Button
									variant='primary'
									onClick={handleAssignParent}
									disabled={assignLoading}>
									{assignLoading ? 'Saving...' : 'Save'}
								</Button>
							</div>
						</div>
					</div>
				)}

				{/* Bulk Assign Modal */}
				{showBulkAssignModal && (
					<div
						className='modal-overlay'
						onClick={() => setShowBulkAssignModal(false)}>
						<div
							className='modal-content'
							onClick={(e) => e.stopPropagation()}>
							<h3>
								Assign {selectedBrandIds.size} Brand
								{selectedBrandIds.size !== 1 ? 's' : ''} to
								Official Brand
							</h3>
							<p className='modal-description'>
								All selected brands will be linked to the chosen
								official brand. Their products will appear on
								the official brand's page.
							</p>

							<select
								value={bulkAssignParentId}
								onChange={(e) =>
									setBulkAssignParentId(e.target.value)
								}
								className='parent-select'>
								<option value=''>
									-- Select official brand --
								</option>
								{officialBrands.map((ob) => (
									<option key={ob.id} value={ob.id}>
										{ob.displayName}
									</option>
								))}
							</select>

							<div className='modal-actions'>
								<Button
									variant='secondary'
									onClick={() =>
										setShowBulkAssignModal(false)
									}>
									Cancel
								</Button>
								<Button
									variant='primary'
									onClick={handleBulkAssign}
									disabled={
										bulkAssignLoading || !bulkAssignParentId
									}>
									{bulkAssignLoading
										? 'Assigning...'
										: 'Assign'}
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
	setToast: (toast: { message: string; type: 'success' | 'error' }) => void;
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
				<span className='child-name'>{child.displayName}</span>
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
