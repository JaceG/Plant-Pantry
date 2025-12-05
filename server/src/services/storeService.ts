import mongoose from 'mongoose';
import { Store, IStore } from '../models';

export interface StoreSummary {
	id: string;
	name: string;
	type: string;
	regionOrScope: string;
	websiteUrl?: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	country?: string;
	latitude?: number;
	longitude?: number;
	googlePlaceId?: string;
	phoneNumber?: string;
}

export interface StoreListResult {
	items: StoreSummary[];
}

export interface CreateStoreInput {
	name: string;
	type: 'brick_and_mortar' | 'online_retailer' | 'brand_direct';
	regionOrScope: string;
	websiteUrl?: string;
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	country?: string;
	latitude?: number;
	longitude?: number;
	googlePlaceId?: string;
	phoneNumber?: string;
}

export interface DuplicateCheckResult {
	hasDuplicates: boolean;
	exactMatch?: StoreSummary;
	similarStores: StoreSummary[];
}

export const storeService = {
	async getStores(): Promise<StoreListResult> {
		const stores = await Store.find()
			.select(
				'name type regionOrScope websiteUrl address city state zipCode country latitude longitude googlePlaceId phoneNumber'
			)
			.sort({ name: 1 })
			.lean();

		const items: StoreSummary[] = stores.map((s) => ({
			id: s._id.toString(),
			name: s.name,
			type: s.type,
			regionOrScope: s.regionOrScope,
			websiteUrl: s.websiteUrl,
			address: s.address,
			city: s.city,
			state: s.state,
			zipCode: s.zipCode,
			country: s.country,
			latitude: s.latitude,
			longitude: s.longitude,
			googlePlaceId: s.googlePlaceId,
			phoneNumber: s.phoneNumber,
		}));

		return { items };
	},

	async getStoreById(id: string): Promise<StoreSummary | null> {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return null;
		}

		const store = await Store.findById(id).lean();
		if (!store) {
			return null;
		}

		return {
			id: store._id.toString(),
			name: store.name,
			type: store.type,
			regionOrScope: store.regionOrScope,
			websiteUrl: store.websiteUrl,
			address: store.address,
			city: store.city,
			state: store.state,
			zipCode: store.zipCode,
			country: store.country,
			latitude: store.latitude,
			longitude: store.longitude,
			googlePlaceId: store.googlePlaceId,
			phoneNumber: store.phoneNumber,
		};
	},

	async createStore(input: CreateStoreInput): Promise<StoreSummary> {
		const store = await Store.create(input);

		return {
			id: store._id.toString(),
			name: store.name,
			type: store.type,
			regionOrScope: store.regionOrScope,
			websiteUrl: store.websiteUrl,
			address: store.address,
			city: store.city,
			state: store.state,
			zipCode: store.zipCode,
			country: store.country,
			latitude: store.latitude,
			longitude: store.longitude,
			googlePlaceId: store.googlePlaceId,
			phoneNumber: store.phoneNumber,
		};
	},

	async searchStores(query: string): Promise<StoreListResult> {
		const stores = await Store.find({
			$or: [
				{ name: { $regex: query, $options: 'i' } },
				{ address: { $regex: query, $options: 'i' } },
				{ city: { $regex: query, $options: 'i' } },
			],
		})
			.select(
				'name type regionOrScope websiteUrl address city state zipCode country latitude longitude googlePlaceId phoneNumber'
			)
			.sort({ name: 1 })
			.limit(20)
			.lean();

		const items: StoreSummary[] = stores.map((s) => ({
			id: s._id.toString(),
			name: s.name,
			type: s.type,
			regionOrScope: s.regionOrScope,
			websiteUrl: s.websiteUrl,
			address: s.address,
			city: s.city,
			state: s.state,
			zipCode: s.zipCode,
			country: s.country,
			latitude: s.latitude,
			longitude: s.longitude,
			googlePlaceId: s.googlePlaceId,
			phoneNumber: s.phoneNumber,
		}));

		return { items };
	},

	async checkForDuplicates(
		input: CreateStoreInput
	): Promise<DuplicateCheckResult> {
		const result: DuplicateCheckResult = {
			hasDuplicates: false,
			similarStores: [],
		};

		// For physical stores, check by Google Place ID first (exact match)
		if (input.type === 'brick_and_mortar' && input.googlePlaceId) {
			const exactMatch = await Store.findOne({
				googlePlaceId: input.googlePlaceId,
			}).lean();
			if (exactMatch) {
				result.hasDuplicates = true;
				result.exactMatch = {
					id: exactMatch._id.toString(),
					name: exactMatch.name,
					type: exactMatch.type,
					regionOrScope: exactMatch.regionOrScope,
					websiteUrl: exactMatch.websiteUrl,
					address: exactMatch.address,
					city: exactMatch.city,
					state: exactMatch.state,
					zipCode: exactMatch.zipCode,
					country: exactMatch.country,
					latitude: exactMatch.latitude,
					longitude: exactMatch.longitude,
					googlePlaceId: exactMatch.googlePlaceId,
					phoneNumber: exactMatch.phoneNumber,
				};
				return result;
			}
		}

		// For online stores, check by name + websiteUrl (exact match)
		if (
			(input.type === 'online_retailer' ||
				input.type === 'brand_direct') &&
			input.websiteUrl
		) {
			// Normalize URL for comparison (remove trailing slashes, www, etc.)
			const normalizeUrl = (url: string): string => {
				try {
					const parsed = new URL(url.toLowerCase());
					return (
						parsed.hostname.replace(/^www\./, '') +
						parsed.pathname.replace(/\/$/, '')
					);
				} catch {
					return url
						.toLowerCase()
						.replace(/^www\./, '')
						.replace(/\/$/, '');
				}
			};

			const normalizedInputUrl = normalizeUrl(input.websiteUrl);

			// Find stores with same name and similar URL
			const potentialMatches = await Store.find({
				name: {
					$regex: `^${input.name.replace(
						/[.*+?^${}()|[\]\\]/g,
						'\\$&'
					)}$`,
					$options: 'i',
				},
				type: { $in: ['online_retailer', 'brand_direct'] },
			}).lean();

			for (const match of potentialMatches) {
				if (
					match.websiteUrl &&
					normalizeUrl(match.websiteUrl) === normalizedInputUrl
				) {
					result.hasDuplicates = true;
					result.exactMatch = {
						id: match._id.toString(),
						name: match.name,
						type: match.type,
						regionOrScope: match.regionOrScope,
						websiteUrl: match.websiteUrl,
						address: match.address,
						city: match.city,
						state: match.state,
						zipCode: match.zipCode,
						country: match.country,
						latitude: match.latitude,
						longitude: match.longitude,
						googlePlaceId: match.googlePlaceId,
						phoneNumber: match.phoneNumber,
					};
					return result;
				}
			}
		}

		// Check for similar stores by name (fuzzy match)
		const similarByName = await Store.find({
			name: {
				$regex: input.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
				$options: 'i',
			},
			type: input.type,
		})
			.limit(5)
			.lean();

		if (similarByName.length > 0) {
			result.hasDuplicates = true;
			result.similarStores = similarByName.map((s) => ({
				id: s._id.toString(),
				name: s.name,
				type: s.type,
				regionOrScope: s.regionOrScope,
				websiteUrl: s.websiteUrl,
				address: s.address,
				city: s.city,
				state: s.state,
				zipCode: s.zipCode,
				country: s.country,
				latitude: s.latitude,
				longitude: s.longitude,
				googlePlaceId: s.googlePlaceId,
				phoneNumber: s.phoneNumber,
			}));
		}

		return result;
	},
};
