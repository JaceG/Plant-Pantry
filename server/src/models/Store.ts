import mongoose, { Document, Schema } from 'mongoose';

export type StoreType = 'brick_and_mortar' | 'online_retailer' | 'brand_direct';

export interface IStore extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: StoreType;
  regionOrScope: string;
  websiteUrl?: string;
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
  },
  {
    timestamps: true,
  }
);

storeSchema.index({ name: 1 });
storeSchema.index({ type: 1 });

export const Store = mongoose.model<IStore>('Store', storeSchema);

