import mongoose, { Document, Schema } from 'mongoose';

export type BrandEditField = 'displayName' | 'description' | 'websiteUrl';
export type BrandContentEditStatus = 'pending' | 'approved' | 'rejected';

export interface IBrandContentEdit extends Document {
	_id: mongoose.Types.ObjectId;
	brandPageId?: mongoose.Types.ObjectId; // Optional - may not exist yet
	brandName: string; // The brand name (for lookup)
	brandSlug: string; // Denormalized for easy lookup
	field: BrandEditField;
	originalValue: string;
	suggestedValue: string;
	reason?: string;
	userId: mongoose.Types.ObjectId;
	status: BrandContentEditStatus;
	// Trusted contributor handling
	trustedContribution: boolean;
	autoApplied: boolean; // If true, was auto-applied but needs review
	reviewedBy?: mongoose.Types.ObjectId;
	reviewedAt?: Date;
	reviewNote?: string;
	createdAt: Date;
	updatedAt: Date;
}

const brandContentEditSchema = new Schema<IBrandContentEdit>(
	{
		brandPageId: {
			type: Schema.Types.ObjectId,
			ref: 'BrandPage',
			index: true,
		},
		brandName: {
			type: String,
			required: true,
			trim: true,
			index: true,
		},
		brandSlug: {
			type: String,
			required: true,
			index: true,
		},
		field: {
			type: String,
			enum: ['displayName', 'description', 'websiteUrl'],
			required: true,
		},
		originalValue: {
			type: String,
			default: '',
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
brandContentEditSchema.index({ status: 1, createdAt: -1 });

// Index for finding edits by brand
brandContentEditSchema.index({ brandSlug: 1, status: 1 });

// Index for trusted contributor review
brandContentEditSchema.index({
	trustedContribution: 1,
	autoApplied: 1,
	status: 1,
});

export const BrandContentEdit = mongoose.model<IBrandContentEdit>(
	'BrandContentEdit',
	brandContentEditSchema
);
