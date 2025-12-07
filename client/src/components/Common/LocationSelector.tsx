import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import './LocationSelector.css';

export function LocationSelector() {
	const {
		location,
		cities,
		isGeolocating,
		error,
		setLocationByCity,
		useGeolocation,
		clearLocation,
		hasLocation,
		locationDisplay,
	} = useLocation();

	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () =>
			document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleCitySelect = (cityName: string, state: string) => {
		setLocationByCity(cityName, state);
		setIsOpen(false);
	};

	const handleGeolocation = async () => {
		await useGeolocation();
		setIsOpen(false);
	};

	const handleClear = () => {
		clearLocation();
		setIsOpen(false);
	};

	// Get slug for the current city if it exists
	const currentCitySlug = cities.find(
		(c) => c.cityName === location?.city && c.state === location?.state
	)?.slug;

	return (
		<div className='location-selector' ref={dropdownRef}>
			<button
				className={`location-trigger ${
					hasLocation ? 'has-location' : ''
				}`}
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				aria-haspopup='true'>
				<span className='location-icon'>📍</span>
				<span className='location-text'>
					{hasLocation ? locationDisplay : 'Set Location'}
				</span>
				<span className={`location-chevron ${isOpen ? 'open' : ''}`}>
					▼
				</span>
			</button>

			{isOpen && (
				<div className='location-dropdown'>
					<div className='dropdown-header'>
						<h4>Your Location</h4>
						{hasLocation && (
							<button
								className='clear-location-btn'
								onClick={handleClear}>
								Clear
							</button>
						)}
					</div>

					{/* Use My Location Button */}
					<button
						className='geolocation-btn'
						onClick={handleGeolocation}
						disabled={isGeolocating}>
						{isGeolocating ? (
							<>
								<span className='geo-spinner'></span>
								<span>Finding location...</span>
							</>
						) : (
							<>
								<span className='geo-icon'>🎯</span>
								<span>Use my location</span>
							</>
						)}
					</button>

					{error && <div className='location-error'>{error}</div>}

					{/* City List */}
					<div className='city-list'>
						<div className='city-list-header'>
							Or choose a city:
						</div>
						{cities.length === 0 ? (
							<div className='no-cities'>Loading cities...</div>
						) : (
							cities.map((city) => (
								<button
									key={city.slug}
									className={`city-option ${
										location?.city === city.cityName &&
										location?.state === city.state
											? 'selected'
											: ''
									}`}
									onClick={() =>
										handleCitySelect(
											city.cityName,
											city.state
										)
									}>
									<span className='city-name'>
										{city.cityName}, {city.state}
									</span>
									{location?.city === city.cityName &&
										location?.state === city.state && (
											<span className='check-icon'>
												✓
											</span>
										)}
								</button>
							))
						)}
					</div>

					{/* Link to city page */}
					{hasLocation && currentCitySlug && (
						<div className='dropdown-footer'>
							<Link
								to={`/cities/${currentCitySlug}`}
								className='explore-city-link'
								onClick={() => setIsOpen(false)}>
								Explore {location?.city} stores →
							</Link>
						</div>
					)}

					{/* Link to profile for logged-in users */}
					<div className='dropdown-actions'>
						<Link
							to='/profile'
							className='profile-link'
							onClick={() => setIsOpen(false)}>
							⚙️ Manage location preferences
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}
