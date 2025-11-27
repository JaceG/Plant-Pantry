import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
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
  },
  {
    timestamps: true,
  }
);

// Text index for search functionality
productSchema.index({ name: 'text', brand: 'text' });

export const Product = mongoose.model<IProduct>('Product', productSchema);

