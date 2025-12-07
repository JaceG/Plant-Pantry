import { useState, useEffect, useCallback, useMemo } from 'react';
import { storesApi, StoresGroupedResponse } from '../../api/storesApi';
import { Store, StoreChain, GooglePlacePrediction } from '../../types/store';
import { StoreAvailabilityInput } from '../../types/product';
import { AutocompleteInput } from './AutocompleteInput';
import { StoreMap } from './StoreMap';
import { ChainLocationPicker } from './ChainLocationPicker';
import { Button } from '../Common';
import './StoreAvailabilitySelector.css';

interface StoreAvailabilitySelectorProps {
	value: StoreAvailabilityInput[];
	onChange: (availabilities: StoreAvailabilityInput[]) => void;
}

type StoreInputMode = 'physical' | 'online';
type StoreSelectionMode = 'existing' | 'new';

export function StoreAvailabilitySelector({
	value,
	onChange,
}: StoreAvailabilitySelectorProps) {
	const [stores, setStores] = useState<Store[]>([]);
	const [chains, setChains] = useState<StoreChain[]>([]);
	const [groupedData, setGroupedData] =
		useState<StoresGroupedResponse | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [existingStoreSearch, setExistingStoreSearch] = useState('');
	const [placePredictions, setPlacePredictions] = useState<
		GooglePlacePrediction[]
	>([]);
	const [selectedStore, setSelectedStore] = useState<Store | null>(null);
	const [selectedChain, setSelectedChain] = useState<StoreChain | null>(null);
	const [priceRange, setPriceRange] = useState('');
	const [loadingStores, setLoadingStores] = useState(false);
	const [showPlaceSearch, setShowPlaceSearch] = useState(false);
	const [storeMode, setStoreMode] = useState<StoreInputMode>('physical');
	const [selectionMode, setSelectionMode] =
		useState<StoreSelectionMode>('existing');
	const [showExistingDropdown, setShowExistingDropdown] = useState(false);

	// Online store form fields
	const [onlineStoreName, setOnlineStoreName] = useState('');
	const [onlineStoreUrl, setOnlineStoreUrl] = useState('');
	const [onlineStoreType, setOnlineStoreType] = useState<
		'online_retailer' | 'brand_direct'
	>('online_retailer');
	const [onlineStoreRegion, setOnlineStoreRegion] = useState('US - Online');

	// Duplicate detection state
	const [duplicateWarning, setDuplicateWarning] = useState<{
		show: boolean;
		similarStores: Store[];
		pendingStoreInput: any;
	} | null>(null);

	// Filter stores by type and search query
	const filteredExistingStores = useMemo(() => {
		const typeFilter =
			storeMode === 'physical'
				? (s: Store) => s.type === 'brick_and_mortar'
				: (s: Store) =>
						s.type === 'online_retailer' ||
						s.type === 'brand_direct';

		// Exclude already added stores
		const addedStoreIds = value.map((v) => v.storeId);

		return stores
			.filter(typeFilter)
			.filter((s) => !addedStoreIds.includes(s.id))
			.filter((s) => {
				if (!existingStoreSearch.trim()) return true;
				const searchLower = existingStoreSearch.toLowerCase();
				return (
					s.name.toLowerCase().includes(searchLower) ||
					s.address?.toLowerCase().includes(searchLower) ||
					s.city?.toLowerCase().includes(searchLower) ||
					s.regionOrScope?.toLowerCase().includes(searchLower)
				);
			});
	}, [stores, storeMode, existingStoreSearch, value]);

	// Create store display names with location details for physical stores
	const physicalStoreOptions = useMemo(
		() =>
			stores
				.filter((s) => s.type === 'brick_and_mortar')
				.map((s) => {
					const location =
						s.city && s.state
							? `${s.city}, ${s.state}`
							: s.address || s.regionOrScope || '';
					return {
						displayName: location
							? `${s.name} — ${location}`
							: s.name,
						store: s,
					};
				}),
		[stores]
	);

	// Map from display name to store for easy lookup
	const physicalStoreMap = useMemo(
		() =>
			new Map(
				physicalStoreOptions.map((opt) => [opt.displayName, opt.store])
			),
		[physicalStoreOptions]
	);

	const storeDisplayNames = useMemo(
		() => physicalStoreOptions.map((opt) => opt.displayName),
		[physicalStoreOptions]
	);

	// Load existing stores and chains
	useEffect(() => {
		const loadStores = async () => {
			setLoadingStores(true);
			try {
				// Load stores, chains, and grouped data in parallel
				const [storesResponse, chainsResponse, groupedResponse] =
					await Promise.all([
						storesApi.getStores(undefined, true),
						storesApi.getChains(),
						storesApi.getStoresGrouped(),
					]);

				setStores(storesResponse.items);
				setChains(chainsResponse.chains);
				setGroupedData(groupedResponse);

				// Load store details for any stores in value that we don't have yet
				const missingStoreIds = (value || [])
					.map((avail) => avail.storeId)
					.filter(
						(id) => !storesResponse.items.some((s) => s.id === id)
					);

				if (missingStoreIds.length > 0) {
					const storePromises = missingStoreIds.map((id) =>
						storesApi.getStoreById(id).catch(() => null)
					);
					const storeResults = await Promise.all(storePromises);
					const loadedStores = storeResults
						.filter(
							(result): result is { store: Store } =>
								result !== null
						)
						.map((result) => result.store);

					if (loadedStores.length > 0) {
						setStores((prev) => [...prev, ...loadedStores]);
					}
				}
			} catch (error) {
				console.error('Failed to load stores:', error);
			} finally {
				setLoadingStores(false);
			}
		};

		loadStores();
	}, [value]);

	// Search Google Places when user types (only for physical stores)
	useEffect(() => {
		if (storeMode === 'online') {
			setPlacePredictions([]);
			setShowPlaceSearch(false);
			return;
		}

		if (searchQuery.trim().length > 2) {
			const timeoutId = setTimeout(async () => {
				try {
					const response = await storesApi.searchPlaces(searchQuery);
					setPlacePredictions(response.predictions);
					setShowPlaceSearch(true);
				} catch (error) {
					console.error('Failed to search places:', error);
				}
			}, 300); // Debounce

			return () => clearTimeout(timeoutId);
		} else {
			setPlacePredictions([]);
			setShowPlaceSearch(false);
		}
	}, [searchQuery, storeMode]);

	const handleStoreNameSelect = useCallback(
		(displayName: string) => {
			// User selected an existing store by display name (includes location)
			const store = physicalStoreMap.get(displayName);
			if (store) {
				setSelectedStore(store);
				setSearchQuery('');
				setPlacePredictions([]);
				setShowPlaceSearch(false);
			}
		},
		[physicalStoreMap]
	);

	const handleExistingStoreSelect = useCallback((store: Store) => {
		setSelectedStore(store);
		setSelectedChain(null);
		setExistingStoreSearch('');
		setShowExistingDropdown(false);
	}, []);

	const handleChainSelect = useCallback((chain: StoreChain) => {
		setSelectedChain(chain);
		setSelectedStore(null);
		setShowExistingDropdown(false);
	}, []);

	const handleChainLocationSelect = useCallback((store: Store) => {
		setSelectedStore(store);
		setSelectedChain(null);
	}, []);

	const handleBackFromChainPicker = useCallback(() => {
		setSelectedChain(null);
	}, []);

	const handlePlaceSelect = useCallback(
		async (placeId: string) => {
			// User selected a Google Place
			try {
				const placeDetails = await storesApi.getPlaceDetails(placeId);
				const storeInput = {
					name: placeDetails.place.name,
					type: 'brick_and_mortar' as const,
					regionOrScope: placeDetails.place.city
						? `${placeDetails.place.city}, ${
								placeDetails.place.state || ''
						  }`.trim()
						: placeDetails.place.formattedAddress,
					websiteUrl: placeDetails.place.website,
					address:
						placeDetails.place.street ||
						placeDetails.place.formattedAddress,
					city: placeDetails.place.city,
					state: placeDetails.place.state,
					zipCode: placeDetails.place.zipCode,
					country: placeDetails.place.country || 'US',
					latitude: placeDetails.place.latitude,
					longitude: placeDetails.place.longitude,
					googlePlaceId: placeDetails.place.placeId,
					phoneNumber: placeDetails.place.phoneNumber,
				};

				const response = await storesApi.createStore(storeInput);

				// Handle duplicate detection
				if (response.isDuplicate) {
					if (response.duplicateType === 'exact' && response.store) {
						// Exact match - use existing store
						setSelectedStore(response.store);
						if (!stores.some((s) => s.id === response.store!.id)) {
							setStores((prev) => [...prev, response.store!]);
						}
					} else if (
						response.duplicateType === 'similar' &&
						response.similarStores
					) {
						// Similar stores found - show warning
						setDuplicateWarning({
							show: true,
							similarStores: response.similarStores,
							pendingStoreInput: storeInput,
						});
					}
				} else if (response.store) {
					setSelectedStore(response.store);
					setStores((prev) => [...prev, response.store!]);
				}

				setSearchQuery('');
				setPlacePredictions([]);
				setShowPlaceSearch(false);
			} catch (error) {
				console.error('Failed to create store from place:', error);
			}
		},
		[stores]
	);

	const handleCreateOnlineStore = useCallback(async () => {
		if (!onlineStoreName.trim()) {
			return;
		}

		try {
			const storeInput = {
				name: onlineStoreName.trim(),
				type: onlineStoreType,
				regionOrScope: onlineStoreRegion.trim() || 'US - Online',
				websiteUrl: onlineStoreUrl.trim() || undefined,
			};

			const response = await storesApi.createStore(storeInput);

			// Handle duplicate detection
			if (response.isDuplicate) {
				if (response.duplicateType === 'exact' && response.store) {
					// Exact match - use existing store
					setSelectedStore(response.store);
					if (!stores.some((s) => s.id === response.store!.id)) {
						setStores((prev) => [...prev, response.store!]);
					}
				} else if (
					response.duplicateType === 'similar' &&
					response.similarStores
				) {
					// Similar stores found - show warning
					setDuplicateWarning({
						show: true,
						similarStores: response.similarStores,
						pendingStoreInput: storeInput,
					});
					return; // Don't clear form until user decides
				}
			} else if (response.store) {
				setSelectedStore(response.store);
				setStores((prev) => [...prev, response.store!]);
			}

			setOnlineStoreName('');
			setOnlineStoreUrl('');
			setOnlineStoreRegion('US - Online');
		} catch (error) {
			console.error('Failed to create online store:', error);
		}
	}, [
		onlineStoreName,
		onlineStoreUrl,
		onlineStoreType,
		onlineStoreRegion,
		stores,
	]);

	// Handle duplicate warning actions
	const handleSelectExistingStore = useCallback(
		(store: Store) => {
			setSelectedStore(store);
			if (!stores.some((s) => s.id === store.id)) {
				setStores((prev) => [...prev, store]);
			}
			setDuplicateWarning(null);
			setOnlineStoreName('');
			setOnlineStoreUrl('');
			setOnlineStoreRegion('US - Online');
		},
		[stores]
	);

	const handleCreateAnywayStore = useCallback(async () => {
		if (!duplicateWarning?.pendingStoreInput) return;

		try {
			const response = await storesApi.createStore({
				...duplicateWarning.pendingStoreInput,
				skipDuplicateCheck: true,
			});

			if (response.store) {
				setSelectedStore(response.store);
				setStores((prev) => [...prev, response.store!]);
			}

			setDuplicateWarning(null);
			setOnlineStoreName('');
			setOnlineStoreUrl('');
			setOnlineStoreRegion('US - Online');
		} catch (error) {
			console.error('Failed to create store:', error);
		}
	}, [duplicateWarning]);

	const handleAddStore = () => {
		if (!selectedStore) return;

		// Check if store is already added
		if (value.some((avail) => avail.storeId === selectedStore.id)) {
			return;
		}

		const newAvailability: StoreAvailabilityInput = {
			storeId: selectedStore.id,
			priceRange: priceRange.trim() || undefined,
			status: 'user_reported',
		};

		onChange([...value, newAvailability]);
		setSelectedStore(null);
		setPriceRange('');
		// Reset online store form if it was used
		if (storeMode === 'online') {
			setOnlineStoreName('');
			setOnlineStoreUrl('');
			setOnlineStoreRegion('US - Online');
		}
	};

	const handleRemoveStore = (storeId: string) => {
		onChange(value.filter((avail) => avail.storeId !== storeId));
	};

	const handleUpdatePriceRange = (storeId: string, newPriceRange: string) => {
		onChange(
			value.map((avail) =>
				avail.storeId === storeId
					? { ...avail, priceRange: newPriceRange }
					: avail
			)
		);
	};

	// Count stores by type for display
	const physicalStoreCount = stores.filter(
		(s) => s.type === 'brick_and_mortar'
	).length;
	const onlineStoreCount = stores.filter(
		(s) => s.type === 'online_retailer' || s.type === 'brand_direct'
	).length;

	return (
		<div className='store-availability-selector'>
			<div className='store-search-section'>
				{/* Store Type Toggle */}
				<div className='store-mode-toggle'>
					<button
						type='button'
						className={`mode-button ${
							storeMode === 'physical' ? 'active' : ''
						}`}
						onClick={() => {
							setStoreMode('physical');
							setSelectedStore(null);
							setSearchQuery('');
							setExistingStoreSearch('');
							setShowExistingDropdown(false);
							setOnlineStoreName('');
							setOnlineStoreUrl('');
							setSelectionMode('existing');
						}}>
						🏪 Physical Store
					</button>
					<button
						type='button'
						className={`mode-button ${
							storeMode === 'online' ? 'active' : ''
						}`}
						onClick={() => {
							setStoreMode('online');
							setSelectedStore(null);
							setSearchQuery('');
							setExistingStoreSearch('');
							setShowExistingDropdown(false);
							setPlacePredictions([]);
							setShowPlaceSearch(false);
							setSelectionMode('existing');
						}}>
						🌐 Online Store
					</button>
				</div>

				{/* Selection Mode Toggle: Existing vs New */}
				<div className='selection-mode-toggle'>
					<button
						type='button'
						className={`selection-mode-button ${
							selectionMode === 'existing' ? 'active' : ''
						}`}
						onClick={() => {
							setSelectionMode('existing');
							setSelectedStore(null);
							setSearchQuery('');
							setOnlineStoreName('');
							setOnlineStoreUrl('');
						}}>
						📋 Select Existing
						<span className='store-count'>
							(
							{storeMode === 'physical'
								? physicalStoreCount
								: onlineStoreCount}
							)
						</span>
					</button>
					<button
						type='button'
						className={`selection-mode-button ${
							selectionMode === 'new' ? 'active' : ''
						}`}
						onClick={() => {
							setSelectionMode('new');
							setSelectedStore(null);
							setExistingStoreSearch('');
							setShowExistingDropdown(false);
						}}>
						➕ Add New
					</button>
				</div>

				{/* Chain Location Picker (when chain is selected) */}
				{selectedChain && storeMode === 'physical' && (
					<ChainLocationPicker
						chain={selectedChain}
						onSelectLocation={handleChainLocationSelect}
						onBack={handleBackFromChainPicker}
					/>
				)}

				{/* Existing Store Selection */}
				{selectionMode === 'existing' && !selectedChain && (
					<div className='existing-store-section'>
						<label>
							{storeMode === 'physical'
								? 'Select a store chain or independent store'
								: 'Select from your existing online stores'}
						</label>
						<div className='existing-store-search-wrapper'>
							<input
								type='text'
								value={existingStoreSearch}
								onChange={(e) => {
									setExistingStoreSearch(e.target.value);
									setShowExistingDropdown(true);
								}}
								onFocus={() => setShowExistingDropdown(true)}
								placeholder={`Search ${
									storeMode === 'physical'
										? 'chains or stores'
										: 'online stores'
								}...`}
								className='form-input existing-store-search-input'
							/>

							{showExistingDropdown && (
								<div className='existing-stores-dropdown'>
									{loadingStores ? (
										<div className='dropdown-message'>
											Loading stores...
										</div>
									) : storeMode === 'physical' ? (
										// Physical stores - show chains first, then independent stores
										<>
											{/* Store Chains */}
											{groupedData &&
												groupedData.chains.length >
													0 && (
													<>
														<div className='dropdown-header'>
															🏬 Store Chains
														</div>
														<div className='dropdown-list'>
															{groupedData.chains
																.filter(
																	(group) => {
																		if (
																			!existingStoreSearch.trim()
																		)
																			return true;
																		return group.chain.name
																			.toLowerCase()
																			.includes(
																				existingStoreSearch.toLowerCase()
																			);
																	}
																)
																.map(
																	({
																		chain,
																		locationCount,
																	}) => (
																		<div
																			key={
																				chain.id
																			}
																			className='existing-store-option chain-option'
																			onClick={() =>
																				handleChainSelect(
																					chains.find(
																						(
																							c
																						) =>
																							c.id ===
																							chain.id
																					)!
																				)
																			}>
																			<div className='store-option-name'>
																				{
																					chain.name
																				}
																			</div>
																			<div className='store-option-details'>
																				<span className='chain-location-count'>
																					{
																						locationCount
																					}{' '}
																					location
																					{locationCount !==
																					1
																						? 's'
																						: ''}
																				</span>
																				<span className='chain-arrow'>
																					→
																				</span>
																			</div>
																		</div>
																	)
																)}
														</div>
													</>
												)}

											{/* Independent Physical Stores */}
											{groupedData &&
												groupedData.independentStores.filter(
													(s) =>
														s.type ===
														'brick_and_mortar'
												).length > 0 && (
													<>
														<div className='dropdown-header'>
															🏪 Independent
															Stores
														</div>
														<div className='dropdown-list'>
															{groupedData.independentStores
																.filter(
																	(s) =>
																		s.type ===
																		'brick_and_mortar'
																)
																.filter(
																	(store) => {
																		if (
																			!existingStoreSearch.trim()
																		)
																			return true;
																		const query =
																			existingStoreSearch.toLowerCase();
																		return (
																			store.name
																				.toLowerCase()
																				.includes(
																					query
																				) ||
																			store.address
																				?.toLowerCase()
																				.includes(
																					query
																				) ||
																			store.city
																				?.toLowerCase()
																				.includes(
																					query
																				)
																		);
																	}
																)
																.filter(
																	(s) =>
																		!value.some(
																			(
																				v
																			) =>
																				v.storeId ===
																				s.id
																		)
																)
																.map(
																	(store) => (
																		<div
																			key={
																				store.id
																			}
																			className='existing-store-option'
																			onClick={() =>
																				handleExistingStoreSelect(
																					store
																				)
																			}>
																			<div className='store-option-name'>
																				{
																					store.name
																				}
																			</div>
																			<div className='store-option-details'>
																				{store.address && (
																					<span>
																						{
																							store.address
																						}
																					</span>
																				)}
																				{store.city &&
																					store.state && (
																						<span>
																							{
																								store.city
																							}

																							,{' '}
																							{
																								store.state
																							}
																						</span>
																					)}
																			</div>
																		</div>
																	)
																)}
														</div>
													</>
												)}

											{/* No results message */}
											{existingStoreSearch &&
												groupedData &&
												groupedData.chains.filter((g) =>
													g.chain.name
														.toLowerCase()
														.includes(
															existingStoreSearch.toLowerCase()
														)
												).length === 0 &&
												groupedData.independentStores.filter(
													(s) =>
														s.type ===
															'brick_and_mortar' &&
														(s.name
															.toLowerCase()
															.includes(
																existingStoreSearch.toLowerCase()
															) ||
															s.address
																?.toLowerCase()
																.includes(
																	existingStoreSearch.toLowerCase()
																) ||
															s.city
																?.toLowerCase()
																.includes(
																	existingStoreSearch.toLowerCase()
																))
												).length === 0 && (
													<div className='dropdown-message'>
														No matching stores found
														<button
															type='button'
															className='switch-to-new-link'
															onClick={() => {
																setSelectionMode(
																	'new'
																);
																setShowExistingDropdown(
																	false
																);
															}}>
															+ Add a new store
														</button>
													</div>
												)}
										</>
									) : // Online stores - original behavior
									filteredExistingStores.length === 0 ? (
										<div className='dropdown-message'>
											{existingStoreSearch
												? 'No matching stores found'
												: 'No online stores yet. Add one below!'}
											<button
												type='button'
												className='switch-to-new-link'
												onClick={() => {
													setSelectionMode('new');
													setShowExistingDropdown(
														false
													);
												}}>
												+ Add a new store
											</button>
										</div>
									) : (
										<>
											<div className='dropdown-header'>
												🌐 Online Stores
											</div>
											<div className='dropdown-list'>
												{filteredExistingStores.map(
													(store) => (
														<div
															key={store.id}
															className='existing-store-option'
															onClick={() =>
																handleExistingStoreSelect(
																	store
																)
															}>
															<div className='store-option-name'>
																{store.name}
															</div>
															<div className='store-option-details'>
																<span className='store-type-badge'>
																	{store.type ===
																	'online_retailer'
																		? 'Retailer'
																		: 'Brand Direct'}
																</span>
																{store.regionOrScope && (
																	<span>
																		{
																			store.regionOrScope
																		}
																	</span>
																)}
															</div>
														</div>
													)
												)}
											</div>
										</>
									)}
								</div>
							)}
						</div>

						{/* Click outside to close dropdown */}
						{showExistingDropdown && (
							<div
								className='dropdown-backdrop'
								onClick={() => setShowExistingDropdown(false)}
							/>
						)}
					</div>
				)}

				{/* New Store Creation */}
				{selectionMode === 'new' && storeMode === 'physical' && (
					<div className='new-store-section'>
						<label>Search for a physical store or location</label>
						<div className='store-search-input-wrapper'>
							<AutocompleteInput
								value={searchQuery}
								onChange={setSearchQuery}
								onSelect={handleStoreNameSelect}
								options={storeDisplayNames}
								placeholder='Search stores or type to search Google Places...'
								allowNew={true}
								newItemLabel='Search Google Places for'
							/>

							{showPlaceSearch && placePredictions.length > 0 && (
								<div className='google-places-dropdown'>
									<div className='places-header'>
										📍 Google Places Results
									</div>
									{placePredictions.map((prediction) => (
										<div
											key={prediction.place_id}
											className='place-option'
											onClick={() =>
												handlePlaceSelect(
													prediction.place_id
												)
											}>
											<div className='place-main-text'>
												{
													prediction
														.structured_formatting
														.main_text
												}
											</div>
											<div className='place-secondary-text'>
												{
													prediction
														.structured_formatting
														.secondary_text
												}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}

				{selectionMode === 'new' && storeMode === 'online' && (
					<div className='online-store-form'>
						<label>Add a new online store</label>
						<div className='form-group'>
							<label htmlFor='online-store-name'>
								Store Name <span className='required'>*</span>
							</label>
							<input
								type='text'
								id='online-store-name'
								value={onlineStoreName}
								onChange={(e) =>
									setOnlineStoreName(e.target.value)
								}
								placeholder='e.g., Amazon, Thrive Market, Brand Website'
								className='form-input'
							/>
						</div>
						<div className='form-group'>
							<label htmlFor='online-store-url'>
								Website URL
							</label>
							<input
								type='url'
								id='online-store-url'
								value={onlineStoreUrl}
								onChange={(e) =>
									setOnlineStoreUrl(e.target.value)
								}
								placeholder='https://example.com'
								className='form-input'
							/>
						</div>
						<div className='form-group'>
							<label htmlFor='online-store-type'>
								Store Type
							</label>
							<select
								id='online-store-type'
								value={onlineStoreType}
								onChange={(e) =>
									setOnlineStoreType(
										e.target.value as
											| 'online_retailer'
											| 'brand_direct'
									)
								}
								className='form-input'>
								<option value='online_retailer'>
									Online Retailer (e.g., Amazon, Thrive
									Market)
								</option>
								<option value='brand_direct'>
									Brand Direct (sold on brand's website)
								</option>
							</select>
						</div>
						<div className='form-group'>
							<label htmlFor='online-store-region'>
								Region/Scope
							</label>
							<input
								type='text'
								id='online-store-region'
								value={onlineStoreRegion}
								onChange={(e) =>
									setOnlineStoreRegion(e.target.value)
								}
								placeholder='e.g., US - Online, Worldwide - Online'
								className='form-input'
							/>
						</div>
						<Button
							type='button'
							onClick={handleCreateOnlineStore}
							variant='primary'
							size='sm'
							disabled={!onlineStoreName.trim()}>
							Create Store
						</Button>
					</div>
				)}

				{/* Duplicate Warning */}
				{duplicateWarning?.show && (
					<div className='duplicate-warning'>
						<div className='duplicate-warning-header'>
							<span className='warning-icon'>⚠️</span>
							<h4>Similar stores found</h4>
						</div>
						<p className='duplicate-warning-text'>
							We found similar stores that may be what you're
							looking for. Would you like to use an existing store
							or create a new one?
						</p>
						<div className='similar-stores-list'>
							{duplicateWarning.similarStores.map((store) => (
								<div
									key={store.id}
									className='similar-store-option'
									onClick={() =>
										handleSelectExistingStore(store)
									}>
									<div className='similar-store-info'>
										<strong>{store.name}</strong>
										{store.type === 'brick_and_mortar' ? (
											<span className='similar-store-location'>
												{store.address &&
													`${store.address}, `}
												{store.city &&
													`${store.city}, `}
												{store.state}
											</span>
										) : (
											<span className='similar-store-location'>
												{store.websiteUrl ||
													store.regionOrScope}
											</span>
										)}
									</div>
									<span className='use-this-btn'>
										Use this →
									</span>
								</div>
							))}
						</div>
						<div className='duplicate-warning-actions'>
							<Button
								type='button'
								variant='secondary'
								size='sm'
								onClick={() => setDuplicateWarning(null)}>
								Cancel
							</Button>
							<Button
								type='button'
								variant='primary'
								size='sm'
								onClick={handleCreateAnywayStore}>
								Create New Store Anyway
							</Button>
						</div>
					</div>
				)}

				{selectedStore && (
					<div className='selected-store-preview'>
						<div className='store-preview-info'>
							<strong>{selectedStore.name}</strong>
							{selectedStore.address && (
								<span className='store-address'>
									{selectedStore.address}
									{selectedStore.city &&
										`, ${selectedStore.city}`}
									{selectedStore.state &&
										`, ${selectedStore.state}`}
								</span>
							)}
							{selectedStore.websiteUrl && (
								<a
									href={selectedStore.websiteUrl}
									target='_blank'
									rel='noopener noreferrer'
									className='store-website'>
									Visit Website →
								</a>
							)}
						</div>
						{selectedStore.latitude && selectedStore.longitude && (
							<div className='store-map-preview'>
								<StoreMap
									stores={[selectedStore]}
									selectedStoreId={selectedStore.id}
									height='250px'
								/>
							</div>
						)}
						<div className='store-price-input'>
							<input
								type='text'
								placeholder='Price range (e.g., $5.99-$7.99)'
								value={priceRange}
								onChange={(e) => setPriceRange(e.target.value)}
							/>
						</div>
						<Button
							type='button'
							onClick={handleAddStore}
							variant='primary'
							size='sm'>
							Add Store
						</Button>
					</div>
				)}
			</div>

			{value.length > 0 && (
				<div className='selected-stores-list'>
					<h3>Where to Buy</h3>
					{value.map((avail) => {
						const store = stores.find(
							(s) => s.id === avail.storeId
						);

						return (
							<div
								key={avail.storeId}
								className='selected-store-item'>
								<div className='store-item-info'>
									{store ? (
										<>
											<strong>{store.name}</strong>
											{store.address && (
												<span className='store-item-address'>
													{store.address}
													{store.city &&
														`, ${store.city}`}
												</span>
											)}
											{store.websiteUrl && (
												<a
													href={store.websiteUrl}
													target='_blank'
													rel='noopener noreferrer'
													className='store-item-link'>
													Website
												</a>
											)}
										</>
									) : (
										<span className='store-loading'>
											Loading store details...
										</span>
									)}
								</div>
								<div className='store-item-price'>
									<input
										type='text'
										placeholder='Price range'
										value={avail.priceRange || ''}
										onChange={(e) =>
											handleUpdatePriceRange(
												avail.storeId,
												e.target.value
											)
										}
									/>
								</div>
								<button
									type='button'
									onClick={() =>
										handleRemoveStore(avail.storeId)
									}
									className='store-item-remove'>
									×
								</button>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
