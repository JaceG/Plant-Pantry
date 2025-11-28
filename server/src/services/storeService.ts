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

export const storeService = {
  async getStores(): Promise<StoreListResult> {
    const stores = await Store.find()
      .select('name type regionOrScope websiteUrl address city state zipCode country latitude longitude googlePlaceId phoneNumber')
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
      .select('name type regionOrScope websiteUrl address city state zipCode country latitude longitude googlePlaceId phoneNumber')
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
};

