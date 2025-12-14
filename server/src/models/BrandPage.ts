import mongoose, { Document, Schema } from 'mongoose';

export interface IBrandPage extends Document {
	_id: mongoose.Types.ObjectId;
	brandName: string; // Normalized brand name (matches product.brand)
	slug: string; // URL-friendly version
	displayName: string; // How to display the brand name
	description?: string; // Brand description/story
	logoUrl?: string;
	websiteUrl?: string;
	// Brand hierarchy - for consolidating brand variations
	parentBrandId?: mongoose.Types.ObjectId; // References the "official" brand
	isOfficial: boolean; // Marks this as a canonical/official brand
	// Meta
	isActive: boolean;
	createdBy?: mongoose.Types.ObjectId;
	updatedBy?: mongoose.Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const brandPageSchema = new Schema<IBrandPage>(
	{
		brandName: {
			type: String,
			required: true,
			trim: true,
			unique: true,
		},
		slug: {
			type: String,
			required: true,
			trim: true,
			unique: true,
			lowercase: true,
		},
		displayName: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		logoUrl: {
			type: String,
			trim: true,
		},
		websiteUrl: {
			type: String,
			trim: true,
		},
		// Brand hierarchy - for consolidating brand variations
		parentBrandId: {
			type: Schema.Types.ObjectId,
			ref: 'BrandPage',
			default: null,
		},
		isOfficial: {
			type: Boolean,
			default: false,
			index: true,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		updatedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
	},
	{
		timestamps: true,
	}
);

// Indexes
brandPageSchema.index({ slug: 1 });
brandPageSchema.index({ brandName: 'text', displayName: 'text' });
brandPageSchema.index({ isActive: 1 });
brandPageSchema.index({ parentBrandId: 1 }); // For finding child brands

// Pre-save hook to generate slug from brandName if not provided
brandPageSchema.pre('save', function (next) {
	if (this.isModified('brandName') && !this.isModified('slug')) {
		this.slug = this.brandName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}
	next();
});

export const BrandPage = mongoose.model<IBrandPage>(
	'BrandPage',
	brandPageSchema
);
