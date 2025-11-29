import mongoose, { Document, Schema } from 'mongoose';

export type FilterType = 'category' | 'tag';

export interface IArchivedFilter extends Document {
  _id: mongoose.Types.ObjectId;
  type: FilterType;
  value: string; // The exact filter value (e.g., "en:animal-fat" or "animal-fat")
  archivedBy: mongoose.Types.ObjectId;
  archivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const archivedFilterSchema = new Schema<IArchivedFilter>(
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
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    archivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of type+value
archivedFilterSchema.index({ type: 1, value: 1 }, { unique: true });

export const ArchivedFilter = mongoose.model<IArchivedFilter>('ArchivedFilter', archivedFilterSchema);

