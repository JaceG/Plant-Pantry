import mongoose, { Document, Schema } from "mongoose";

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
      ref: "User",
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
  },
);

// Text index for search functionality
productSchema.index({ name: "text", brand: "text" });

export const Product = mongoose.model<IProduct>("Product", productSchema);
