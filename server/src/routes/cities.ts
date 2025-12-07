import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { cityService } from '../services/cityService';
import { HttpError } from '../middleware/errorHandler';
import { Availability, Product, UserProduct, Review } from '../models';

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

export default router;
