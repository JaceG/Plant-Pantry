import mongoose, { Document, Schema } from 'mongoose';

/**
 * UserProduct - User-contributed products
 *
 * Separate from Product (API-sourced) for:
 * - Easy auditing and export
 * - Different permissions/validation
 * - Clear separation of data sources
 */
export interface IUserProduct extends Document {
	_id: mongoose.Types.ObjectId;
	userId: mongoose.Types.ObjectId; // Who created it
	name: string;
	brand: string;
	description?: string;
	sizeOrVariant: string;
	categories: string[];
	tags: string[];
	isStrictVegan: boolean;
	imageUrl?: string;
	nutritionSummary?: string;
	ingredientSummary?: string;

	// Metadata
	source: 'user_contribution';
	status: 'pending' | 'approved' | 'rejected'; // For moderation if needed
	sourceProductId?: mongoose.Types.ObjectId; // If this is an edit of an API product, reference the original
	editedBy?: mongoose.Types.ObjectId; // Who edited it (for admin edits)
	archived: boolean;
	archivedAt?: Date;
	archivedBy?: mongoose.Types.ObjectId;
	// Featured product fields (admin-controlled)
	featured: boolean;
	featuredOrder?: number;
	featuredAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const userProductSchema = new Schema<IUserProduct>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			required: true,
			index: true,
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
		brand: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		sizeOrVariant: {
			type: String,
			required: true,
			trim: true,
			default: 'Standard',
		},
		categories: {
			type: [String],
			default: [],
			index: true,
		},
		tags: {
			type: [String],
			default: [],
			index: true,
		},
		isStrictVegan: {
			type: Boolean,
			default: true,
		},
		imageUrl: {
			type: String,
			trim: true,
		},
		nutritionSummary: {
			type: String,
			trim: true,
		},
		ingredientSummary: {
			type: String,
			trim: true,
		},
		source: {
			type: String,
			default: 'user_contribution',
			immutable: true,
		},
		status: {
			type: String,
			enum: ['pending', 'approved', 'rejected'],
			default: 'approved', // Auto-approve for MVP, can add moderation later
		},
		sourceProductId: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			index: true,
		},
		editedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		archived: {
			type: Boolean,
			default: false,
			index: true,
		},
		archivedAt: {
			type: Date,
		},
		archivedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		// Featured product fields (admin-controlled)
		featured: {
			type: Boolean,
			default: false,
			index: true,
		},
		featuredOrder: {
			type: Number,
			default: 0,
		},
		featuredAt: {
			type: Date,
		},
	},
	{
		timestamps: true,
	}
);

// Text index for search functionality
userProductSchema.index({ name: 'text', brand: 'text' });
userProductSchema.index({ userId: 1, createdAt: -1 });

export const UserProduct = mongoose.model<IUserProduct>(
	'UserProduct',
	userProductSchema
);
