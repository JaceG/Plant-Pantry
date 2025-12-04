import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { adminApi, PendingReport, PendingReportCity } from '../../api/adminApi';
import './AdminPendingReports.css';

export function AdminPendingReports() {
	const [cities, setCities] = useState<PendingReportCity[]>([]);
	const [totalPending, setTotalPending] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Selection state
	const [selectedReports, setSelectedReports] = useState<Set<string>>(
		new Set()
	);
	const [expandedCities, setExpandedCities] = useState<Set<string>>(
		new Set()
	);

	// Processing state
	const [processing, setProcessing] = useState(false);

	const fetchPendingReports = useCallback(async () => {
		try {
			const res = await adminApi.getPendingReports();
			setCities(res.cities);
			setTotalPending(res.totalPending);
			// Expand first city by default
			if (res.cities.length > 0) {
				setExpandedCities(new Set([res.cities[0].city]));
			}
		} catch (err) {
			setError('Failed to load pending reports');
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPendingReports();
	}, [fetchPendingReports]);

	const toggleCity = (city: string) => {
		setExpandedCities((prev) => {
			const next = new Set(prev);
			if (next.has(city)) {
				next.delete(city);
			} else {
				next.add(city);
			}
			return next;
		});
	};

	const toggleReport = (reportId: string) => {
		setSelectedReports((prev) => {
			const next = new Set(prev);
			if (next.has(reportId)) {
				next.delete(reportId);
			} else {
				next.add(reportId);
			}
			return next;
		});
	};

	const selectAllInCity = (city: PendingReportCity) => {
		setSelectedReports((prev) => {
			const next = new Set(prev);
			city.reports.forEach((r) => next.add(r.id));
			return next;
		});
	};

	const deselectAllInCity = (city: PendingReportCity) => {
		setSelectedReports((prev) => {
			const next = new Set(prev);
			city.reports.forEach((r) => next.delete(r.id));
			return next;
		});
	};

	const handleModerate = async (
		reportId: string,
		status: 'confirmed' | 'rejected'
	) => {
		try {
			await adminApi.moderateAvailability(reportId, status);
			setSuccessMessage(
				status === 'confirmed' ? 'Report approved!' : 'Report rejected'
			);
			setSelectedReports((prev) => {
				const next = new Set(prev);
				next.delete(reportId);
				return next;
			});
			await fetchPendingReports();
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err) {
			setError('Failed to moderate report');
			setTimeout(() => setError(null), 3000);
		}
	};

	const handleBulkModerate = async (status: 'confirmed' | 'rejected') => {
		if (selectedReports.size === 0) return;

		setProcessing(true);
		try {
			const reportIds = Array.from(selectedReports);
			const res = await adminApi.bulkModerateReports(reportIds, status);
			setSuccessMessage(res.message);
			setSelectedReports(new Set());
			await fetchPendingReports();
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err) {
			setError('Failed to moderate reports');
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

	if (loading) {
		return (
			<AdminLayout>
				<div className='admin-loading'>
					<div className='loading-spinner' />
					<span>Loading pending reports...</span>
				</div>
			</AdminLayout>
		);
	}

	return (
		<AdminLayout>
			<div className='admin-pending-reports'>
				<header className='page-header'>
					<div className='header-info'>
						<h1>Pending Reports</h1>
						<p className='header-subtitle'>
							Review user-submitted availability reports
						</p>
					</div>
					<div className='header-stats'>
						<div className='stat-badge'>
							<span className='stat-value'>{totalPending}</span>
							<span className='stat-label'>Pending</span>
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

				{/* Bulk Actions */}
				{selectedReports.size > 0 && (
					<div className='bulk-actions'>
						<span className='selected-count'>
							{selectedReports.size} selected
						</span>
						<button
							onClick={() => handleBulkModerate('confirmed')}
							disabled={processing}
							className='bulk-approve-btn'>
							{processing ? 'Processing...' : '✓ Approve All'}
						</button>
						<button
							onClick={() => handleBulkModerate('rejected')}
							disabled={processing}
							className='bulk-reject-btn'>
							{processing ? 'Processing...' : '× Reject All'}
						</button>
						<button
							onClick={() => setSelectedReports(new Set())}
							className='clear-selection-btn'>
							Clear Selection
						</button>
					</div>
				)}

				{/* Reports by City */}
				{cities.length === 0 ? (
					<div className='empty-state'>
						<span className='empty-icon'>🎉</span>
						<h2>All caught up!</h2>
						<p>There are no pending reports to review.</p>
					</div>
				) : (
					<div className='cities-list'>
						{cities.map((cityGroup) => {
							const isExpanded = expandedCities.has(
								cityGroup.city
							);
							const allSelected = cityGroup.reports.every((r) =>
								selectedReports.has(r.id)
							);
							const someSelected = cityGroup.reports.some((r) =>
								selectedReports.has(r.id)
							);

							return (
								<div
									key={cityGroup.city}
									className={`city-group ${
										isExpanded ? 'expanded' : ''
									}`}>
									<div
										className='city-header'
										onClick={() =>
											toggleCity(cityGroup.city)
										}>
										<div className='city-info'>
											<span
												className={`expand-icon ${
													isExpanded ? 'expanded' : ''
												}`}>
												▶
											</span>
											<h2 className='city-name'>
												{cityGroup.city}
											</h2>
											<span className='city-count'>
												{cityGroup.count}{' '}
												{cityGroup.count === 1
													? 'report'
													: 'reports'}
											</span>
										</div>
										{isExpanded && (
											<div
												className='city-actions'
												onClick={(e) =>
													e.stopPropagation()
												}>
												{allSelected ? (
													<button
														onClick={() =>
															deselectAllInCity(
																cityGroup
															)
														}
														className='select-all-btn'>
														Deselect All
													</button>
												) : (
													<button
														onClick={() =>
															selectAllInCity(
																cityGroup
															)
														}
														className='select-all-btn'>
														{someSelected
															? 'Select All'
															: 'Select All'}
													</button>
												)}
											</div>
										)}
									</div>

									{isExpanded && (
										<div className='reports-list'>
											{cityGroup.reports.map((report) => (
												<ReportCard
													key={report.id}
													report={report}
													isSelected={selectedReports.has(
														report.id
													)}
													onToggleSelect={() =>
														toggleReport(report.id)
													}
													onApprove={() =>
														handleModerate(
															report.id,
															'confirmed'
														)
													}
													onReject={() =>
														handleModerate(
															report.id,
															'rejected'
														)
													}
													formatDate={formatDate}
												/>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</AdminLayout>
	);
}

interface ReportCardProps {
	report: PendingReport;
	isSelected: boolean;
	onToggleSelect: () => void;
	onApprove: () => void;
	onReject: () => void;
	formatDate: (date: string) => string;
}

function ReportCard({
	report,
	isSelected,
	onToggleSelect,
	onApprove,
	onReject,
	formatDate,
}: ReportCardProps) {
	return (
		<div className={`report-card ${isSelected ? 'selected' : ''}`}>
			<div className='report-checkbox'>
				<input
					type='checkbox'
					checked={isSelected}
					onChange={onToggleSelect}
				/>
			</div>

			<div className='report-product'>
				<div className='product-image'>
					{report.productImageUrl ? (
						<img
							src={report.productImageUrl}
							alt={report.productName}
						/>
					) : (
						<span>🌱</span>
					)}
				</div>
				<div className='product-details'>
					<Link
						to={`/products/${report.productId}`}
						className='product-name'>
						{report.productName}
					</Link>
					<span className='product-brand'>{report.productBrand}</span>
				</div>
			</div>

			<div className='report-store'>
				<span className='store-name'>{report.storeName}</span>
				{report.storeAddress && (
					<span className='store-address'>{report.storeAddress}</span>
				)}
			</div>

			<div className='report-info'>
				{report.priceRange && (
					<span className='info-item price'>
						💵 {report.priceRange}
					</span>
				)}
				{report.notes && (
					<span className='info-item notes' title={report.notes}>
						📝{' '}
						{report.notes.length > 30
							? report.notes.slice(0, 30) + '...'
							: report.notes}
					</span>
				)}
			</div>

			<div className='report-meta'>
				<span className='reported-by'>
					{report.reportedBy?.displayName ||
						report.reportedBy?.email ||
						'Anonymous'}
				</span>
				<span className='reported-at'>
					{formatDate(report.createdAt)}
				</span>
			</div>

			<div className='report-actions'>
				<button
					onClick={onApprove}
					className='approve-btn'
					title='Approve'>
					✓
				</button>
				<button
					onClick={onReject}
					className='reject-btn'
					title='Reject'>
					×
				</button>
			</div>
		</div>
	);
}
