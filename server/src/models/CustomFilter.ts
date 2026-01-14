import mongoose, { Document, Schema } from "mongoose";
import { FilterType } from "./ArchivedFilter";

export interface ICustomFilter extends Document {
  _id: mongoose.Types.ObjectId;
  type: FilterType;
  value: string; // The filter value (normalized: lowercase, spaces)
  displayName?: string; // Optional custom display name
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customFilterSchema = new Schema<ICustomFilter>(
  {
    type: {
      type: String,
      enum: ["category", "tag"],
      required: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to ensure uniqueness of type+value
customFilterSchema.index({ type: 1, value: 1 }, { unique: true });

export const CustomFilter = mongoose.model<ICustomFilter>(
  "CustomFilter",
  customFilterSchema,
);
