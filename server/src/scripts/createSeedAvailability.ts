/**
 * Create seed availability data for imported products
 *
 * This script creates availability entries for products that were imported
 * via MongoDB Compass. It randomly assigns products to stores with price ranges.
 *
 * Usage:
 *   npm run create:availability
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product, Store, Availability } from "../models";

dotenv.config();

async function createSeedAvailability() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined");
    }

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");
    console.log("");

    // Check if stores exist
    const stores = await Store.find();
    if (stores.length === 0) {
      console.log("🏪 Creating stores...");
      await Store.insertMany([
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
          name: "Sprouts Farmers Market",
          type: "brick_and_mortar",
          regionOrScope: "US - West & Southwest",
          websiteUrl: "https://www.sprouts.com",
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
          name: "iHerb",
          type: "online_retailer",
          regionOrScope: "Worldwide - Online",
          websiteUrl: "https://www.iherb.com",
        },
      ]);
      console.log("✅ Created stores");
    } else {
      console.log(`✅ Found ${stores.length} existing stores`);
    }
    console.log("");

    // Check if products exist
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log("❌ No products found in database");
      console.log(
        "   Please import products first using MongoDB Compass or npm run import:products-only",
      );
      process.exit(1);
    }

    console.log(`📦 Found ${productCount.toLocaleString()} products`);
    console.log("");

    // Check if availability already exists
    const existingAvailability = await Availability.countDocuments();
    if (existingAvailability > 0) {
      console.log(
        `⚠️  Found ${existingAvailability.toLocaleString()} existing availability entries`,
      );
      console.log(
        "   Skipping creation. Delete existing entries first if you want to recreate.",
      );
      process.exit(0);
    }

    console.log("📍 Creating availability entries...");
    console.log("   (This may take a few minutes for large datasets)");
    console.log("");

    const priceRanges = [
      "$3.99-$4.99",
      "$4.99-$6.99",
      "$5.99-$7.99",
      "$6.99-$9.99",
      "$8.99-$12.99",
    ];

    // Process products in batches
    const BATCH_SIZE = 1000;
    let processed = 0;
    let created = 0;

    const totalProducts = await Product.countDocuments();
    const cursor = Product.find().cursor();

    for await (const product of cursor) {
      processed++;

      if (processed % 1000 === 0) {
        process.stdout.write(
          `\r📊 Processed: ${processed.toLocaleString()} / ${totalProducts.toLocaleString()} products | Created: ${created.toLocaleString()} availability entries`,
        );
      }

      // Each product gets 2-5 stores
      const numStores = Math.floor(Math.random() * 4) + 2;
      const shuffledStores = [...stores].sort(() => Math.random() - 0.5);
      const selectedStores = shuffledStores.slice(0, numStores);

      const availabilityEntries = selectedStores.map((store) => ({
        productId: product._id,
        storeId: store._id,
        status: "known" as const,
        priceRange: priceRanges[Math.floor(Math.random() * priceRanges.length)],
        lastConfirmedAt: new Date(),
        source: "seed_data" as const,
      }));

      // Insert in batches for efficiency
      if (availabilityEntries.length > 0) {
        await Availability.insertMany(availabilityEntries, { ordered: false });
        created += availabilityEntries.length;
      }
    }

    console.log("\n");
    console.log("=".repeat(60));
    console.log("✅ Availability creation completed!");
    console.log("=".repeat(60));
    console.log(`Products processed: ${processed.toLocaleString()}`);
    console.log(`Availability entries created: ${created.toLocaleString()}`);
    console.log("");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createSeedAvailability();
