import mongoose, { Document, Schema } from "mongoose";

export interface ICityLandingPage extends Document {
  _id: mongoose.Types.ObjectId;
  slug: string; // URL-friendly identifier, e.g., "delaware-oh"
  cityName: string; // Display name, e.g., "Delaware"
  state: string; // State abbreviation, e.g., "OH"
  headline: string; // Custom headline for the page
  description: string; // Introductory text about the city
  isActive: boolean; // Whether the page is published
  featuredStoreIds: mongoose.Types.ObjectId[]; // Manually curated stores to highlight
  createdAt: Date;
  updatedAt: Date;
}

const cityLandingPageSchema = new Schema<ICityLandingPage>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    cityName: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    headline: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    featuredStoreIds: {
      type: [Schema.Types.ObjectId],
      ref: "Store",
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Note: slug already has unique index from schema definition
cityLandingPageSchema.index({ isActive: 1 });
cityLandingPageSchema.index({ cityName: 1, state: 1 });

export const CityLandingPage = mongoose.model<ICityLandingPage>(
  "CityLandingPage",
  cityLandingPageSchema,
);
