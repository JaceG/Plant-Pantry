import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { citiesApi } from '../api/citiesApi';

export interface UserLocation {
	city: string;
	state: string;
	lat?: number;
	lng?: number;
	source: 'manual' | 'geolocation' | 'profile';
}

export interface CityOption {
	slug: string;
	cityName: string;
	state: string;
}

interface LocationContextType {
	location: UserLocation | null;
	cities: CityOption[];
	isLoading: boolean;
	isGeolocating: boolean;
	error: string | null;
	setLocation: (location: UserLocation | null) => void;
	setLocationByCity: (city: string, state: string) => void;
	useGeolocation: () => Promise<void>;
	clearLocation: () => void;
	hasLocation: boolean;
	locationDisplay: string;
}

const LocationContext = createContext<LocationContextType | undefined>(
	undefined
);

const LOCATION_STORAGE_KEY = 'plant-pantry-location';

interface LocationProviderProps {
	children: ReactNode;
}

// Reverse geocode is now handled by the backend via citiesApi.reverseGeocode()

export function LocationProvider({ children }: LocationProviderProps) {
	const { user, isAuthenticated } = useAuth();
	const [location, setLocationState] = useState<UserLocation | null>(null);
	const [cities, setCities] = useState<CityOption[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isGeolocating, setIsGeolocating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load available cities on mount
	useEffect(() => {
		const loadCities = async () => {
			try {
				const response = await citiesApi.getActiveCities();
				setCities(
					response.cities.map((c) => ({
						slug: c.slug,
						cityName: c.cityName,
						state: c.state,
					}))
				);
			} catch (err) {
				console.error('Failed to load cities:', err);
			}
		};
		loadCities();
	}, []);

	// Load location on mount - from user profile or localStorage
	useEffect(() => {
		const loadLocation = async () => {
			setIsLoading(true);

			// If user is authenticated and has location in profile, use that
			if (
				isAuthenticated &&
				user?.preferredCity &&
				user?.preferredState
			) {
				setLocationState({
					city: user.preferredCity,
					state: user.preferredState,
					lat: user.latitude,
					lng: user.longitude,
					source: 'profile',
				});
				setIsLoading(false);
				return;
			}

			// Otherwise, check localStorage
			const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
			if (stored) {
				try {
					const parsed = JSON.parse(stored);
					setLocationState(parsed);
				} catch (e) {
					console.error('Failed to parse stored location:', e);
				}
			}

			setIsLoading(false);
		};

		loadLocation();
	}, [isAuthenticated, user]);

	// Save location to localStorage whenever it changes
	useEffect(() => {
		if (location) {
			localStorage.setItem(
				LOCATION_STORAGE_KEY,
				JSON.stringify(location)
			);
		} else {
			localStorage.removeItem(LOCATION_STORAGE_KEY);
		}
	}, [location]);

	const setLocation = useCallback((newLocation: UserLocation | null) => {
		setLocationState(newLocation);
		setError(null);
	}, []);

	const setLocationByCity = useCallback((city: string, state: string) => {
		setLocationState({
			city,
			state,
			source: 'manual',
		});
		setError(null);
	}, []);

	const useGeolocation = useCallback(async () => {
		if (!navigator.geolocation) {
			setError('Geolocation is not supported by your browser');
			return;
		}

		setIsGeolocating(true);
		setError(null);

		try {
			// Step 1: Get coordinates from browser
			const position = await new Promise<GeolocationPosition>(
				(resolve, reject) => {
					navigator.geolocation.getCurrentPosition(resolve, reject, {
						enableHighAccuracy: true,
						timeout: 10000,
						maximumAge: 300000, // 5 minutes
					});
				}
			);

			const { latitude, longitude } = position.coords;

			// Step 2: Reverse geocode using Google Maps API via our backend
			try {
				const geocodeResult = await citiesApi.reverseGeocode(
					latitude,
					longitude
				);

				if (geocodeResult.city && geocodeResult.state) {
					setLocationState({
						city: geocodeResult.city,
						state: geocodeResult.state,
						lat: latitude,
						lng: longitude,
						source: 'geolocation',
					});
				} else {
					// Geocoding didn't return a city, use coordinates only
					setLocationState({
						city: 'Your Location',
						state: '',
						lat: latitude,
						lng: longitude,
						source: 'geolocation',
					});
				}
			} catch (geocodeError) {
				console.error('Geocoding failed:', geocodeError);
				// Fall back to coordinates only
				setLocationState({
					city: 'Your Location',
					state: '',
					lat: latitude,
					lng: longitude,
					source: 'geolocation',
				});
			}
		} catch (err) {
			const geoError = err as GeolocationPositionError;
			switch (geoError.code) {
				case geoError.PERMISSION_DENIED:
					setError('Location permission denied');
					break;
				case geoError.POSITION_UNAVAILABLE:
					setError('Location unavailable');
					break;
				case geoError.TIMEOUT:
					setError('Location request timed out');
					break;
				default:
					setError('Failed to get location');
			}
		} finally {
			setIsGeolocating(false);
		}
	}, []);

	const clearLocation = useCallback(() => {
		setLocationState(null);
		setError(null);
	}, []);

	const hasLocation = !!location;
	const locationDisplay = location
		? location.state
			? `${location.city}, ${location.state}`
			: location.city
		: '';

	const value: LocationContextType = {
		location,
		cities,
		isLoading,
		isGeolocating,
		error,
		setLocation,
		setLocationByCity,
		useGeolocation,
		clearLocation,
		hasLocation,
		locationDisplay,
	};

	return (
		<LocationContext.Provider value={value}>
			{children}
		</LocationContext.Provider>
	);
}

export function useLocation(): LocationContextType {
	const context = useContext(LocationContext);

	if (context === undefined) {
		throw new Error('useLocation must be used within a LocationProvider');
	}

	return context;
}

export { LocationContext };
