import mongoose from 'mongoose';

/**
 * Normalize a chain name to a company key for grouping related chains.
 * E.g., "Walmart Supercenter", "Walmart Neighborhood Market" -> "walmart"
 */
export function normalizeCompanyKey(input: string): string {
	const raw = input
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9\s-]/g, ' ')
		// remove common store-variant descriptors, keep the owning retailer
		.replace(
			/\b(supercenter|neighborhood|market|marketplace|fresh|fare|greatland|super|pharmacy|store)\b/g,
			' '
		)
		.replace(/\s+/g, ' ')
		.trim();
	// Special-case a few known tricky brand stylings
	if (raw === 'wal mart') return 'walmart';
	if (raw === 'h e b' || raw === 'heb') return 'h-e-b';
	return raw.replace(/\s+/g, ' ');
}

/**
 * Get all chain IDs that belong to the same company as the given chain.
 * If includeRelatedCompany is false, only returns the original chain ID.
 */
export async function getRelatedChainIds(
	chainId: string,
	includeRelatedCompany: boolean
): Promise<mongoose.Types.ObjectId[]> {
	if (!mongoose.Types.ObjectId.isValid(chainId)) return [];

	const { StoreChain } = await import('../models');
	const chain = await StoreChain.findById(chainId).select('name').lean();
	if (!chain) return [];

	if (!includeRelatedCompany) {
		return [new mongoose.Types.ObjectId(chainId)];
	}

	const companyKey = normalizeCompanyKey(chain.name);
	if (!companyKey) return [new mongoose.Types.ObjectId(chainId)];

	// Scan active chains and group by normalized company key.
	const all = await StoreChain.find({ isActive: true })
		.select('_id name')
		.lean();

	return all
		.filter((c: any) => normalizeCompanyKey(c.name) === companyKey)
		.map((c: any) => c._id as mongoose.Types.ObjectId);
}

/**
 * Get all related chain names for a given chain (for display purposes).
 */
export async function getRelatedChainNames(chainId: string): Promise<string[]> {
	const relatedIds = await getRelatedChainIds(chainId, true);
	if (relatedIds.length === 0) return [];

	const { StoreChain } = await import('../models');
	const chains = await StoreChain.find({ _id: { $in: relatedIds } })
		.select('name')
		.lean();

	return chains.map((c: any) => c.name);
}
