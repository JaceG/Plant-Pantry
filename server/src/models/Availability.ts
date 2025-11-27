import mongoose, { Document, Schema } from 'mongoose';

export type AvailabilityStatus = 'known' | 'user_reported' | 'unknown';
export type AvailabilitySource = 'seed_data' | 'user_contribution';

export interface IAvailability extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  status: AvailabilityStatus;
  priceRange?: string;
  lastConfirmedAt?: Date;
  source: AvailabilitySource;
}

const availabilitySchema = new Schema<IAvailability>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['known', 'user_reported', 'unknown'],
      default: 'known',
    },
    priceRange: {
      type: String,
      trim: true,
    },
    lastConfirmedAt: {
      type: Date,
    },
    source: {
      type: String,
      enum: ['seed_data', 'user_contribution'],
      default: 'seed_data',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups
availabilitySchema.index({ productId: 1, storeId: 1 }, { unique: true });

export const Availability = mongoose.model<IAvailability>('Availability', availabilitySchema);

