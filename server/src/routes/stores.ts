import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { storeService } from '../services';
import { storeChainService } from '../services/storeChainService';
import { googlePlacesService } from '../services/googlePlacesService';
import { HttpError } from '../middleware/errorHandler';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import {
	Availability,
	Product,
	UserProduct,
	Store,
	StoreChain,
	RetailerContentEdit,
	User,
} from '../models';

const router = Router();

// GET /api/stores - List all stores
// Uses optional auth to show pending stores to their creators
router.get(
	'/',
	optionalAuthMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { q, includeChains } = req.query;
			const withChainInfo = includeChains === 'true';
			const userId = req.userId; // From optional auth

			if (q && typeof q === 'string') {
				const result = await storeService.searchStores(
					q,
					withChainInfo,
					userId
				);
				res.json(result);
			} else {
				const result = await storeService.getStores(
					withChainInfo,
					userId
				);
				res.json(result);
			}
		} catch (error) {
			next(error);
		}
	}
);

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

// GET /api/stores/chains/slug/:slug - Get chain page data by slug
router.get(
	'/chains/slug/:slug',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const { page = '1', pageSize = '24' } = req.query;

			const chain = await storeChainService.getChainBySlug(slug);
			if (!chain) {
				throw new HttpError('Chain not found', 404);
			}

			// Get all stores in this chain
			const storesResult = await storeService.getStoresByChain(
				chain.id,
				{}
			);
			const stores = storesResult.items;

			// Get all product IDs available at these stores
			const storeIds = stores.map((s: any) => s.id);

			const availabilities = await Availability.find({
				storeId: { $in: storeIds },
				moderationStatus: 'confirmed',
			})
				.select('productId')
				.lean();

			const productIdSet = new Set(
				availabilities.map((a: any) => a.productId.toString())
			);
			const productIds = Array.from(productIdSet);

			// Paginate products
			const pageNum = parseInt(page as string, 10);
			const pageSizeNum = parseInt(pageSize as string, 10);
			const skip = (pageNum - 1) * pageSizeNum;
			const paginatedIds = productIds.slice(skip, skip + pageSizeNum);

			// Fetch product details
			const productObjectIds = paginatedIds.map(
				(id) => new mongoose.Types.ObjectId(id)
			);

			const [apiProducts, userProducts] = await Promise.all([
				Product.find({
					_id: { $in: productObjectIds },
					archived: { $ne: true },
				})
					.select('name brand sizeOrVariant imageUrl categories tags')
					.lean(),
				UserProduct.find({
					_id: { $in: productObjectIds },
					status: 'approved',
					archived: { $ne: true },
				})
					.select('name brand sizeOrVariant imageUrl categories tags')
					.lean(),
			]);

			const products = [...apiProducts, ...userProducts].map(
				(p: any) => ({
					id: p._id.toString(),
					name: p.name,
					brand: p.brand,
					sizeOrVariant: p.sizeOrVariant,
					imageUrl: p.imageUrl,
					categories: p.categories || [],
					tags: p.tags || [],
				})
			);

			res.json({
				chain,
				stores: stores.map((s: any) => ({
					id: s.id,
					name: s.name,
					type: s.type,
					address: s.address,
					city: s.city,
					state: s.state,
					zipCode: s.zipCode,
					latitude: s.latitude,
					longitude: s.longitude,
					locationIdentifier: s.locationIdentifier,
				})),
				products,
				totalProducts: productIds.length,
				page: pageNum,
				totalPages: Math.ceil(productIds.length / pageSizeNum),
			});
		} catch (error) {
			console.error('Error in GET /api/stores/chains/slug/:slug:', error);
			next(error);
		}
	}
);

// GET /api/stores/:id/page - Get individual store page data (for online retailers or independent stores)
router.get(
	'/:id/page',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { page = '1', pageSize = '24' } = req.query;

			const store = await storeService.getStoreById(id);
			if (!store) {
				throw new HttpError('Store not found', 404);
			}

			// Get all products available at this store
			const availabilities = await Availability.find({
				storeId: id,
				moderationStatus: 'confirmed',
			})
				.select('productId')
				.lean();

			const productIdSet = new Set(
				availabilities.map((a: any) => a.productId.toString())
			);
			const productIds = Array.from(productIdSet);

			// Paginate products
			const pageNum = parseInt(page as string, 10);
			const pageSizeNum = parseInt(pageSize as string, 10);
			const skip = (pageNum - 1) * pageSizeNum;
			const paginatedIds = productIds.slice(skip, skip + pageSizeNum);

			// Fetch product details
			const productObjectIds = paginatedIds.map(
				(id) => new mongoose.Types.ObjectId(id)
			);

			const [apiProducts, userProducts] = await Promise.all([
				Product.find({
					_id: { $in: productObjectIds },
					archived: { $ne: true },
				})
					.select('name brand sizeOrVariant imageUrl categories tags')
					.lean(),
				UserProduct.find({
					_id: { $in: productObjectIds },
					status: 'approved',
					archived: { $ne: true },
				})
					.select('name brand sizeOrVariant imageUrl categories tags')
					.lean(),
			]);

			const products = [...apiProducts, ...userProducts].map(
				(p: any) => ({
					id: p._id.toString(),
					name: p.name,
					brand: p.brand,
					sizeOrVariant: p.sizeOrVariant,
					imageUrl: p.imageUrl,
					categories: p.categories || [],
					tags: p.tags || [],
				})
			);

			res.json({
				store,
				products,
				totalProducts: productIds.length,
				page: pageNum,
				totalPages: Math.ceil(productIds.length / pageSizeNum),
			});
		} catch (error) {
			console.error('Error in GET /api/stores/:id/page:', error);
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
			const userId = req.userId;
			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

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
				createdBy: userId, // Track who created the store
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

// ============================================
// USER CONTRIBUTION ROUTES (requires auth)
// ============================================

// POST /api/stores/chains/:id/suggest-edit - Submit a suggested edit for a chain
router.post(
	'/chains/:id/suggest-edit',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { field, suggestedValue, reason } = req.body;
			const userId = req.userId;

			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			// Validate field
			const validFields = ['name', 'description', 'websiteUrl'];
			if (!field || !validFields.includes(field)) {
				throw new HttpError(
					'Invalid field. Must be name, description, or websiteUrl',
					400
				);
			}

			if (suggestedValue === undefined || suggestedValue === null) {
				throw new HttpError('suggestedValue is required', 400);
			}

			// Get the chain
			const chain = await StoreChain.findById(id).lean();
			if (!chain) {
				throw new HttpError('Chain not found', 404);
			}

			// Get the original value (may be undefined/null)
			const originalValue =
				(chain[field as keyof typeof chain] as string) || '';

			// Don't create edit if values are the same
			const trimmedValue =
				typeof suggestedValue === 'string'
					? suggestedValue.trim()
					: suggestedValue;
			if (originalValue === trimmedValue) {
				throw new HttpError(
					'Suggested value is the same as the current value',
					400
				);
			}

			// Check if user is a trusted contributor
			const user = await User.findById(userId).lean();
			const isTrusted = user?.trustedContributor || false;

			// For trusted users, auto-apply the edit but flag for review
			if (isTrusted) {
				// Apply the edit directly
				const updateData: Record<string, string> = {};
				updateData[field] = trimmedValue;
				await StoreChain.findByIdAndUpdate(id, updateData);

				// Create the edit record (already approved but flagged for review)
				const contentEdit = await RetailerContentEdit.create({
					retailerType: 'chain',
					chainId: chain._id,
					chainSlug: chain.slug,
					field,
					originalValue,
					suggestedValue: trimmedValue,
					reason: reason?.trim(),
					userId: new mongoose.Types.ObjectId(userId),
					status: 'approved',
					trustedContribution: true,
					autoApplied: true,
				});

				return res.status(201).json({
					message: 'Edit applied successfully',
					edit: {
						id: contentEdit._id.toString(),
						field: contentEdit.field,
						status: contentEdit.status,
					},
					autoApplied: true,
				});
			}

			// For regular users, create pending edit
			const contentEdit = await RetailerContentEdit.create({
				retailerType: 'chain',
				chainId: chain._id,
				chainSlug: chain.slug,
				field,
				originalValue,
				suggestedValue: trimmedValue,
				reason: reason?.trim(),
				userId: new mongoose.Types.ObjectId(userId),
				status: 'pending',
				trustedContribution: false,
				autoApplied: false,
			});

			res.status(201).json({
				message: 'Edit suggestion submitted for review',
				edit: {
					id: contentEdit._id.toString(),
					field: contentEdit.field,
					status: contentEdit.status,
				},
				autoApplied: false,
			});
		} catch (error) {
			next(error);
		}
	}
);

// POST /api/stores/:id/suggest-edit - Submit a suggested edit for a store
router.post(
	'/:id/suggest-edit',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { field, suggestedValue, reason } = req.body;
			const userId = req.userId;

			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			// Validate field
			const validFields = ['name', 'description', 'websiteUrl'];
			if (!field || !validFields.includes(field)) {
				throw new HttpError(
					'Invalid field. Must be name, description, or websiteUrl',
					400
				);
			}

			if (suggestedValue === undefined || suggestedValue === null) {
				throw new HttpError('suggestedValue is required', 400);
			}

			// Get the store
			const store = await Store.findById(id).lean();
			if (!store) {
				throw new HttpError('Store not found', 404);
			}

			// Get the original value (may be undefined/null)
			const originalValue =
				(store[field as keyof typeof store] as string) || '';

			// Don't create edit if values are the same
			const trimmedValue =
				typeof suggestedValue === 'string'
					? suggestedValue.trim()
					: suggestedValue;
			if (originalValue === trimmedValue) {
				throw new HttpError(
					'Suggested value is the same as the current value',
					400
				);
			}

			// Check if user is a trusted contributor
			const user = await User.findById(userId).lean();
			const isTrusted = user?.trustedContributor || false;

			// For trusted users, auto-apply the edit but flag for review
			if (isTrusted) {
				// Apply the edit directly
				const updateData: Record<string, string> = {};
				updateData[field] = trimmedValue;
				await Store.findByIdAndUpdate(id, updateData);

				// Create the edit record (already approved but flagged for review)
				const contentEdit = await RetailerContentEdit.create({
					retailerType: 'store',
					storeId: store._id,
					field,
					originalValue,
					suggestedValue: trimmedValue,
					reason: reason?.trim(),
					userId: new mongoose.Types.ObjectId(userId),
					status: 'approved',
					trustedContribution: true,
					autoApplied: true,
				});

				return res.status(201).json({
					message: 'Edit applied successfully',
					edit: {
						id: contentEdit._id.toString(),
						field: contentEdit.field,
						status: contentEdit.status,
					},
					autoApplied: true,
				});
			}

			// For regular users, create pending edit
			const contentEdit = await RetailerContentEdit.create({
				retailerType: 'store',
				storeId: store._id,
				field,
				originalValue,
				suggestedValue: trimmedValue,
				reason: reason?.trim(),
				userId: new mongoose.Types.ObjectId(userId),
				status: 'pending',
				trustedContribution: false,
				autoApplied: false,
			});

			res.status(201).json({
				message: 'Edit suggestion submitted for review',
				edit: {
					id: contentEdit._id.toString(),
					field: contentEdit.field,
					status: contentEdit.status,
				},
				autoApplied: false,
			});
		} catch (error) {
			next(error);
		}
	}
);

export default router;
