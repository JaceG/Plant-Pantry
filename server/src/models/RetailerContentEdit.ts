import mongoose, { Document, Schema } from 'mongoose';

// Fields that can be edited for stores
export type StoreEditField = 'name' | 'description' | 'websiteUrl';

// Fields that can be edited for chains
export type ChainEditField = 'name' | 'description' | 'websiteUrl';

export type RetailerEditField = StoreEditField | ChainEditField;
export type RetailerType = 'store' | 'chain';
export type RetailerContentEditStatus = 'pending' | 'approved' | 'rejected';

export interface IRetailerContentEdit extends Document {
	_id: mongoose.Types.ObjectId;
	retailerType: RetailerType;
	// For stores
	storeId?: mongoose.Types.ObjectId;
	// For chains
	chainId?: mongoose.Types.ObjectId;
	chainSlug?: string; // Denormalized for easy lookup
	field: RetailerEditField;
	originalValue: string;
	suggestedValue: string;
	reason?: string;
	userId: mongoose.Types.ObjectId;
	status: RetailerContentEditStatus;
	// Trusted contributor handling
	trustedContribution: boolean;
	autoApplied: boolean; // If true, was auto-applied but needs review
	reviewedBy?: mongoose.Types.ObjectId;
	reviewedAt?: Date;
	reviewNote?: string;
	createdAt: Date;
	updatedAt: Date;
}

const retailerContentEditSchema = new Schema<IRetailerContentEdit>(
	{
		retailerType: {
			type: String,
			enum: ['store', 'chain'],
			required: true,
			index: true,
		},
		storeId: {
			type: Schema.Types.ObjectId,
			ref: 'Store',
			index: true,
		},
		chainId: {
			type: Schema.Types.ObjectId,
			ref: 'StoreChain',
			index: true,
		},
		chainSlug: {
			type: String,
			index: true,
		},
		field: {
			type: String,
			enum: ['name', 'description', 'websiteUrl'],
			required: true,
		},
		originalValue: {
			type: String,
			required: true,
		},
		suggestedValue: {
			type: String,
			required: true,
		},
		reason: {
			type: String,
			trim: true,
		},
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		status: {
			type: String,
			enum: ['pending', 'approved', 'rejected'],
			default: 'pending',
			index: true,
		},
		trustedContribution: {
			type: Boolean,
			default: false,
		},
		autoApplied: {
			type: Boolean,
			default: false,
		},
		reviewedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		reviewedAt: {
			type: Date,
		},
		reviewNote: {
			type: String,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

// Index for finding pending edits
retailerContentEditSchema.index({ status: 1, createdAt: -1 });

// Index for finding edits by retailer
retailerContentEditSchema.index({ retailerType: 1, storeId: 1, status: 1 });
retailerContentEditSchema.index({ retailerType: 1, chainId: 1, status: 1 });

// Index for trusted contributor review
retailerContentEditSchema.index({
	trustedContribution: 1,
	autoApplied: 1,
	status: 1,
});

export const RetailerContentEdit = mongoose.model<IRetailerContentEdit>(
	'RetailerContentEdit',
	retailerContentEditSchema
);
