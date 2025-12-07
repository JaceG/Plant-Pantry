import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { authApi } from '../api/authApi';
import './ProfileScreen.css';

export function ProfileScreen() {
	const navigate = useNavigate();
	const { user, isAuthenticated, updateUser } = useAuth();
	const {
		location: userLocation,
		cities,
		isGeolocating,
		setLocationByCity,
		useGeolocation,
		clearLocation,
		locationDisplay,
	} = useLocation();

	const [displayName, setDisplayName] = useState(user?.displayName || '');
	const [selectedCity, setSelectedCity] = useState('');
	const [selectedState, setSelectedState] = useState('');
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{
		type: 'success' | 'error';
		text: string;
	} | null>(null);

	// Update form when user loads
	useEffect(() => {
		if (user) {
			setDisplayName(user.displayName);
			if (user.preferredCity && user.preferredState) {
				setSelectedCity(user.preferredCity);
				setSelectedState(user.preferredState);
			} else if (userLocation) {
				setSelectedCity(userLocation.city);
				setSelectedState(userLocation.state);
			}
		}
	}, [user, userLocation]);

	// Redirect if not authenticated
	useEffect(() => {
		if (!isAuthenticated) {
			navigate('/login');
		}
	}, [isAuthenticated, navigate]);

	const handleCityChange = (value: string) => {
		const [city, state] = value.split('|');
		setSelectedCity(city || '');
		setSelectedState(state || '');
	};

	const handleUseMyLocation = async () => {
		await useGeolocation();
		// After geolocation, update the form with the detected location
		if (userLocation) {
			setSelectedCity(userLocation.city);
			setSelectedState(userLocation.state);
		}
	};

	const handleClearLocation = () => {
		setSelectedCity('');
		setSelectedState('');
		clearLocation();
	};

	const handleSave = async () => {
		if (!user) return;

		setSaving(true);
		setMessage(null);

		try {
			const updates: {
				displayName?: string;
				preferredCity?: string;
				preferredState?: string;
				latitude?: number;
				longitude?: number;
			} = {};

			if (displayName !== user.displayName) {
				updates.displayName = displayName;
			}

			// Save location to profile
			if (selectedCity && selectedState) {
				updates.preferredCity = selectedCity;
				updates.preferredState = selectedState;

				// Also save coordinates if we have them from geolocation
				if (userLocation?.lat && userLocation?.lng) {
					updates.latitude = userLocation.lat;
					updates.longitude = userLocation.lng;
				}

				// Update the location context as well
				setLocationByCity(selectedCity, selectedState);
			} else if (!selectedCity && user.preferredCity) {
				// User is clearing their location
				updates.preferredCity = '';
				updates.preferredState = '';
			}

			if (Object.keys(updates).length === 0) {
				setMessage({ type: 'success', text: 'No changes to save' });
				setSaving(false);
				return;
			}

			const response = await authApi.updateProfile(updates);
			updateUser(response.user);

			setMessage({
				type: 'success',
				text: 'Profile updated successfully!',
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to update profile';
			setMessage({ type: 'error', text: errorMessage });
		} finally {
			setSaving(false);
		}
	};

	if (!user) {
		return (
			<div className='profile-screen'>
				<div className='profile-loading'>Loading...</div>
			</div>
		);
	}

	return (
		<div className='profile-screen'>
			<div className='profile-container'>
				<div className='profile-header'>
					<Link to='/' className='back-link'>
						← Back to Browse
					</Link>
					<h1>Profile Settings</h1>
					<p>Manage your account and location preferences</p>
				</div>

				{message && (
					<div className={`profile-message ${message.type}`}>
						{message.text}
					</div>
				)}

				<div className='profile-sections'>
					{/* Account Info Section */}
					<section className='profile-section'>
						<h2>
							<span className='section-icon'>👤</span>
							Account Information
						</h2>
						<div className='form-group'>
							<label htmlFor='email'>Email</label>
							<input
								type='email'
								id='email'
								value={user.email}
								disabled
								className='input-disabled'
							/>
							<span className='field-hint'>
								Email cannot be changed
							</span>
						</div>
						<div className='form-group'>
							<label htmlFor='displayName'>Display Name</label>
							<input
								type='text'
								id='displayName'
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								placeholder='Your display name'
							/>
							<span className='field-hint'>
								This is how you'll appear to other users
							</span>
						</div>
						{user.authProvider !== 'local' && (
							<div className='auth-provider-badge'>
								Signed in with{' '}
								{user.authProvider === 'google'
									? 'Google'
									: 'Apple'}
							</div>
						)}
					</section>

					{/* Location Section */}
					<section className='profile-section'>
						<h2>
							<span className='section-icon'>📍</span>
							Location Preferences
						</h2>
						<p className='section-description'>
							Set your location to see products available near you
							and get personalized recommendations.
						</p>

						<div className='location-actions'>
							<button
								type='button'
								className='geolocation-btn'
								onClick={handleUseMyLocation}
								disabled={isGeolocating}>
								{isGeolocating ? (
									<>
										<span className='spinner'></span>
										Finding location...
									</>
								) : (
									<>
										<span className='geo-icon'>🎯</span>
										Use my current location
									</>
								)}
							</button>
						</div>

						<div className='form-group'>
							<label htmlFor='city'>Preferred City</label>
							<select
								id='city'
								value={
									selectedCity && selectedState
										? `${selectedCity}|${selectedState}`
										: ''
								}
								onChange={(e) =>
									handleCityChange(e.target.value)
								}>
								<option value=''>Select a city...</option>
								{cities.map((city) => (
									<option
										key={city.slug}
										value={`${city.cityName}|${city.state}`}>
										{city.cityName}, {city.state}
									</option>
								))}
							</select>
							<span className='field-hint'>
								Products will be filtered to show availability
								in this area
							</span>
						</div>

						{(selectedCity || locationDisplay) && (
							<div className='current-location'>
								<span className='location-label'>
									Current location:
								</span>
								<span className='location-value'>
									{selectedCity && selectedState
										? `${selectedCity}, ${selectedState}`
										: locationDisplay || 'Not set'}
								</span>
								<button
									type='button'
									className='clear-btn'
									onClick={handleClearLocation}>
									Clear
								</button>
							</div>
						)}
					</section>

					{/* Contributions Section */}
					<section className='profile-section'>
						<h2>
							<span className='section-icon'>🌱</span>
							Your Contributions
						</h2>
						<div className='contributions-summary'>
							<p>
								Thank you for helping build The Vegan Aisle
								community!
							</p>
							<div className='contribution-links'>
								<Link
									to='/add-product'
									className='contrib-link'>
									➕ Add a new product
								</Link>
							</div>
						</div>
					</section>
				</div>

				<div className='profile-actions'>
					<button
						className='save-btn'
						onClick={handleSave}
						disabled={saving}>
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</div>
		</div>
	);
}
