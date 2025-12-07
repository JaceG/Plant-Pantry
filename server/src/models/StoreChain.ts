import mongoose, { Document, Schema } from 'mongoose';

export type ChainType = 'national' | 'regional' | 'local';

export interface IStoreChain extends Document {
	_id: mongoose.Types.ObjectId;
	name: string;
	slug: string;
	logoUrl?: string;
	websiteUrl?: string;
	type: ChainType;
	isActive: boolean;
	locationCount: number;
	createdAt: Date;
	updatedAt: Date;
}

const storeChainSchema = new Schema<IStoreChain>(
	{
		name: {
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
		logoUrl: {
			type: String,
			trim: true,
		},
		websiteUrl: {
			type: String,
			trim: true,
		},
		type: {
			type: String,
			enum: ['national', 'regional', 'local'],
			default: 'regional',
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		locationCount: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
	}
);

// Indexes (slug already has unique index from field definition)
storeChainSchema.index({ name: 'text' });
storeChainSchema.index({ isActive: 1 });

// Pre-save hook to generate slug from name if not provided
storeChainSchema.pre('save', function (next) {
	if (this.isModified('name') && !this.slug) {
		this.slug = this.name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}
	next();
});

export const StoreChain = mongoose.model<IStoreChain>(
	'StoreChain',
	storeChainSchema
);
