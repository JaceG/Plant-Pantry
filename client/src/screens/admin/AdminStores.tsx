import { useState, useEffect, useCallback, useMemo } from 'react';
import {
	adminApi,
	AdminStore,
	AdminStoreChain,
	StoresGroupedResponse,
	PendingStore,
} from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import './AdminStores.css';

type StoreFilter =
	| 'all'
	| 'brick_and_mortar'
	| 'online_retailer'
	| 'brand_direct';

type ViewMode = 'list' | 'grouped' | 'pending';

type SortField = 'name' | 'regionOrScope' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface EditStoreData {
	name: string;
	type: 'brick_and_mortar' | 'online_retailer' | 'brand_direct';
	regionOrScope: string;
	websiteUrl: string;
	address: string;
	city: string;
	state: string;
	zipCode: string;
	phoneNumber: string;
	chainId: string;
	locationIdentifier: string;
}

interface ChainFormData {
	name: string;
	slug: string;
	websiteUrl: string;
	logoUrl: string;
	type: 'national' | 'regional' | 'local';
}

export function AdminStores() {
	const [stores, setStores] = useState<AdminStore[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [filter, setFilter] = useState<StoreFilter>('all');
	const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
	const [toast, setToast] = useState<{
		message: string;
		type: 'success' | 'error';
	} | null>(null);

	// View mode state
	const [viewMode, setViewMode] = useState<ViewMode>('list');
	const [groupedData, setGroupedData] =
		useState<StoresGroupedResponse | null>(null);
	const [expandedChains, setExpandedChains] = useState<Set<string>>(
		new Set()
	);

	// Chains state
	const [chains, setChains] = useState<AdminStoreChain[]>([]);

	// Pending stores state
	const [pendingStores, setPendingStores] = useState<PendingStore[]>([]);
	const [pendingTotal, setPendingTotal] = useState(0);
	const [pendingPage, setPendingPage] = useState(1);
	const [moderatingStoreId, setModeratingStoreId] = useState<string | null>(
		null
	);

	// Sorting state
	const [sortField, setSortField] = useState<SortField>('name');
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

	// Edit modal state
	const [editingStore, setEditingStore] = useState<AdminStore | null>(null);
	const [editForm, setEditForm] = useState<EditStoreData>({
		name: '',
		type: 'brick_and_mortar',
		regionOrScope: '',
		websiteUrl: '',
		address: '',
		city: '',
		state: '',
		zipCode: '',
		phoneNumber: '',
		chainId: '',
		locationIdentifier: '',
	});
	const [saveLoading, setSaveLoading] = useState(false);

	// Bulk selection state
	const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(
		new Set()
	);
	const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
	const [bulkAssignChainId, setBulkAssignChainId] = useState('');
	const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

	// Chain modal state
	const [showChainModal, setShowChainModal] = useState(false);
	const [editingChain, setEditingChain] = useState<AdminStoreChain | null>(
		null
	);
	const [chainForm, setChainForm] = useState<ChainFormData>({
		name: '',
		slug: '',
		websiteUrl: '',
		logoUrl: '',
		type: 'regional',
	});
	const [chainSaveLoading, setChainSaveLoading] = useState(false);

	// Sort stores
	const sortedStores = useMemo(() => {
		return [...stores].sort((a, b) => {
			let comparison = 0;

			if (sortField === 'name') {
				comparison = a.name.localeCompare(b.name);
			} else if (sortField === 'regionOrScope') {
				comparison = (a.regionOrScope || '').localeCompare(
					b.regionOrScope || ''
				);
			} else if (sortField === 'createdAt') {
				comparison =
					new Date(a.createdAt).getTime() -
					new Date(b.createdAt).getTime();
			}

			return sortDirection === 'asc' ? comparison : -comparison;
		});
	}, [stores, sortField, sortDirection]);

	// Handle sort click
	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortField(field);
			setSortDirection('asc');
		}
	};

	// Get sort indicator
	const getSortIndicator = (field: SortField) => {
		if (sortField !== field) return '↕️';
		return sortDirection === 'asc' ? '↑' : '↓';
	};

	// Fetch chains
	const fetchChains = useCallback(async () => {
		try {
			const response = await adminApi.getChains(true);
			setChains(response.chains);
		} catch (err) {
			console.error('Failed to load chains:', err);
		}
	}, []);

	// Fetch stores (list view)
	const fetchStores = useCallback(async () => {
		try {
			setLoading(true);
			const response = await adminApi.getStores(
				page,
				20,
				filter === 'all' ? undefined : filter
			);
			setStores(response.items);
			setTotal(response.total);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to load stores'
			);
		} finally {
			setLoading(false);
		}
	}, [page, filter]);

	// Fetch grouped data
	const fetchGroupedStores = useCallback(async () => {
		try {
			setLoading(true);
			const response = await adminApi.getStoresGrouped();
			setGroupedData(response);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to load stores'
			);
		} finally {
			setLoading(false);
		}
	}, []);

	// Fetch pending stores
	const fetchPendingStores = useCallback(async () => {
		try {
			setLoading(true);
			const response = await adminApi.getPendingStores(pendingPage, 20);
			setPendingStores(response.items);
			setPendingTotal(response.total);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to load pending stores'
			);
		} finally {
			setLoading(false);
		}
	}, [pendingPage]);

	// Handle approve store
	const handleApproveStore = async (storeId: string) => {
		setModeratingStoreId(storeId);
		try {
			await adminApi.approveStore(storeId);
			setPendingStores(pendingStores.filter((s) => s.id !== storeId));
			setPendingTotal((prev) => prev - 1);
			setToast({
				message: 'Store approved successfully',
				type: 'success',
			});
		} catch (err) {
			setToast({ message: 'Failed to approve store', type: 'error' });
		} finally {
			setModeratingStoreId(null);
		}
	};

	// Handle reject store
	const handleRejectStore = async (storeId: string) => {
		if (!window.confirm('Are you sure you want to reject this store?'))
			return;

		setModeratingStoreId(storeId);
		try {
			await adminApi.rejectStore(storeId);
			setPendingStores(pendingStores.filter((s) => s.id !== storeId));
			setPendingTotal((prev) => prev - 1);
			setToast({ message: 'Store rejected', type: 'success' });
		} catch (err) {
			setToast({ message: 'Failed to reject store', type: 'error' });
		} finally {
			setModeratingStoreId(null);
		}
	};

	useEffect(() => {
		fetchChains();
	}, [fetchChains]);

	useEffect(() => {
		if (viewMode === 'pending') {
			fetchPendingStores();
		} else if (viewMode === 'list') {
			fetchStores();
		} else {
			fetchGroupedStores();
		}
	}, [viewMode, fetchStores, fetchGroupedStores, fetchPendingStores]);

	// Also fetch pending count on initial load to show badge
	useEffect(() => {
		const fetchPendingCount = async () => {
			try {
				const response = await adminApi.getPendingStores(1, 1);
				setPendingTotal(response.total);
			} catch (err) {
				// Silently fail - not critical
			}
		};
		fetchPendingCount();
	}, []);

	const handleDelete = async (storeId: string, storeName: string) => {
		if (
			!window.confirm(
				`Are you sure you want to delete "${storeName}"? This will also remove all associated availability data.`
			)
		) {
			return;
		}

		setDeleteLoading(storeId);
		try {
			await adminApi.deleteStore(storeId);
			if (viewMode === 'list') {
				setStores(stores.filter((s) => s.id !== storeId));
				setTotal(total - 1);
			} else {
				fetchGroupedStores();
			}
			setToast({
				message: 'Store deleted successfully',
				type: 'success',
			});
		} catch (err) {
			setToast({ message: 'Failed to delete store', type: 'error' });
		} finally {
			setDeleteLoading(null);
		}
	};

	const handleEdit = (store: AdminStore) => {
		setEditingStore(store);
		setEditForm({
			name: store.name,
			type: store.type as
				| 'brick_and_mortar'
				| 'online_retailer'
				| 'brand_direct',
			regionOrScope: store.regionOrScope || '',
			websiteUrl: store.websiteUrl || '',
			address: store.address || '',
			city: store.city || '',
			state: store.state || '',
			zipCode: store.zipCode || '',
			phoneNumber: store.phoneNumber || '',
			chainId: store.chainId || '',
			locationIdentifier: store.locationIdentifier || '',
		});
	};

	const handleEditFormChange = (
		field: keyof EditStoreData,
		value: string
	) => {
		setEditForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleSaveEdit = async () => {
		if (!editingStore) return;

		setSaveLoading(true);
		try {
			const response = await adminApi.updateStore(editingStore.id, {
				...editForm,
				chainId: editForm.chainId || null,
			});
			if (viewMode === 'list') {
				setStores(
					stores.map((s) =>
						s.id === editingStore.id
							? { ...s, ...response.store }
							: s
					)
				);
			} else {
				fetchGroupedStores();
			}
			fetchChains(); // Refresh chain counts
			setEditingStore(null);
			setToast({
				message: 'Store updated successfully',
				type: 'success',
			});
		} catch (err) {
			setToast({ message: 'Failed to update store', type: 'error' });
		} finally {
			setSaveLoading(false);
		}
	};

	const handleCancelEdit = () => {
		setEditingStore(null);
	};

	// Chain management
	const handleCreateChain = () => {
		setEditingChain(null);
		setChainForm({
			name: '',
			slug: '',
			websiteUrl: '',
			logoUrl: '',
			type: 'regional',
		});
		setShowChainModal(true);
	};

	const handleEditChain = (chain: AdminStoreChain) => {
		setEditingChain(chain);
		setChainForm({
			name: chain.name,
			slug: chain.slug,
			websiteUrl: chain.websiteUrl || '',
			logoUrl: chain.logoUrl || '',
			type: chain.type,
		});
		setShowChainModal(true);
	};

	const handleChainFormChange = (
		field: keyof ChainFormData,
		value: string
	) => {
		setChainForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleSaveChain = async () => {
		setChainSaveLoading(true);
		try {
			if (editingChain) {
				await adminApi.updateChain(editingChain.id, chainForm);
				setToast({
					message: 'Chain updated successfully',
					type: 'success',
				});
			} else {
				await adminApi.createChain(chainForm);
				setToast({
					message: 'Chain created successfully',
					type: 'success',
				});
			}
			fetchChains();
			if (viewMode === 'grouped') {
				fetchGroupedStores();
			}
			setShowChainModal(false);
		} catch (err: any) {
			setToast({
				message: err.message || 'Failed to save chain',
				type: 'error',
			});
		} finally {
			setChainSaveLoading(false);
		}
	};

	const handleDeleteChain = async (chain: AdminStoreChain) => {
		if (chain.locationCount > 0) {
			setToast({
				message: `Cannot delete chain: ${chain.locationCount} stores are assigned. Remove stores first.`,
				type: 'error',
			});
			return;
		}

		if (
			!window.confirm(`Are you sure you want to delete "${chain.name}"?`)
		) {
			return;
		}

		try {
			await adminApi.deleteChain(chain.id);
			fetchChains();
			if (viewMode === 'grouped') {
				fetchGroupedStores();
			}
			setToast({
				message: 'Chain deleted successfully',
				type: 'success',
			});
		} catch (err: any) {
			setToast({
				message: err.message || 'Failed to delete chain',
				type: 'error',
			});
		}
	};

	const toggleChainExpanded = (chainId: string) => {
		setExpandedChains((prev) => {
			const next = new Set(prev);
			if (next.has(chainId)) {
				next.delete(chainId);
			} else {
				next.add(chainId);
			}
			return next;
		});
	};

	// Bulk selection handlers
	const handleToggleStoreSelection = (storeId: string) => {
		setSelectedStoreIds((prev) => {
			const next = new Set(prev);
			if (next.has(storeId)) {
				next.delete(storeId);
			} else {
				next.add(storeId);
			}
			return next;
		});
	};

	const handleSelectAllStores = () => {
		if (selectedStoreIds.size === sortedStores.length) {
			setSelectedStoreIds(new Set());
		} else {
			setSelectedStoreIds(new Set(sortedStores.map((s) => s.id)));
		}
	};

	const handleClearSelection = () => {
		setSelectedStoreIds(new Set());
	};

	const handleBulkAssign = async () => {
		if (!bulkAssignChainId || selectedStoreIds.size === 0) return;

		setBulkAssignLoading(true);
		try {
			const result = await adminApi.bulkAssignStoresToChain(
				Array.from(selectedStoreIds),
				bulkAssignChainId
			);
			setToast({
				message: `Assigned ${result.updated} stores to chain`,
				type: 'success',
			});
			setShowBulkAssignModal(false);
			setBulkAssignChainId('');
			setSelectedStoreIds(new Set());
			fetchStores();
			fetchChains();
			if (viewMode === 'grouped') {
				fetchGroupedStores();
			}
		} catch (err: any) {
			setToast({
				message: err.message || 'Failed to assign stores',
				type: 'error',
			});
		} finally {
			setBulkAssignLoading(false);
		}
	};

	const getStoreTypeIcon = (type: string) => {
		switch (type) {
			case 'brick_and_mortar':
				return '🏪';
			case 'online_retailer':
				return '🌐';
			case 'brand_direct':
				return '🏷️';
			default:
				return '📍';
		}
	};

	const getStoreTypeLabel = (type: string) => {
		switch (type) {
			case 'brick_and_mortar':
				return 'Physical';
			case 'online_retailer':
				return 'Online';
			case 'brand_direct':
				return 'Brand Direct';
			default:
				return type;
		}
	};

	if (loading && stores.length === 0 && !groupedData) {
		return (
			<AdminLayout>
				<div className='admin-loading'>
					<div className='loading-spinner' />
					<span>Loading stores...</span>
				</div>
			</AdminLayout>
		);
	}

	return (
		<AdminLayout>
			<div className='admin-stores'>
				<header className='page-header'>
					<div className='page-header-main'>
						<div>
							<h1>Store Management</h1>
							<p className='page-subtitle'>
								{viewMode === 'list'
									? `${total} store${
											total !== 1 ? 's' : ''
									  } total`
									: groupedData
									? `${groupedData.chains.length} chains, ${groupedData.independentStores.length} independent stores`
									: 'Loading...'}
							</p>
						</div>
						<div className='header-actions'>
							<Button
								variant='secondary'
								size='sm'
								onClick={handleCreateChain}>
								+ Add Chain
							</Button>
						</div>
					</div>
				</header>

				{/* View Mode Toggle & Filters */}
				<div className='filters-bar'>
					<div className='view-toggle'>
						<button
							className={`view-btn ${
								viewMode === 'list' ? 'active' : ''
							}`}
							onClick={() => setViewMode('list')}>
							📋 List
						</button>
						<button
							className={`view-btn ${
								viewMode === 'grouped' ? 'active' : ''
							}`}
							onClick={() => setViewMode('grouped')}>
							🏬 Grouped
						</button>
						<button
							className={`view-btn ${
								viewMode === 'pending' ? 'active' : ''
							} ${pendingTotal > 0 ? 'has-pending' : ''}`}
							onClick={() => setViewMode('pending')}>
							⏳ Pending {pendingTotal > 0 && `(${pendingTotal})`}
						</button>
					</div>

					{viewMode === 'list' && (
						<div className='filter-buttons'>
							<button
								className={`filter-btn ${
									filter === 'all' ? 'active' : ''
								}`}
								onClick={() => {
									setFilter('all');
									setPage(1);
								}}>
								All
							</button>
							<button
								className={`filter-btn ${
									filter === 'brick_and_mortar'
										? 'active'
										: ''
								}`}
								onClick={() => {
									setFilter('brick_and_mortar');
									setPage(1);
								}}>
								🏪 Physical
							</button>
							<button
								className={`filter-btn ${
									filter === 'online_retailer' ? 'active' : ''
								}`}
								onClick={() => {
									setFilter('online_retailer');
									setPage(1);
								}}>
								🌐 Online
							</button>
							<button
								className={`filter-btn ${
									filter === 'brand_direct' ? 'active' : ''
								}`}
								onClick={() => {
									setFilter('brand_direct');
									setPage(1);
								}}>
								🏷️ Brand Direct
							</button>
						</div>
					)}
				</div>

				{error && (
					<div className='error-banner'>
						<span>⚠️ {error}</span>
					</div>
				)}

				{/* List View */}
				{viewMode === 'list' && (
					<>
						{stores.length === 0 ? (
							<div className='empty-state'>
								<span className='empty-icon'>🏪</span>
								<h2>No Stores Found</h2>
								<p>
									{filter !== 'all'
										? `No ${getStoreTypeLabel(
												filter
										  ).toLowerCase()} stores found.`
										: 'No stores have been added yet.'}
								</p>
							</div>
						) : (
							<div className='stores-table-container'>
								{/* Bulk action bar */}
								{selectedStoreIds.size > 0 && (
									<div className='bulk-action-bar'>
										<span className='selection-count'>
											{selectedStoreIds.size} store
											{selectedStoreIds.size !== 1
												? 's'
												: ''}{' '}
											selected
										</span>
										<div className='bulk-actions'>
											<Button
												variant='secondary'
												size='sm'
												onClick={() =>
													setShowBulkAssignModal(true)
												}>
												🏬 Assign to Chain
											</Button>
											<Button
												variant='secondary'
												size='sm'
												onClick={handleClearSelection}>
												✕ Clear
											</Button>
										</div>
									</div>
								)}

								<table className='stores-table'>
									<thead>
										<tr>
											<th className='checkbox-cell'>
												<input
													type='checkbox'
													checked={
														selectedStoreIds.size ===
															sortedStores.length &&
														sortedStores.length > 0
													}
													onChange={
														handleSelectAllStores
													}
													title='Select all'
												/>
											</th>
											<th
												className='sortable-header'
												onClick={() =>
													handleSort('name')
												}>
												Store{' '}
												<span className='sort-indicator'>
													{getSortIndicator('name')}
												</span>
											</th>
											<th>Type</th>
											<th>Chain</th>
											<th
												className='sortable-header'
												onClick={() =>
													handleSort('regionOrScope')
												}>
												Region{' '}
												<span className='sort-indicator'>
													{getSortIndicator(
														'regionOrScope'
													)}
												</span>
											</th>
											<th>Website</th>
											<th
												className='sortable-header'
												onClick={() =>
													handleSort('createdAt')
												}>
												Added{' '}
												<span className='sort-indicator'>
													{getSortIndicator(
														'createdAt'
													)}
												</span>
											</th>
											<th>Actions</th>
										</tr>
									</thead>
									<tbody>
										{sortedStores.map((store) => (
											<tr
												key={store.id}
												className={
													selectedStoreIds.has(
														store.id
													)
														? 'selected'
														: ''
												}>
												<td className='checkbox-cell'>
													<input
														type='checkbox'
														checked={selectedStoreIds.has(
															store.id
														)}
														onChange={() =>
															handleToggleStoreSelection(
																store.id
															)
														}
													/>
												</td>
												<td className='store-name-cell'>
													<span className='store-icon'>
														{getStoreTypeIcon(
															store.type
														)}
													</span>
													<div className='store-name-info'>
														<span className='store-name'>
															{store.name}
														</span>
														{store.locationIdentifier && (
															<span className='store-location-id'>
																{
																	store.locationIdentifier
																}
															</span>
														)}
														{store.address && (
															<span className='store-address'>
																{store.address}
																{store.city &&
																	`, ${store.city}`}
																{store.state &&
																	`, ${store.state}`}
															</span>
														)}
													</div>
												</td>
												<td>
													<span
														className={`type-badge type-${store.type}`}>
														{getStoreTypeLabel(
															store.type
														)}
													</span>
												</td>
												<td>
													{store.chain ? (
														<span className='chain-badge'>
															{store.chain.name}
														</span>
													) : (
														<span className='no-chain'>
															—
														</span>
													)}
												</td>
												<td className='region-cell'>
													{store.regionOrScope}
												</td>
												<td>
													{store.websiteUrl ? (
														<a
															href={
																store.websiteUrl
															}
															target='_blank'
															rel='noopener noreferrer'
															className='website-link'>
															Visit →
														</a>
													) : (
														<span className='no-website'>
															—
														</span>
													)}
												</td>
												<td className='date-cell'>
													{new Date(
														store.createdAt
													).toLocaleDateString()}
												</td>
												<td className='actions-cell'>
													<Button
														onClick={() =>
															handleEdit(store)
														}
														variant='secondary'
														size='sm'>
														✏️
													</Button>
													<Button
														onClick={() =>
															handleDelete(
																store.id,
																store.name
															)
														}
														variant='secondary'
														size='sm'
														isLoading={
															deleteLoading ===
															store.id
														}
														disabled={
															deleteLoading !==
															null
														}>
														🗑️
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{/* Pagination */}
						{total > 20 && (
							<div className='pagination'>
								<Button
									onClick={() =>
										setPage((p) => Math.max(1, p - 1))
									}
									disabled={page === 1}
									variant='secondary'
									size='sm'>
									← Previous
								</Button>
								<span className='page-info'>
									Page {page} of {Math.ceil(total / 20)}
								</span>
								<Button
									onClick={() => setPage((p) => p + 1)}
									disabled={page >= Math.ceil(total / 20)}
									variant='secondary'
									size='sm'>
									Next →
								</Button>
							</div>
						)}
					</>
				)}

				{/* Grouped View */}
				{viewMode === 'grouped' && groupedData && (
					<div className='grouped-stores-view'>
						{/* Chains Section */}
						<div className='chains-section'>
							<h2 className='section-title'>
								🏬 Store Chains ({groupedData.chains.length})
							</h2>

							{groupedData.chains.length === 0 ? (
								<div className='empty-chains'>
									<p>No chains created yet.</p>
									<Button
										variant='primary'
										size='sm'
										onClick={handleCreateChain}>
										+ Create First Chain
									</Button>
								</div>
							) : (
								<div className='chains-list'>
									{groupedData.chains.map(
										({ chain, stores: chainStores }) => (
											<div
												key={chain.id}
												className='chain-group'>
												<div
													className='chain-header'
													onClick={() =>
														toggleChainExpanded(
															chain.id
														)
													}>
													<span className='chain-expand-icon'>
														{expandedChains.has(
															chain.id
														)
															? '▼'
															: '▶'}
													</span>
													<div className='chain-info'>
														<span className='chain-name'>
															{chain.name}
														</span>
														<span className='chain-count'>
															(
															{chainStores.length}{' '}
															locations)
														</span>
													</div>
													<div className='chain-actions'>
														<Button
															variant='secondary'
															size='sm'
															onClick={(e) => {
																e.stopPropagation();
																handleEditChain(
																	chains.find(
																		(c) =>
																			c.id ===
																			chain.id
																	)!
																);
															}}>
															✏️
														</Button>
													</div>
												</div>

												{expandedChains.has(
													chain.id
												) && (
													<div className='chain-stores'>
														{chainStores.map(
															(store) => (
																<div
																	key={
																		store.id
																	}
																	className='chain-store-item'>
																	<span className='store-icon'>
																		{getStoreTypeIcon(
																			store.type
																		)}
																	</span>
																	<div className='store-details'>
																		<span className='store-name'>
																			{store.locationIdentifier ||
																				store.name}
																		</span>
																		{store.address && (
																			<span className='store-address'>
																				{
																					store.address
																				}
																				{store.city &&
																					`, ${store.city}`}
																				{store.state &&
																					`, ${store.state}`}
																			</span>
																		)}
																	</div>
																	<div className='store-actions'>
																		<Button
																			variant='secondary'
																			size='sm'
																			onClick={() =>
																				handleEdit(
																					store
																				)
																			}>
																			✏️
																		</Button>
																		<Button
																			variant='secondary'
																			size='sm'
																			onClick={() =>
																				handleDelete(
																					store.id,
																					store.name
																				)
																			}
																			isLoading={
																				deleteLoading ===
																				store.id
																			}>
																			🗑️
																		</Button>
																	</div>
																</div>
															)
														)}
													</div>
												)}
											</div>
										)
									)}
								</div>
							)}
						</div>

						{/* Independent Stores Section */}
						<div className='independent-section'>
							<h2 className='section-title'>
								🏪 Independent Stores (
								{groupedData.independentStores.length})
							</h2>

							{groupedData.independentStores.length === 0 ? (
								<div className='empty-independent'>
									<p>All stores are assigned to chains.</p>
								</div>
							) : (
								<div className='independent-stores-list'>
									{groupedData.independentStores.map(
										(store) => (
											<div
												key={store.id}
												className='independent-store-item'>
												<span className='store-icon'>
													{getStoreTypeIcon(
														store.type
													)}
												</span>
												<div className='store-details'>
													<span className='store-name'>
														{store.name}
													</span>
													{store.address && (
														<span className='store-address'>
															{store.address}
															{store.city &&
																`, ${store.city}`}
															{store.state &&
																`, ${store.state}`}
														</span>
													)}
												</div>
												<span
													className={`type-badge type-${store.type}`}>
													{getStoreTypeLabel(
														store.type
													)}
												</span>
												<div className='store-actions'>
													<Button
														variant='secondary'
														size='sm'
														onClick={() =>
															handleEdit(store)
														}>
														✏️
													</Button>
													<Button
														variant='secondary'
														size='sm'
														onClick={() =>
															handleDelete(
																store.id,
																store.name
															)
														}
														isLoading={
															deleteLoading ===
															store.id
														}>
														🗑️
													</Button>
												</div>
											</div>
										)
									)}
								</div>
							)}
						</div>
					</div>
				)}

				{/* Pending Stores View */}
				{viewMode === 'pending' && (
					<div className='pending-stores-view'>
						{pendingStores.length === 0 ? (
							<div className='empty-state'>
								<span className='empty-icon'>✅</span>
								<h2>No Pending Stores</h2>
								<p>All store submissions have been reviewed.</p>
							</div>
						) : (
							<>
								<div className='pending-stores-list'>
									{pendingStores.map((store) => (
										<div
											key={store.id}
											className='pending-store-card'>
											<div className='pending-store-header'>
												<span className='store-icon'>
													{store.type ===
														'brick_and_mortar' &&
														'🏪'}
													{store.type ===
														'online_retailer' &&
														'🌐'}
													{store.type ===
														'brand_direct' && '🏷️'}
												</span>
												<div className='pending-store-info'>
													<h3>{store.name}</h3>
													<span className='pending-store-type'>
														{store.type ===
															'brick_and_mortar' &&
															'Physical Store'}
														{store.type ===
															'online_retailer' &&
															'Online Retailer'}
														{store.type ===
															'brand_direct' &&
															'Brand Direct'}
													</span>
												</div>
											</div>

											<div className='pending-store-details'>
												{store.address && (
													<div className='detail-row'>
														<span className='detail-label'>
															Address:
														</span>
														<span className='detail-value'>
															{store.address}
															{store.city &&
																`, ${store.city}`}
															{store.state &&
																`, ${store.state}`}
															{store.zipCode &&
																` ${store.zipCode}`}
														</span>
													</div>
												)}
												{store.websiteUrl && (
													<div className='detail-row'>
														<span className='detail-label'>
															Website:
														</span>
														<a
															href={
																store.websiteUrl
															}
															target='_blank'
															rel='noopener noreferrer'>
															{store.websiteUrl}
														</a>
													</div>
												)}
												{store.phoneNumber && (
													<div className='detail-row'>
														<span className='detail-label'>
															Phone:
														</span>
														<span className='detail-value'>
															{store.phoneNumber}
														</span>
													</div>
												)}
												{store.createdBy && (
													<div className='detail-row'>
														<span className='detail-label'>
															Submitted by:
														</span>
														<span className='detail-value'>
															{store.createdBy
																.displayName ||
																store.createdBy
																	.email}
														</span>
													</div>
												)}
												<div className='detail-row'>
													<span className='detail-label'>
														Submitted:
													</span>
													<span className='detail-value'>
														{new Date(
															store.createdAt
														).toLocaleDateString()}
													</span>
												</div>
											</div>

											<div className='pending-store-actions'>
												<Button
													variant='primary'
													size='sm'
													onClick={() =>
														handleApproveStore(
															store.id
														)
													}
													isLoading={
														moderatingStoreId ===
														store.id
													}
													disabled={
														moderatingStoreId !==
														null
													}>
													✅ Approve
												</Button>
												<Button
													variant='secondary'
													size='sm'
													onClick={() =>
														handleRejectStore(
															store.id
														)
													}
													isLoading={
														moderatingStoreId ===
														store.id
													}
													disabled={
														moderatingStoreId !==
														null
													}>
													❌ Reject
												</Button>
											</div>
										</div>
									))}
								</div>

								{/* Pagination for pending stores */}
								{pendingTotal > 20 && (
									<div className='pagination'>
										<Button
											onClick={() =>
												setPendingPage((p) =>
													Math.max(1, p - 1)
												)
											}
											disabled={pendingPage === 1}
											variant='secondary'
											size='sm'>
											← Previous
										</Button>
										<span className='page-info'>
											Page {pendingPage} of{' '}
											{Math.ceil(pendingTotal / 20)}
										</span>
										<Button
											onClick={() =>
												setPendingPage((p) => p + 1)
											}
											disabled={
												pendingPage >=
												Math.ceil(pendingTotal / 20)
											}
											variant='secondary'
											size='sm'>
											Next →
										</Button>
									</div>
								)}
							</>
						)}
					</div>
				)}
			</div>

			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}

			{/* Edit Store Modal */}
			{editingStore && (
				<div className='modal-overlay' onClick={handleCancelEdit}>
					<div
						className='modal-content edit-store-modal'
						onClick={(e) => e.stopPropagation()}>
						<div className='modal-header'>
							<h2>Edit Store</h2>
							<button
								className='modal-close'
								onClick={handleCancelEdit}>
								×
							</button>
						</div>

						<div className='modal-body'>
							<div className='form-group'>
								<label htmlFor='edit-name'>Store Name *</label>
								<input
									type='text'
									id='edit-name'
									value={editForm.name}
									onChange={(e) =>
										handleEditFormChange(
											'name',
											e.target.value
										)
									}
									required
								/>
							</div>

							<div className='form-group'>
								<label htmlFor='edit-chain'>Chain</label>
								<select
									id='edit-chain'
									value={editForm.chainId}
									onChange={(e) =>
										handleEditFormChange(
											'chainId',
											e.target.value
										)
									}>
									<option value=''>
										— Independent Store —
									</option>
									{chains.map((chain) => (
										<option key={chain.id} value={chain.id}>
											{chain.name} ({chain.locationCount}{' '}
											locations)
										</option>
									))}
								</select>
							</div>

							{editForm.chainId && (
								<div className='form-group'>
									<label htmlFor='edit-location-id'>
										Location Identifier
									</label>
									<input
										type='text'
										id='edit-location-id'
										value={editForm.locationIdentifier}
										onChange={(e) =>
											handleEditFormChange(
												'locationIdentifier',
												e.target.value
											)
										}
										placeholder='e.g., #1234, Downtown, Main & High'
									/>
								</div>
							)}

							<div className='form-group'>
								<label htmlFor='edit-type'>Store Type *</label>
								<select
									id='edit-type'
									value={editForm.type}
									onChange={(e) =>
										handleEditFormChange(
											'type',
											e.target.value
										)
									}>
									<option value='brick_and_mortar'>
										🏪 Physical Store
									</option>
									<option value='online_retailer'>
										🌐 Online Retailer
									</option>
									<option value='brand_direct'>
										🏷️ Brand Direct
									</option>
								</select>
							</div>

							<div className='form-group'>
								<label htmlFor='edit-region'>
									Region/Scope *
								</label>
								<input
									type='text'
									id='edit-region'
									value={editForm.regionOrScope}
									onChange={(e) =>
										handleEditFormChange(
											'regionOrScope',
											e.target.value
										)
									}
									placeholder='e.g., US - Nationwide, San Diego, CA'
								/>
							</div>

							<div className='form-group'>
								<label htmlFor='edit-website'>
									Website URL
								</label>
								<input
									type='url'
									id='edit-website'
									value={editForm.websiteUrl}
									onChange={(e) =>
										handleEditFormChange(
											'websiteUrl',
											e.target.value
										)
									}
									placeholder='https://...'
								/>
							</div>

							{editForm.type === 'brick_and_mortar' && (
								<>
									<div className='form-group'>
										<label htmlFor='edit-address'>
											Address
										</label>
										<input
											type='text'
											id='edit-address'
											value={editForm.address}
											onChange={(e) =>
												handleEditFormChange(
													'address',
													e.target.value
												)
											}
											placeholder='Street address'
										/>
									</div>

									<div className='form-row'>
										<div className='form-group'>
											<label htmlFor='edit-city'>
												City
											</label>
											<input
												type='text'
												id='edit-city'
												value={editForm.city}
												onChange={(e) =>
													handleEditFormChange(
														'city',
														e.target.value
													)
												}
											/>
										</div>

										<div className='form-group'>
											<label htmlFor='edit-state'>
												State
											</label>
											<input
												type='text'
												id='edit-state'
												value={editForm.state}
												onChange={(e) =>
													handleEditFormChange(
														'state',
														e.target.value
													)
												}
												placeholder='e.g., CA'
											/>
										</div>

										<div className='form-group'>
											<label htmlFor='edit-zip'>
												ZIP Code
											</label>
											<input
												type='text'
												id='edit-zip'
												value={editForm.zipCode}
												onChange={(e) =>
													handleEditFormChange(
														'zipCode',
														e.target.value
													)
												}
											/>
										</div>
									</div>

									<div className='form-group'>
										<label htmlFor='edit-phone'>
											Phone Number
										</label>
										<input
											type='tel'
											id='edit-phone'
											value={editForm.phoneNumber}
											onChange={(e) =>
												handleEditFormChange(
													'phoneNumber',
													e.target.value
												)
											}
											placeholder='(555) 123-4567'
										/>
									</div>
								</>
							)}
						</div>

						<div className='modal-footer'>
							<Button
								variant='secondary'
								onClick={handleCancelEdit}
								disabled={saveLoading}>
								Cancel
							</Button>
							<Button
								variant='primary'
								onClick={handleSaveEdit}
								isLoading={saveLoading}
								disabled={
									!editForm.name.trim() ||
									!editForm.regionOrScope.trim()
								}>
								Save Changes
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Chain Modal */}
			{showChainModal && (
				<div
					className='modal-overlay'
					onClick={() => setShowChainModal(false)}>
					<div
						className='modal-content chain-modal'
						onClick={(e) => e.stopPropagation()}>
						<div className='modal-header'>
							<h2>
								{editingChain ? 'Edit Chain' : 'Create Chain'}
							</h2>
							<button
								className='modal-close'
								onClick={() => setShowChainModal(false)}>
								×
							</button>
						</div>

						<div className='modal-body'>
							<div className='form-group'>
								<label htmlFor='chain-name'>Chain Name *</label>
								<input
									type='text'
									id='chain-name'
									value={chainForm.name}
									onChange={(e) =>
										handleChainFormChange(
											'name',
											e.target.value
										)
									}
									placeholder='e.g., Kroger, Whole Foods'
									required
								/>
							</div>

							<div className='form-group'>
								<label htmlFor='chain-slug'>
									URL Slug (optional)
								</label>
								<input
									type='text'
									id='chain-slug'
									value={chainForm.slug}
									onChange={(e) =>
										handleChainFormChange(
											'slug',
											e.target.value
										)
									}
									placeholder='Auto-generated from name'
								/>
							</div>

							<div className='form-group'>
								<label htmlFor='chain-type'>Chain Type</label>
								<select
									id='chain-type'
									value={chainForm.type}
									onChange={(e) =>
										handleChainFormChange(
											'type',
											e.target.value
										)
									}>
									<option value='national'>
										🌎 National
									</option>
									<option value='regional'>
										📍 Regional
									</option>
									<option value='local'>🏘️ Local</option>
								</select>
							</div>

							<div className='form-group'>
								<label htmlFor='chain-website'>
									Website URL
								</label>
								<input
									type='url'
									id='chain-website'
									value={chainForm.websiteUrl}
									onChange={(e) =>
										handleChainFormChange(
											'websiteUrl',
											e.target.value
										)
									}
									placeholder='https://...'
								/>
							</div>

							<div className='form-group'>
								<label htmlFor='chain-logo'>Logo URL</label>
								<input
									type='url'
									id='chain-logo'
									value={chainForm.logoUrl}
									onChange={(e) =>
										handleChainFormChange(
											'logoUrl',
											e.target.value
										)
									}
									placeholder='https://...'
								/>
							</div>

							{editingChain && (
								<div className='chain-meta'>
									<p>
										<strong>Locations:</strong>{' '}
										{editingChain.locationCount}
									</p>
								</div>
							)}
						</div>

						<div className='modal-footer'>
							{editingChain && (
								<Button
									variant='secondary'
									onClick={() =>
										handleDeleteChain(editingChain)
									}
									disabled={
										chainSaveLoading ||
										editingChain.locationCount > 0
									}>
									🗑️ Delete
								</Button>
							)}
							<div style={{ flex: 1 }} />
							<Button
								variant='secondary'
								onClick={() => setShowChainModal(false)}
								disabled={chainSaveLoading}>
								Cancel
							</Button>
							<Button
								variant='primary'
								onClick={handleSaveChain}
								isLoading={chainSaveLoading}
								disabled={!chainForm.name.trim()}>
								{editingChain ? 'Save Changes' : 'Create Chain'}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Bulk Assign Modal */}
			{showBulkAssignModal && (
				<div className='modal-overlay'>
					<div className='modal bulk-assign-modal'>
						<div className='modal-header'>
							<h2>Assign Stores to Chain</h2>
							<button
								className='modal-close'
								onClick={() => {
									setShowBulkAssignModal(false);
									setBulkAssignChainId('');
								}}>
								×
							</button>
						</div>

						<div className='modal-body'>
							<p className='bulk-assign-info'>
								Assign {selectedStoreIds.size} selected store
								{selectedStoreIds.size !== 1 ? 's' : ''} to a
								chain:
							</p>

							<div className='form-group'>
								<label htmlFor='bulk-chain-select'>
									Select Chain
								</label>
								<select
									id='bulk-chain-select'
									value={bulkAssignChainId}
									onChange={(e) =>
										setBulkAssignChainId(e.target.value)
									}
									className='form-select'>
									<option value=''>— Select a chain —</option>
									{chains.map((chain) => (
										<option key={chain.id} value={chain.id}>
											{chain.name} ({chain.locationCount}{' '}
											locations)
										</option>
									))}
								</select>
							</div>

							<div className='selected-stores-preview'>
								<h4>Selected Stores:</h4>
								<ul>
									{sortedStores
										.filter((s) =>
											selectedStoreIds.has(s.id)
										)
										.slice(0, 5)
										.map((store) => (
											<li key={store.id}>
												{store.name}
												{store.city &&
													` — ${store.city}`}
												{store.chain && (
													<span className='current-chain'>
														(currently:{' '}
														{store.chain.name})
													</span>
												)}
											</li>
										))}
									{selectedStoreIds.size > 5 && (
										<li className='more-stores'>
											...and {selectedStoreIds.size - 5}{' '}
											more
										</li>
									)}
								</ul>
							</div>
						</div>

						<div className='modal-footer'>
							<Button
								variant='secondary'
								onClick={() => {
									setShowBulkAssignModal(false);
									setBulkAssignChainId('');
								}}
								disabled={bulkAssignLoading}>
								Cancel
							</Button>
							<Button
								variant='primary'
								onClick={handleBulkAssign}
								isLoading={bulkAssignLoading}
								disabled={!bulkAssignChainId}>
								Assign to Chain
							</Button>
						</div>
					</div>
				</div>
			)}
		</AdminLayout>
	);
}
