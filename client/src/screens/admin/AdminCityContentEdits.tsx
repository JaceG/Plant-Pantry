import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { adminApi, CityContentEdit } from '../../api/adminApi';
import './AdminCityContentEdits.css';

export function AdminCityContentEdits() {
	const [edits, setEdits] = useState<CityContentEdit[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Selection state
	const [selectedEdits, setSelectedEdits] = useState<Set<string>>(new Set());

	// Filters
	const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>(
		'pending'
	);
	const [page, setPage] = useState(1);
	const pageSize = 20;

	// Processing state
	const [processing, setProcessing] = useState(false);
	const [reviewingEdit, setReviewingEdit] = useState<string | null>(null);
	const [reviewNote, setReviewNote] = useState('');

	const fetchEdits = useCallback(async () => {
		setLoading(true);
		try {
			const res = await adminApi.getCityContentEdits(
				page,
				pageSize,
				statusFilter
			);
			setEdits(res.items);
			setTotal(res.total);
		} catch (err) {
			setError('Failed to load content edits');
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [page, statusFilter]);

	useEffect(() => {
		fetchEdits();
	}, [fetchEdits]);

	const toggleEdit = (editId: string) => {
		setSelectedEdits((prev) => {
			const next = new Set(prev);
			if (next.has(editId)) {
				next.delete(editId);
			} else {
				next.add(editId);
			}
			return next;
		});
	};

	const handleApprove = async (editId: string) => {
		setProcessing(true);
		try {
			await adminApi.approveCityContentEdit(
				editId,
				reviewNote || undefined
			);
			setSuccessMessage('Edit approved and applied!');
			setSelectedEdits((prev) => {
				const next = new Set(prev);
				next.delete(editId);
				return next;
			});
			setReviewingEdit(null);
			setReviewNote('');
			await fetchEdits();
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err) {
			setError('Failed to approve edit');
			setTimeout(() => setError(null), 3000);
		} finally {
			setProcessing(false);
		}
	};

	const handleReject = async (editId: string) => {
		setProcessing(true);
		try {
			await adminApi.rejectCityContentEdit(
				editId,
				reviewNote || undefined
			);
			setSuccessMessage('Edit rejected');
			setSelectedEdits((prev) => {
				const next = new Set(prev);
				next.delete(editId);
				return next;
			});
			setReviewingEdit(null);
			setReviewNote('');
			await fetchEdits();
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err) {
			setError('Failed to reject edit');
			setTimeout(() => setError(null), 3000);
		} finally {
			setProcessing(false);
		}
	};

	const handleBulkReview = async (action: 'approve' | 'reject') => {
		if (selectedEdits.size === 0) return;

		setProcessing(true);
		try {
			const editIds = Array.from(selectedEdits);
			const res = await adminApi.bulkReviewCityContentEdits(
				editIds,
				action
			);
			setSuccessMessage(res.message);
			setSelectedEdits(new Set());
			await fetchEdits();
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err) {
			setError('Failed to process edits');
			setTimeout(() => setError(null), 3000);
		} finally {
			setProcessing(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	};

	const getFieldLabel = (field: string) => {
		switch (field) {
			case 'cityName':
				return 'City Name';
			case 'headline':
				return 'Headline';
			case 'description':
				return 'Description';
			default:
				return field;
		}
	};

	if (loading && edits.length === 0) {
		return (
			<AdminLayout>
				<div className='admin-loading'>
					<div className='loading-spinner' />
					<span>Loading content edits...</span>
				</div>
			</AdminLayout>
		);
	}

	return (
		<AdminLayout>
			<div className='admin-city-content-edits'>
				<header className='page-header'>
					<div className='header-info'>
						<h1>City Content Edits</h1>
						<p className='header-subtitle'>
							Review user-suggested edits to city landing pages
						</p>
					</div>
					<div className='header-stats'>
						<div className='stat-badge'>
							<span className='stat-value'>{total}</span>
							<span className='stat-label'>
								{statusFilter === 'pending'
									? 'Pending'
									: 'Total'}
							</span>
						</div>
					</div>
				</header>

				{error && (
					<div className='message error-message'>
						<span className='message-icon'>⚠️</span>
						{error}
					</div>
				)}

				{successMessage && (
					<div className='message success-message'>
						<span className='message-icon'>✓</span>
						{successMessage}
					</div>
				)}

				{/* Filter Controls */}
				<div className='filter-controls'>
					<div className='status-filter'>
						<button
							className={`filter-btn ${
								statusFilter === 'pending' ? 'active' : ''
							}`}
							onClick={() => {
								setStatusFilter('pending');
								setPage(1);
							}}>
							Pending
						</button>
						<button
							className={`filter-btn ${
								statusFilter === 'all' ? 'active' : ''
							}`}
							onClick={() => {
								setStatusFilter('all');
								setPage(1);
							}}>
							All
						</button>
					</div>
				</div>

				{/* Bulk Actions */}
				{selectedEdits.size > 0 && (
					<div className='bulk-actions'>
						<span className='selected-count'>
							{selectedEdits.size} selected
						</span>
						<button
							onClick={() => handleBulkReview('approve')}
							disabled={processing}
							className='bulk-approve-btn'>
							{processing ? 'Processing...' : '✓ Approve All'}
						</button>
						<button
							onClick={() => handleBulkReview('reject')}
							disabled={processing}
							className='bulk-reject-btn'>
							{processing ? 'Processing...' : '× Reject All'}
						</button>
						<button
							onClick={() => setSelectedEdits(new Set())}
							className='clear-selection-btn'>
							Clear Selection
						</button>
					</div>
				)}

				{/* Edits List */}
				{edits.length === 0 ? (
					<div className='empty-state'>
						<span className='empty-icon'>🎉</span>
						<h2>All caught up!</h2>
						<p>
							{statusFilter === 'pending'
								? 'There are no pending content edits to review.'
								: 'No content edits found.'}
						</p>
					</div>
				) : (
					<div className='edits-list'>
						{edits.map((edit) => (
							<div
								key={edit.id}
								className={`edit-card ${
									selectedEdits.has(edit.id) ? 'selected' : ''
								} ${
									edit.status !== 'pending' ? 'reviewed' : ''
								}`}>
								<div className='edit-checkbox'>
									{edit.status === 'pending' && (
										<input
											type='checkbox'
											checked={selectedEdits.has(edit.id)}
											onChange={() => toggleEdit(edit.id)}
										/>
									)}
								</div>

								<div className='edit-city'>
									<Link
										to={`/cities/${edit.citySlug}`}
										className='city-link'
										target='_blank'>
										{edit.cityName}, {edit.state}
									</Link>
									<span className='field-badge'>
										{getFieldLabel(edit.field)}
									</span>
								</div>

								<div className='edit-content'>
									<div className='content-original'>
										<span className='content-label'>
											Original:
										</span>
										<span className='content-value'>
											{edit.originalValue.length > 200
												? edit.originalValue.slice(
														0,
														200
												  ) + '...'
												: edit.originalValue}
										</span>
									</div>
									<div className='content-arrow'>→</div>
									<div className='content-suggested'>
										<span className='content-label'>
											Suggested:
										</span>
										<span className='content-value suggested'>
											{edit.suggestedValue.length > 200
												? edit.suggestedValue.slice(
														0,
														200
												  ) + '...'
												: edit.suggestedValue}
										</span>
									</div>
								</div>

								{edit.reason && (
									<div className='edit-reason'>
										<span className='reason-label'>
											Reason:
										</span>
										<span className='reason-text'>
											{edit.reason}
										</span>
									</div>
								)}

								<div className='edit-meta'>
									<span className='submitted-by'>
										{edit.submittedBy?.displayName ||
											edit.submittedBy?.email ||
											'Unknown'}
									</span>
									<span className='submitted-at'>
										{formatDate(edit.createdAt)}
									</span>
									{edit.status !== 'pending' && (
										<span
											className={`status-badge ${edit.status}`}>
											{edit.status}
										</span>
									)}
								</div>

								{edit.status === 'pending' && (
									<div className='edit-actions'>
										{reviewingEdit === edit.id ? (
											<div className='review-form'>
												<input
													type='text'
													className='review-note-input'
													value={reviewNote}
													onChange={(e) =>
														setReviewNote(
															e.target.value
														)
													}
													placeholder='Add a note (optional)'
												/>
												<div className='review-buttons'>
													<button
														onClick={() =>
															handleApprove(
																edit.id
															)
														}
														disabled={processing}
														className='approve-btn'>
														{processing
															? '...'
															: '✓ Approve'}
													</button>
													<button
														onClick={() =>
															handleReject(
																edit.id
															)
														}
														disabled={processing}
														className='reject-btn'>
														{processing
															? '...'
															: '× Reject'}
													</button>
													<button
														onClick={() => {
															setReviewingEdit(
																null
															);
															setReviewNote('');
														}}
														className='cancel-btn'>
														Cancel
													</button>
												</div>
											</div>
										) : (
											<>
												<button
													onClick={() =>
														handleApprove(edit.id)
													}
													className='approve-btn'
													title='Quick approve'>
													✓
												</button>
												<button
													onClick={() =>
														handleReject(edit.id)
													}
													className='reject-btn'
													title='Quick reject'>
													×
												</button>
												<button
													onClick={() =>
														setReviewingEdit(
															edit.id
														)
													}
													className='review-btn'
													title='Review with note'>
													📝
												</button>
											</>
										)}
									</div>
								)}

								{edit.reviewNote && (
									<div className='review-note'>
										<span className='note-label'>
											Review note:
										</span>
										<span className='note-text'>
											{edit.reviewNote}
										</span>
									</div>
								)}
							</div>
						))}
					</div>
				)}

				{/* Pagination */}
				{total > pageSize && (
					<div className='pagination'>
						<button
							disabled={page === 1}
							onClick={() => setPage((p) => p - 1)}>
							← Previous
						</button>
						<span className='page-info'>
							Page {page} of {Math.ceil(total / pageSize)}
						</span>
						<button
							disabled={page >= Math.ceil(total / pageSize)}
							onClick={() => setPage((p) => p + 1)}>
							Next →
						</button>
					</div>
				)}
			</div>
		</AdminLayout>
	);
}
