/**
 * Convert filtered CSV to JSON format matching Product schema
 *
 * This creates a JSON file that can be imported directly into MongoDB
 * with all the proper field names and transformations.
 *
 * Usage:
 *   npm run convert:csv-to-json
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";

const INPUT_FILE =
  process.argv[2] || path.join(__dirname, "../../data/products-usa-vegan.csv");
const OUTPUT_FILE =
  process.argv[3] || path.join(__dirname, "../../data/products-usa-vegan.json");

// Helper to parse CSV field
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

// Map CSV row to Product schema format
function mapCSVRowToProduct(row: Record<string, string>): any {
  const categoriesTags = parseField(row.categories_tags);
  const categories = categoriesTags.split(",").filter(Boolean);

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
    sizeOrVariant: row.quantity || row.serving_size || "Standard",
    categories: categoryArray,
    tags,
    isStrictVegan: true,
    imageUrl: row.image_front_url || row.image_url || undefined,
    nutritionSummary: parseNutrition(row),
    ingredientSummary: row.ingredients_text?.substring(0, 200) || undefined,
  };
}

async function convertCSVtoJSON() {
  try {
    if (!fs.existsSync(INPUT_FILE)) {
      console.error(`❌ Input file not found: ${INPUT_FILE}`);
      process.exit(1);
    }

    console.log("=".repeat(60));
    console.log("🔄 Converting CSV to JSON");
    console.log("=".repeat(60));
    console.log(`Input: ${INPUT_FILE}`);
    console.log(`Output: ${OUTPUT_FILE}`);
    console.log("");

    const readStream = fs.createReadStream(INPUT_FILE);
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      delimiter: ",",
    });

    const products: any[] = [];
    let totalRows = 0;

    readStream.pipe(parser);

    parser.on("data", (row: Record<string, string>) => {
      totalRows++;

      if (totalRows % 5000 === 0) {
        process.stdout.write(
          `\r📊 Processed: ${totalRows.toLocaleString()} rows`,
        );
      }

      try {
        const product = mapCSVRowToProduct(row);
        products.push(product);
      } catch (error) {
        // Skip invalid rows
      }
    });

    parser.on("end", () => {
      console.log("\n");
      console.log("💾 Writing JSON file...");

      // Write as JSON array
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2));

      console.log("=".repeat(60));
      console.log("✅ Conversion completed!");
      console.log("=".repeat(60));
      console.log(`Total products: ${products.length.toLocaleString()}`);
      console.log(`Output file: ${OUTPUT_FILE}`);
      console.log("");
      console.log("📝 Next step: Import this JSON file into MongoDB Compass");
      console.log("   File → Import File → Select the JSON file");
      console.log("");
    });

    parser.on("error", (error) => {
      console.error("\n❌ Parse error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Conversion error:", error);
    process.exit(1);
  }
}

convertCSVtoJSON();
