import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product, Store, Availability, User } from "../models";

dotenv.config();

const DEMO_USER_ID = "000000000000000000000001";

const seedData = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined");
    }

    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await Promise.all([
      Product.deleteMany({}),
      Store.deleteMany({}),
      Availability.deleteMany({}),
    ]);
    console.log("Cleared existing data");

    // Create demo user
    await User.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(DEMO_USER_ID) },
      {
        email: "demo@theveganaisle.app",
        displayName: "Demo User",
      },
      { upsert: true },
    );
    console.log("Created demo user");

    // Create stores
    const stores = await Store.insertMany([
      {
        name: "Whole Foods Market",
        type: "brick_and_mortar",
        regionOrScope: "US - Nationwide",
        websiteUrl: "https://www.wholefoodsmarket.com",
      },
      {
        name: "Target",
        type: "brick_and_mortar",
        regionOrScope: "US - Nationwide",
        websiteUrl: "https://www.target.com",
      },
      {
        name: "Trader Joe's",
        type: "brick_and_mortar",
        regionOrScope: "US - Select Locations",
        websiteUrl: "https://www.traderjoes.com",
      },
      {
        name: "Amazon Fresh",
        type: "online_retailer",
        regionOrScope: "US - Online",
        websiteUrl: "https://www.amazon.com/fresh",
      },
      {
        name: "Thrive Market",
        type: "online_retailer",
        regionOrScope: "US - Online",
        websiteUrl: "https://thrivemarket.com",
      },
      {
        name: "Oatly Direct",
        type: "brand_direct",
        regionOrScope: "Online",
        websiteUrl: "https://us.oatly.com",
      },
      {
        name: "Miyoko's Creamery",
        type: "brand_direct",
        regionOrScope: "Online",
        websiteUrl: "https://miyokos.com",
      },
    ]);
    console.log(`Created ${stores.length} stores`);

    const storeMap = new Map(stores.map((s) => [s.name, s._id]));

    // Create products
    const products = await Product.insertMany([
      // Dairy Alternatives - Milk
      {
        name: "Oat Milk Barista Edition",
        brand: "Oatly",
        description:
          "Creamy oat milk designed for frothing and coffee. Made from Swedish oats with a smooth, neutral taste.",
        sizeOrVariant: "32 fl oz",
        categories: ["Dairy Alternatives", "Oat Milk"],
        tags: ["vegan", "dairy-free", "barista", "organic"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1600718374662-0483d2b9da44?w=400",
        nutritionSummary: "120 cal, 5g fat, 16g carbs, 3g protein per serving",
        ingredientSummary: "Oat base (water, oats), rapeseed oil, sea salt",
      },
      {
        name: "Unsweetened Almond Milk",
        brand: "Califia Farms",
        description:
          "Light and refreshing unsweetened almond milk with only 30 calories per serving.",
        sizeOrVariant: "48 fl oz",
        categories: ["Dairy Alternatives", "Almond Milk"],
        tags: ["vegan", "dairy-free", "unsweetened", "low-calorie"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=400",
        nutritionSummary: "30 cal, 2.5g fat, 1g carbs, 1g protein per serving",
        ingredientSummary:
          "Almond milk (water, almonds), calcium carbonate, sunflower lecithin",
      },
      {
        name: "Organic Soy Milk Original",
        brand: "Silk",
        description: "Classic organic soy milk with complete plant protein.",
        sizeOrVariant: "64 fl oz",
        categories: ["Dairy Alternatives", "Soy Milk"],
        tags: ["vegan", "dairy-free", "organic", "high-protein"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
        nutritionSummary: "110 cal, 4.5g fat, 9g carbs, 8g protein per serving",
        ingredientSummary:
          "Organic soymilk (filtered water, organic soybeans), cane sugar, sea salt",
      },
      // Dairy Alternatives - Cheese
      {
        name: "Classic Chive Cream Cheese",
        brand: "Miyoko's Creamery",
        description:
          "Artisan vegan cream cheese made with organic cashews and cultured for authentic tang.",
        sizeOrVariant: "8 oz",
        categories: ["Dairy Alternatives", "Vegan Cheese"],
        tags: ["vegan", "dairy-free", "organic", "cashew-based"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400",
        nutritionSummary: "70 cal, 6g fat, 2g carbs, 2g protein per serving",
        ingredientSummary:
          "Organic cashews, filtered water, organic coconut cream, chives",
      },
      {
        name: "Cheddar Style Slices",
        brand: "Violife",
        description:
          "Melty cheddar-style cheese slices perfect for sandwiches and burgers.",
        sizeOrVariant: "7.05 oz (10 slices)",
        categories: ["Dairy Alternatives", "Vegan Cheese"],
        tags: ["vegan", "dairy-free", "soy-free", "gluten-free"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=400",
        nutritionSummary: "70 cal, 5g fat, 4g carbs, 0g protein per slice",
        ingredientSummary:
          "Coconut oil, modified starch, sea salt, olive extract, beta carotene",
      },
      // Protein
      {
        name: "Organic Extra Firm Tofu",
        brand: "Nasoya",
        description:
          "Organic extra firm tofu, perfect for stir-fries, grilling, or scrambling.",
        sizeOrVariant: "14 oz",
        categories: ["Protein", "Tofu"],
        tags: ["vegan", "organic", "high-protein", "gluten-free"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1628689469838-524a4a973b8e?w=400",
        nutritionSummary: "90 cal, 5g fat, 2g carbs, 10g protein per serving",
        ingredientSummary: "Organic soybeans, water, calcium sulfate",
      },
      {
        name: "Organic Tempeh",
        brand: "Lightlife",
        description:
          "Fermented soy tempeh with a nutty flavor and firm texture.",
        sizeOrVariant: "8 oz",
        categories: ["Protein", "Tempeh"],
        tags: ["vegan", "organic", "fermented", "high-protein"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=400",
        nutritionSummary: "140 cal, 6g fat, 10g carbs, 16g protein per serving",
        ingredientSummary:
          "Organic soybeans, water, organic brown rice, culture",
      },
      {
        name: "Beyond Burger Patties",
        brand: "Beyond Meat",
        description:
          "Plant-based burger patties that look, cook, and satisfy like beef.",
        sizeOrVariant: "8 oz (2 patties)",
        categories: ["Protein", "Meat Alternatives"],
        tags: ["vegan", "plant-based", "soy-free", "gluten-free"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
        nutritionSummary: "230 cal, 14g fat, 5g carbs, 20g protein per patty",
        ingredientSummary:
          "Pea protein, expeller-pressed canola oil, refined coconut oil",
      },
      // Pantry
      {
        name: "Nutritional Yeast Flakes",
        brand: "Bragg",
        description:
          "Savory, cheesy-tasting nutritional yeast fortified with B vitamins.",
        sizeOrVariant: "4.5 oz",
        categories: ["Pantry", "Seasonings"],
        tags: ["vegan", "gluten-free", "fortified", "cheese-flavor"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=400",
        nutritionSummary: "60 cal, 0.5g fat, 5g carbs, 8g protein per 2 tbsp",
        ingredientSummary:
          "Dried yeast, niacin, pyridoxine hydrochloride, riboflavin, thiamin hydrochloride, folic acid, vitamin B12",
      },
      {
        name: "Organic Tahini",
        brand: "Soom",
        description:
          "Single-origin Ethiopian sesame tahini with ultra-smooth texture.",
        sizeOrVariant: "12 oz",
        categories: ["Pantry", "Spreads"],
        tags: ["vegan", "organic", "single-ingredient", "gluten-free"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400",
        nutritionSummary: "180 cal, 17g fat, 3g carbs, 5g protein per 2 tbsp",
        ingredientSummary: "Organic sesame seeds",
      },
      // Snacks
      {
        name: "Sea Salt Chickpea Snacks",
        brand: "Biena",
        description:
          "Crunchy roasted chickpeas with a light sea salt seasoning.",
        sizeOrVariant: "5 oz",
        categories: ["Snacks", "Chips & Crackers"],
        tags: ["vegan", "gluten-free", "high-fiber", "high-protein"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400",
        nutritionSummary:
          "120 cal, 3.5g fat, 17g carbs, 6g protein per serving",
        ingredientSummary: "Chickpeas, sunflower oil, sea salt",
      },
      {
        name: "Organic Dark Chocolate Bar 85%",
        brand: "Endangered Species",
        description:
          "Intense dark chocolate bar with 85% cacao, ethically sourced.",
        sizeOrVariant: "3 oz",
        categories: ["Snacks", "Chocolate"],
        tags: ["vegan", "organic", "fair-trade", "dark-chocolate"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400",
        nutritionSummary: "190 cal, 15g fat, 14g carbs, 3g protein per serving",
        ingredientSummary:
          "Organic chocolate liquor, organic cane sugar, organic cocoa butter",
      },
      // Frozen
      {
        name: "Veggie Lover's Pizza",
        brand: "Amy's Kitchen",
        description:
          "Organic pizza loaded with vegetables and dairy-free cheese.",
        sizeOrVariant: "12 oz",
        categories: ["Frozen", "Pizza"],
        tags: ["vegan", "organic", "dairy-free"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
        nutritionSummary: "290 cal, 11g fat, 38g carbs, 7g protein per serving",
        ingredientSummary:
          "Organic wheat flour, organic tomato puree, vegan cheese, organic vegetables",
      },
      {
        name: "Vanilla Non-Dairy Frozen Dessert",
        brand: "So Delicious",
        description: "Creamy coconut milk-based vanilla frozen dessert.",
        sizeOrVariant: "16 oz",
        categories: ["Frozen", "Ice Cream"],
        tags: ["vegan", "dairy-free", "gluten-free", "coconut-based"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400",
        nutritionSummary: "180 cal, 11g fat, 19g carbs, 1g protein per serving",
        ingredientSummary:
          "Organic coconut milk, organic cane sugar, vanilla extract",
      },
      // Beverages
      {
        name: "Cold Brew Coffee Concentrate",
        brand: "Chameleon",
        description:
          "Organic cold brew coffee concentrate, makes up to 6 cups.",
        sizeOrVariant: "32 fl oz",
        categories: ["Beverages", "Coffee"],
        tags: ["vegan", "organic", "fair-trade", "concentrate"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400",
        nutritionSummary: "0 cal, 0g fat, 0g carbs, 0g protein per serving",
        ingredientSummary: "Organic coffee, water",
      },
      {
        name: "Organic Kombucha Ginger",
        brand: "GT's",
        description: "Raw organic kombucha with fresh ginger and probiotics.",
        sizeOrVariant: "16 fl oz",
        categories: ["Beverages", "Kombucha"],
        tags: ["vegan", "organic", "probiotic", "fermented"],
        isStrictVegan: true,
        imageUrl:
          "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400",
        nutritionSummary: "50 cal, 0g fat, 12g carbs, 0g protein per bottle",
        ingredientSummary:
          "Organic raw kombucha, organic ginger juice, organic cane sugar",
      },
    ]);
    console.log(`Created ${products.length} products`);

    // Create availability entries
    const availabilityEntries = [];

    // Helper to get random stores for a product
    const getStoresForProduct = (
      productBrand: string,
      productCategories: string[],
    ): mongoose.Types.ObjectId[] => {
      const selectedStores: mongoose.Types.ObjectId[] = [];

      // Most products available at Whole Foods and Thrive
      if (Math.random() > 0.2) {
        selectedStores.push(storeMap.get("Whole Foods Market")!);
      }
      if (Math.random() > 0.3) {
        selectedStores.push(storeMap.get("Thrive Market")!);
      }

      // Target for mainstream products
      if (Math.random() > 0.4) {
        selectedStores.push(storeMap.get("Target")!);
      }

      // Trader Joe's for select items
      if (Math.random() > 0.5) {
        selectedStores.push(storeMap.get("Trader Joe's")!);
      }

      // Amazon Fresh for most items
      if (Math.random() > 0.25) {
        selectedStores.push(storeMap.get("Amazon Fresh")!);
      }

      // Brand direct for specific brands
      if (productBrand === "Oatly") {
        selectedStores.push(storeMap.get("Oatly Direct")!);
      }
      if (productBrand === "Miyoko's Creamery") {
        selectedStores.push(storeMap.get("Miyoko's Creamery")!);
      }

      return selectedStores;
    };

    for (const product of products) {
      const storeIds = getStoresForProduct(product.brand, product.categories);

      for (const storeId of storeIds) {
        const priceRanges = [
          "$3.99-$4.99",
          "$4.99-$5.99",
          "$5.99-$6.99",
          "$6.99-$7.99",
          "$7.99-$8.99",
        ];
        const randomPrice =
          priceRanges[Math.floor(Math.random() * priceRanges.length)];

        availabilityEntries.push({
          productId: product._id,
          storeId: storeId,
          status: "known",
          priceRange: randomPrice,
          lastConfirmedAt: new Date(),
          source: "seed_data",
        });
      }
    }

    await Availability.insertMany(availabilityEntries);
    console.log(`Created ${availabilityEntries.length} availability entries`);

    console.log("\n✅ Seed completed successfully!");
    console.log(`   - ${stores.length} stores`);
    console.log(`   - ${products.length} products`);
    console.log(`   - ${availabilityEntries.length} availability entries`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedData();
