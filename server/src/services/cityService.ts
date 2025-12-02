import mongoose from 'mongoose';
import {
	CityLandingPage,
	ICityLandingPage,
	Store,
	Availability,
	Product,
	UserProduct,
	Review,
} from '../models';

export interface CityPageData {
	slug: string;
	cityName: string;
	state: string;
	headline: string;
	description: string;
	isActive: boolean;
}

export interface CityStore {
	id: string;
	name: string;
	type: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	latitude?: number;
	longitude?: number;
	websiteUrl?: string;
	phoneNumber?: string;
	productCount?: number;
}

export interface CityProduct {
	id: string;
	name: string;
	brand: string;
	sizeOrVariant: string;
	imageUrl?: string;
	categories: string[];
	tags: string[];
	averageRating?: number;
	reviewCount?: number;
	storeNames: string[];
}

export const cityService = {
	/**
	 * Get city landing page by slug
	 */
	async getCityPage(
		slug: string,
		includeInactive: boolean = false
	): Promise<CityPageData | null> {
		const query: any = { slug: slug.toLowerCase() };
		if (!includeInactive) {
			query.isActive = true;
		}

		const cityPage = await CityLandingPage.findOne(query).lean();
		if (!cityPage) return null;

		return {
			slug: cityPage.slug,
			cityName: cityPage.cityName,
			state: cityPage.state,
			headline: cityPage.headline,
			description: cityPage.description,
			isActive: cityPage.isActive,
		};
	},

	/**
	 * Get all stores in a city
	 */
	async getCityStores(slug: string): Promise<CityStore[]> {
		// First get the city page to get city name and state
		const cityPage = await CityLandingPage.findOne({
			slug: slug.toLowerCase(),
		}).lean();
		if (!cityPage) return [];

		// Find stores in this city (case-insensitive match)
		const stores = await Store.find({
			city: { $regex: new RegExp(`^${cityPage.cityName}$`, 'i') },
			state: { $regex: new RegExp(`^${cityPage.state}$`, 'i') },
			type: 'brick_and_mortar', // Only physical stores for city pages
		}).lean();

		// Get product counts for each store
		const storeIds = stores.map((s) => s._id);
		const availabilityCounts = await Availability.aggregate([
			{ $match: { storeId: { $in: storeIds } } },
			{ $group: { _id: '$storeId', count: { $sum: 1 } } },
		]);

		const countMap = new Map(
			availabilityCounts.map((a) => [a._id.toString(), a.count])
		);

		return stores.map((store) => ({
			id: store._id.toString(),
			name: store.name,
			type: store.type,
			address: store.address,
			city: store.city,
			state: store.state,
			zipCode: store.zipCode,
			latitude: store.latitude,
			longitude: store.longitude,
			websiteUrl: store.websiteUrl,
			phoneNumber: store.phoneNumber,
			productCount: countMap.get(store._id.toString()) || 0,
		}));
	},

	/**
	 * Get products available at stores in a city
	 */
	async getCityProducts(
		slug: string,
		limit: number = 20,
		page: number = 1
	): Promise<{
		products: CityProduct[];
		totalCount: number;
		page: number;
		totalPages: number;
	}> {
		// First get the city page to get city name and state
		const cityPage = await CityLandingPage.findOne({
			slug: slug.toLowerCase(),
		}).lean();
		if (!cityPage) {
			return { products: [], totalCount: 0, page, totalPages: 0 };
		}

		// Find stores in this city
		const stores = await Store.find({
			city: { $regex: new RegExp(`^${cityPage.cityName}$`, 'i') },
			state: { $regex: new RegExp(`^${cityPage.state}$`, 'i') },
			type: 'brick_and_mortar',
		}).lean();

		if (stores.length === 0) {
			return { products: [], totalCount: 0, page, totalPages: 0 };
		}

		const storeIds = stores.map((s) => s._id);
		const storeMap = new Map(stores.map((s) => [s._id.toString(), s.name]));

		// Get all product IDs available at these stores
		const availabilities = await Availability.find({
			storeId: { $in: storeIds },
		}).lean();

		// Group by product ID and collect store names
		const productStoreMap = new Map<string, Set<string>>();
		availabilities.forEach((a) => {
			const productId = a.productId.toString();
			if (!productStoreMap.has(productId)) {
				productStoreMap.set(productId, new Set());
			}
			const storeName = storeMap.get(a.storeId.toString());
			if (storeName) {
				productStoreMap.get(productId)!.add(storeName);
			}
		});

		const productIds = Array.from(productStoreMap.keys());
		const totalCount = productIds.length;
		const totalPages = Math.ceil(totalCount / limit);

		// Paginate the product IDs
		const skip = (page - 1) * limit;
		const paginatedIds = productIds.slice(skip, skip + limit);

		if (paginatedIds.length === 0) {
			return { products: [], totalCount, page, totalPages };
		}

		// Fetch products
		const productObjectIds = paginatedIds
			.filter((id) => mongoose.Types.ObjectId.isValid(id))
			.map((id) => new mongoose.Types.ObjectId(id));

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
				console.warn(
					'Error fetching rating stats for city products:',
					error
				);
			}
		}

		const products: CityProduct[] = allProducts.map((p) => {
			const id = p._id.toString();
			const stats = ratingStatsMap.get(id);
			const storeNames = Array.from(productStoreMap.get(id) || []);

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
				storeNames,
			};
		});

		return { products, totalCount, page, totalPages };
	},

	/**
	 * Get all active city landing pages
	 */
	async getActiveCityPages(): Promise<CityPageData[]> {
		const cityPages = await CityLandingPage.find({ isActive: true })
			.sort({ cityName: 1 })
			.lean();

		return cityPages.map((page) => ({
			slug: page.slug,
			cityName: page.cityName,
			state: page.state,
			headline: page.headline,
			description: page.description,
			isActive: page.isActive,
		}));
	},

	/**
	 * Get all city landing pages (for admin)
	 */
	async getAllCityPages(): Promise<
		(CityPageData & { createdAt: Date; updatedAt: Date })[]
	> {
		const cityPages = await CityLandingPage.find()
			.sort({ cityName: 1 })
			.lean();

		return cityPages.map((page) => ({
			slug: page.slug,
			cityName: page.cityName,
			state: page.state,
			headline: page.headline,
			description: page.description,
			isActive: page.isActive,
			createdAt: page.createdAt,
			updatedAt: page.updatedAt,
		}));
	},

	/**
	 * Create a new city landing page
	 */
	async createCityPage(data: {
		slug: string;
		cityName: string;
		state: string;
		headline: string;
		description: string;
		isActive?: boolean;
		featuredStoreIds?: string[];
	}): Promise<ICityLandingPage> {
		const cityPage = new CityLandingPage({
			slug: data.slug.toLowerCase(),
			cityName: data.cityName,
			state: data.state.toUpperCase(),
			headline: data.headline,
			description: data.description,
			isActive: data.isActive ?? false,
			featuredStoreIds:
				data.featuredStoreIds?.map(
					(id) => new mongoose.Types.ObjectId(id)
				) || [],
		});

		await cityPage.save();
		return cityPage;
	},

	/**
	 * Update a city landing page
	 */
	async updateCityPage(
		slug: string,
		data: {
			cityName?: string;
			state?: string;
			headline?: string;
			description?: string;
			isActive?: boolean;
			featuredStoreIds?: string[];
		}
	): Promise<ICityLandingPage | null> {
		const updateData: any = {};

		if (data.cityName !== undefined) updateData.cityName = data.cityName;
		if (data.state !== undefined)
			updateData.state = data.state.toUpperCase();
		if (data.headline !== undefined) updateData.headline = data.headline;
		if (data.description !== undefined)
			updateData.description = data.description;
		if (data.isActive !== undefined) updateData.isActive = data.isActive;
		if (data.featuredStoreIds !== undefined) {
			updateData.featuredStoreIds = data.featuredStoreIds.map(
				(id) => new mongoose.Types.ObjectId(id)
			);
		}

		const cityPage = await CityLandingPage.findOneAndUpdate(
			{ slug: slug.toLowerCase() },
			updateData,
			{ new: true }
		);

		return cityPage;
	},

	/**
	 * Delete a city landing page
	 */
	async deleteCityPage(slug: string): Promise<boolean> {
		const result = await CityLandingPage.deleteOne({
			slug: slug.toLowerCase(),
		});
		return result.deletedCount > 0;
	},
};
