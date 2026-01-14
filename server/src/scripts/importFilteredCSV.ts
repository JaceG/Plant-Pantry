/**
 * Import filtered CSV into MongoDB
 *
 * This script imports the filtered USA vegan products CSV into MongoDB.
 * It's much faster than using the full MongoDB dump since we only have ~74k products.
 *
 * Usage:
 *   npm run import:csv <input.csv>
 *
 * Or with default path:
 *   npm run import:csv
 */

import * as fs from "fs";
import * as path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse";
import { Product, Store, Availability } from "../models";

dotenv.config();

const INPUT_FILE =
  process.argv[2] || path.join(__dirname, "../../data/products-usa-vegan.csv");
const BATCH_SIZE = 1000; // Insert in batches for better performance
const SKIP_AVAILABILITY = process.env.SKIP_AVAILABILITY === "true"; // Set to skip availability creation for faster import

// Helper to parse CSV field (might be JSON array string or plain string)
function parseField(field: string | undefined): string {
  if (!field) return "";
  try {
    const parsed = JSON.parse(field);
    if (Array.isArray(parsed)) {
      return parsed.join(",");
    }
    return String(parsed);
  } catch {
    return field;
  }
}

// Parse nutrition data from CSV
function parseNutrition(row: Record<string, string>): string | undefined {
  const parts: string[] = [];

  const energy = row["energy-kcal_100g"];
  const fat = row["fat_100g"];
  const carbs = row["carbohydrates_100g"];
  const protein = row["proteins_100g"];

  if (energy) parts.push(`${Math.round(parseFloat(energy))} cal`);
  if (fat) parts.push(`${parseFloat(fat)}g fat`);
  if (carbs) parts.push(`${parseFloat(carbs)}g carbs`);
  if (protein) parts.push(`${parseFloat(protein)}g protein`);

  if (parts.length > 0) {
    return parts.join(", ") + " per 100g";
  }
  return undefined;
}

// Map CSV row to our Product model
function mapCSVRowToProduct(
  row: Record<string, string>,
): Partial<typeof Product.prototype> {
  const categoriesTags = parseField(row.categories_tags);
  const categories = categoriesTags.split(",").filter(Boolean);

  // Use first category as main category, second as subcategory
  const mainCategory = categories[0] || "Food";
  const subCategory = categories[1];

  const categoryArray = [mainCategory];
  if (subCategory) categoryArray.push(subCategory);

  // Build tags
  const tags: string[] = ["vegan"];
  const labelsTags = parseField(row.labels_tags);
  if (labelsTags) {
    if (labelsTags.includes("en:organic")) tags.push("organic");
    if (labelsTags.includes("en:gluten-free")) tags.push("gluten-free");
    if (labelsTags.includes("en:no-added-sugar")) tags.push("no-sugar-added");
    if (labelsTags.includes("en:fair-trade")) tags.push("fair-trade");
  }

  const analysisTags = parseField(row.ingredients_analysis_tags);
  if (analysisTags.includes("en:palm-oil-free")) {
    tags.push("palm-oil-free");
  }

  // Clean brand
  const brands = parseField(row.brands);
  const brand = brands.split(",")[0]?.trim() || "Unknown Brand";

  // Clean product name
  let name = row.product_name || "Unknown Product";
  if (name.toLowerCase().startsWith(brand.toLowerCase())) {
    name = name.substring(brand.length).trim();
    if (name.startsWith("-") || name.startsWith(":")) {
      name = name.substring(1).trim();
    }
  }
  if (!name || name.length < 2) {
    name = row.product_name || "Product";
  }

  return {
    name,
    brand,
    description: undefined,
    sizeOrVariant: row.quantity || row.serving_size || "Standard",
    categories: categoryArray,
    tags,
    isStrictVegan: true,
    imageUrl: row.image_front_url || row.image_url,
    nutritionSummary: parseNutrition(row),
    ingredientSummary: row.ingredients_text?.substring(0, 200),
  };
}

async function importCSV() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined");
    }

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");
    console.log("");

    if (!fs.existsSync(INPUT_FILE)) {
      console.error(`❌ Input file not found: ${INPUT_FILE}`);
      console.error("Run npm run filter:tsv first to create the filtered CSV");
      process.exit(1);
    }

    console.log("=".repeat(60));
    console.log("📦 Importing Filtered CSV to MongoDB");
    console.log("=".repeat(60));
    console.log(`Input: ${INPUT_FILE}`);
    if (SKIP_AVAILABILITY) {
      console.log(
        "⚠️  Availability creation SKIPPED (set SKIP_AVAILABILITY=false to enable)",
      );
    }
    console.log("");

    // Clear existing products (optional - comment out if you want to keep existing)
    console.log("🗑️  Clearing existing products...");
    await Product.deleteMany({});
    console.log("✅ Cleared existing products");
    console.log("");

    // Ensure stores exist
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

    // Read and parse CSV
    const readStream = fs.createReadStream(INPUT_FILE);
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      delimiter: ",", // Output CSV is comma-separated
    });

    let totalRows = 0;
    let importedRows = 0;
    let skippedRows = 0;
    let availabilityCount = 0;
    let batch: Array<Partial<typeof Product.prototype>> = [];
    const productIds: mongoose.Types.ObjectId[] = []; // Store product IDs for batch availability creation

    console.log("📥 Importing products...");
    console.log("");

    readStream.pipe(parser);

    // Helper to create availability entries efficiently using bulkWrite
    async function createAvailabilityEntriesBulk(
      productIds: mongoose.Types.ObjectId[],
    ) {
      const priceRanges = [
        "$3.99-$4.99",
        "$4.99-$6.99",
        "$5.99-$7.99",
        "$6.99-$9.99",
        "$8.99-$12.99",
      ];

      const operations: any[] = [];

      for (const productId of productIds) {
        // Each product gets 2-5 stores
        const numStores = Math.floor(Math.random() * 4) + 2;
        const shuffledStores = [...stores].sort(() => Math.random() - 0.5);
        const selectedStores = shuffledStores.slice(0, numStores);

        for (const store of selectedStores) {
          operations.push({
            insertOne: {
              document: {
                productId,
                storeId: store._id,
                status: "known",
                priceRange:
                  priceRanges[Math.floor(Math.random() * priceRanges.length)],
                lastConfirmedAt: new Date(),
                source: "seed_data",
              },
            },
          });
        }
      }

      // Use bulkWrite with unordered operations for better performance
      if (operations.length > 0) {
        const BULK_BATCH_SIZE = 10000;
        for (let i = 0; i < operations.length; i += BULK_BATCH_SIZE) {
          const batch = operations.slice(i, i + BULK_BATCH_SIZE);
          await Availability.bulkWrite(batch, { ordered: false });
          availabilityCount += batch.length;
          if (i % 50000 === 0 || i + BULK_BATCH_SIZE >= operations.length) {
            process.stdout.write(
              `\r  Creating availability: ${Math.min(i + BULK_BATCH_SIZE, operations.length).toLocaleString()} / ${operations.length.toLocaleString()}`,
            );
          }
        }
      }
    }

    // Legacy helper (kept for reference but not used)
    async function createAvailabilityEntries(
      products: Array<{ _id: mongoose.Types.ObjectId }>,
    ) {
      const availabilityBatch: Array<{
        productId: mongoose.Types.ObjectId;
        storeId: mongoose.Types.ObjectId;
        status: string;
        priceRange: string;
        lastConfirmedAt: Date;
        source: string;
      }> = [];

      for (const product of products) {
        const numStores = Math.floor(Math.random() * 4) + 2;
        const shuffledStores = [...stores].sort(() => Math.random() - 0.5);
        const selectedStores = shuffledStores.slice(0, numStores);

        for (const store of selectedStores) {
          const priceRanges = [
            "$3.99-$4.99",
            "$4.99-$6.99",
            "$5.99-$7.99",
            "$6.99-$9.99",
            "$8.99-$12.99",
          ];
          availabilityBatch.push({
            productId: product._id as mongoose.Types.ObjectId,
            storeId: store._id as mongoose.Types.ObjectId,
            status: "known",
            priceRange:
              priceRanges[Math.floor(Math.random() * priceRanges.length)],
            lastConfirmedAt: new Date(),
            source: "seed_data",
          });
        }
      }

      // Insert availability entries in smaller batches to avoid memory issues
      if (availabilityBatch.length > 0) {
        const AVAILABILITY_BATCH_SIZE = 5000;
        for (
          let i = 0;
          i < availabilityBatch.length;
          i += AVAILABILITY_BATCH_SIZE
        ) {
          const batch = availabilityBatch.slice(i, i + AVAILABILITY_BATCH_SIZE);
          await Availability.insertMany(batch);
          availabilityCount += batch.length;
        }
      }
    }

    parser.on("data", async (row: Record<string, string>) => {
      totalRows++;

      if (totalRows % 10000 === 0) {
        process.stdout.write(
          `\r📊 Processed: ${totalRows.toLocaleString()} | Imported: ${importedRows.toLocaleString()} | Availability: ${availabilityCount.toLocaleString()}`,
        );
      }

      try {
        const productData = mapCSVRowToProduct(row);
        batch.push(productData);

        // Insert in batches
        if (batch.length >= BATCH_SIZE) {
          const products = await Product.insertMany(batch);
          if (!SKIP_AVAILABILITY) {
            // Collect product IDs for batch availability creation
            productIds.push(
              ...products.map((p) => p._id as mongoose.Types.ObjectId),
            );
          }
          importedRows += products.length;
          batch = [];
        }
      } catch (error) {
        skippedRows++;
        // Continue processing
      }
    });

    parser.on("end", async () => {
      // Insert remaining batch
      if (batch.length > 0) {
        try {
          const products = await Product.insertMany(batch);
          if (!SKIP_AVAILABILITY) {
            productIds.push(
              ...products.map((p) => p._id as mongoose.Types.ObjectId),
            );
          }
          importedRows += products.length;
        } catch (error) {
          skippedRows += batch.length;
        }
      }

      // Create availability entries in bulk after all products are imported
      if (!SKIP_AVAILABILITY && productIds.length > 0) {
        console.log("\n");
        console.log("📍 Creating availability entries in bulk...");
        await createAvailabilityEntriesBulk(productIds);
        console.log("\n");
      }

      console.log("=".repeat(60));
      console.log("✅ Import completed!");
      console.log("=".repeat(60));
      console.log(`Total rows processed: ${totalRows.toLocaleString()}`);
      console.log(`Products imported: ${importedRows.toLocaleString()}`);
      console.log(`Rows skipped: ${skippedRows.toLocaleString()}`);
      if (!SKIP_AVAILABILITY) {
        console.log(
          `Availability entries: ${availabilityCount.toLocaleString()}`,
        );
      }
      console.log("");

      await mongoose.disconnect();
      process.exit(0);
    });

    parser.on("error", (error) => {
      console.error("\n❌ Parse error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Import error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

importCSV();
