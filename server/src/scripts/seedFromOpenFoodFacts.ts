/**
 * Seed script that fetches real vegan products from Open Food Facts API
 *
 * API Documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
 *
 * Rate limits: 10 req/min for search queries - we add delays between requests
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product, Store, Availability, User } from '../models';

dotenv.config();

const BASE_URL = 'https://world.openfoodfacts.org';
const USER_AGENT = 'PlantPantry/1.0 (plantpantry-app@example.com)';
const DEMO_USER_ID = '000000000000000000000001';

// Rate limit delay (6 seconds between requests to stay under 10 req/min)
const RATE_LIMIT_DELAY = 6000;

interface OpenFoodFactsProduct {
	code: string;
	product_name?: string;
	brands?: string;
	categories?: string;
	categories_tags?: string[];
	labels_tags?: string[];
	ingredients_analysis_tags?: string[];
	ingredients_text?: string;
	nutriments?: {
		'energy-kcal_100g'?: number;
		fat_100g?: number;
		carbohydrates_100g?: number;
		proteins_100g?: number;
		fiber_100g?: number;
		sugars_100g?: number;
		salt_100g?: number;
	};
	image_front_url?: string;
	image_url?: string;
	quantity?: string;
	serving_size?: string;
}

interface SearchResponse {
	count: number;
	page: number;
	page_count: number;
	page_size: number;
	products: OpenFoodFactsProduct[];
}

// Categories to fetch from Open Food Facts (mapped to our categories)
// Reduced for faster MVP seeding (~30-35 products)
const CATEGORIES_TO_FETCH = [
	{
		offCategory: 'en:plant-milks',
		ourCategory: 'Dairy Alternatives',
		ourSubcategory: 'Plant Milk',
		count: 6,
	},
	{
		offCategory: 'en:oat-milks',
		ourCategory: 'Dairy Alternatives',
		ourSubcategory: 'Oat Milk',
		count: 4,
	},
	{
		offCategory: 'en:almond-milks',
		ourCategory: 'Dairy Alternatives',
		ourSubcategory: 'Almond Milk',
		count: 3,
	},
	{
		offCategory: 'en:tofu',
		ourCategory: 'Protein',
		ourSubcategory: 'Tofu',
		count: 4,
	},
	{
		offCategory: 'en:tempeh',
		ourCategory: 'Protein',
		ourSubcategory: 'Tempeh',
		count: 3,
	},
	{
		offCategory: 'en:hummus',
		ourCategory: 'Pantry',
		ourSubcategory: 'Spreads',
		count: 4,
	},
	{
		offCategory: 'en:peanut-butters',
		ourCategory: 'Pantry',
		ourSubcategory: 'Nut Butters',
		count: 3,
	},
	{
		offCategory: 'en:dark-chocolates',
		ourCategory: 'Snacks',
		ourSubcategory: 'Chocolate',
		count: 4,
	},
	{
		offCategory: 'en:fruit-juices',
		ourCategory: 'Beverages',
		ourSubcategory: 'Juice',
		count: 3,
	},
	{
		offCategory: 'en:kombucha',
		ourCategory: 'Beverages',
		ourSubcategory: 'Kombucha',
		count: 3,
	},
];

async function fetchVeganProducts(
	category: string,
	count: number
): Promise<OpenFoodFactsProduct[]> {
	const params = new URLSearchParams({
		ingredients_analysis_tags: 'en:vegan',
		categories_tags: category,
		countries_tags: 'en:united-states', // Filter for USA products
		lc: 'en', // Filter for English language
		fields: 'code,product_name,brands,categories,categories_tags,labels_tags,ingredients_analysis_tags,ingredients_text,nutriments,image_front_url,image_url,quantity,serving_size',
		page: '1',
		page_size: Math.min(count * 3, 50).toString(), // Fetch more to filter for quality
		sort_by: 'popularity_key',
	});

	const url = `${BASE_URL}/api/v2/search?${params.toString()}`;
	console.log(`  Fetching from: ${category}`);

	const response = await fetch(url, {
		headers: { 'User-Agent': USER_AGENT },
	});

	if (!response.ok) {
		throw new Error(`API request failed: ${response.status}`);
	}

	const data = (await response.json()) as SearchResponse;

	// Filter for products with good data quality AND exclude non-food items
	const qualityProducts = data.products.filter((p) => {
		// Basic quality checks
		if (
			!p.product_name ||
			p.product_name.length <= 2 ||
			!p.brands ||
			!(p.image_front_url || p.image_url)
		) {
			return false;
		}

		// Exclude non-food categories
		const categories = p.categories_tags || [];
		const nonFoodCategories = [
			'supplement',
			'cosmetic',
			'beauty',
			'personal-care',
			'hygiene',
			'cleaning',
			'pet-food',
		];

		// If any category contains non-food keywords, exclude it
		if (
			categories.some((cat) =>
				nonFoodCategories.some((nonFood) =>
					cat.toLowerCase().includes(nonFood)
				)
			)
		) {
			return false;
		}

		return true;
	});

	console.log(
		`  Found ${data.count} total, ${qualityProducts.length} with quality data`
	);

	return qualityProducts.slice(0, count);
}

function mapToOurProduct(
	offProduct: OpenFoodFactsProduct,
	ourCategory: string,
	ourSubcategory: string
): Partial<typeof Product.prototype> {
	// Build categories array
	const categories = [ourCategory];
	if (ourSubcategory) categories.push(ourSubcategory);

	// Build tags from labels and analysis
	const tags: string[] = ['vegan'];
	if (offProduct.labels_tags) {
		if (offProduct.labels_tags.includes('en:organic')) tags.push('organic');
		if (offProduct.labels_tags.includes('en:gluten-free'))
			tags.push('gluten-free');
		if (offProduct.labels_tags.includes('en:no-added-sugar'))
			tags.push('no-sugar-added');
		if (offProduct.labels_tags.includes('en:fair-trade'))
			tags.push('fair-trade');
	}
	if (offProduct.ingredients_analysis_tags?.includes('en:palm-oil-free')) {
		tags.push('palm-oil-free');
	}

	// Build nutrition summary
	let nutritionSummary: string | undefined;
	if (offProduct.nutriments) {
		const n = offProduct.nutriments;
		const parts: string[] = [];
		if (n['energy-kcal_100g'])
			parts.push(`${Math.round(n['energy-kcal_100g'])} cal`);
		if (n.fat_100g !== undefined) parts.push(`${n.fat_100g}g fat`);
		if (n.carbohydrates_100g !== undefined)
			parts.push(`${n.carbohydrates_100g}g carbs`);
		if (n.proteins_100g !== undefined)
			parts.push(`${n.proteins_100g}g protein`);
		if (parts.length > 0) {
			nutritionSummary = parts.join(', ') + ' per 100g';
		}
	}

	// Clean up brand name (sometimes has multiple values separated by comma)
	const brand = offProduct.brands?.split(',')[0]?.trim() || 'Unknown Brand';

	// Clean up product name
	let name = offProduct.product_name || 'Unknown Product';
	// Remove brand from name if it's duplicated
	if (name.toLowerCase().startsWith(brand.toLowerCase())) {
		name = name.substring(brand.length).trim();
		if (name.startsWith('-') || name.startsWith(':')) {
			name = name.substring(1).trim();
		}
	}
	// Fallback if name is now empty
	if (!name || name.length < 2) {
		name = offProduct.product_name || 'Product';
	}

	return {
		name,
		brand,
		description: undefined, // OFF doesn't provide descriptions
		sizeOrVariant:
			offProduct.quantity || offProduct.serving_size || 'Standard',
		categories,
		tags,
		isStrictVegan: true,
		imageUrl: offProduct.image_front_url || offProduct.image_url,
		nutritionSummary,
		ingredientSummary: offProduct.ingredients_text?.substring(0, 200),
	};
}

async function seedFromOpenFoodFacts() {
	try {
		const mongoURI = process.env.MONGODB_URI;
		if (!mongoURI) {
			throw new Error('MONGODB_URI is not defined');
		}

		await mongoose.connect(mongoURI);
		console.log('✅ Connected to MongoDB');
		console.log('');

		// Clear existing data
		console.log('🗑️  Clearing existing data...');
		await Promise.all([
			Product.deleteMany({}),
			Store.deleteMany({}),
			Availability.deleteMany({}),
		]);

		// Create demo user
		await User.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(DEMO_USER_ID) },
			{ email: 'demo@plantpantry.app', displayName: 'Demo User' },
			{ upsert: true }
		);
		console.log('👤 Created demo user');
		console.log('');

		// Create stores (we keep our own store data since OFF doesn't provide this)
		console.log('🏪 Creating stores...');
		const stores = await Store.insertMany([
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
		console.log(`  Created ${stores.length} stores`);
		console.log('');

		// Fetch and create products from Open Food Facts
		console.log('📦 Fetching vegan products from Open Food Facts...');
		console.log('  (This will take a few minutes due to API rate limits)');
		console.log('');

		const allProducts: mongoose.Document[] = [];
		const availabilityEntries: Array<{
			productId: mongoose.Types.ObjectId;
			storeId: mongoose.Types.ObjectId;
			status: string;
			priceRange: string;
			lastConfirmedAt: Date;
			source: string;
		}> = [];

		// Track processed product codes to prevent duplicates
		const processedProductCodes = new Set<string>();
		let skippedDuplicates = 0;

		for (const categoryConfig of CATEGORIES_TO_FETCH) {
			try {
				const offProducts = await fetchVeganProducts(
					categoryConfig.offCategory,
					categoryConfig.count
				);

				for (const offProduct of offProducts) {
					// Skip if we've already processed this product (by barcode)
					if (processedProductCodes.has(offProduct.code)) {
						skippedDuplicates++;
						continue;
					}

					// Mark this product code as processed
					processedProductCodes.add(offProduct.code);

					const productData = mapToOurProduct(
						offProduct,
						categoryConfig.ourCategory,
						categoryConfig.ourSubcategory
					);

					let product: mongoose.Document | null = null;

					try {
						// Check if product already exists (by name + brand + size)
						const existingProduct = await Product.findOne({
							name: productData.name,
							brand: productData.brand,
							sizeOrVariant: productData.sizeOrVariant,
						});

						if (existingProduct) {
							skippedDuplicates++;
							continue;
						}

						product = await Product.create(productData);
						allProducts.push(product);
					} catch (error: any) {
						// Skip if duplicate key error or other creation error
						if (
							error.code === 11000 ||
							error.name === 'MongoServerError'
						) {
							skippedDuplicates++;
							continue;
						}
						throw error;
					}

					// Only create availability if product was successfully created
					if (product) {
						// Randomly assign to 2-5 stores
						const numStores = Math.floor(Math.random() * 4) + 2;
						const shuffledStores = [...stores].sort(
							() => Math.random() - 0.5
						);
						const selectedStores = shuffledStores.slice(
							0,
							numStores
						);

						for (const store of selectedStores) {
							const priceRanges = [
								'$3.99-$4.99',
								'$4.99-$6.99',
								'$5.99-$7.99',
								'$6.99-$9.99',
								'$8.99-$12.99',
							];
							availabilityEntries.push({
								productId:
									product._id as mongoose.Types.ObjectId,
								storeId: store._id as mongoose.Types.ObjectId,
								status: 'known',
								priceRange:
									priceRanges[
										Math.floor(
											Math.random() * priceRanges.length
										)
									],
								lastConfirmedAt: new Date(),
								source: 'seed_data',
							});
						}
					}
				}

				console.log(
					`  ✓ ${categoryConfig.ourSubcategory}: ${offProducts.length} products`
				);

				// Wait for rate limit
				await new Promise((resolve) =>
					setTimeout(resolve, RATE_LIMIT_DELAY)
				);
			} catch (error) {
				console.error(
					`  ✗ Error fetching ${categoryConfig.ourCategory}:`,
					error
				);
			}
		}

		// Insert availability entries
		if (availabilityEntries.length > 0) {
			await Availability.insertMany(availabilityEntries);
		}

		console.log('');
		console.log('='.repeat(50));
		console.log('🌱 Seed completed successfully!');
		console.log('='.repeat(50));
		console.log(`  📦 Products: ${allProducts.length}`);
		console.log(`  🏪 Stores: ${stores.length}`);
		console.log(`  📍 Availability entries: ${availabilityEntries.length}`);
		if (skippedDuplicates > 0) {
			console.log(`  ⚠️  Skipped duplicates: ${skippedDuplicates}`);
		}
		console.log('');
		console.log(
			'Data sourced from Open Food Facts (https://world.openfoodfacts.org)'
		);
		console.log('Licensed under Open Database License (ODbL)');

		await mongoose.disconnect();
		process.exit(0);
	} catch (error) {
		console.error('❌ Seed error:', error);
		await mongoose.disconnect();
		process.exit(1);
	}
}

seedFromOpenFoodFacts();
