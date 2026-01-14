import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number; // 1-5
  title?: string;
  comment: string;
  photoUrls: string[];
  status: "pending" | "approved" | "rejected";
  // Trusted contributor handling
  trustedContribution: boolean;
  needsReview: boolean; // If true, was auto-approved but needs admin review
  helpfulCount: number;
  helpfulVotes: mongoose.Types.ObjectId[];
  reviewedAt: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    photoUrls: {
      type: [String],
      default: [],
      validate: {
        validator: (urls: string[]) => urls.length <= 5,
        message: "Maximum 5 photos allowed per review",
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    trustedContribution: {
      type: Boolean,
      default: false,
    },
    needsReview: {
      type: Boolean,
      default: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    helpfulVotes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes
reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true }); // One review per user per product

// Index for trusted contributor review
reviewSchema.index({ trustedContribution: 1, needsReview: 1, status: 1 });

export const Review = mongoose.model<IReview>("Review", reviewSchema);
