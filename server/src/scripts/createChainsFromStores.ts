/**
 * Script to auto-detect store chains from existing stores and create chain records.
 *
 * This script:
 * 1. Analyzes existing store names to detect common chain patterns
 * 2. Creates StoreChain records for detected chains
 * 3. Assigns stores to their respective chains
 *
 * Usage: npx ts-node src/scripts/createChainsFromStores.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Store, StoreChain } from "../models";

dotenv.config();

// Known chain patterns - name patterns and their canonical chain names
// IMPORTANT: More specific patterns (e.g., "Kroger Marketplace") must come BEFORE
// general patterns (e.g., "Kroger") to ensure proper matching
const CHAIN_PATTERNS: Array<{
  patterns: RegExp[];
  chainName: string;
  type: "national" | "regional" | "local";
  websiteUrl?: string;
}> = [
  // ============================================
  // KROGER FAMILY - specific formats first
  // ============================================
  {
    patterns: [/^kroger\s+marketplace/i],
    chainName: "Kroger Marketplace",
    type: "national",
    websiteUrl: "https://www.kroger.com",
  },
  {
    patterns: [/^kroger\s+fresh\s*fare/i],
    chainName: "Kroger Fresh Fare",
    type: "national",
    websiteUrl: "https://www.kroger.com",
  },
  {
    patterns: [/^kroger/i], // General Kroger - must be after specific variants
    chainName: "Kroger",
    type: "national",
    websiteUrl: "https://www.kroger.com",
  },

  // ============================================
  // TARGET FAMILY - specific formats first
  // ============================================
  {
    patterns: [/^super\s*target/i],
    chainName: "Super Target",
    type: "national",
    websiteUrl: "https://www.target.com",
  },
  {
    patterns: [/^target\s+greatland/i],
    chainName: "Target Greatland",
    type: "national",
    websiteUrl: "https://www.target.com",
  },
  {
    patterns: [/^target/i], // General Target - must be after specific variants
    chainName: "Target",
    type: "national",
    websiteUrl: "https://www.target.com",
  },

  // ============================================
  // WALMART FAMILY - specific formats first
  // ============================================
  {
    patterns: [/^walmart\s+supercenter/i, /^wal-?mart\s+supercenter/i],
    chainName: "Walmart Supercenter",
    type: "national",
    websiteUrl: "https://www.walmart.com",
  },
  {
    patterns: [/^walmart\s+neighborhood/i, /^wal-?mart\s+neighborhood/i],
    chainName: "Walmart Neighborhood Market",
    type: "national",
    websiteUrl: "https://www.walmart.com",
  },
  {
    patterns: [/^walmart/i, /^wal-?mart/i], // General Walmart
    chainName: "Walmart",
    type: "national",
    websiteUrl: "https://www.walmart.com",
  },

  // ============================================
  // OTHER NATIONAL CHAINS
  // ============================================
  {
    patterns: [/^whole\s*foods/i, /^whole\s*foods\s+market/i],
    chainName: "Whole Foods Market",
    type: "national",
    websiteUrl: "https://www.wholefoodsmarket.com",
  },
  {
    patterns: [/^trader\s*joe'?s/i],
    chainName: "Trader Joe's",
    type: "national",
    websiteUrl: "https://www.traderjoes.com",
  },
  {
    patterns: [/^costco/i],
    chainName: "Costco",
    type: "national",
    websiteUrl: "https://www.costco.com",
  },
  {
    patterns: [/^safeway/i],
    chainName: "Safeway",
    type: "national",
    websiteUrl: "https://www.safeway.com",
  },
  {
    patterns: [/^sprouts/i, /^sprouts\s+farmers/i],
    chainName: "Sprouts Farmers Market",
    type: "national",
    websiteUrl: "https://www.sprouts.com",
  },
  {
    patterns: [/^natural\s*grocers/i],
    chainName: "Natural Grocers",
    type: "national",
    websiteUrl: "https://www.naturalgrocers.com",
  },
  {
    patterns: [/^aldi/i],
    chainName: "ALDI",
    type: "national",
    websiteUrl: "https://www.aldi.us",
  },
  {
    patterns: [/^cvs/i],
    chainName: "CVS Pharmacy",
    type: "national",
    websiteUrl: "https://www.cvs.com",
  },
  {
    patterns: [/^walgreens/i],
    chainName: "Walgreens",
    type: "national",
    websiteUrl: "https://www.walgreens.com",
  },

  // ============================================
  // REGIONAL CHAINS
  // ============================================
  {
    patterns: [/^publix/i],
    chainName: "Publix",
    type: "regional",
    websiteUrl: "https://www.publix.com",
  },
  {
    patterns: [/^wegmans/i],
    chainName: "Wegmans",
    type: "regional",
    websiteUrl: "https://www.wegmans.com",
  },
  {
    patterns: [/^h-?e-?b\b/i, /^heb\b/i],
    chainName: "H-E-B",
    type: "regional",
    websiteUrl: "https://www.heb.com",
  },
  {
    patterns: [/^giant\s*eagle\s+market\s*district/i],
    chainName: "Giant Eagle Market District",
    type: "regional",
    websiteUrl: "https://www.gianteagle.com",
  },
  {
    patterns: [/^giant\s*eagle/i],
    chainName: "Giant Eagle",
    type: "regional",
    websiteUrl: "https://www.gianteagle.com",
  },
  {
    patterns: [/^meijer/i],
    chainName: "Meijer",
    type: "regional",
    websiteUrl: "https://www.meijer.com",
  },
  {
    patterns: [/^fred\s*meyer/i],
    chainName: "Fred Meyer",
    type: "regional",
    websiteUrl: "https://www.fredmeyer.com",
  },
  {
    patterns: [/^ralphs/i],
    chainName: "Ralph's",
    type: "regional",
    websiteUrl: "https://www.ralphs.com",
  },
  {
    patterns: [/^vons/i],
    chainName: "Vons",
    type: "regional",
    websiteUrl: "https://www.vons.com",
  },
  {
    patterns: [/^stop\s*&?\s*shop/i],
    chainName: "Stop & Shop",
    type: "regional",
    websiteUrl: "https://www.stopandshop.com",
  },
  {
    patterns: [/^giant\s*food/i, /^giant(?!\s*eagle)/i],
    chainName: "Giant Food",
    type: "regional",
    websiteUrl: "https://www.giantfood.com",
  },
  {
    patterns: [/^food\s*lion/i],
    chainName: "Food Lion",
    type: "regional",
    websiteUrl: "https://www.foodlion.com",
  },
  {
    patterns: [/^harris\s*teeter/i],
    chainName: "Harris Teeter",
    type: "regional",
    websiteUrl: "https://www.harristeeter.com",
  },

  // ============================================
  // HEALTH FOOD / SPECIALTY STORES
  // ============================================
  {
    patterns: [/^the\s*vitamin\s*shoppe/i, /^vitamin\s*shoppe/i],
    chainName: "The Vitamin Shoppe",
    type: "national",
    websiteUrl: "https://www.vitaminshoppe.com",
  },
  {
    patterns: [/^gnc/i],
    chainName: "GNC",
    type: "national",
    websiteUrl: "https://www.gnc.com",
  },
];

interface ChainMatch {
  chainName: string;
  type: "national" | "regional" | "local";
  websiteUrl?: string;
  storeIds: string[];
  storeNames: string[];
}

async function detectChains(): Promise<Map<string, ChainMatch>> {
  const stores = await Store.find({ type: "brick_and_mortar" }).lean();
  const chainMatches = new Map<string, ChainMatch>();

  for (const store of stores) {
    let matched = false;

    for (const chainPattern of CHAIN_PATTERNS) {
      for (const pattern of chainPattern.patterns) {
        if (pattern.test(store.name)) {
          const key = chainPattern.chainName.toLowerCase();

          if (!chainMatches.has(key)) {
            chainMatches.set(key, {
              chainName: chainPattern.chainName,
              type: chainPattern.type,
              websiteUrl: chainPattern.websiteUrl,
              storeIds: [],
              storeNames: [],
            });
          }

          const match = chainMatches.get(key)!;
          match.storeIds.push(store._id.toString());
          match.storeNames.push(store.name);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }

  return chainMatches;
}

async function createChainsAndAssignStores(dryRun = true) {
  console.log("🔍 Analyzing existing stores for chain patterns...\n");

  const chainMatches = await detectChains();

  if (chainMatches.size === 0) {
    console.log("No chain patterns detected in existing stores.");
    return;
  }

  console.log(`Found ${chainMatches.size} potential chains:\n`);

  for (const [, match] of chainMatches) {
    console.log(`📦 ${match.chainName} (${match.type})`);
    console.log(`   ${match.storeIds.length} locations found:`);
    for (const name of match.storeNames.slice(0, 5)) {
      console.log(`   - ${name}`);
    }
    if (match.storeNames.length > 5) {
      console.log(`   ... and ${match.storeNames.length - 5} more`);
    }
    console.log("");
  }

  if (dryRun) {
    console.log("--- DRY RUN MODE ---");
    console.log(
      "No changes will be made. Run with --execute to apply changes.",
    );
    return;
  }

  console.log("\n🚀 Creating chains and assigning stores...\n");

  let chainsCreated = 0;
  let storesAssigned = 0;

  for (const [, match] of chainMatches) {
    // Check if chain already exists
    let chain = await StoreChain.findOne({
      name: { $regex: new RegExp(`^${match.chainName}$`, "i") },
    });

    if (!chain) {
      // Create the chain
      const slug = match.chainName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      chain = await StoreChain.create({
        name: match.chainName,
        slug,
        type: match.type,
        websiteUrl: match.websiteUrl,
        isActive: true,
        locationCount: 0,
      });

      console.log(`✅ Created chain: ${match.chainName}`);
      chainsCreated++;
    } else {
      console.log(`ℹ️  Chain already exists: ${match.chainName}`);
    }

    // Assign stores to chain
    for (const storeId of match.storeIds) {
      const store = await Store.findById(storeId);
      if (store && !store.chainId) {
        // Generate location identifier from store name
        let locationIdentifier = store.name
          .replace(new RegExp(`^${match.chainName}\\s*`, "i"), "")
          .replace(/^-\s*/, "")
          .trim();

        // If no identifier from name, use address or city
        if (!locationIdentifier) {
          if (store.address) {
            locationIdentifier = store.address;
          } else if (store.city) {
            locationIdentifier = store.city;
          }
        }

        store.chainId = chain._id;
        store.locationIdentifier = locationIdentifier || undefined;
        await store.save();
        storesAssigned++;
      }
    }

    // Update location count
    const locationCount = await Store.countDocuments({
      chainId: chain._id,
    });
    chain.locationCount = locationCount;
    await chain.save();

    console.log(
      `   Assigned ${match.storeIds.length} stores to ${match.chainName}`,
    );
  }

  console.log("\n✨ Done!");
  console.log(`   Chains created: ${chainsCreated}`);
  console.log(`   Stores assigned: ${storesAssigned}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--execute");

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI environment variable is required");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected!\n");

    await createChainsAndAssignStores(dryRun);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
