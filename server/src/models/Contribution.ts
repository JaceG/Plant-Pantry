import mongoose, { Document, Schema } from 'mongoose';

export type ContributionType = 'product_suggestion' | 'availability_confirmation';

export interface IContribution extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  type: ContributionType;
  payloadJson: string;
  createdAt: Date;
}

const contributionSchema = new Schema<IContribution>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: ['product_suggestion', 'availability_confirmation'],
      required: true,
    },
    payloadJson: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

contributionSchema.index({ type: 1, createdAt: -1 });

export const Contribution = mongoose.model<IContribution>('Contribution', contributionSchema);

