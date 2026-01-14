/**
 * Cleanup Script: Remove All Cached Availability Data
 *
 * This script removes all availability entries from the database except
 * user-contributed ones. We now fetch availability fresh from APIs on each view.
 *
 * Only user-contributed availability (source: 'user_contribution') is kept.
 * All other entries (api_fetch, seed_data, store_api) are deleted.
 *
 * Usage:
 *   npm run cleanup:fake-availability -- --dry-run  (preview only)
 *   npm run cleanup:fake-availability -- --delete    (actually delete)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Availability } from "../models";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env");
  process.exit(1);
}

// Type assertion: we've already checked MONGODB_URI is defined
const mongoUri: string = MONGODB_URI;

// We're deleting ALL cached availability except user-contributed
// No date filter needed - we want to remove everything except user_contribution

async function cleanupFakeAvailability(dryRun: boolean = true) {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Count entries by source
    const sourceCounts = await Availability.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log("Current availability entries by source:");
    sourceCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id || "null"}: ${count}`);
    });
    console.log("");

    // Find all entries EXCEPT user-contributed ones
    const entriesToDelete = await Availability.find({
      source: { $ne: "user_contribution" },
    }).lean();

    const userContributedCount = await Availability.countDocuments({
      source: "user_contribution",
    });

    console.log(
      `Found ${entriesToDelete.length} cached availability entries to delete`,
    );
    console.log(`Keeping ${userContributedCount} user-contributed entries\n`);

    if (entriesToDelete.length === 0) {
      console.log("No cached entries to clean up!");
      await mongoose.disconnect();
      return;
    }

    // Group by product to show impact
    const productCounts = new Map<string, number>();
    entriesToDelete.forEach((entry) => {
      const productId = entry.productId.toString();
      productCounts.set(productId, (productCounts.get(productId) || 0) + 1);
    });

    console.log(`Affects ${productCounts.size} products:`);
    if (productCounts.size > 0) {
      console.log("Top 10 products by cached entry count:");
      Array.from(productCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([productId, count]) => {
          console.log(`  Product ${productId}: ${count} cached entries`);
        });
    }
    console.log("");

    if (dryRun) {
      console.log("🔍 DRY RUN MODE - No data will be deleted");
      console.log("Run with --delete flag to actually delete these entries\n");
    } else {
      console.log("⚠️  DELETING all cached availability entries...");
      console.log("   (Keeping user-contributed entries)\n");
      const result = await Availability.deleteMany({
        source: { $ne: "user_contribution" },
      });

      console.log(
        `✅ Deleted ${result.deletedCount} cached availability entries`,
      );
      console.log(`✅ Kept ${userContributedCount} user-contributed entries\n`);
    }

    // Show summary of remaining availability by source
    const remainingCounts = await Availability.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log("Remaining availability entries by source:");
    if (remainingCounts.length === 0) {
      console.log("  (none)");
    } else {
      remainingCounts.forEach(({ _id, count }) => {
        console.log(`  ${_id || "null"}: ${count}`);
      });
    }

    await mongoose.disconnect();
    console.log("\n✅ Cleanup complete");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || !args.includes("--delete");

if (dryRun) {
  console.log("🔍 Running in DRY RUN mode (no data will be deleted)");
  console.log("   Add --delete flag to actually delete fake entries\n");
} else {
  console.log(
    "⚠️  Running in DELETE mode - fake entries will be permanently removed\n",
  );
}

cleanupFakeAvailability(dryRun);
