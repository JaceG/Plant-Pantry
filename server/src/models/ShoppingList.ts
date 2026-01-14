import mongoose, { Document, Schema } from "mongoose";

export interface IShoppingList extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const shoppingListSchema = new Schema<IShoppingList>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

shoppingListSchema.index({ userId: 1, createdAt: -1 });

export const ShoppingList = mongoose.model<IShoppingList>(
  "ShoppingList",
  shoppingListSchema,
);
