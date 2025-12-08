import mongoose, { Document, Schema } from 'mongoose';

export type StoreType = 'brick_and_mortar' | 'online_retailer' | 'brand_direct';
export type StoreModerationStatus = 'confirmed' | 'pending' | 'rejected';

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
	// Moderation
	moderationStatus: StoreModerationStatus;
	createdBy?: mongoose.Types.ObjectId; // User who created the store
	moderatedBy?: mongoose.Types.ObjectId; // Admin who moderated
	moderatedAt?: Date;
	// Review tracking (separate from moderation status for trusted contributors)
	needsReview: boolean; // True if content needs admin review
	trustedContribution: boolean; // True if submitted by a trusted contributor
	reviewedBy?: mongoose.Types.ObjectId; // Admin who reviewed
	reviewedAt?: Date;
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
		// Moderation
		moderationStatus: {
			type: String,
			enum: ['confirmed', 'pending', 'rejected'],
			default: 'confirmed', // Default to confirmed for admin-created stores
			index: true,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			index: true,
		},
		moderatedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		moderatedAt: {
			type: Date,
		},
		// Review tracking (separate from moderation status for trusted contributors)
		needsReview: {
			type: Boolean,
			default: false, // Admin-created stores don't need review
			index: true,
		},
		trustedContribution: {
			type: Boolean,
			default: false, // True if submitted by a trusted contributor
			index: true,
		},
		reviewedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		reviewedAt: {
			type: Date,
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
