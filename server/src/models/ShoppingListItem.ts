import mongoose, { Document, Schema } from "mongoose";

export interface IShoppingListItem extends Document {
  _id: mongoose.Types.ObjectId;
  shoppingListId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  note?: string;
  addedAt: Date;
}

const shoppingListItemSchema = new Schema<IShoppingListItem>(
  {
    shoppingListId: {
      type: Schema.Types.ObjectId,
      ref: "ShoppingList",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    note: {
      type: String,
      trim: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

shoppingListItemSchema.index({ shoppingListId: 1, productId: 1 });

export const ShoppingListItem = mongoose.model<IShoppingListItem>(
  "ShoppingListItem",
  shoppingListItemSchema,
);
