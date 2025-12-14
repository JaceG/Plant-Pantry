import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { storesApi } from '../../api/storesApi';
import { Store } from '../../types/store';
import './ChainAvailabilityCard.css';

interface ChainAvailability {
	chainId: string;
	chainName: string;
	chainSlug: string;
	chainLogoUrl?: string;
	chainType?: 'national' | 'regional' | 'local';
	locationCount: number;
	includeRelatedCompany: boolean;
	priceRange?: string;
}

interface ChainAvailabilityCardProps {
	chainAvailability: ChainAvailability;
}

export function ChainAvailabilityCard({
	chainAvailability,
}: ChainAvailabilityCardProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [stores, setStores] = useState<Store[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [hasSearched, setHasSearched] = useState(false);

	const chainTypeLabels: Record<string, string> = {
		national: '🌎 Nationwide',
		regional: '📍 Regional',
		local: '🏘️ Local',
	};

	const handleExpand = useCallback(async () => {
		if (!isExpanded) {
			setIsExpanded(true);
			// Don't auto-load stores - wait for user to search
		} else {
			setIsExpanded(false);
		}
	}, [isExpanded]);

	const handleSearch = useCallback(async () => {
		if (!searchQuery.trim()) return;

		setLoading(true);
		setHasSearched(true);
		try {
			// Parse the search query - could be city, state, or zip
			const query = searchQuery.trim();
			let city: string | undefined;
			let state: string | undefined;

			// Simple parsing: if it looks like "City, State" or just a city name
			if (query.includes(',')) {
				const parts = query.split(',').map((p) => p.trim());
				city = parts[0];
				state = parts[1];
			} else if (/^\d{5}(-\d{4})?$/.test(query)) {
				// It's a ZIP code - we'll search by it
				// For now, just pass it as city (backend might need enhancement for ZIP search)
				city = query;
			} else {
				city = query;
			}

			const response = await storesApi.getChainLocations(
				chainAvailability.chainId,
				{
					city,
					state,
					includeRelated: chainAvailability.includeRelatedCompany,
				}
			);
			setStores(response.stores);
			setTotalCount(response.totalCount);
		} catch (error) {
			console.error('Failed to search stores:', error);
			setStores([]);
			setTotalCount(0);
		} finally {
			setLoading(false);
		}
	}, [chainAvailability.chainId, searchQuery]);

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};

	const handleLoadAll = useCallback(async () => {
		setLoading(true);
		setHasSearched(true);
		try {
			const response = await storesApi.getChainLocations(
				chainAvailability.chainId,
				{ includeRelated: chainAvailability.includeRelatedCompany }
			);
			setStores(response.stores.slice(0, 20)); // Limit initial display
			setTotalCount(response.totalCount);
		} catch (error) {
			console.error('Failed to load stores:', error);
		} finally {
			setLoading(false);
		}
	}, [chainAvailability.chainId, chainAvailability.includeRelatedCompany]);

	return (
		<div className='chain-availability-card'>
			<div className='chain-card-header' onClick={handleExpand}>
				<div className='chain-card-main'>
					{chainAvailability.chainLogoUrl ? (
						<img
							src={chainAvailability.chainLogoUrl}
							alt={chainAvailability.chainName}
							className='chain-logo'
						/>
					) : (
						<span className='chain-logo-placeholder'>🏬</span>
					)}
					<div className='chain-card-info'>
						<Link
							to={`/retailers/chain/${chainAvailability.chainSlug}`}
							className='chain-card-name'
							onClick={(e) => e.stopPropagation()}>
							{chainAvailability.chainName}
						</Link>
						<div className='chain-card-meta'>
							{chainAvailability.chainType && (
								<span className='chain-type-badge'>
									{chainTypeLabels[
										chainAvailability.chainType
									] || chainAvailability.chainType}
								</span>
							)}
							<span className='chain-location-count'>
								{chainAvailability.locationCount > 0
									? `${
											chainAvailability.locationCount
									  } location${
											chainAvailability.locationCount !==
											1
												? 's'
												: ''
									  }`
									: 'All locations'}
							</span>
						</div>
					</div>
				</div>
				<div className='chain-card-actions'>
					<span className='chain-available-badge'>✓ Available</span>
					<span className='chain-expand-icon'>
						{isExpanded ? '▼' : '▶'}
					</span>
				</div>
			</div>

			{isExpanded && (
				<div className='chain-card-expanded'>
					<div className='chain-location-search'>
						<p className='search-hint'>
							Find a {chainAvailability.chainName} near you:
						</p>
						<div className='search-input-row'>
							<input
								type='text'
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onKeyPress={handleKeyPress}
								placeholder='Enter city, state or ZIP code...'
								className='location-search-input'
							/>
							<button
								onClick={handleSearch}
								disabled={loading || !searchQuery.trim()}
								className='search-btn'>
								{loading ? 'Searching...' : 'Search'}
							</button>
						</div>
						{chainAvailability.locationCount > 0 && (
							<button
								onClick={handleLoadAll}
								disabled={loading}
								className='show-all-link'>
								Or browse all{' '}
								{chainAvailability.locationCount > 20
									? 'locations'
									: `${chainAvailability.locationCount} locations`}
							</button>
						)}
					</div>

					{loading && (
						<div className='chain-stores-loading'>
							<span className='loading-spinner-small' />
							Searching...
						</div>
					)}

					{!loading && hasSearched && stores.length === 0 && (
						<div className='chain-no-results'>
							<p>No stores found matching your search.</p>
							<p className='no-results-hint'>
								Try a different city or browse all locations.
							</p>
						</div>
					)}

					{!loading && stores.length > 0 && (
						<div className='chain-stores-results'>
							<p className='results-count'>
								{totalCount > stores.length
									? `Showing ${stores.length} of ${totalCount} locations`
									: `${stores.length} location${
											stores.length !== 1 ? 's' : ''
									  } found`}
							</p>
							<div className='chain-stores-list'>
								{stores.map((store) => {
									// Show store name (e.g., "Walmart Supercenter", "Kroger Marketplace")
									// Use locationIdentifier only if it's not just an address (doesn't start with a number)
									const hasUsefulLocationId =
										store.locationIdentifier &&
										!/^\d/.test(store.locationIdentifier);
									const displayName = hasUsefulLocationId
										? `${store.name} - ${store.locationIdentifier}`
										: store.name;

									return (
										<div
											key={store.id}
											className='chain-store-item'>
											<div className='store-item-info'>
												<span className='store-item-name'>
													{displayName}
												</span>
												{store.address && (
													<span className='store-item-address'>
														{store.address}
														{store.city &&
															`, ${store.city}`}
														{store.state &&
															`, ${store.state}`}
														{store.zipCode &&
															` ${store.zipCode}`}
													</span>
												)}
											</div>
											<Link
												to={`/retailers/store/${store.id}`}
												className='store-item-link'>
												View →
											</Link>
										</div>
									);
								})}
							</div>
							{totalCount > stores.length && (
								<Link
									to={`/retailers/chain/${chainAvailability.chainSlug}`}
									className='view-all-stores-link'>
									View all {totalCount} locations →
								</Link>
							)}
						</div>
					)}

					{!hasSearched && !loading && (
						<div className='chain-search-prompt'>
							<p>
								Enter a location above to find{' '}
								{chainAvailability.chainName} stores near you.
							</p>
						</div>
					)}
				</div>
			)}

			{chainAvailability.priceRange && (
				<div className='chain-price-info'>
					<span className='price-label'>Price Range:</span>
					<span className='price-value'>
						{chainAvailability.priceRange}
					</span>
				</div>
			)}
		</div>
	);
}
