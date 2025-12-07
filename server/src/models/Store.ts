import mongoose, { Document, Schema } from 'mongoose';

export type StoreType = 'brick_and_mortar' | 'online_retailer' | 'brand_direct';

export interface IStore extends Document {
	_id: mongoose.Types.ObjectId;
	name: string;
	type: StoreType;
	regionOrScope: string;
	websiteUrl?: string;
	// Chain relationship (null for independent stores)
	chainId?: mongoose.Types.ObjectId;
	locationIdentifier?: string; // "#1234", "Downtown", "Main & High St"
	// Google Maps/Places integration
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	country?: string;
	latitude?: number;
	longitude?: number;
	googlePlaceId?: string; // Google Places API place_id
	phoneNumber?: string;
	createdAt: Date;
	updatedAt: Date;
}

const storeSchema = new Schema<IStore>(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		type: {
			type: String,
			enum: ['brick_and_mortar', 'online_retailer', 'brand_direct'],
			required: true,
		},
		regionOrScope: {
			type: String,
			required: true,
			trim: true,
		},
		websiteUrl: {
			type: String,
			trim: true,
		},
		chainId: {
			type: Schema.Types.ObjectId,
			ref: 'StoreChain',
			default: null,
		},
		locationIdentifier: {
			type: String,
			trim: true,
		},
		address: {
			type: String,
			trim: true,
		},
		city: {
			type: String,
			trim: true,
		},
		state: {
			type: String,
			trim: true,
		},
		zipCode: {
			type: String,
			trim: true,
		},
		country: {
			type: String,
			trim: true,
			default: 'US',
		},
		latitude: {
			type: Number,
		},
		longitude: {
			type: Number,
		},
		googlePlaceId: {
			type: String,
			trim: true,
			index: true,
		},
		phoneNumber: {
			type: String,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

storeSchema.index({ name: 1 });
storeSchema.index({ type: 1 });
storeSchema.index({ chainId: 1 });

export const Store = mongoose.model<IStore>('Store', storeSchema);
