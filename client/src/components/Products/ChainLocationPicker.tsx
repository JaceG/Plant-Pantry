import { useState, useEffect, useCallback, useMemo } from 'react';
import { storesApi } from '../../api/storesApi';
import { Store, StoreChain } from '../../types/store';
import { usePreferredStores } from '../../hooks';
import './ChainLocationPicker.css';

interface ChainLocationPickerProps {
	chain: StoreChain;
	onSelectLocation: (store: Store) => void;
	onBack: () => void;
}

// Calculate distance between two coordinates in miles
function calculateDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const R = 3959; // Earth's radius in miles
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export function ChainLocationPicker({
	chain,
	onSelectLocation,
	onBack,
}: ChainLocationPickerProps) {
	const [stores, setStores] = useState<Store[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedState, setSelectedState] = useState<string>('');

	// Geolocation state
	const [userLocation, setUserLocation] = useState<{
		lat: number;
		lng: number;
	} | null>(null);
	const [locationLoading, setLocationLoading] = useState(false);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [sortByDistance, setSortByDistance] = useState(false);

	// Preferred stores
	const { isPreferred, togglePreferred } = usePreferredStores();

	// Calculate distances if user location is available
	const storesWithDistance = useMemo(() => {
		if (!userLocation) return stores.map((s) => ({ ...s, distance: null }));

		return stores.map((store) => {
			if (store.latitude && store.longitude) {
				const distance = calculateDistance(
					userLocation.lat,
					userLocation.lng,
					store.latitude,
					store.longitude
				);
				return { ...store, distance };
			}
			return { ...store, distance: null };
		});
	}, [stores, userLocation]);

	// Group stores by state then city
	const storesByState = storesWithDistance.reduce((acc, store) => {
		const state = store.state || 'Other';
		if (!acc[state]) acc[state] = [];
		acc[state].push(store);
		return acc;
	}, {} as Record<string, (Store & { distance: number | null })[]>);

	const states = Object.keys(storesByState).sort();

	// Filter stores based on search and state selection
	const filteredStores = storesWithDistance.filter((store) => {
		// State filter
		if (selectedState && store.state !== selectedState) return false;

		// Search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			const matchesCity = store.city?.toLowerCase().includes(query);
			const matchesAddress = store.address?.toLowerCase().includes(query);
			const matchesZip = store.zipCode?.includes(query);
			const matchesName = store.name.toLowerCase().includes(query);
			const matchesLocationId = store.locationIdentifier
				?.toLowerCase()
				.includes(query);

			return (
				matchesCity ||
				matchesAddress ||
				matchesZip ||
				matchesName ||
				matchesLocationId
			);
		}

		return true;
	});

	// Sort by distance if enabled, otherwise group by city
	const sortedByDistance = useMemo(() => {
		if (!sortByDistance || !userLocation) return null;

		return [...filteredStores].sort((a, b) => {
			if (a.distance === null && b.distance === null) return 0;
			if (a.distance === null) return 1;
			if (b.distance === null) return -1;
			return a.distance - b.distance;
		});
	}, [filteredStores, sortByDistance, userLocation]);

	// Group filtered stores by city (when not sorting by distance)
	const filteredByCity = filteredStores.reduce((acc, store) => {
		const city = store.city || 'Other';
		if (!acc[city]) acc[city] = [];
		acc[city].push(store);
		return acc;
	}, {} as Record<string, (Store & { distance: number | null })[]>);

	const cities = Object.keys(filteredByCity).sort();

	// Handle "Use my location" button
	const handleUseMyLocation = useCallback(() => {
		if (!navigator.geolocation) {
			setLocationError('Geolocation is not supported by your browser');
			return;
		}

		setLocationLoading(true);
		setLocationError(null);

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setUserLocation({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
				setSortByDistance(true);
				setLocationLoading(false);
			},
			(error) => {
				setLocationLoading(false);
				switch (error.code) {
					case error.PERMISSION_DENIED:
						setLocationError(
							'Location access denied. Please enable location permissions.'
						);
						break;
					case error.POSITION_UNAVAILABLE:
						setLocationError('Location information unavailable.');
						break;
					case error.TIMEOUT:
						setLocationError('Location request timed out.');
						break;
					default:
						setLocationError('Unable to get your location.');
				}
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
		);
	}, []);

	const handleClearLocation = useCallback(() => {
		setUserLocation(null);
		setSortByDistance(false);
		setLocationError(null);
	}, []);

	useEffect(() => {
		const fetchLocations = async () => {
			setLoading(true);
			try {
				const response = await storesApi.getChainLocations(chain.id);
				setStores(response.stores);
			} catch (error) {
				console.error('Failed to load chain locations:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchLocations();
	}, [chain.id]);

	const handleSelectStore = useCallback(
		(store: Store) => {
			onSelectLocation(store);
		},
		[onSelectLocation]
	);

	if (loading) {
		return (
			<div className='chain-location-picker'>
				<div className='picker-header'>
					<button className='back-btn' onClick={onBack}>
						← Back
					</button>
					<h3>{chain.name}</h3>
				</div>
				<div className='loading-state'>
					<div className='loading-spinner' />
					<span>Loading locations...</span>
				</div>
			</div>
		);
	}

	return (
		<div className='chain-location-picker'>
			<div className='picker-header'>
				<button className='back-btn' onClick={onBack}>
					← Back
				</button>
				<div className='header-info'>
					<h3>{chain.name}</h3>
					<span className='location-count'>
						{stores.length} location{stores.length !== 1 ? 's' : ''}
					</span>
				</div>
			</div>

			{/* Geolocation Button */}
			<div className='location-actions'>
				{!userLocation ? (
					<button
						type='button'
						className='use-location-btn'
						onClick={handleUseMyLocation}
						disabled={locationLoading}>
						{locationLoading ? (
							<>
								<span className='location-spinner'></span>
								Finding location...
							</>
						) : (
							<>
								<span className='location-icon'>📍</span>
								Use my location
							</>
						)}
					</button>
				) : (
					<div className='location-active'>
						<span className='location-badge'>
							📍 Showing nearest locations
						</span>
						<button
							type='button'
							className='clear-location-btn'
							onClick={handleClearLocation}>
							✕
						</button>
					</div>
				)}
				{locationError && (
					<span className='location-error'>{locationError}</span>
				)}
			</div>

			<div className='picker-filters'>
				<input
					type='text'
					placeholder='Search by city, address, or ZIP...'
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className='search-input'
				/>

				{states.length > 1 && !sortByDistance && (
					<select
						value={selectedState}
						onChange={(e) => setSelectedState(e.target.value)}
						className='state-select'>
						<option value=''>All States</option>
						{states.map((state) => (
							<option key={state} value={state}>
								{state} ({storesByState[state].length})
							</option>
						))}
					</select>
				)}
			</div>

			{filteredStores.length === 0 ? (
				<div className='empty-state'>
					<p>No locations found matching your search.</p>
				</div>
			) : sortByDistance && sortedByDistance ? (
				// Distance-sorted flat list
				<div className='locations-list'>
					<div className='distance-list'>
						{sortedByDistance.map((store) => (
							<div
								key={store.id}
								className={`location-item with-distance ${
									isPreferred(store.id) ? 'preferred' : ''
								}`}>
								<button
									type='button'
									className='favorite-btn'
									onClick={(e) => {
										e.stopPropagation();
										togglePreferred({
											id: store.id,
											name: store.name,
											chainId: chain.id,
											chainName: chain.name,
											address: store.address,
											city: store.city,
											state: store.state,
										});
									}}
									title={
										isPreferred(store.id)
											? 'Remove from favorites'
											: 'Add to favorites'
									}>
									{isPreferred(store.id) ? '★' : '☆'}
								</button>
								<button
									type='button'
									className='location-select-btn'
									onClick={() => handleSelectStore(store)}>
									<div className='location-info'>
										<span className='location-name'>
											{store.locationIdentifier ||
												store.name}
										</span>
										<span className='location-address'>
											{store.address &&
												`${store.address}, `}
											{store.city}
											{store.state && `, ${store.state}`}
											{store.zipCode &&
												` ${store.zipCode}`}
										</span>
									</div>
									<div className='location-distance'>
										{store.distance !== null ? (
											<span className='distance-badge'>
												{store.distance < 1
													? `${(
															store.distance *
															5280
													  ).toFixed(0)} ft`
													: `${store.distance.toFixed(
															1
													  )} mi`}
											</span>
										) : (
											<span className='distance-unknown'>
												—
											</span>
										)}
										<span className='select-icon'>→</span>
									</div>
								</button>
							</div>
						))}
					</div>
				</div>
			) : (
				// City-grouped list
				<div className='locations-list'>
					{cities.map((city) => {
						// Sort stores in city - preferred first
						const cityStores = [...filteredByCity[city]].sort(
							(a, b) => {
								const aPreferred = isPreferred(a.id);
								const bPreferred = isPreferred(b.id);
								if (aPreferred && !bPreferred) return -1;
								if (!aPreferred && bPreferred) return 1;
								return 0;
							}
						);

						return (
							<div key={city} className='city-group'>
								<h4 className='city-header'>
									{city}
									{filteredByCity[city][0]?.state &&
										`, ${filteredByCity[city][0].state}`}
									<span className='city-count'>
										({filteredByCity[city].length})
									</span>
								</h4>
								<div className='city-stores'>
									{cityStores.map((store) => (
										<div
											key={store.id}
											className={`location-item ${
												isPreferred(store.id)
													? 'preferred'
													: ''
											}`}>
											<button
												type='button'
												className='favorite-btn'
												onClick={(e) => {
													e.stopPropagation();
													togglePreferred({
														id: store.id,
														name: store.name,
														chainId: chain.id,
														chainName: chain.name,
														address: store.address,
														city: store.city,
														state: store.state,
													});
												}}
												title={
													isPreferred(store.id)
														? 'Remove from favorites'
														: 'Add to favorites'
												}>
												{isPreferred(store.id)
													? '★'
													: '☆'}
											</button>
											<button
												type='button'
												className='location-select-btn'
												onClick={() =>
													handleSelectStore(store)
												}>
												<div className='location-info'>
													<span className='location-name'>
														{store.locationIdentifier ||
															store.name}
													</span>
													{store.address && (
														<span className='location-address'>
															{store.address}
															{store.zipCode &&
																`, ${store.zipCode}`}
														</span>
													)}
												</div>
												<span className='select-icon'>
													→
												</span>
											</button>
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
