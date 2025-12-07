import mongoose from 'mongoose';
import { Store, IStore, StoreChain } from '../models';
import { storeChainService } from './storeChainService';

export interface ChainInfo {
	id: string;
	name: string;
	slug: string;
	logoUrl?: string;
}

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
	// Chain fields
	chainId?: string;
	locationIdentifier?: string;
	chain?: ChainInfo;
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
	// Chain fields
	chainId?: string;
	locationIdentifier?: string;
}

export interface DuplicateCheckResult {
	hasDuplicates: boolean;
	exactMatch?: StoreSummary;
	similarStores: StoreSummary[];
}

// Helper to convert store document to summary
function toStoreSummary(s: any, chainInfo?: ChainInfo | null): StoreSummary {
	return {
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
		chainId: s.chainId?.toString(),
		locationIdentifier: s.locationIdentifier,
		chain: chainInfo || undefined,
	};
}

export const storeService = {
	async getStores(includeChainInfo = false): Promise<StoreListResult> {
		const stores = await Store.find()
			.select(
				'name type regionOrScope websiteUrl address city state zipCode country latitude longitude googlePlaceId phoneNumber chainId locationIdentifier'
			)
			.sort({ name: 1 })
			.lean();

		let chainMap: Map<string, ChainInfo> | null = null;

		if (includeChainInfo) {
			// Get unique chain IDs
			const chainIds = [
				...new Set(
					stores
						.map((s) => s.chainId?.toString())
						.filter((id): id is string => !!id)
				),
			];

			if (chainIds.length > 0) {
				const chains = await StoreChain.find({
					_id: { $in: chainIds },
				}).lean();

				chainMap = new Map(
					chains.map((c) => [
						c._id.toString(),
						{
							id: c._id.toString(),
							name: c.name,
							slug: c.slug,
							logoUrl: c.logoUrl,
						},
					])
				);
			}
		}

		const items: StoreSummary[] = stores.map((s) => {
			const chainInfo =
				s.chainId && chainMap
					? chainMap.get(s.chainId.toString()) || null
					: null;
			return toStoreSummary(s, chainInfo);
		});

		return { items };
	},

	async getStoreById(
		id: string,
		includeChainInfo = false
	): Promise<StoreSummary | null> {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return null;
		}

		const store = await Store.findById(id).lean();
		if (!store) {
			return null;
		}

		let chainInfo: ChainInfo | null = null;
		if (includeChainInfo && store.chainId) {
			const chain = await StoreChain.findById(store.chainId).lean();
			if (chain) {
				chainInfo = {
					id: chain._id.toString(),
					name: chain.name,
					slug: chain.slug,
					logoUrl: chain.logoUrl,
				};
			}
		}

		return toStoreSummary(store, chainInfo);
	},

	async createStore(input: CreateStoreInput): Promise<StoreSummary> {
		const storeData: any = { ...input };

		// Convert chainId string to ObjectId if provided
		if (input.chainId) {
			storeData.chainId = new mongoose.Types.ObjectId(input.chainId);
		}

		const store = await Store.create(storeData);

		// Update chain location count if assigned to a chain
		if (input.chainId) {
			await storeChainService.updateLocationCount(input.chainId);
		}

		return toStoreSummary(store, null);
	},

	async searchStores(
		query: string,
		includeChainInfo = false
	): Promise<StoreListResult> {
		const stores = await Store.find({
			$or: [
				{ name: { $regex: query, $options: 'i' } },
				{ address: { $regex: query, $options: 'i' } },
				{ city: { $regex: query, $options: 'i' } },
				{ locationIdentifier: { $regex: query, $options: 'i' } },
			],
		})
			.select(
				'name type regionOrScope websiteUrl address city state zipCode country latitude longitude googlePlaceId phoneNumber chainId locationIdentifier'
			)
			.sort({ name: 1 })
			.limit(20)
			.lean();

		let chainMap: Map<string, ChainInfo> | null = null;

		if (includeChainInfo) {
			const chainIds = [
				...new Set(
					stores
						.map((s) => s.chainId?.toString())
						.filter((id): id is string => !!id)
				),
			];

			if (chainIds.length > 0) {
				const chains = await StoreChain.find({
					_id: { $in: chainIds },
				}).lean();

				chainMap = new Map(
					chains.map((c) => [
						c._id.toString(),
						{
							id: c._id.toString(),
							name: c.name,
							slug: c.slug,
							logoUrl: c.logoUrl,
						},
					])
				);
			}
		}

		const items: StoreSummary[] = stores.map((s) => {
			const chainInfo =
				s.chainId && chainMap
					? chainMap.get(s.chainId.toString()) || null
					: null;
			return toStoreSummary(s, chainInfo);
		});

		return { items };
	},

	/**
	 * Get stores by chain ID
	 */
	async getStoresByChain(
		chainId: string,
		filters?: { city?: string; state?: string }
	): Promise<StoreListResult> {
		if (!mongoose.Types.ObjectId.isValid(chainId)) {
			return { items: [] };
		}

		const query: any = { chainId: new mongoose.Types.ObjectId(chainId) };

		if (filters?.city) {
			query.city = { $regex: filters.city, $options: 'i' };
		}
		if (filters?.state) {
			query.state = { $regex: filters.state, $options: 'i' };
		}

		const stores = await Store.find(query)
			.select(
				'name type regionOrScope websiteUrl address city state zipCode country latitude longitude googlePlaceId phoneNumber chainId locationIdentifier'
			)
			.sort({ state: 1, city: 1, name: 1 })
			.lean();

		return {
			items: stores.map((s) => toStoreSummary(s, null)),
		};
	},

	/**
	 * Get stores grouped by chain
	 * @param includeEmptyChains - If true, includes chains with no stores (useful for admin views)
	 */
	async getStoresGroupedByChain(includeEmptyChains = false): Promise<{
		chains: Array<{
			chain: ChainInfo;
			stores: StoreSummary[];
			locationCount: number;
		}>;
		independentStores: StoreSummary[];
	}> {
		const [stores, chains] = await Promise.all([
			Store.find()
				.select(
					'name type regionOrScope websiteUrl address city state zipCode country latitude longitude googlePlaceId phoneNumber chainId locationIdentifier'
				)
				.sort({ name: 1 })
				.lean(),
			StoreChain.find({ isActive: true }).sort({ name: 1 }).lean(),
		]);

		const chainMap = new Map(
			chains.map((c) => [
				c._id.toString(),
				{
					id: c._id.toString(),
					name: c.name,
					slug: c.slug,
					logoUrl: c.logoUrl,
				},
			])
		);

		const chainStoresMap = new Map<string, StoreSummary[]>();
		const independentStores: StoreSummary[] = [];

		for (const store of stores) {
			const storeSummary = toStoreSummary(store, null);

			if (store.chainId) {
				const chainIdStr = store.chainId.toString();
				if (!chainStoresMap.has(chainIdStr)) {
					chainStoresMap.set(chainIdStr, []);
				}
				chainStoresMap.get(chainIdStr)!.push(storeSummary);
			} else {
				independentStores.push(storeSummary);
			}
		}

		let chainGroups = Array.from(chainMap.entries())
			.map(([chainId, chainInfo]) => ({
				chain: chainInfo,
				stores: chainStoresMap.get(chainId) || [],
				locationCount: chainStoresMap.get(chainId)?.length || 0,
			}))
			.sort((a, b) => a.chain.name.localeCompare(b.chain.name));

		// Filter out empty chains unless includeEmptyChains is true
		if (!includeEmptyChains) {
			chainGroups = chainGroups.filter(
				(group) => group.locationCount > 0
			);
		}

		return {
			chains: chainGroups,
			independentStores,
		};
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
				result.exactMatch = toStoreSummary(exactMatch, null);
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
					result.exactMatch = toStoreSummary(match, null);
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
			result.similarStores = similarByName.map((s) =>
				toStoreSummary(s, null)
			);
		}

		return result;
	},

	async updateStore(
		id: string,
		updates: Partial<CreateStoreInput>
	): Promise<StoreSummary | null> {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return null;
		}

		// Get old store to check chain changes
		const oldStore = await Store.findById(id).lean();
		const oldChainId = oldStore?.chainId?.toString();

		// Prepare update data
		const updateData: any = { ...updates };
		if (updates.chainId !== undefined) {
			updateData.chainId = updates.chainId
				? new mongoose.Types.ObjectId(updates.chainId)
				: null;
		}

		const store = await Store.findByIdAndUpdate(
			id,
			{ $set: updateData },
			{ new: true, runValidators: true }
		).lean();

		if (!store) {
			return null;
		}

		// Update chain location counts if chain changed
		const newChainId = store.chainId?.toString();
		if (oldChainId !== newChainId) {
			if (oldChainId) {
				await storeChainService.updateLocationCount(oldChainId);
			}
			if (newChainId) {
				await storeChainService.updateLocationCount(newChainId);
			}
		}

		return toStoreSummary(store, null);
	},

	/**
	 * Delete a store
	 */
	async deleteStore(
		id: string
	): Promise<{ success: boolean; message: string }> {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return { success: false, message: 'Invalid store ID' };
		}

		const store = await Store.findById(id).lean();
		if (!store) {
			return { success: false, message: 'Store not found' };
		}

		const chainId = store.chainId?.toString();

		await Store.findByIdAndDelete(id);

		// Update chain location count if was part of a chain
		if (chainId) {
			await storeChainService.updateLocationCount(chainId);
		}

		return { success: true, message: 'Store deleted successfully' };
	},
};
