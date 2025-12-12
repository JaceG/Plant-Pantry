import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { cityService } from '../services/cityService';
import { HttpError } from '../middleware/errorHandler';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import {
	Availability,
	Product,
	UserProduct,
	Review,
	CityLandingPage,
	CityContentEdit,
	Store,
	User,
} from '../models';

// Helper to get user trust level for moderation decisions
// - Admin: trusted, no review needed
// - Moderator/Trusted contributor: trusted, needs review by admin later
// - Regular user: not trusted, stays pending until approved
async function getUserTrustLevel(
	userId: string
): Promise<{ isTrusted: boolean; needsReview: boolean }> {
	const user = await User.findById(userId)
		.select('trustedContributor role')
		.lean();
	if (!user) return { isTrusted: false, needsReview: true };

	if (user.role === 'admin') {
		return { isTrusted: true, needsReview: false };
	}
	if (user.role === 'moderator') {
		return { isTrusted: true, needsReview: true };
	}
	if (user.trustedContributor) {
		return { isTrusted: true, needsReview: true };
	}
	return { isTrusted: false, needsReview: true };
}

const router = Router();

// GET /api/cities/geocode - Reverse geocode coordinates to city/state using Google Maps API
router.get(
	'/geocode',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { lat, lng } = req.query;

			if (!lat || !lng) {
				throw new HttpError(
					'lat and lng query parameters are required',
					400
				);
			}

			const latitude = parseFloat(lat as string);
			const longitude = parseFloat(lng as string);

			if (isNaN(latitude) || isNaN(longitude)) {
				throw new HttpError('Invalid lat/lng values', 400);
			}

			const apiKey = process.env.GOOGLE_API_KEY;
			if (!apiKey) {
				throw new HttpError('Google API key not configured', 500);
			}

			// Call Google Maps Geocoding API
			const response = await fetch(
				`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
			);

			if (!response.ok) {
				throw new HttpError('Geocoding request failed', 500);
			}

			interface AddressComponent {
				long_name: string;
				short_name: string;
				types: string[];
			}

			interface GeocodeResult {
				address_components: AddressComponent[];
			}

			interface GeocodeResponse {
				status: string;
				results: GeocodeResult[];
			}

			const data = (await response.json()) as GeocodeResponse;

			if (
				data.status !== 'OK' ||
				!data.results ||
				data.results.length === 0
			) {
				return res.json({ city: null, state: null });
			}

			// Parse the address components to find city and state
			let city = '';
			let state = '';

			// Look through results to find the most specific location
			for (const result of data.results) {
				for (const component of result.address_components) {
					const types = component.types;

					// Get city (locality or sublocality)
					if (
						types.includes('locality') ||
						types.includes('sublocality') ||
						types.includes('sublocality_level_1')
					) {
						if (!city) {
							city = component.long_name;
						}
					}

					// Get state (administrative_area_level_1)
					if (types.includes('administrative_area_level_1')) {
						if (!state) {
							// Google returns short_name as abbreviation (e.g., "CA")
							state = component.short_name;
						}
					}
				}

				// If we found both, we're done
				if (city && state) break;
			}

			// If no city found, try county or neighborhood
			if (!city) {
				for (const result of data.results) {
					for (const component of result.address_components) {
						const types = component.types;
						if (
							types.includes('administrative_area_level_2') ||
							types.includes('neighborhood')
						) {
							city = component.long_name;
							break;
						}
					}
					if (city) break;
				}
			}

			res.json({ city, state });
		} catch (error) {
			console.error('Error in GET /api/cities/geocode:', error);
			next(error);
		}
	}
);

// GET /api/cities - Get all active city landing pages
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const cities = await cityService.getActiveCityPages();
		res.json({ cities });
	} catch (error) {
		console.error('Error in GET /api/cities:', error);
		next(error);
	}
});

// GET /api/cities/:slug - Get city landing page data
router.get(
	'/:slug',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const city = await cityService.getCityPage(slug);

			if (!city) {
				throw new HttpError('City page not found', 404);
			}

			res.json({ city });
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/cities/:slug/stores - Get stores in a city
router.get(
	'/:slug/stores',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const { grouped } = req.query;

			// Verify city exists
			const city = await cityService.getCityPage(slug);
			if (!city) {
				throw new HttpError('City page not found', 404);
			}

			// Return grouped or flat list based on query param
			if (grouped === 'true') {
				const groupedStores = await cityService.getCityStoresGrouped(
					slug
				);
				res.json(groupedStores);
			} else {
				const stores = await cityService.getCityStores(slug);
				res.json({ stores });
			}
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/cities/:slug/products - Get products available at city stores
router.get(
	'/:slug/products',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const { page, limit } = req.query;

			// Verify city exists
			const city = await cityService.getCityPage(slug);
			if (!city) {
				throw new HttpError('City page not found', 404);
			}

			const result = await cityService.getCityProducts(
				slug,
				limit ? parseInt(limit as string, 10) : 20,
				page ? parseInt(page as string, 10) : 1
			);

			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/cities/:slug/stores/:storeId/products - Get products at a specific store
router.get(
	'/:slug/stores/:storeId/products',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug, storeId } = req.params;

			// Verify city exists
			const city = await cityService.getCityPage(slug);
			if (!city) {
				throw new HttpError('City page not found', 404);
			}

			// Get confirmed availability for this store (include legacy records without moderationStatus)
			const availabilities = await Availability.find({
				storeId: new mongoose.Types.ObjectId(storeId),
				$or: [
					{ moderationStatus: 'confirmed' },
					{ moderationStatus: { $exists: false } },
				],
			}).lean();

			if (availabilities.length === 0) {
				return res.json({ products: [] });
			}

			const productIds = availabilities.map((a) => a.productId);
			const productObjectIds = productIds.map(
				(id) => new mongoose.Types.ObjectId(id)
			);

			// Fetch products
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

			const allProducts = [...apiProducts, ...userProducts];

			// Get rating stats
			const ratingStatsMap = new Map<
				string,
				{ averageRating: number; reviewCount: number }
			>();

			if (productObjectIds.length > 0) {
				try {
					const ratingAggregation = await Review.aggregate([
						{
							$match: {
								status: 'approved',
								productId: { $in: productObjectIds },
							},
						},
						{
							$group: {
								_id: '$productId',
								averageRating: { $avg: '$rating' },
								reviewCount: { $sum: 1 },
							},
						},
					]);

					ratingAggregation.forEach((agg: any) => {
						if (agg._id) {
							const productId = agg._id.toString();
							const avgRating =
								Math.round(agg.averageRating * 10) / 10;
							ratingStatsMap.set(productId, {
								averageRating: avgRating,
								reviewCount: agg.reviewCount,
							});
						}
					});
				} catch (error) {
					console.warn('Error fetching rating stats:', error);
				}
			}

			// Get price ranges from availability
			const priceMap = new Map<string, string>();
			availabilities.forEach((a) => {
				if (a.priceRange) {
					priceMap.set(a.productId.toString(), a.priceRange);
				}
			});

			const products = allProducts.map((p) => {
				const id = p._id.toString();
				const stats = ratingStatsMap.get(id);
				const priceRange = priceMap.get(id);

				return {
					id,
					name: p.name,
					brand: p.brand,
					sizeOrVariant: p.sizeOrVariant,
					imageUrl: p.imageUrl,
					categories: p.categories || [],
					tags: p.tags || [],
					averageRating: stats?.averageRating,
					reviewCount: stats?.reviewCount,
					priceRange,
				};
			});

			res.json({ products });
		} catch (error) {
			next(error);
		}
	}
);

// ============================================
// USER CONTRIBUTION ROUTES (requires auth)
// ============================================

// POST /api/cities/:slug/suggest-edit - Submit a suggested edit to city page content
router.post(
	'/:slug/suggest-edit',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const { field, suggestedValue, reason } = req.body;
			const userId = req.userId;

			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			// Validate field
			const validFields = ['cityName', 'headline', 'description'];
			if (!field || !validFields.includes(field)) {
				throw new HttpError(
					'Invalid field. Must be cityName, headline, or description',
					400
				);
			}

			if (!suggestedValue || typeof suggestedValue !== 'string') {
				throw new HttpError('suggestedValue is required', 400);
			}

			// Get the city page
			const cityPage = await CityLandingPage.findOne({
				slug: slug.toLowerCase(),
			}).lean();

			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			// Get the original value
			const originalValue = cityPage[
				field as keyof typeof cityPage
			] as string;

			const trimmedValue = suggestedValue.trim();

			// Don't create edit if values are the same
			if (originalValue === trimmedValue) {
				throw new HttpError(
					'Suggested value is the same as the current value',
					400
				);
			}

			// Check user trust level for moderation decisions
			const { isTrusted, needsReview } = await getUserTrustLevel(userId);

			// For trusted users (admin/mod/trusted contributor), auto-apply the edit
			if (isTrusted) {
				// Apply the edit directly
				const updateData: Record<string, string> = {};
				updateData[field] = trimmedValue;
				await CityLandingPage.findByIdAndUpdate(
					cityPage._id,
					updateData
				);

				// Create the edit record (already approved; admins don't need review, others do)
				const contentEdit = await CityContentEdit.create({
					cityPageId: cityPage._id,
					citySlug: cityPage.slug,
					field,
					originalValue,
					suggestedValue: trimmedValue,
					reason: reason?.trim(),
					userId: new mongoose.Types.ObjectId(userId),
					status: 'approved',
					trustedContribution: true,
					autoApplied: needsReview, // Admin edits don't need review (autoApplied=false)
				});

				return res.status(201).json({
					message: 'Edit applied successfully',
					edit: {
						id: contentEdit._id.toString(),
						field: contentEdit.field,
						status: contentEdit.status,
					},
					autoApplied: needsReview,
				});
			}

			// For regular users, create pending edit
			const contentEdit = await CityContentEdit.create({
				cityPageId: cityPage._id,
				citySlug: cityPage.slug,
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

// POST /api/cities/:slug/stores - Suggest a new store in this city
router.post(
	'/:slug/stores',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const userId = req.userId;

			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const {
				name,
				type,
				address,
				zipCode,
				websiteUrl,
				phoneNumber,
				latitude,
				longitude,
				googlePlaceId,
			} = req.body;

			if (!name) {
				throw new HttpError('Store name is required', 400);
			}

			// Get the city page to get city/state
			const cityPage = await CityLandingPage.findOne({
				slug: slug.toLowerCase(),
			}).lean();

			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			// Check user trust level for moderation decisions
			const { isTrusted, needsReview } = await getUserTrustLevel(userId);

			// Create the store with pending status (or confirmed if trusted)
			const store = await Store.create({
				name,
				type: type || 'brick_and_mortar',
				city: cityPage.cityName,
				state: cityPage.state,
				address,
				zipCode,
				websiteUrl,
				phoneNumber,
				latitude,
				longitude,
				googlePlaceId,
				createdBy: new mongoose.Types.ObjectId(userId),
				moderationStatus: isTrusted ? 'confirmed' : 'pending',
				trustedContribution: isTrusted,
				needsReview: needsReview, // Admin edits don't need review; moderator/trusted edits do
			});

			res.status(201).json({
				message: isTrusted
					? 'Store added successfully'
					: 'Store submitted for review',
				store: {
					id: store._id.toString(),
					name: store.name,
					city: store.city,
					state: store.state,
					moderationStatus: store.moderationStatus,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

// POST /api/cities/:slug/stores/:storeId/products - Report a product at a store
router.post(
	'/:slug/stores/:storeId/products',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug, storeId } = req.params;
			const userId = req.userId;

			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const { productId, priceRange, notes } = req.body;

			if (!productId) {
				throw new HttpError('productId is required', 400);
			}

			// Verify the city page exists
			const cityPage = await CityLandingPage.findOne({
				slug: slug.toLowerCase(),
			}).lean();

			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			// Verify store exists and is in this city
			const store = await Store.findOne({
				_id: new mongoose.Types.ObjectId(storeId),
				city: { $regex: new RegExp(`^${cityPage.cityName}$`, 'i') },
				state: { $regex: new RegExp(`^${cityPage.state}$`, 'i') },
			}).lean();

			if (!store) {
				throw new HttpError('Store not found in this city', 404);
			}

			// Verify product exists
			let product = await Product.findById(productId).lean();
			if (!product) {
				product = (await UserProduct.findOne({
					_id: productId,
					status: 'approved',
				}).lean()) as any;
			}
			if (!product) {
				throw new HttpError('Product not found', 404);
			}

			// Check if availability already exists
			const existingAvailability = await Availability.findOne({
				productId: new mongoose.Types.ObjectId(productId),
				storeId: new mongoose.Types.ObjectId(storeId),
			}).lean();

			if (existingAvailability) {
				// Update existing availability (confirm it's still there)
				await Availability.findByIdAndUpdate(existingAvailability._id, {
					lastConfirmedAt: new Date(),
					...(priceRange && { priceRange }),
					...(notes && { notes }),
				});

				return res.json({
					message: 'Product availability confirmed',
					isNew: false,
				});
			}

			// Check user trust level for moderation decisions
			const { isTrusted, needsReview } = await getUserTrustLevel(userId);

			// Create new availability report
			const availability = await Availability.create({
				productId: new mongoose.Types.ObjectId(productId),
				storeId: new mongoose.Types.ObjectId(storeId),
				source: 'user_contribution',
				moderationStatus: isTrusted ? 'confirmed' : 'pending',
				priceRange,
				notes,
				reportedBy: new mongoose.Types.ObjectId(userId),
				lastConfirmedAt: new Date(),
				trustedContribution: isTrusted,
				needsReview: needsReview, // Admin edits don't need review; moderator/trusted edits do
			});

			res.status(201).json({
				message: isTrusted
					? 'Product added to store'
					: 'Product availability submitted for review',
				isNew: true,
				availability: {
					id: availability._id.toString(),
					moderationStatus: availability.moderationStatus,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/cities/:slug/my-contributions - Get user's contributions for this city
router.get(
	'/:slug/my-contributions',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const userId = req.userId;

			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			// Get the city page
			const cityPage = await CityLandingPage.findOne({
				slug: slug.toLowerCase(),
			}).lean();

			if (!cityPage) {
				throw new HttpError('City page not found', 404);
			}

			// Get user's pending content edits for this city
			const pendingEdits = await CityContentEdit.find({
				citySlug: slug.toLowerCase(),
				userId: new mongoose.Types.ObjectId(userId),
				status: 'pending',
			})
				.sort({ createdAt: -1 })
				.lean();

			// Get stores the user suggested in this city
			const userStores = await Store.find({
				city: { $regex: new RegExp(`^${cityPage.cityName}$`, 'i') },
				state: { $regex: new RegExp(`^${cityPage.state}$`, 'i') },
				createdBy: new mongoose.Types.ObjectId(userId),
			})
				.sort({ createdAt: -1 })
				.lean();

			// Get stores in this city for availability lookup
			const cityStores = await Store.find({
				city: { $regex: new RegExp(`^${cityPage.cityName}$`, 'i') },
				state: { $regex: new RegExp(`^${cityPage.state}$`, 'i') },
			}).lean();

			const cityStoreIds = cityStores.map((s) => s._id);

			// Get user's availability reports for stores in this city
			const userAvailabilities = await Availability.find({
				storeId: { $in: cityStoreIds },
				reportedBy: new mongoose.Types.ObjectId(userId),
			})
				.sort({ createdAt: -1 })
				.lean();

			res.json({
				contentEdits: pendingEdits.map((e) => ({
					id: e._id.toString(),
					field: e.field,
					originalValue: e.originalValue,
					suggestedValue: e.suggestedValue,
					status: e.status,
					createdAt: e.createdAt,
				})),
				stores: userStores.map((s) => ({
					id: s._id.toString(),
					name: s.name,
					moderationStatus: s.moderationStatus,
					createdAt: s.createdAt,
				})),
				availabilityReports: userAvailabilities.map((a) => ({
					id: a._id.toString(),
					productId: a.productId.toString(),
					storeId: a.storeId.toString(),
					moderationStatus: a.moderationStatus,
					createdAt: a.createdAt,
				})),
			});
		} catch (error) {
			next(error);
		}
	}
);

export default router;
