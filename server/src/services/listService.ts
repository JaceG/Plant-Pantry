import mongoose from "mongoose";
import {
  ShoppingList,
  ShoppingListItem,
  Product,
  UserProduct,
  Availability,
  Store,
} from "../models";

export interface ShoppingListSummary {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSummaryForList {
  id: string;
  name: string;
  brand: string;
  sizeOrVariant: string;
  imageUrl?: string;
}

export interface AvailabilityHint {
  storeName: string;
  storeId: string;
  storeType: string;
  stockStatus?: "in_stock" | "out_of_stock" | "unknown";
  lastStockReportAt?: Date;
  recentInStockCount?: number;
  recentOutOfStockCount?: number;
}

export interface ShoppingListItemDetail {
  itemId: string;
  productId: string;
  quantity: number;
  note?: string;
  addedAt: Date;
  productSummary: ProductSummaryForList;
  availabilityHints: AvailabilityHint[];
}

export interface ShoppingListDetail {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  items: ShoppingListItemDetail[];
}

export interface CreateListInput {
  name: string;
}

export interface AddItemInput {
  productId: string;
  quantity?: number;
  note?: string;
}

export interface ShoppingListItemResult {
  itemId: string;
  productId: string;
  quantity: number;
  note?: string;
  addedAt: Date;
}

export const listService = {
  async createList(
    userId: string,
    input: CreateListInput,
  ): Promise<ShoppingListSummary> {
    const list = await ShoppingList.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: input.name,
    });

    return {
      id: list._id.toString(),
      name: list.name,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  },

  async getLists(userId: string): Promise<ShoppingListSummary[]> {
    const lists = await ShoppingList.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return lists.map((list) => ({
      id: list._id.toString(),
      name: list.name,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    }));
  },

  async getListById(
    userId: string,
    listId: string,
  ): Promise<ShoppingListDetail | null> {
    if (!mongoose.Types.ObjectId.isValid(listId)) {
      return null;
    }

    const list = await ShoppingList.findOne({
      _id: listId,
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (!list) {
      return null;
    }

    // Get items with product info
    const items = await ShoppingListItem.find({ shoppingListId: list._id })
      .sort({ addedAt: -1 })
      .lean();

    const productIds = items.map((item) => item.productId);

    // Fetch from both Product and UserProduct collections
    const products = await Product.find({ _id: { $in: productIds } })
      .select("name brand sizeOrVariant imageUrl")
      .lean();
    const userProducts = await UserProduct.find({
      _id: { $in: productIds },
    })
      .select("name brand sizeOrVariant imageUrl")
      .lean();

    // Combine into a single map
    const productMap = new Map<
      string,
      {
        name: string;
        brand: string;
        sizeOrVariant: string;
        imageUrl?: string;
      }
    >();
    products.forEach((p) => productMap.set(p._id.toString(), p));
    userProducts.forEach((p) => productMap.set(p._id.toString(), p));

    // Get availability hints for all products (include stock status fields)
    const availabilities = await Availability.find({
      productId: { $in: productIds },
      moderationStatus: "confirmed",
    })
      .select(
        "productId storeId stockStatus lastStockReportAt recentInStockCount recentOutOfStockCount",
      )
      .lean();
    const storeIds = [
      ...new Set(availabilities.map((a) => a.storeId.toString())),
    ];
    const stores = await Store.find({ _id: { $in: storeIds } }).lean();
    const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

    // Group availability by product (deduplicated by store)
    const availabilityByProduct = new Map<string, AvailabilityHint[]>();
    for (const avail of availabilities) {
      const productIdStr = avail.productId.toString();
      const store = storeMap.get(avail.storeId.toString());
      if (store) {
        const hints = availabilityByProduct.get(productIdStr) || [];
        // Only add if this store isn't already in the hints
        const alreadyExists = hints.some(
          (h) => h.storeId === store._id.toString(),
        );
        if (!alreadyExists) {
          hints.push({
            storeName: store.name,
            storeId: store._id.toString(),
            storeType: store.type,
            stockStatus: avail.stockStatus || "unknown",
            lastStockReportAt: avail.lastStockReportAt,
            recentInStockCount: avail.recentInStockCount || 0,
            recentOutOfStockCount: avail.recentOutOfStockCount || 0,
          });
        }
        availabilityByProduct.set(productIdStr, hints);
      }
    }

    const itemDetails: ShoppingListItemDetail[] = items.map((item) => {
      const product = productMap.get(item.productId.toString());
      return {
        itemId: item._id.toString(),
        productId: item.productId.toString(),
        quantity: item.quantity,
        note: item.note,
        addedAt: item.addedAt,
        productSummary: {
          id: item.productId.toString(),
          name: product?.name || "Unknown Product",
          brand: product?.brand || "Unknown Brand",
          sizeOrVariant: product?.sizeOrVariant || "",
          imageUrl: product?.imageUrl,
        },
        availabilityHints:
          availabilityByProduct.get(item.productId.toString()) || [],
      };
    });

    return {
      id: list._id.toString(),
      name: list.name,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      items: itemDetails,
    };
  },

  async addItemToList(
    userId: string,
    listId: string,
    input: AddItemInput,
  ): Promise<ShoppingListItemResult | null> {
    if (
      !mongoose.Types.ObjectId.isValid(listId) ||
      !mongoose.Types.ObjectId.isValid(input.productId)
    ) {
      return null;
    }

    // Verify list ownership
    const list = await ShoppingList.findOne({
      _id: listId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!list) {
      return null;
    }

    const productId = new mongoose.Types.ObjectId(input.productId);

    // Check if product exists - follow the same lookup logic as productService.getProductById
    // First, check if this ID is an edited version (UserProduct with sourceProductId)
    let foundProduct = await UserProduct.findOne({
      sourceProductId: productId,
      status: "approved",
      archived: { $ne: true },
    });

    // If no edited version, check Product collection
    if (!foundProduct) {
      foundProduct = await Product.findOne({
        _id: productId,
        archived: { $ne: true },
      });
    }

    // If still not found, check UserProduct by ID directly
    if (!foundProduct) {
      foundProduct = await UserProduct.findOne({
        _id: productId,
        archived: { $ne: true },
      });
    }

    if (!foundProduct) {
      return null;
    }

    // Check if item already exists in list
    const existingItem = await ShoppingListItem.findOne({
      shoppingListId: list._id,
      productId: input.productId,
    });

    if (existingItem) {
      // Update quantity
      existingItem.quantity += input.quantity || 1;
      if (input.note) {
        existingItem.note = input.note;
      }
      await existingItem.save();

      return {
        itemId: existingItem._id.toString(),
        productId: existingItem.productId.toString(),
        quantity: existingItem.quantity,
        note: existingItem.note,
        addedAt: existingItem.addedAt,
      };
    }

    // Create new item
    const item = await ShoppingListItem.create({
      shoppingListId: list._id,
      productId: new mongoose.Types.ObjectId(input.productId),
      quantity: input.quantity || 1,
      note: input.note,
      addedAt: new Date(),
    });

    return {
      itemId: item._id.toString(),
      productId: item.productId.toString(),
      quantity: item.quantity,
      note: item.note,
      addedAt: item.addedAt,
    };
  },

  async removeItemFromList(
    userId: string,
    listId: string,
    itemId: string,
  ): Promise<boolean> {
    if (
      !mongoose.Types.ObjectId.isValid(listId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return false;
    }

    // Verify list ownership
    const list = await ShoppingList.findOne({
      _id: listId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!list) {
      return false;
    }

    const result = await ShoppingListItem.deleteOne({
      _id: itemId,
      shoppingListId: list._id,
    });

    return result.deletedCount > 0;
  },

  async getOrCreateDefaultList(userId: string): Promise<ShoppingListSummary> {
    let list = await ShoppingList.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: 1 })
      .lean();

    if (!list) {
      const newList = await ShoppingList.create({
        userId: new mongoose.Types.ObjectId(userId),
        name: "My Vegan List",
      });
      list = newList.toObject() as unknown as typeof list;
    }

    if (!list) {
      throw new Error("Failed to create or retrieve shopping list");
    }

    return {
      id: list._id.toString(),
      name: list.name,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  },
};
