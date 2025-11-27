/**
 * Fast import - Products only (no availability)
 * 
 * This script imports products quickly without creating availability entries.
 * Much faster for initial data load.
 * 
 * Usage:
 *   npm run import:products-only
 */

import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { parse } from 'csv-parse';
import { Product, Store } from '../models';

dotenv.config();

const INPUT_FILE = process.argv[2] || path.join(__dirname, '../../data/products-usa-vegan.csv');
const BATCH_SIZE = 1000; // Smaller batches to avoid memory issues

// Helper to parse CSV field
function parseField(field: string | undefined): string {
	if (!field) return '';
	try {
		const parsed = JSON.parse(field);
		if (Array.isArray(parsed)) {
			return parsed.join(',');
		}
		return String(parsed);
	} catch {
		return field;
	}
}

// Parse nutrition data from CSV
function parseNutrition(row: Record<string, string>): string | undefined {
	const parts: string[] = [];
	
	const energy = row['energy-kcal_100g'];
	const fat = row['fat_100g'];
	const carbs = row['carbohydrates_100g'];
	const protein = row['proteins_100g'];
	
	if (energy) parts.push(`${Math.round(parseFloat(energy))} cal`);
	if (fat) parts.push(`${parseFloat(fat)}g fat`);
	if (carbs) parts.push(`${parseFloat(carbs)}g carbs`);
	if (protein) parts.push(`${parseFloat(protein)}g protein`);
	
	if (parts.length > 0) {
		return parts.join(', ') + ' per 100g';
	}
	return undefined;
}

// Map CSV row to our Product model
function mapCSVRowToProduct(row: Record<string, string>): Partial<typeof Product.prototype> {
	const categoriesTags = parseField(row.categories_tags);
	const categories = categoriesTags.split(',').filter(Boolean);
	
	const mainCategory = categories[0] || 'Food';
	const subCategory = categories[1];
	
	const categoryArray = [mainCategory];
	if (subCategory) categoryArray.push(subCategory);
	
	// Build tags
	const tags: string[] = ['vegan'];
	const labelsTags = parseField(row.labels_tags);
	if (labelsTags) {
		if (labelsTags.includes('en:organic')) tags.push('organic');
		if (labelsTags.includes('en:gluten-free')) tags.push('gluten-free');
		if (labelsTags.includes('en:no-added-sugar')) tags.push('no-sugar-added');
		if (labelsTags.includes('en:fair-trade')) tags.push('fair-trade');
	}
	
	const analysisTags = parseField(row.ingredients_analysis_tags);
	if (analysisTags.includes('en:palm-oil-free')) {
		tags.push('palm-oil-free');
	}
	
	// Clean brand
	const brands = parseField(row.brands);
	const brand = brands.split(',')[0]?.trim() || 'Unknown Brand';
	
	// Clean product name
	let name = row.product_name || 'Unknown Product';
	if (name.toLowerCase().startsWith(brand.toLowerCase())) {
		name = name.substring(brand.length).trim();
		if (name.startsWith('-') || name.startsWith(':')) {
			name = name.substring(1).trim();
		}
	}
	if (!name || name.length < 2) {
		name = row.product_name || 'Product';
	}
	
	return {
		name,
		brand,
		description: undefined,
		sizeOrVariant: row.quantity || row.serving_size || 'Standard',
		categories: categoryArray,
		tags,
		isStrictVegan: true,
		imageUrl: row.image_front_url || row.image_url,
		nutritionSummary: parseNutrition(row),
		ingredientSummary: row.ingredients_text?.substring(0, 200),
	};
}

async function importProductsOnly() {
	try {
		const mongoURI = process.env.MONGODB_URI;
		if (!mongoURI) {
			throw new Error('MONGODB_URI is not defined');
		}

		await mongoose.connect(mongoURI);
		console.log('✅ Connected to MongoDB');
		console.log('');

		if (!fs.existsSync(INPUT_FILE)) {
			console.error(`❌ Input file not found: ${INPUT_FILE}`);
			process.exit(1);
		}

		console.log('='.repeat(60));
		console.log('📦 Fast Import - Products Only');
		console.log('='.repeat(60));
		console.log(`Input: ${INPUT_FILE}`);
		console.log('⚠️  Availability entries will NOT be created');
		console.log('');

		// Clear existing products
		console.log('🗑️  Clearing existing products...');
		await Product.deleteMany({});
		console.log('✅ Cleared existing products');
		console.log('');

		// Ensure stores exist (we need them even if not creating availability)
		const stores = await Store.find();
		if (stores.length === 0) {
			console.log('🏪 Creating stores...');
			await Store.insertMany([
				{
					name: 'Whole Foods Market',
					type: 'brick_and_mortar',
					regionOrScope: 'US - Nationwide',
					websiteUrl: 'https://www.wholefoodsmarket.com',
				},
				{
					name: 'Target',
					type: 'brick_and_mortar',
					regionOrScope: 'US - Nationwide',
					websiteUrl: 'https://www.target.com',
				},
				{
					name: "Trader Joe's",
					type: 'brick_and_mortar',
					regionOrScope: 'US - Select Locations',
					websiteUrl: 'https://www.traderjoes.com',
				},
				{
					name: 'Sprouts Farmers Market',
					type: 'brick_and_mortar',
					regionOrScope: 'US - West & Southwest',
					websiteUrl: 'https://www.sprouts.com',
				},
				{
					name: 'Amazon Fresh',
					type: 'online_retailer',
					regionOrScope: 'US - Online',
					websiteUrl: 'https://www.amazon.com/fresh',
				},
				{
					name: 'Thrive Market',
					type: 'online_retailer',
					regionOrScope: 'US - Online',
					websiteUrl: 'https://thrivemarket.com',
				},
				{
					name: 'iHerb',
					type: 'online_retailer',
					regionOrScope: 'Worldwide - Online',
					websiteUrl: 'https://www.iherb.com',
				},
			]);
			console.log('✅ Created stores');
		} else {
			console.log(`✅ Found ${stores.length} existing stores`);
		}
		console.log('');

		// Read and parse CSV
		const readStream = fs.createReadStream(INPUT_FILE);
		const parser = parse({
			columns: true,
			skip_empty_lines: true,
			relax_column_count: true,
			delimiter: ',',
		});

		let totalRows = 0;
		let importedRows = 0;
		let skippedRows = 0;
		let batch: Array<Partial<typeof Product.prototype>> = [];

		console.log('📥 Importing products (products only, no availability)...');
		console.log('');

		readStream.pipe(parser);

		// Process synchronously to avoid memory buildup
		parser.on('data', (row: Record<string, string>) => {
			totalRows++;

			if (totalRows % 1000 === 0) {
				process.stdout.write(
					`\r📊 Processed: ${totalRows.toLocaleString()} | Imported: ${importedRows.toLocaleString()}`
				);
			}

			try {
				const productData = mapCSVRowToProduct(row);
				batch.push(productData);

				// Insert in batches when we reach the batch size
				if (batch.length >= BATCH_SIZE) {
					// Process synchronously to avoid queue buildup
					Product.insertMany(batch, { ordered: false })
						.then((products) => {
							importedRows += products.length;
						})
						.catch(() => {
							skippedRows += batch.length;
						});
					batch = []; // Clear batch immediately
				}
			} catch (error) {
				skippedRows++;
				// Continue processing
			}
		});

		parser.on('end', async () => {
			// Wait a bit for any pending inserts to complete
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			// Insert remaining batch
			if (batch.length > 0) {
				try {
					await Product.insertMany(batch, { ordered: false });
					importedRows += batch.length;
				} catch (error) {
					skippedRows += batch.length;
				}
			}

			console.log('\n');
			console.log('='.repeat(60));
			console.log('✅ Import completed!');
			console.log('='.repeat(60));
			console.log(`Total rows processed: ${totalRows.toLocaleString()}`);
			console.log(`Products imported: ${importedRows.toLocaleString()}`);
			console.log(`Rows skipped: ${skippedRows.toLocaleString()}`);
			console.log('');
			console.log('💡 Tip: You can add availability entries later if needed');
			console.log('');

			await mongoose.disconnect();
			process.exit(0);
		});

		parser.on('error', (error) => {
			console.error('\n❌ Parse error:', error);
			process.exit(1);
		});

	} catch (error) {
		console.error('❌ Import error:', error);
		await mongoose.disconnect();
		process.exit(1);
	}
}

importProductsOnly();

