import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi, AdminStore } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import './AdminStores.css';

type StoreFilter =
	| 'all'
	| 'brick_and_mortar'
	| 'online_retailer'
	| 'brand_direct';

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
	});
	const [saveLoading, setSaveLoading] = useState(false);

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
			// Toggle direction if same field
			setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
		} else {
			// New field, default to ascending
			setSortField(field);
			setSortDirection('asc');
		}
	};

	// Get sort indicator
	const getSortIndicator = (field: SortField) => {
		if (sortField !== field) return '↕️';
		return sortDirection === 'asc' ? '↑' : '↓';
	};

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

	useEffect(() => {
		fetchStores();
	}, [fetchStores]);

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
			setStores(stores.filter((s) => s.id !== storeId));
			setTotal(total - 1);
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
			const response = await adminApi.updateStore(
				editingStore.id,
				editForm
			);
			setStores(
				stores.map((s) =>
					s.id === editingStore.id ? { ...s, ...response.store } : s
				)
			);
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

	if (loading && stores.length === 0) {
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
					<div>
						<h1>Store Management</h1>
						<p className='page-subtitle'>
							{total} store{total !== 1 ? 's' : ''} total
						</p>
					</div>
				</header>

				{/* Filters */}
				<div className='filters-bar'>
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
								filter === 'brick_and_mortar' ? 'active' : ''
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
				</div>

				{error && (
					<div className='error-banner'>
						<span>⚠️ {error}</span>
					</div>
				)}

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
						<table className='stores-table'>
							<thead>
								<tr>
									<th
										className='sortable-header'
										onClick={() => handleSort('name')}>
										Store{' '}
										<span className='sort-indicator'>
											{getSortIndicator('name')}
										</span>
									</th>
									<th>Type</th>
									<th
										className='sortable-header'
										onClick={() =>
											handleSort('regionOrScope')
										}>
										Region{' '}
										<span className='sort-indicator'>
											{getSortIndicator('regionOrScope')}
										</span>
									</th>
									<th>Website</th>
									<th
										className='sortable-header'
										onClick={() => handleSort('createdAt')}>
										Added{' '}
										<span className='sort-indicator'>
											{getSortIndicator('createdAt')}
										</span>
									</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{sortedStores.map((store) => (
									<tr key={store.id}>
										<td className='store-name-cell'>
											<span className='store-icon'>
												{getStoreTypeIcon(store.type)}
											</span>
											<div className='store-name-info'>
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
										</td>
										<td>
											<span
												className={`type-badge type-${store.type}`}>
												{getStoreTypeLabel(store.type)}
											</span>
										</td>
										<td className='region-cell'>
											{store.regionOrScope}
										</td>
										<td>
											{store.websiteUrl ? (
												<a
													href={store.websiteUrl}
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
													deleteLoading === store.id
												}
												disabled={
													deleteLoading !== null
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
							onClick={() => setPage((p) => Math.max(1, p - 1))}
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
		</AdminLayout>
	);
}
