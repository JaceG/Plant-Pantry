import mongoose, { Document, Schema } from "mongoose";

/**
 * Stock status reported by users
 * - in_stock: Product is available
 * - out_of_stock: Product is not available
 */
export type ReportedStockStatus = "in_stock" | "out_of_stock";

export interface IAvailabilityReport extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  // The status being reported
  status: ReportedStockStatus;

  // Optional context
  notes?: string;

  // Timestamps
  reportedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const availabilityReportSchema = new Schema<IAvailabilityReport>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["in_stock", "out_of_stock"],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    reportedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
// Get all reports for a product at a store, sorted by recency
availabilityReportSchema.index({ productId: 1, storeId: 1, reportedAt: -1 });
// Get all reports by a user for a product (to check if they already reported today)
availabilityReportSchema.index({
  productId: 1,
  storeId: 1,
  userId: 1,
  reportedAt: -1,
});
// Get recent reports (for aggregation)
availabilityReportSchema.index({ reportedAt: -1 });

export const AvailabilityReport = mongoose.model<IAvailabilityReport>(
  "AvailabilityReport",
  availabilityReportSchema,
);
