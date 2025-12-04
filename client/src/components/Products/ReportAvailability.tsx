import { useState, useEffect } from 'react';
import { productsApi, StoreLocation } from '../../api/productsApi';
import { useAuth } from '../../context/AuthContext';
import './ReportAvailability.css';

interface ReportAvailabilityProps {
	productId: string;
	productName: string;
	onSuccess?: () => void;
}

export function ReportAvailability({
	productId,
	productName,
	onSuccess,
}: ReportAvailabilityProps) {
	const { isAuthenticated } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [locations, setLocations] = useState<StoreLocation[]>([]);
	const [selectedLocation, setSelectedLocation] = useState('');
	const [selectedStore, setSelectedStore] = useState('');
	const [priceRange, setPriceRange] = useState('');
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);
	const [loadingStores, setLoadingStores] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Fetch stores when modal opens
	useEffect(() => {
		if (isOpen) {
			fetchStores();
		}
	}, [isOpen]);

	const fetchStores = async () => {
		setLoadingStores(true);
		try {
			const res = await productsApi.getStoresByCity();
			setLocations(res.locations);
		} catch (err) {
			console.error('Failed to fetch stores:', err);
		} finally {
			setLoadingStores(false);
		}
	};

	const handleLocationChange = (locationKey: string) => {
		setSelectedLocation(locationKey);
		setSelectedStore('');
	};

	const getStoresForLocation = () => {
		if (!selectedLocation) return [];
		const location = locations.find(
			(l) => `${l.city}, ${l.state}` === selectedLocation
		);
		return location?.stores || [];
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStore) {
			setError('Please select a store');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await productsApi.reportAvailability(
				productId,
				selectedStore,
				priceRange || undefined,
				notes || undefined
			);
			setSuccess(res.message);
			// Reset form after success
			setTimeout(() => {
				setIsOpen(false);
				setSelectedLocation('');
				setSelectedStore('');
				setPriceRange('');
				setNotes('');
				setSuccess(null);
				onSuccess?.();
			}, 2000);
		} catch (err: any) {
			setError(err.message || 'Failed to report availability');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		setIsOpen(false);
		setError(null);
		setSuccess(null);
	};

	if (!isAuthenticated) {
		return (
			<div className='report-availability-cta'>
				<p className='cta-text'>
					📍 Found this at a store? <a href='/login'>Log in</a> to
					report it!
				</p>
			</div>
		);
	}

	return (
		<div className='report-availability'>
			{!isOpen ? (
				<button
					onClick={() => setIsOpen(true)}
					className='report-trigger'>
					<span className='trigger-icon'>📍</span>
					<span className='trigger-text'>Found this somewhere?</span>
					<span className='trigger-action'>Report Availability</span>
				</button>
			) : (
				<div className='report-modal-overlay' onClick={handleClose}>
					<div
						className='report-modal'
						onClick={(e) => e.stopPropagation()}>
						<button
							onClick={handleClose}
							className='close-btn'
							aria-label='Close'>
							×
						</button>

						<h2>Report Availability</h2>
						<p className='modal-subtitle'>
							Where did you find <strong>{productName}</strong>?
						</p>

						{success ? (
							<div className='success-message'>
								<span className='success-icon'>✓</span>
								{success}
							</div>
						) : (
							<form onSubmit={handleSubmit}>
								{error && (
									<div className='error-message'>{error}</div>
								)}

								<div className='form-group'>
									<label>City/Location *</label>
									{loadingStores ? (
										<div className='loading-stores'>
											Loading stores...
										</div>
									) : (
										<select
											value={selectedLocation}
											onChange={(e) =>
												handleLocationChange(
													e.target.value
												)
											}
											required>
											<option value=''>
												Select a location...
											</option>
											{locations.map((loc) => (
												<option
													key={`${loc.city}, ${loc.state}`}
													value={`${loc.city}, ${loc.state}`}>
													{loc.city}, {loc.state} (
													{loc.stores.length}{' '}
													{loc.stores.length === 1
														? 'store'
														: 'stores'}
													)
												</option>
											))}
										</select>
									)}
								</div>

								{selectedLocation && (
									<div className='form-group'>
										<label>Store *</label>
										<select
											value={selectedStore}
											onChange={(e) =>
												setSelectedStore(e.target.value)
											}
											required>
											<option value=''>
												Select a store...
											</option>
											{getStoresForLocation().map(
												(store) => (
													<option
														key={store.id}
														value={store.id}>
														{store.name}
														{store.address &&
															` - ${store.address}`}
													</option>
												)
											)}
										</select>
									</div>
								)}

								<div className='form-group'>
									<label>Price (optional)</label>
									<input
										type='text'
										value={priceRange}
										onChange={(e) =>
											setPriceRange(e.target.value)
										}
										placeholder='e.g., $4.99 or $4-6'
									/>
								</div>

								<div className='form-group'>
									<label>Notes (optional)</label>
									<textarea
										value={notes}
										onChange={(e) =>
											setNotes(e.target.value)
										}
										placeholder='e.g., Found in the frozen section'
										rows={2}
										maxLength={500}
									/>
								</div>

								<div className='form-actions'>
									<button
										type='button'
										onClick={handleClose}
										className='cancel-btn'>
										Cancel
									</button>
									<button
										type='submit'
										disabled={loading || !selectedStore}
										className='submit-btn'>
										{loading
											? 'Submitting...'
											: 'Report Availability'}
									</button>
								</div>
							</form>
						)}
					</div>
				</div>
			)}
		</div>
	);
}


