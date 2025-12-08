import mongoose, { Document, Schema } from 'mongoose';
import { FilterType } from './ArchivedFilter';

export interface IPendingFilter extends Document {
	_id: mongoose.Types.ObjectId;
	type: FilterType;
	value: string; // The filter value (e.g., "New Category" or "new-tag")
	submittedBy: mongoose.Types.ObjectId; // User who submitted
	productId?: mongoose.Types.ObjectId; // Product this was submitted with (for reference)
	trustedContribution: boolean; // True if submitted by a trusted contributor
	createdAt: Date;
	updatedAt: Date;
}

const pendingFilterSchema = new Schema<IPendingFilter>(
	{
		type: {
			type: String,
			enum: ['category', 'tag'],
			required: true,
			index: true,
		},
		value: {
			type: String,
			required: true,
			trim: true,
		},
		submittedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		productId: {
			type: Schema.Types.ObjectId,
			ref: 'UserProduct',
			index: true,
		},
		trustedContribution: {
			type: Boolean,
			default: false,
			index: true,
		},
	},
	{
		timestamps: true,
	}
);

// Compound index to ensure uniqueness of type+value (only one pending per filter value)
pendingFilterSchema.index({ type: 1, value: 1 }, { unique: true });

export const PendingFilter = mongoose.model<IPendingFilter>(
	'PendingFilter',
	pendingFilterSchema
);
