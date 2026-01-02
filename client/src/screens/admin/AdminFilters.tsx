import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import './AdminFilters.css';

type FilterType = 'category' | 'tag';

export function AdminFilters() {
	const [activeTab, setActiveTab] = useState<FilterType>('category');
	const [filters, setFilters] = useState<
		Array<{
			value: string;
			displayName?: string;
			archived: boolean;
			archivedAt?: string;
		}>
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [toast, setToast] = useState<{
		message: string;
		type: 'success' | 'error';
	} | null>(null);
	const [showArchived, setShowArchived] = useState(false);
	const [editingFilter, setEditingFilter] = useState<string | null>(null);
	const [editDisplayName, setEditDisplayName] = useState('');
	// Add filter form state
	const [showAddForm, setShowAddForm] = useState(false);
	const [newFilterValue, setNewFilterValue] = useState('');
	const [newFilterDisplayName, setNewFilterDisplayName] = useState('');
	const [addLoading, setAddLoading] = useState(false);

	const fetchFilters = useCallback(async () => {
		try {
			setLoading(true);
			const response = await adminApi.getFilters(activeTab, page, 100);
			setFilters(response.items);
			setTotal(response.total);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to load filters'
			);
		} finally {
			setLoading(false);
		}
	}, [activeTab, page]);

	useEffect(() => {
		fetchFilters();
	}, [fetchFilters]);

	const handleArchive = async (value: string) => {
		setActionLoading(value);
		try {
			await adminApi.archiveFilter(activeTab, value);
			setToast({
				message: 'Filter archived successfully',
				type: 'success',
			});
			fetchFilters(); // Refresh list
		} catch (err) {
			setToast({ message: 'Failed to archive filter', type: 'error' });
		} finally {
			setActionLoading(null);
		}
	};

	const handleUnarchive = async (value: string) => {
		setActionLoading(value);
		try {
			await adminApi.unarchiveFilter(activeTab, value);
			setToast({
				message: 'Filter unarchived successfully',
				type: 'success',
			});
			fetchFilters(); // Refresh list
		} catch (err) {
			setToast({ message: 'Failed to unarchive filter', type: 'error' });
		} finally {
			setActionLoading(null);
		}
	};

	const handleEditDisplayName = (filter: {
		value: string;
		displayName?: string;
	}) => {
		setEditingFilter(filter.value);
		setEditDisplayName(filter.displayName || filter.value);
	};

	const handleSaveDisplayName = async (value: string) => {
		setActionLoading(value);
		try {
			if (editDisplayName.trim() === value) {
				// If display name matches the value, remove the custom display name
				await adminApi.removeFilterDisplayName(activeTab, value);
			} else {
				await adminApi.setFilterDisplayName(
					activeTab,
					value,
					editDisplayName.trim()
				);
			}
			setToast({
				message: 'Display name updated successfully',
				type: 'success',
			});
			setEditingFilter(null);
			fetchFilters(); // Refresh list
		} catch (err) {
			setToast({
				message: 'Failed to update display name',
				type: 'error',
			});
		} finally {
			setActionLoading(null);
		}
	};

	const handleCancelEdit = () => {
		setEditingFilter(null);
		setEditDisplayName('');
	};

	const handleAddFilter = async () => {
		if (!newFilterValue.trim()) {
			setToast({ message: 'Filter value is required', type: 'error' });
			return;
		}

		setAddLoading(true);
		try {
			await adminApi.createFilter(
				activeTab,
				newFilterValue.trim(),
				newFilterDisplayName.trim() || undefined
			);
			setToast({
				message: `${
					activeTab === 'category' ? 'Category' : 'Tag'
				} added successfully`,
				type: 'success',
			});
			setShowAddForm(false);
			setNewFilterValue('');
			setNewFilterDisplayName('');
			fetchFilters(); // Refresh list
		} catch (err: any) {
			const message =
				err?.response?.data?.message ||
				err?.message ||
				`Failed to add ${activeTab}`;
			setToast({ message, type: 'error' });
		} finally {
			setAddLoading(false);
		}
	};

	const handleCancelAdd = () => {
		setShowAddForm(false);
		setNewFilterValue('');
		setNewFilterDisplayName('');
	};

	const displayedFilters = showArchived
		? filters
		: filters.filter((f) => !f.archived);

	if (loading && filters.length === 0) {
		return (
			<AdminLayout>
				<div className='admin-loading'>
					<div className='loading-spinner' />
					<span>Loading filters...</span>
				</div>
			</AdminLayout>
		);
	}

	return (
		<AdminLayout>
			<div className='admin-filters'>
				<header className='page-header'>
					<div>
						<h1>Filter Management</h1>
						<p className='page-subtitle'>
							Manage categories and tags that appear in filters
						</p>
					</div>
					<div className='header-actions'>
						<label className='toggle-archived'>
							<input
								type='checkbox'
								checked={showArchived}
								onChange={(e) =>
									setShowArchived(e.target.checked)
								}
							/>
							<span>Show archived</span>
						</label>
						<Button
							onClick={() => setShowAddForm(true)}
							variant='primary'
							size='sm'
							disabled={showAddForm}>
							+ Add{' '}
							{activeTab === 'category' ? 'Category' : 'Tag'}
						</Button>
					</div>
				</header>

				<div className='admin-tabs'>
					<button
						className={`tab-button ${
							activeTab === 'category' ? 'active' : ''
						}`}
						onClick={() => {
							setActiveTab('category');
							setPage(1);
							handleCancelAdd();
						}}>
						Categories
					</button>
					<button
						className={`tab-button ${
							activeTab === 'tag' ? 'active' : ''
						}`}
						onClick={() => {
							setActiveTab('tag');
							setPage(1);
							handleCancelAdd();
						}}>
						Tags
					</button>
				</div>

				{showAddForm && (
					<div className='add-filter-form'>
						<h3>
							Add New{' '}
							{activeTab === 'category' ? 'Category' : 'Tag'}
						</h3>
						<div className='form-fields'>
							<div className='form-field'>
								<label htmlFor='filter-value'>
									Value <span className='required'>*</span>
								</label>
								<input
									id='filter-value'
									type='text'
									value={newFilterValue}
									onChange={(e) =>
										setNewFilterValue(e.target.value)
									}
									placeholder={`e.g., ${
										activeTab === 'category'
											? 'chocolate bars'
											: 'organic'
									}`}
									className='filter-input'
									autoFocus
								/>
								<span className='form-hint'>
									This is the internal value stored in the
									database
								</span>
							</div>
							<div className='form-field'>
								<label htmlFor='filter-display-name'>
									Display Name{' '}
									<span className='optional'>(optional)</span>
								</label>
								<input
									id='filter-display-name'
									type='text'
									value={newFilterDisplayName}
									onChange={(e) =>
										setNewFilterDisplayName(e.target.value)
									}
									placeholder={`e.g., ${
										activeTab === 'category'
											? 'Chocolate Bars'
											: 'Organic'
									}`}
									className='filter-input'
								/>
								<span className='form-hint'>
									How the filter appears to users (defaults to
									value if empty)
								</span>
							</div>
						</div>
						<div className='form-actions'>
							<Button
								onClick={handleAddFilter}
								variant='primary'
								size='sm'
								isLoading={addLoading}
								disabled={addLoading || !newFilterValue.trim()}>
								Add{' '}
								{activeTab === 'category' ? 'Category' : 'Tag'}
							</Button>
							<Button
								onClick={handleCancelAdd}
								variant='secondary'
								size='sm'
								disabled={addLoading}>
								Cancel
							</Button>
						</div>
					</div>
				)}

				{error && (
					<div className='error-banner'>
						<span>⚠️ {error}</span>
					</div>
				)}

				{displayedFilters.length === 0 ? (
					<div className='empty-state'>
						<span className='empty-icon'>🏷️</span>
						<h2>No Filters Found</h2>
						<p>
							{showArchived
								? 'No archived filters found.'
								: 'No active filters found.'}
						</p>
					</div>
				) : (
					<div className='filters-list'>
						{displayedFilters.map((filter) => (
							<div
								key={filter.value}
								className={`filter-item ${
									filter.archived ? 'archived' : ''
								}`}>
								<div className='filter-info'>
									{editingFilter === filter.value ? (
										<div className='filter-edit-form'>
											<input
												type='text'
												value={editDisplayName}
												onChange={(e) =>
													setEditDisplayName(
														e.target.value
													)
												}
												className='filter-edit-input'
												placeholder='Display name'
												autoFocus
											/>
											<div className='filter-edit-actions'>
												<Button
													onClick={() =>
														handleSaveDisplayName(
															filter.value
														)
													}
													variant='primary'
													size='sm'
													isLoading={
														actionLoading ===
														filter.value
													}
													disabled={
														actionLoading !== null
													}>
													✓ Save
												</Button>
												<Button
													onClick={handleCancelEdit}
													variant='secondary'
													size='sm'
													disabled={
														actionLoading !== null
													}>
													Cancel
												</Button>
											</div>
										</div>
									) : (
										<>
											<div className='filter-display'>
												<span className='filter-display-name'>
													{filter.displayName ||
														filter.value}
												</span>
												{filter.displayName && (
													<span className='filter-database-value'>
														(DB: {filter.value})
													</span>
												)}
											</div>
											{filter.archived &&
												filter.archivedAt && (
													<span className='filter-meta'>
														Archived{' '}
														{new Date(
															filter.archivedAt
														).toLocaleDateString()}
													</span>
												)}
										</>
									)}
								</div>
								{editingFilter !== filter.value && (
									<div className='filter-actions'>
										<Button
											onClick={() =>
												handleEditDisplayName(filter)
											}
											variant='secondary'
											size='sm'
											disabled={actionLoading !== null}>
											✏️ Edit Name
										</Button>
										{filter.archived ? (
											<Button
												onClick={() =>
													handleUnarchive(
														filter.value
													)
												}
												variant='primary'
												size='sm'
												isLoading={
													actionLoading ===
													filter.value
												}
												disabled={
													actionLoading !== null
												}>
												↻ Unarchive
											</Button>
										) : (
											<Button
												onClick={() =>
													handleArchive(filter.value)
												}
												variant='secondary'
												size='sm'
												isLoading={
													actionLoading ===
													filter.value
												}
												disabled={
													actionLoading !== null
												}>
												📦 Archive
											</Button>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				)}

				{/* Pagination */}
				{total > 100 && (
					<div className='pagination'>
						<Button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							variant='secondary'
							size='sm'>
							← Previous
						</Button>
						<span className='page-info'>
							Page {page} of {Math.ceil(total / 100)}
						</span>
						<Button
							onClick={() => setPage((p) => p + 1)}
							disabled={page >= Math.ceil(total / 100)}
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
		</AdminLayout>
	);
}
