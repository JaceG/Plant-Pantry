import { Store, IStore } from '../models';

export interface StoreSummary {
  id: string;
  name: string;
  type: string;
  regionOrScope: string;
  websiteUrl?: string;
}

export interface StoreListResult {
  items: StoreSummary[];
}

export const storeService = {
  async getStores(): Promise<StoreListResult> {
    const stores = await Store.find()
      .select('name type regionOrScope websiteUrl')
      .sort({ name: 1 })
      .lean();

    const items: StoreSummary[] = stores.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      type: s.type,
      regionOrScope: s.regionOrScope,
      websiteUrl: s.websiteUrl,
    }));

    return { items };
  },
};

