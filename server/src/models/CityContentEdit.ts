import mongoose, { Document, Schema } from 'mongoose';

export type CityContentEditField = 'cityName' | 'headline' | 'description';
export type CityContentEditStatus = 'pending' | 'approved' | 'rejected';

export interface ICityContentEdit extends Document {
	_id: mongoose.Types.ObjectId;
	cityPageId: mongoose.Types.ObjectId;
	citySlug: string; // Denormalized for easy lookup
	field: CityContentEditField;
	originalValue: string;
	suggestedValue: string;
	reason?: string; // Optional reason for the edit
	userId: mongoose.Types.ObjectId;
	status: CityContentEditStatus;
	// Trusted contributor handling
	trustedContribution: boolean;
	autoApplied: boolean; // If true, was auto-applied but needs review
	reviewedBy?: mongoose.Types.ObjectId;
	reviewedAt?: Date;
	reviewNote?: string; // Admin note when approving/rejecting
	createdAt: Date;
	updatedAt: Date;
}

const cityContentEditSchema = new Schema<ICityContentEdit>(
	{
		cityPageId: {
			type: Schema.Types.ObjectId,
			ref: 'CityLandingPage',
			required: true,
			index: true,
		},
		citySlug: {
			type: String,
			required: true,
			index: true,
		},
		field: {
			type: String,
			enum: ['cityName', 'headline', 'description'],
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
cityContentEditSchema.index({ status: 1, createdAt: -1 });

// Index for finding edits by city
cityContentEditSchema.index({ citySlug: 1, status: 1 });

// Index for trusted contributor review
cityContentEditSchema.index({
	trustedContribution: 1,
	autoApplied: 1,
	status: 1,
});

export const CityContentEdit = mongoose.model<ICityContentEdit>(
	'CityContentEdit',
	cityContentEditSchema
);
