import { Router, Request, Response, NextFunction } from 'express';
import { storeService } from '../services';
import { storeChainService } from '../services/storeChainService';
import { googlePlacesService } from '../services/googlePlacesService';
import { HttpError } from '../middleware/errorHandler';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/stores - List all stores
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { q, includeChains } = req.query;
		const withChainInfo = includeChains === 'true';

		if (q && typeof q === 'string') {
			const result = await storeService.searchStores(q, withChainInfo);
			res.json(result);
		} else {
			const result = await storeService.getStores(withChainInfo);
			res.json(result);
		}
	} catch (error) {
		next(error);
	}
});

// GET /api/stores/grouped - Get stores grouped by chain
router.get(
	'/grouped',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const result = await storeService.getStoresGroupedByChain();
			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/stores/chains - List all store chains
router.get(
	'/chains',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const chains = await storeChainService.getChains();
			res.json({ chains });
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/stores/chains/:id - Get a specific chain
router.get(
	'/chains/:id',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const chain = await storeChainService.getChainById(id);

			if (!chain) {
				throw new HttpError('Chain not found', 404);
			}

			res.json({ chain });
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/stores/chains/:id/locations - Get stores in a chain
router.get(
	'/chains/:id/locations',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { city, state } = req.query;

			const chain = await storeChainService.getChainById(id);
			if (!chain) {
				throw new HttpError('Chain not found', 404);
			}

			const result = await storeService.getStoresByChain(id, {
				city: city as string | undefined,
				state: state as string | undefined,
			});

			res.json({
				chain,
				stores: result.items,
				totalCount: result.items.length,
			});
		} catch (error) {
			next(error);
		}
	}
);

// IMPORTANT: Place-specific routes MUST come BEFORE /:id to avoid "places" being matched as an id
// GET /api/stores/places/autocomplete - Search Google Places
router.get(
	'/places/autocomplete',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { input, types, lat, lng, radius } = req.query;

			if (!input || typeof input !== 'string') {
				throw new HttpError('Input query is required', 400);
			}

			if (input.trim().length < 2) {
				throw new HttpError(
					'Input query must be at least 2 characters',
					400
				);
			}

			const location =
				lat && lng
					? {
							lat: parseFloat(lat as string),
							lng: parseFloat(lng as string),
					  }
					: undefined;

			const predictions = await googlePlacesService.autocompletePlaces(
				input,
				types ? (types as string).split(',') : undefined,
				location,
				radius ? parseInt(radius as string, 10) : undefined
			);

			res.json({ predictions });
		} catch (error) {
			console.error('Error in /places/autocomplete:', error);
			next(error);
		}
	}
);

// GET /api/stores/places/details/:placeId - Get Google Place details
router.get(
	'/places/details/:placeId',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { placeId } = req.params;

			if (!placeId || placeId.trim().length === 0) {
				throw new HttpError('Place ID is required', 400);
			}

			const placeDetails = await googlePlacesService.getPlaceDetails(
				placeId
			);

			if (!placeDetails) {
				throw new HttpError('Place not found or API error', 404);
			}

			// Parse address components
			const addressComponents =
				googlePlacesService.parseAddressComponents(
					placeDetails.address_components
				);

			res.json({
				place: {
					placeId: placeDetails.place_id,
					name: placeDetails.name,
					formattedAddress: placeDetails.formatted_address,
					website: placeDetails.website,
					phoneNumber: placeDetails.formatted_phone_number,
					latitude: placeDetails.geometry?.location.lat,
					longitude: placeDetails.geometry?.location.lng,
					...addressComponents,
				},
			});
		} catch (error) {
			console.error('Error in /places/details:', error);
			next(error);
		}
	}
);

// POST /api/stores - Create a new store (requires auth)
router.post(
	'/',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const {
				name,
				type,
				regionOrScope,
				websiteUrl,
				address,
				city,
				state,
				zipCode,
				country,
				latitude,
				longitude,
				googlePlaceId,
				phoneNumber,
				skipDuplicateCheck,
			} = req.body;

			if (!name || !type) {
				throw new HttpError('Name and type are required', 400);
			}

			const storeInput = {
				name,
				type,
				regionOrScope: regionOrScope || 'Unknown',
				websiteUrl,
				address,
				city,
				state,
				zipCode,
				country: country || 'US',
				latitude,
				longitude,
				googlePlaceId,
				phoneNumber,
			};

			// Check for duplicates unless explicitly skipped
			if (!skipDuplicateCheck) {
				const duplicateCheck = await storeService.checkForDuplicates(
					storeInput
				);

				if (duplicateCheck.hasDuplicates) {
					// If exact match found, return the existing store
					if (duplicateCheck.exactMatch) {
						return res.status(200).json({
							store: duplicateCheck.exactMatch,
							isDuplicate: true,
							duplicateType: 'exact',
							message: 'An identical store already exists',
						});
					}

					// If similar stores found, return them as a warning
					if (duplicateCheck.similarStores.length > 0) {
						return res.status(200).json({
							store: null,
							isDuplicate: true,
							duplicateType: 'similar',
							similarStores: duplicateCheck.similarStores,
							message:
								'Similar stores found. Please review before creating.',
						});
					}
				}
			}

			const store = await storeService.createStore(storeInput);

			res.status(201).json({ store, isDuplicate: false });
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/stores/:id - Get store by ID (must come AFTER /places/* routes)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const store = await storeService.getStoreById(id);

		if (!store) {
			throw new HttpError('Store not found', 404);
		}

		res.json({ store });
	} catch (error) {
		next(error);
	}
});

export default router;
