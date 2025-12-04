import { useEffect, useRef, useState } from 'react';
import { Store } from '../../types/store';
import { httpClient } from '../../api/httpClient';
import './StoreMap.css';

interface StoreMapProps {
	stores: Store[];
	selectedStoreId?: string;
	height?: string;
}

declare global {
	interface Window {
		google: any;
		initMap: () => void;
	}
}

export function StoreMap({
	stores,
	selectedStoreId,
	height = '400px',
}: StoreMapProps) {
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const markersRef = useRef<any[]>([]);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [apiKey, setApiKey] = useState<string | null>(null);

	// Get API key from backend
	useEffect(() => {
		const fetchApiKey = async () => {
			try {
				// Get API key from backend
				const data = await httpClient.get<{ apiKey: string }>(
					'/config/google-api-key',
					{ skipAuth: true }
				);
				if (data.apiKey) {
					setApiKey(data.apiKey);
				} else {
					// Fallback: try to get from env (if exposed)
					const envKey = import.meta.env.VITE_GOOGLE_API_KEY;
					if (envKey) {
						setApiKey(envKey);
					}
				}
			} catch (error) {
				console.error('Failed to get Google API key:', error);
				// Try env as fallback
				const envKey = import.meta.env.VITE_GOOGLE_API_KEY;
				if (envKey) {
					setApiKey(envKey);
				}
			}
		};

		fetchApiKey();
	}, []);

	// Load Google Maps script
	useEffect(() => {
		if (!apiKey || mapLoaded) return;

		// Check if Maps API is already fully loaded
		if (window.google && window.google.maps && window.google.maps.Map) {
			setMapLoaded(true);
			return;
		}

		// Helper to check if Maps API is ready
		const checkMapsReady = () => {
			return (
				window.google && window.google.maps && window.google.maps.Map
			);
		};

		// Poll for Maps API readiness (needed because loading=async)
		const waitForMaps = () => {
			if (checkMapsReady()) {
				setMapLoaded(true);
			} else {
				// Check again in 100ms
				setTimeout(waitForMaps, 100);
			}
		};

		// Check if script already exists
		const existingScript = document.querySelector(
			`script[src*="maps.googleapis.com"]`
		);
		if (existingScript) {
			// Script exists, wait for it to be ready
			waitForMaps();
			return;
		}

		// Load the script
		const script = document.createElement('script');
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
		script.async = true;
		script.defer = true;
		script.onload = () => {
			// Start polling for Maps API readiness
			waitForMaps();
		};
		script.onerror = () => {
			console.error('Failed to load Google Maps script');
		};
		document.head.appendChild(script);
	}, [apiKey, mapLoaded]);

	// Initialize map
	useEffect(() => {
		// Ensure Maps API is fully loaded before initializing
		if (!mapLoaded || !mapRef.current) return;
		if (!window.google || !window.google.maps || !window.google.maps.Map) {
			console.warn('Google Maps API not fully loaded yet');
			return;
		}

		// Filter stores that have coordinates
		const storesWithCoords = stores.filter(
			(store) => store.latitude && store.longitude
		);

		if (storesWithCoords.length === 0) {
			// No stores with coordinates, show default location (US center)
			if (!mapInstanceRef.current) {
				mapInstanceRef.current = new window.google.maps.Map(
					mapRef.current,
					{
						center: { lat: 39.8283, lng: -98.5795 }, // Geographic center of US
						zoom: 4,
					}
				);
			}
			return;
		}

		// Initialize map centered on first store or selected store
		const centerStore =
			storesWithCoords.find((s) => s.id === selectedStoreId) ||
			storesWithCoords[0];

		if (!mapInstanceRef.current) {
			mapInstanceRef.current = new window.google.maps.Map(
				mapRef.current,
				{
					center: {
						lat: centerStore.latitude!,
						lng: centerStore.longitude!,
					},
					zoom: 12,
				}
			);
		} else {
			// Update center if selected store changed
			if (selectedStoreId) {
				const selected = storesWithCoords.find(
					(s) => s.id === selectedStoreId
				);
				if (selected) {
					mapInstanceRef.current.setCenter({
						lat: selected.latitude!,
						lng: selected.longitude!,
					});
					mapInstanceRef.current.setZoom(14);
				}
			}
		}

		// Clear existing markers
		markersRef.current.forEach((marker) => marker.setMap(null));
		markersRef.current = [];

		// Add markers for all stores
		storesWithCoords.forEach((store) => {
			const marker = new window.google.maps.Marker({
				position: { lat: store.latitude!, lng: store.longitude! },
				map: mapInstanceRef.current,
				title: store.name,
				icon:
					store.id === selectedStoreId
						? {
								url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
								scaledSize: new window.google.maps.Size(32, 32),
						  }
						: {
								url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
								scaledSize: new window.google.maps.Size(24, 24),
						  },
			});

			// Add info window
			const infoWindow = new window.google.maps.InfoWindow({
				content: `
          <div style="padding: 8px;">
            <strong>${store.name}</strong><br/>
            ${store.address || ''}${store.city ? `, ${store.city}` : ''}${
					store.state ? `, ${store.state}` : ''
				}
            ${
				store.websiteUrl
					? `<br/><a href="${store.websiteUrl}" target="_blank">Visit Website</a>`
					: ''
			}
          </div>
        `,
			});

			marker.addListener('click', () => {
				// Close all other info windows
				markersRef.current.forEach((m) => {
					if (m.infoWindow) {
						m.infoWindow.close();
					}
				});
				infoWindow.open(mapInstanceRef.current, marker);
			});

			marker.infoWindow = infoWindow;
			markersRef.current.push(marker);
		});

		// Fit bounds to show all markers
		if (storesWithCoords.length > 1) {
			const bounds = new window.google.maps.LatLngBounds();
			storesWithCoords.forEach((store) => {
				bounds.extend({ lat: store.latitude!, lng: store.longitude! });
			});
			mapInstanceRef.current.fitBounds(bounds);
		}
	}, [mapLoaded, stores, selectedStoreId]);

	if (!apiKey) {
		return (
			<div className='store-map-container' style={{ height }}>
				<div className='map-placeholder'>
					<p>Loading map...</p>
				</div>
			</div>
		);
	}

	if (!mapLoaded) {
		return (
			<div className='store-map-container' style={{ height }}>
				<div className='map-placeholder'>
					<p>Loading Google Maps...</p>
				</div>
			</div>
		);
	}

	const storesWithCoords = stores.filter(
		(store) => store.latitude && store.longitude
	);

	if (storesWithCoords.length === 0) {
		return (
			<div className='store-map-container' style={{ height }}>
				<div className='map-placeholder'>
					<p>📍 No location data available for these stores</p>
				</div>
			</div>
		);
	}

	return (
		<div className='store-map-container' style={{ height }}>
			<div ref={mapRef} className='store-map' />
		</div>
	);
}
