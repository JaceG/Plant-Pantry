import { useState, useMemo } from 'react';
import { Store } from '../../types/store';
import { StoreMap } from './StoreMap';
import { useLocation } from '../../context/LocationContext';
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
	const { location, hasLocation } = useLocation();
	const [radius, setRadius] = useState(defaultRadius);
	const [showAll, setShowAll] = useState(false);

	// Get user coordinates
	const userLat = location?.lat;
	const userLng = location?.lng;
	const hasCoordinates = Boolean(userLat && userLng);

	// Filter stores that have coordinates
	const storesWithCoords = useMemo(
		() => stores.filter((s) => s.latitude && s.longitude),
		[stores]
	);

	// Filter stores by proximity (always called, but returns different results based on conditions)
	const filteredStores = useMemo(() => {
		// If showing all or no coordinates, return all stores with coords
		if (showAll || !hasCoordinates || !userLat || !userLng) {
			return storesWithCoords;
		}

		return storesWithCoords
			.map((store) => ({
				store,
				distance: calculateDistance(
					userLat,
					userLng,
					store.latitude!,
					store.longitude!
				),
			}))
			.filter((item) => item.distance <= radius)
			.sort((a, b) => a.distance - b.distance)
			.map((item) => item.store);
	}, [storesWithCoords, userLat, userLng, radius, showAll, hasCoordinates]);

	// Count stores outside radius
	const storesOutsideRadius = useMemo(() => {
		if (showAll || !hasCoordinates) return 0;
		return storesWithCoords.length - filteredStores.length;
	}, [
		storesWithCoords.length,
		filteredStores.length,
		showAll,
		hasCoordinates,
	]);

	// If no location is set, don't show the map at all
	if (!hasLocation || !location) {
		return null;
	}

	// If no stores have coordinates, don't show the map
	if (storesWithCoords.length === 0) {
		return null;
	}

	// If we don't have coordinates, show a message but still display all stores
	if (!hasCoordinates) {
		return (
			<div className='proximity-map-wrapper'>
				<div className='proximity-map-controls'>
					<div className='proximity-map-info'>
						<span className='proximity-status'>
							📍 Location set to {location.city}, {location.state}{' '}
							(showing all {storesWithCoords.length} stores)
						</span>
					</div>
				</div>
				<StoreMap stores={storesWithCoords} height={height} />
			</div>
		);
	}

	return (
		<div className='proximity-map-wrapper'>
			<div className='proximity-map-controls'>
				<div className='proximity-map-info'>
					{!showAll ? (
						<span className='proximity-status'>
							📍 Showing {filteredStores.length} store
							{filteredStores.length !== 1 ? 's' : ''} within{' '}
							{radius} miles of {location.city}
							{storesOutsideRadius > 0 && (
								<span className='stores-outside'>
									{' '}
									({storesOutsideRadius} more farther away)
								</span>
							)}
						</span>
					) : (
						<span className='proximity-status'>
							📍 Showing all {storesWithCoords.length} stores
						</span>
					)}
				</div>

				<div className='proximity-map-actions'>
					{!showAll && (
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

					{showAll && (
						<button
							onClick={() => setShowAll(false)}
							className='show-nearby-btn'>
							Show Nearby Only
						</button>
					)}
				</div>
			</div>

			{filteredStores.length > 0 ? (
				<StoreMap stores={filteredStores} height={height} />
			) : (
				<div className='proximity-map-empty'>
					<p>
						No stores found within {radius} miles of {location.city}
						.
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
			)}
		</div>
	);
}
