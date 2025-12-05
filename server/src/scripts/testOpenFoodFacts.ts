/**
 * Test script to explore the Open Food Facts API for vegan products
 *
 * API Documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
 *
 * Key endpoints:
 * - Search: GET /api/v2/search
 * - Product: GET /api/v2/product/{barcode}
 *
 * Vegan filtering:
 * - ingredients_analysis_tags=en:vegan
 * - labels_tags=en:vegan
 *
 * Rate limits: 10 req/min for search queries
 */

const BASE_URL = 'https://world.openfoodfacts.org';
const USER_AGENT = 'TheVeganAisle/1.0 (veganaisle@example.com)';

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
		[key: string]: number | undefined;
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

async function searchVeganProducts(
	options: {
		page?: number;
		pageSize?: number;
		category?: string;
		searchTerms?: string;
	} = {}
): Promise<SearchResponse> {
	const { page = 1, pageSize = 24, category, searchTerms } = options;

	const params = new URLSearchParams({
		// Filter for vegan products
		ingredients_analysis_tags: 'en:vegan',
		// Filter for USA products
		countries_tags: 'en:united-states',
		// Filter for English language
		lc: 'en',
		// Only get products with images and names
		fields: 'code,product_name,brands,categories,categories_tags,labels_tags,ingredients_analysis_tags,ingredients_text,nutriments,image_front_url,image_url,quantity,serving_size',
		page: page.toString(),
		page_size: pageSize.toString(),
		// Sort by popularity (number of scans)
		sort_by: 'popularity_key',
	});

	// Add category filter if specified
	if (category) {
		params.set('categories_tags', category);
	}

	// Add search terms if specified
	if (searchTerms) {
		params.set('search_terms', searchTerms);
	}

	const url = `${BASE_URL}/api/v2/search?${params.toString()}`;

	console.log('Fetching:', url);

	const response = await fetch(url, {
		headers: {
			'User-Agent': USER_AGENT,
		},
	});

	if (!response.ok) {
		throw new Error(
			`API request failed: ${response.status} ${response.statusText}`
		);
	}

	return response.json() as Promise<SearchResponse>;
}

// Test different vegan product categories
async function exploreVeganProducts() {
	console.log('='.repeat(60));
	console.log('🌱 Exploring Open Food Facts API for Vegan Products');
	console.log('='.repeat(60));
	console.log('');

	// Test 1: General vegan products search
	console.log('📦 Test 1: General vegan products');
	console.log('-'.repeat(40));

	try {
		const result = await searchVeganProducts({ pageSize: 5 });
		console.log(
			`Total vegan products found: ${result.count.toLocaleString()}`
		);
		console.log(`Page: ${result.page} of ${result.page_count}`);
		console.log('');

		console.log('Sample products:');
		result.products.slice(0, 5).forEach((p, i) => {
			console.log(`  ${i + 1}. ${p.product_name || 'No name'}`);
			console.log(`     Brand: ${p.brands || 'Unknown'}`);
			console.log(
				`     Categories: ${
					p.categories_tags?.slice(0, 3).join(', ') || 'None'
				}`
			);
			console.log(`     Has image: ${!!p.image_front_url}`);
			console.log('');
		});
	} catch (error) {
		console.error('Error:', error);
	}

	// Wait to respect rate limits
	await new Promise((resolve) => setTimeout(resolve, 7000));

	// Test 2: Search in specific category (plant-based milks)
	console.log('');
	console.log('🥛 Test 2: Plant-based milks');
	console.log('-'.repeat(40));

	try {
		const result = await searchVeganProducts({
			pageSize: 5,
			category: 'en:plant-milks',
		});
		console.log(
			`Total vegan plant milks found: ${result.count.toLocaleString()}`
		);
		console.log('');

		console.log('Sample products:');
		result.products.slice(0, 5).forEach((p, i) => {
			console.log(`  ${i + 1}. ${p.product_name || 'No name'}`);
			console.log(`     Brand: ${p.brands || 'Unknown'}`);
			console.log(`     Quantity: ${p.quantity || 'Unknown'}`);
			console.log(`     Has image: ${!!p.image_front_url}`);
			console.log('');
		});
	} catch (error) {
		console.error('Error:', error);
	}

	// Wait to respect rate limits
	await new Promise((resolve) => setTimeout(resolve, 7000));

	// Test 3: Search for specific term
	console.log('');
	console.log('🧀 Test 3: Vegan cheese');
	console.log('-'.repeat(40));

	try {
		const result = await searchVeganProducts({
			pageSize: 5,
			searchTerms: 'vegan cheese',
		});
		console.log(
			`Total vegan cheese products found: ${result.count.toLocaleString()}`
		);
		console.log('');

		console.log('Sample products:');
		result.products.slice(0, 5).forEach((p, i) => {
			console.log(`  ${i + 1}. ${p.product_name || 'No name'}`);
			console.log(`     Brand: ${p.brands || 'Unknown'}`);
			console.log(
				`     Ingredients analysis: ${
					p.ingredients_analysis_tags?.join(', ') || 'None'
				}`
			);
			console.log('');
		});
	} catch (error) {
		console.error('Error:', error);
	}

	console.log('');
	console.log('='.repeat(60));
	console.log('✅ API exploration complete!');
	console.log('='.repeat(60));
}

// Run the exploration
exploreVeganProducts().catch(console.error);
