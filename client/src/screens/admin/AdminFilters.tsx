import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi, PendingFilterItem } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import './AdminFilters.css';

type FilterType = 'category' | 'tag';
type ViewMode = 'active' | 'pending';

export function AdminFilters() {
	const [searchParams, setSearchParams] = useSearchParams();
	const initialTab =
		searchParams.get('tab') === 'pending' ? 'pending' : 'active';

	const [viewMode, setViewMode] = useState<ViewMode>(initialTab as ViewMode);
	const [activeTab, setActiveTab] = useState<FilterType>('category');
	const [filters, setFilters] = useState<
		Array<{
			value: string;
			displayName?: string;
			archived: boolean;
			archivedAt?: string;
		}>
	>([]);
	const [pendingFilters, setPendingFilters] = useState<PendingFilterItem[]>(
		[]
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [total, setTotal] = useState(0);
	const [pendingTotal, setPendingTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [toast, setToast] = useState<{
		message: string;
		type: 'success' | 'error';
	} | null>(null);
	const [showArchived, setShowArchived] = useState(false);
	const [editingFilter, setEditingFilter] = useState<string | null>(null);
	const [editDisplayName, setEditDisplayName] = useState('');
	const [selectedPending, setSelectedPending] = useState<Set<string>>(
		new Set()
	);
	const [showTrusted, setShowTrusted] = useState(false);

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

	const fetchPendingFilters = useCallback(async () => {
		try {
			setLoading(true);
			const response = await adminApi.getPendingFilters(
				activeTab,
				showTrusted,
				page,
				100
			);
			setPendingFilters(response.items);
			setPendingTotal(response.total);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to load pending filters'
			);
		} finally {
			setLoading(false);
		}
	}, [activeTab, showTrusted, page]);

	useEffect(() => {
		if (viewMode === 'active') {
			fetchFilters();
		} else {
			fetchPendingFilters();
		}
	}, [viewMode, fetchFilters, fetchPendingFilters]);

	// Also fetch pending counts for both types on load
	useEffect(() => {
		const fetchPendingCounts = async () => {
			try {
				const [catRes, tagRes] = await Promise.all([
					adminApi.getPendingFilters('category', false, 1, 1),
					adminApi.getPendingFilters('tag', false, 1, 1),
				]);
				setPendingTotal(catRes.total + tagRes.total);
			} catch {
				// Silently fail
			}
		};
		fetchPendingCounts();
	}, []);

	const handleArchive = async (value: string) => {
		setActionLoading(value);
		try {
			await adminApi.archiveFilter(activeTab, value);
			setToast({
				message: 'Filter archived successfully',
				type: 'success',
			});
			fetchFilters(); // Refresh list
		} catch {
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
		} catch {
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
		} catch {
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

	// Pending filter handlers
	const handleApprovePending = async (filterId: string) => {
		setActionLoading(filterId);
		try {
			await adminApi.approvePendingFilter(filterId);
			setPendingFilters(pendingFilters.filter((f) => f.id !== filterId));
			setPendingTotal((prev) => prev - 1);
			setToast({
				message: 'Filter approved and now visible',
				type: 'success',
			});
		} catch {
			setToast({ message: 'Failed to approve filter', type: 'error' });
		} finally {
			setActionLoading(null);
		}
	};

	const handleRejectPending = async (filterId: string) => {
		setActionLoading(filterId);
		try {
			await adminApi.rejectPendingFilter(filterId);
			setPendingFilters(pendingFilters.filter((f) => f.id !== filterId));
			setPendingTotal((prev) => prev - 1);
			setToast({
				message: 'Filter rejected and archived',
				type: 'success',
			});
		} catch {
			setToast({ message: 'Failed to reject filter', type: 'error' });
		} finally {
			setActionLoading(null);
		}
	};

	const handleBulkApprove = async () => {
		if (selectedPending.size === 0) return;
		setActionLoading('bulk');
		try {
			const result = await adminApi.bulkApprovePendingFilters(
				Array.from(selectedPending)
			);
			setPendingFilters(
				pendingFilters.filter((f) => !selectedPending.has(f.id))
			);
			setPendingTotal((prev) => prev - result.count);
			setSelectedPending(new Set());
			setToast({
				message: `${result.count} filters approved`,
				type: 'success',
			});
		} catch {
			setToast({ message: 'Failed to approve filters', type: 'error' });
		} finally {
			setActionLoading(null);
		}
	};

	const handleBulkReject = async () => {
		if (selectedPending.size === 0) return;
		if (
			!window.confirm(
				`Are you sure you want to reject ${selectedPending.size} filters?`
			)
		)
			return;
		setActionLoading('bulk');
		try {
			const result = await adminApi.bulkRejectPendingFilters(
				Array.from(selectedPending)
			);
			setPendingFilters(
				pendingFilters.filter((f) => !selectedPending.has(f.id))
			);
			setPendingTotal((prev) => prev - result.count);
			setSelectedPending(new Set());
			setToast({
				message: `${result.count} filters rejected`,
				type: 'success',
			});
		} catch {
			setToast({ message: 'Failed to reject filters', type: 'error' });
		} finally {
			setActionLoading(null);
		}
	};

	const togglePendingSelection = (id: string) => {
		setSelectedPending((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const selectAllPending = () => {
		setSelectedPending(new Set(pendingFilters.map((f) => f.id)));
	};

	const deselectAllPending = () => {
		setSelectedPending(new Set());
	};

	const displayedFilters = showArchived
		? filters
		: filters.filter((f) => !f.archived);

	if (loading && filters.length === 0 && pendingFilters.length === 0) {
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
					{viewMode === 'active' && (
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
						</div>
					)}
				</header>

				{/* View Mode Toggle */}
				<div className='view-mode-toggle'>
					<button
						className={`view-btn ${
							viewMode === 'active' ? 'active' : ''
						}`}
						onClick={() => {
							setViewMode('active');
							setSearchParams({});
							setPage(1);
						}}>
						📋 Active Filters
					</button>
					<button
						className={`view-btn ${
							viewMode === 'pending' ? 'active' : ''
						} ${pendingTotal > 0 ? 'has-pending' : ''}`}
						onClick={() => {
							setViewMode('pending');
							setSearchParams({ tab: 'pending' });
							setPage(1);
						}}>
						⏳ Pending Review{' '}
						{pendingTotal > 0 && `(${pendingTotal})`}
					</button>
				</div>

				<div className='admin-tabs'>
					<button
						className={`tab-button ${
							activeTab === 'category' ? 'active' : ''
						}`}
						onClick={() => {
							setActiveTab('category');
							setPage(1);
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
						}}>
						Tags
					</button>
				</div>

				{viewMode === 'pending' && (
					<div className='pending-options'>
						<label className='toggle-trusted'>
							<input
								type='checkbox'
								checked={showTrusted}
								onChange={(e) =>
									setShowTrusted(e.target.checked)
								}
							/>
							<span>
								Show trusted contributor submissions (live)
							</span>
						</label>
					</div>
				)}

				{error && (
					<div className='error-banner'>
						<span>⚠️ {error}</span>
					</div>
				)}

				{/* Active Filters View */}
				{viewMode === 'active' && (
					<>
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
																actionLoading !==
																null
															}>
															✓ Save
														</Button>
														<Button
															onClick={
																handleCancelEdit
															}
															variant='secondary'
															size='sm'
															disabled={
																actionLoading !==
																null
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
																(DB:{' '}
																{filter.value})
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
														handleEditDisplayName(
															filter
														)
													}
													variant='secondary'
													size='sm'
													disabled={
														actionLoading !== null
													}>
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
															actionLoading !==
															null
														}>
														↻ Unarchive
													</Button>
												) : (
													<Button
														onClick={() =>
															handleArchive(
																filter.value
															)
														}
														variant='secondary'
														size='sm'
														isLoading={
															actionLoading ===
															filter.value
														}
														disabled={
															actionLoading !==
															null
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
									onClick={() =>
										setPage((p) => Math.max(1, p - 1))
									}
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
					</>
				)}

				{/* Pending Filters View */}
				{viewMode === 'pending' && (
					<>
						{/* Bulk actions */}
						{pendingFilters.length > 0 && (
							<div className='bulk-actions'>
								<div className='selection-controls'>
									<button
										onClick={selectAllPending}
										className='select-btn'>
										Select All
									</button>
									<button
										onClick={deselectAllPending}
										className='select-btn'>
										Deselect All
									</button>
									<span className='selection-count'>
										{selectedPending.size} selected
									</span>
								</div>
								{selectedPending.size > 0 && (
									<div className='bulk-buttons'>
										<Button
											onClick={handleBulkApprove}
											variant='primary'
											size='sm'
											isLoading={actionLoading === 'bulk'}
											disabled={actionLoading !== null}>
											✅ Approve Selected
										</Button>
										<Button
											onClick={handleBulkReject}
											variant='secondary'
											size='sm'
											isLoading={actionLoading === 'bulk'}
											disabled={actionLoading !== null}>
											❌ Reject Selected
										</Button>
									</div>
								)}
							</div>
						)}

						{pendingFilters.length === 0 ? (
							<div className='empty-state'>
								<span className='empty-icon'>✅</span>
								<h2>All Caught Up!</h2>
								<p>
									No pending{' '}
									{activeTab === 'category'
										? 'categories'
										: 'tags'}{' '}
									to review.
								</p>
							</div>
						) : (
							<div className='filters-list pending-list'>
								{pendingFilters.map((filter) => (
									<div
										key={filter.id}
										className={`filter-item pending ${
											filter.trustedContribution
												? 'trusted'
												: ''
										}`}>
										<div className='filter-checkbox'>
											<input
												type='checkbox'
												checked={selectedPending.has(
													filter.id
												)}
												onChange={() =>
													togglePendingSelection(
														filter.id
													)
												}
											/>
										</div>
										<div className='filter-info'>
											<div className='filter-display'>
												<span className='filter-display-name'>
													{filter.value}
												</span>
												{filter.trustedContribution && (
													<span className='trusted-badge'>
														⭐ Trusted (Live)
													</span>
												)}
											</div>
											<div className='filter-meta'>
												{filter.submittedBy && (
													<span>
														👤{' '}
														{filter.submittedBy
															.displayName ||
															filter.submittedBy
																.email}
													</span>
												)}
												<span>
													📅{' '}
													{new Date(
														filter.createdAt
													).toLocaleDateString()}
												</span>
											</div>
										</div>
										<div className='filter-actions'>
											<Button
												onClick={() =>
													handleApprovePending(
														filter.id
													)
												}
												variant='primary'
												size='sm'
												isLoading={
													actionLoading === filter.id
												}
												disabled={
													actionLoading !== null
												}>
												✅ Approve
											</Button>
											<Button
												onClick={() =>
													handleRejectPending(
														filter.id
													)
												}
												variant='secondary'
												size='sm'
												isLoading={
													actionLoading === filter.id
												}
												disabled={
													actionLoading !== null
												}>
												❌ Reject
											</Button>
										</div>
									</div>
								))}
							</div>
						)}

						{/* Pagination */}
						{pendingTotal > 100 && (
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
									Page {page} of{' '}
									{Math.ceil(pendingTotal / 100)}
								</span>
								<Button
									onClick={() => setPage((p) => p + 1)}
									disabled={
										page >= Math.ceil(pendingTotal / 100)
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
