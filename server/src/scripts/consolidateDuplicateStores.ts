/**
 * Consolidate Duplicate Stores Script
 *
 * This script finds duplicate online stores and consolidates them into one.
 * It updates all Availability records to point to the keeper store and deletes duplicates.
 *
 * Usage:
 *   npx ts-node src/scripts/consolidateDuplicateStores.ts --dry-run    (preview only)
 *   npx ts-node src/scripts/consolidateDuplicateStores.ts --delete     (actually consolidate)
 *   npx ts-node src/scripts/consolidateDuplicateStores.ts --name "Dare" --delete  (specific store name)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Store, Availability } from "../models";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env");
  process.exit(1);
}

const mongoUri: string = MONGODB_URI;

interface StoreDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  regionOrScope: string;
  websiteUrl?: string;
  createdAt: Date;
}

async function consolidateDuplicateStores(
  dryRun: boolean = true,
  storeName?: string,
) {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Build query for online stores
    const query: any = {
      type: { $in: ["online_retailer", "brand_direct"] },
    };

    if (storeName) {
      query.name = { $regex: storeName, $options: "i" };
    }

    // Find all online stores matching the criteria
    const stores = (await Store.find(query)
      .sort({ createdAt: 1 })
      .lean()) as StoreDoc[];

    console.log(`Found ${stores.length} online stores matching criteria\n`);

    if (stores.length === 0) {
      console.log("No stores to consolidate.");
      await mongoose.disconnect();
      return;
    }

    // Group stores by normalized name (case-insensitive)
    const storeGroups = new Map<string, StoreDoc[]>();
    for (const store of stores) {
      const normalizedName = store.name.toLowerCase().trim();
      const group = storeGroups.get(normalizedName) || [];
      group.push(store);
      storeGroups.set(normalizedName, group);
    }

    // Find groups with duplicates
    const duplicateGroups = Array.from(storeGroups.entries()).filter(
      ([, group]) => group.length > 1,
    );

    if (duplicateGroups.length === 0) {
      console.log("No duplicate stores found!");
      await mongoose.disconnect();
      return;
    }

    console.log(
      `Found ${duplicateGroups.length} store name(s) with duplicates:\n`,
    );

    let totalDuplicates = 0;
    let totalAvailabilityUpdates = 0;

    for (const [name, group] of duplicateGroups) {
      console.log(`\n📦 "${name}" - ${group.length} stores:`);

      // Get availability count for each store in the group
      const storeStats = await Promise.all(
        group.map(async (store) => {
          const availCount = await Availability.countDocuments({
            storeId: store._id,
          });
          return {
            store,
            availabilityCount: availCount,
          };
        }),
      );

      // Sort by availability count (descending), then by creation date (ascending)
      // The "keeper" is the one with most availability or oldest creation date
      storeStats.sort((a, b) => {
        if (b.availabilityCount !== a.availabilityCount) {
          return b.availabilityCount - a.availabilityCount;
        }
        return (
          new Date(a.store.createdAt).getTime() -
          new Date(b.store.createdAt).getTime()
        );
      });

      const keeper = storeStats[0];
      const duplicates = storeStats.slice(1);

      console.log(
        `  ✅ KEEP: ${keeper.store._id} (${keeper.availabilityCount} availability records, created ${keeper.store.createdAt})`,
      );
      console.log(`     Region: ${keeper.store.regionOrScope}`);
      if (keeper.store.websiteUrl) {
        console.log(`     URL: ${keeper.store.websiteUrl}`);
      }

      for (const dup of duplicates) {
        console.log(
          `  ❌ DELETE: ${dup.store._id} (${dup.availabilityCount} availability records, created ${dup.store.createdAt})`,
        );
        console.log(`     Region: ${dup.store.regionOrScope}`);
        if (dup.store.websiteUrl) {
          console.log(`     URL: ${dup.store.websiteUrl}`);
        }
        totalDuplicates++;
        totalAvailabilityUpdates += dup.availabilityCount;
      }

      if (!dryRun) {
        // Update all availability records from duplicates to point to keeper
        for (const dup of duplicates) {
          if (dup.availabilityCount > 0) {
            const updateResult = await Availability.updateMany(
              { storeId: dup.store._id },
              { $set: { storeId: keeper.store._id } },
            );
            console.log(
              `     → Updated ${updateResult.modifiedCount} availability records`,
            );
          }

          // Delete the duplicate store
          await Store.deleteOne({ _id: dup.store._id });
          console.log(`     → Deleted store ${dup.store._id}`);
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("Summary:");
    console.log(`  Duplicate stores: ${totalDuplicates}`);
    console.log(
      `  Availability records to update: ${totalAvailabilityUpdates}`,
    );

    if (dryRun) {
      console.log("\n🔍 DRY RUN MODE - No data was modified");
      console.log("   Run with --delete flag to actually consolidate\n");
    } else {
      console.log("\n✅ Consolidation complete!");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error during consolidation:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || !args.includes("--delete");
const nameIndex = args.indexOf("--name");
const storeName = nameIndex !== -1 ? args[nameIndex + 1] : undefined;

if (dryRun) {
  console.log("🔍 Running in DRY RUN mode (no data will be modified)");
  console.log("   Add --delete flag to actually consolidate stores\n");
} else {
  console.log(
    "⚠️  Running in DELETE mode - duplicate stores will be consolidated\n",
  );
}

if (storeName) {
  console.log(`🔎 Filtering stores by name containing: "${storeName}"\n`);
}

consolidateDuplicateStores(dryRun, storeName);
