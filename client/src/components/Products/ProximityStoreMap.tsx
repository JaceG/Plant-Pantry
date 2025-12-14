import { useState, useEffect, useMemo, useCallback } from 'react';
import { Store } from '../../types/store';
import { StoreMap } from './StoreMap';
import './ProximityStoreMap.css';

interface ProximityStoreMapProps {
	stores: Store[];
	height?: string;
	defaultRadius?: number; // in miles
}

// Haversine formula to calculate distance between two points
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

export function ProximityStoreMap({
	stores,
	height = '400px',
	defaultRadius = 50,
}: ProximityStoreMapProps) {
	const [userLocation, setUserLocation] = useState<{
		lat: number;
		lng: number;
	} | null>(null);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [locationLoading, setLocationLoading] = useState(true);
	const [radius, setRadius] = useState(defaultRadius);
	const [showAll, setShowAll] = useState(false);
	const [manualSearch, setManualSearch] = useState('');
	const [searchLocation, setSearchLocation] = useState<{
		lat: number;
		lng: number;
	} | null>(null);

	// Get user's location on mount
	useEffect(() => {
		if (!navigator.geolocation) {
			setLocationError('Geolocation is not supported by your browser');
			setLocationLoading(false);
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setUserLocation({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
				setLocationLoading(false);
			},
			(error) => {
				console.warn('Geolocation error:', error.message);
				setLocationError(
					'Unable to get your location. You can search manually or view all stores.'
				);
				setLocationLoading(false);
			},
			{
				enableHighAccuracy: false,
				timeout: 10000,
				maximumAge: 300000, // 5 minutes
			}
		);
	}, []);

	// Active location (user's or searched)
	const activeLocation = searchLocation || userLocation;

	// Filter stores by proximity
	const filteredStores = useMemo(() => {
		const storesWithCoords = stores.filter(
			(s) => s.latitude && s.longitude
		);

		if (showAll || !activeLocation) {
			return storesWithCoords;
		}

		return storesWithCoords
			.map((store) => ({
				store,
				distance: calculateDistance(
					activeLocation.lat,
					activeLocation.lng,
					store.latitude!,
					store.longitude!
				),
			}))
			.filter((item) => item.distance <= radius)
			.sort((a, b) => a.distance - b.distance)
			.map((item) => item.store);
	}, [stores, activeLocation, radius, showAll]);

	// Count stores outside radius
	const storesOutsideRadius = useMemo(() => {
		if (!activeLocation || showAll) return 0;
		const storesWithCoords = stores.filter(
			(s) => s.latitude && s.longitude
		);
		return storesWithCoords.length - filteredStores.length;
	}, [stores, filteredStores, activeLocation, showAll]);

	// Handle manual location search using geocoding
	const handleSearch = useCallback(async () => {
		if (!manualSearch.trim()) return;

		try {
			// Use browser's Geocoding API if available, or a simple lookup
			// For now, we'll rely on Google Maps Geocoder if loaded
			if (window.google?.maps?.Geocoder) {
				const geocoder = new window.google.maps.Geocoder();
				geocoder.geocode(
					{ address: manualSearch },
					(results: any, status: any) => {
						if (status === 'OK' && results[0]) {
							const location = results[0].geometry.location;
							setSearchLocation({
								lat: location.lat(),
								lng: location.lng(),
							});
							setLocationError(null);
						} else {
							setLocationError(
								'Could not find that location. Try a different search.'
							);
						}
					}
				);
			} else {
				setLocationError(
					'Location search is not available. Please enable location access.'
				);
			}
		} catch (error) {
			console.error('Geocoding error:', error);
			setLocationError('Failed to search location.');
		}
	}, [manualSearch]);

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};

	// Show loading state
	if (locationLoading) {
		return (
			<div className='proximity-map-container' style={{ height }}>
				<div className='proximity-map-loading'>
					<span className='loading-spinner' />
					<p>Getting your location...</p>
				</div>
			</div>
		);
	}

	// Total stores with coordinates
	const totalStoresWithCoords = stores.filter(
		(s) => s.latitude && s.longitude
	).length;

	return (
		<div className='proximity-map-wrapper'>
			<div className='proximity-map-controls'>
				<div className='proximity-map-info'>
					{activeLocation && !showAll ? (
						<span className='proximity-status'>
							📍 Showing {filteredStores.length} store
							{filteredStores.length !== 1 ? 's' : ''} within{' '}
							{radius} miles
							{storesOutsideRadius > 0 && (
								<span className='stores-outside'>
									{' '}
									({storesOutsideRadius} more farther away)
								</span>
							)}
						</span>
					) : showAll ? (
						<span className='proximity-status'>
							📍 Showing all {totalStoresWithCoords} stores
						</span>
					) : (
						<span className='proximity-status location-unavailable'>
							📍 Location not available
						</span>
					)}
				</div>

				<div className='proximity-map-actions'>
					{activeLocation && !showAll && (
						<select
							value={radius}
							onChange={(e) => setRadius(Number(e.target.value))}
							className='radius-select'>
							<option value={25}>25 miles</option>
							<option value={50}>50 miles</option>
							<option value={100}>100 miles</option>
							<option value={250}>250 miles</option>
						</select>
					)}

					{!showAll && storesOutsideRadius > 0 && (
						<button
							onClick={() => setShowAll(true)}
							className='show-all-btn'>
							Show All Stores
						</button>
					)}

					{showAll && activeLocation && (
						<button
							onClick={() => setShowAll(false)}
							className='show-nearby-btn'>
							Show Nearby Only
						</button>
					)}
				</div>
			</div>

			{locationError && !activeLocation && (
				<div className='proximity-search-fallback'>
					<p className='fallback-message'>{locationError}</p>
					<div className='fallback-search'>
						<input
							type='text'
							value={manualSearch}
							onChange={(e) => setManualSearch(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder='Enter city, state or ZIP...'
							className='fallback-search-input'
						/>
						<button
							onClick={handleSearch}
							disabled={!manualSearch.trim()}
							className='fallback-search-btn'>
							Search
						</button>
					</div>
					<button
						onClick={() => setShowAll(true)}
						className='view-all-link'>
						Or view all {totalStoresWithCoords} stores
					</button>
				</div>
			)}

			{filteredStores.length > 0 ? (
				<StoreMap stores={filteredStores} height={height} />
			) : activeLocation ? (
				<div className='proximity-map-empty'>
					<p>
						No stores found within {radius} miles of your location.
					</p>
					<button
						onClick={() => setRadius(radius * 2)}
						className='expand-radius-btn'>
						Search within {radius * 2} miles
					</button>
					<button
						onClick={() => setShowAll(true)}
						className='show-all-link'>
						Or view all stores
					</button>
				</div>
			) : (
				<StoreMap stores={stores} height={height} />
			)}
		</div>
	);
}
