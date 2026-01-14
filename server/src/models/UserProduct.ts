import mongoose, { Document, Schema } from "mongoose";

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

  // Optional chain/company availability selections (used to expand into store-level Availability)
  chainAvailabilities?: Array<{
    chainId: mongoose.Types.ObjectId;
    includeRelatedCompany: boolean;
    priceRange?: string;
  }>;

  // Metadata
  source: "user_contribution";
  status: "pending" | "approved" | "rejected"; // For moderation if needed
  rejectionReason?: string; // Reason for rejection
  rejectedAt?: Date; // When the product was rejected
  // Review tracking (separate from status for trusted contributors)
  needsReview: boolean; // True if content needs admin review
  trustedContribution: boolean; // True if submitted by a trusted contributor
  reviewedBy?: mongoose.Types.ObjectId; // Admin who reviewed
  reviewedAt?: Date;
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
      trim: true,
      default: "Standard",
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
    chainAvailabilities: {
      type: [
        {
          chainId: { type: Schema.Types.ObjectId, ref: "StoreChain" },
          includeRelatedCompany: { type: Boolean, default: true },
          priceRange: { type: String, trim: true },
        },
      ],
      default: [],
    },
    source: {
      type: String,
      default: "user_contribution",
      immutable: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending", // Require moderation for all user contributions
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    rejectedAt: {
      type: Date,
    },
    // Review tracking (separate from status for trusted contributors)
    needsReview: {
      type: Boolean,
      default: true, // All user content needs review
      index: true,
    },
    trustedContribution: {
      type: Boolean,
      default: false, // True if submitted by a trusted contributor
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    sourceProductId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
userProductSchema.index({ name: "text", brand: "text" });
userProductSchema.index({ userId: 1, createdAt: -1 });

export const UserProduct = mongoose.model<IUserProduct>(
  "UserProduct",
  userProductSchema,
);
