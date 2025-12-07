import mongoose from 'mongoose';
import { StoreChain, IStoreChain, Store } from '../models';

export interface StoreChainSummary {
	id: string;
	name: string;
	slug: string;
	logoUrl?: string;
	websiteUrl?: string;
	type: string;
	isActive: boolean;
	locationCount: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateChainInput {
	name: string;
	slug?: string;
	logoUrl?: string;
	websiteUrl?: string;
	type?: 'national' | 'regional' | 'local';
}

export interface UpdateChainInput {
	name?: string;
	slug?: string;
	logoUrl?: string;
	websiteUrl?: string;
	type?: 'national' | 'regional' | 'local';
	isActive?: boolean;
}

function toChainSummary(chain: IStoreChain): StoreChainSummary {
	return {
		id: chain._id.toString(),
		name: chain.name,
		slug: chain.slug,
		logoUrl: chain.logoUrl,
		websiteUrl: chain.websiteUrl,
		type: chain.type,
		isActive: chain.isActive,
		locationCount: chain.locationCount,
		createdAt: chain.createdAt,
		updatedAt: chain.updatedAt,
	};
}

export const storeChainService = {
	/**
	 * Get all store chains
	 */
	async getChains(includeInactive = false): Promise<StoreChainSummary[]> {
		const query = includeInactive ? {} : { isActive: true };
		const chains = await StoreChain.find(query).sort({ name: 1 }).lean();

		return chains.map((c) => toChainSummary(c as IStoreChain));
	},

	/**
	 * Get a chain by ID
	 */
	async getChainById(id: string): Promise<StoreChainSummary | null> {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return null;
		}

		const chain = await StoreChain.findById(id).lean();
		if (!chain) return null;

		return toChainSummary(chain as IStoreChain);
	},

	/**
	 * Get a chain by slug
	 */
	async getChainBySlug(slug: string): Promise<StoreChainSummary | null> {
		const chain = await StoreChain.findOne({
			slug: slug.toLowerCase(),
		}).lean();
		if (!chain) return null;

		return toChainSummary(chain as IStoreChain);
	},

	/**
	 * Create a new store chain
	 */
	async createChain(input: CreateChainInput): Promise<StoreChainSummary> {
		// Generate slug if not provided
		const slug =
			input.slug ||
			input.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');

		const chain = await StoreChain.create({
			name: input.name,
			slug,
			logoUrl: input.logoUrl,
			websiteUrl: input.websiteUrl,
			type: input.type || 'regional',
			isActive: true,
			locationCount: 0,
		});

		return toChainSummary(chain);
	},

	/**
	 * Update a store chain
	 */
	async updateChain(
		id: string,
		updates: UpdateChainInput
	): Promise<StoreChainSummary | null> {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return null;
		}

		const chain = await StoreChain.findByIdAndUpdate(
			id,
			{ $set: updates },
			{ new: true, runValidators: true }
		).lean();

		if (!chain) return null;

		return toChainSummary(chain as IStoreChain);
	},

	/**
	 * Delete a store chain (only if no stores are assigned)
	 */
	async deleteChain(
		id: string
	): Promise<{ success: boolean; message: string }> {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return { success: false, message: 'Invalid chain ID' };
		}

		// Check if any stores are assigned to this chain
		const storeCount = await Store.countDocuments({ chainId: id });
		if (storeCount > 0) {
			return {
				success: false,
				message: `Cannot delete chain: ${storeCount} stores are still assigned to it. Reassign or remove stores first.`,
			};
		}

		const result = await StoreChain.findByIdAndDelete(id);
		if (!result) {
			return { success: false, message: 'Chain not found' };
		}

		return { success: true, message: 'Chain deleted successfully' };
	},

	/**
	 * Update the location count for a chain
	 */
	async updateLocationCount(chainId: string): Promise<void> {
		if (!mongoose.Types.ObjectId.isValid(chainId)) return;

		const count = await Store.countDocuments({ chainId });
		await StoreChain.findByIdAndUpdate(chainId, { locationCount: count });
	},

	/**
	 * Assign a store to a chain
	 */
	async assignStoreToChain(
		storeId: string,
		chainId: string | null,
		locationIdentifier?: string
	): Promise<{ success: boolean; message: string }> {
		if (!mongoose.Types.ObjectId.isValid(storeId)) {
			return { success: false, message: 'Invalid store ID' };
		}

		if (chainId && !mongoose.Types.ObjectId.isValid(chainId)) {
			return { success: false, message: 'Invalid chain ID' };
		}

		const store = await Store.findById(storeId);
		if (!store) {
			return { success: false, message: 'Store not found' };
		}

		const oldChainId = store.chainId?.toString();

		// Update store
		store.chainId = chainId
			? new mongoose.Types.ObjectId(chainId)
			: undefined;
		store.locationIdentifier = locationIdentifier;
		await store.save();

		// Update location counts
		if (oldChainId) {
			await this.updateLocationCount(oldChainId);
		}
		if (chainId) {
			await this.updateLocationCount(chainId);
		}

		return { success: true, message: 'Store assigned to chain' };
	},

	/**
	 * Bulk assign stores to a chain
	 */
	async bulkAssignToChain(
		storeIds: string[],
		chainId: string | null
	): Promise<{ success: boolean; message: string; updated: number }> {
		if (chainId && !mongoose.Types.ObjectId.isValid(chainId)) {
			return { success: false, message: 'Invalid chain ID', updated: 0 };
		}

		// Validate all store IDs
		const validStoreIds = storeIds.filter((id) =>
			mongoose.Types.ObjectId.isValid(id)
		);

		if (validStoreIds.length === 0) {
			return {
				success: false,
				message: 'No valid store IDs',
				updated: 0,
			};
		}

		// Get old chain IDs for count updates
		const stores = await Store.find({
			_id: { $in: validStoreIds },
		}).select('chainId');

		const oldChainIds = [
			...new Set(
				stores
					.map((s) => s.chainId?.toString())
					.filter((id): id is string => !!id)
			),
		];

		// Update stores
		const result = await Store.updateMany(
			{ _id: { $in: validStoreIds } },
			{
				$set: {
					chainId: chainId
						? new mongoose.Types.ObjectId(chainId)
						: null,
				},
			}
		);

		// Update location counts
		for (const oldId of oldChainIds) {
			await this.updateLocationCount(oldId);
		}
		if (chainId) {
			await this.updateLocationCount(chainId);
		}

		return {
			success: true,
			message: `${result.modifiedCount} stores assigned to chain`,
			updated: result.modifiedCount,
		};
	},

	/**
	 * Search chains by name
	 */
	async searchChains(query: string): Promise<StoreChainSummary[]> {
		const chains = await StoreChain.find({
			isActive: true,
			name: { $regex: query, $options: 'i' },
		})
			.sort({ locationCount: -1, name: 1 })
			.limit(10)
			.lean();

		return chains.map((c) => toChainSummary(c as IStoreChain));
	},

	/**
	 * Get chains with their store counts by type
	 */
	async getChainsWithStats(): Promise<
		(StoreChainSummary & { storesByType: Record<string, number> })[]
	> {
		const chains = await StoreChain.find({ isActive: true })
			.sort({ name: 1 })
			.lean();

		const chainsWithStats = await Promise.all(
			chains.map(async (chain) => {
				const storesByType = await Store.aggregate([
					{ $match: { chainId: chain._id } },
					{ $group: { _id: '$type', count: { $sum: 1 } } },
				]);

				const typeMap: Record<string, number> = {};
				storesByType.forEach((item) => {
					typeMap[item._id] = item.count;
				});

				return {
					...toChainSummary(chain as IStoreChain),
					storesByType: typeMap,
				};
			})
		);

		return chainsWithStats;
	},
};
