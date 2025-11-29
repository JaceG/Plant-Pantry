import mongoose, { Document, Schema } from 'mongoose';
import { FilterType } from './ArchivedFilter';

export interface IFilterDisplayName extends Document {
  _id: mongoose.Types.ObjectId;
  type: FilterType;
  value: string; // The filter value from the database
  displayName: string; // The custom display name shown to users
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const filterDisplayNameSchema = new Schema<IFilterDisplayName>(
  {
    type: {
      type: String,
      enum: ['category', 'tag'],
      required: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of type+value
filterDisplayNameSchema.index({ type: 1, value: 1 }, { unique: true });

export const FilterDisplayName = mongoose.model<IFilterDisplayName>('FilterDisplayName', filterDisplayNameSchema);

