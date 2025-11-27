/**
 * Filter Open Food Facts CSV/TSV to USA vegan food products only
 * 
 * Note: Open Food Facts exports are tab-separated (TSV) even with .csv extension
 * 
 * Usage:
 *   npm run filter:tsv <input.csv> <output.csv>
 * 
 * Or with default paths:
 *   npm run filter:tsv
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

const INPUT_FILE = process.argv[2] || path.join(__dirname, '../../data/products.csv');
const OUTPUT_FILE = process.argv[3] || path.join(__dirname, '../../data/products-usa-vegan.csv');

// Required fields we need
const REQUIRED_FIELDS = [
	'code',
	'product_name',
	'brands',
	'categories_tags',
	'labels_tags',
	'ingredients_analysis_tags',
	'ingredients_text',
	'nutriments',
	'image_front_url',
	'image_url',
	'quantity',
	'serving_size',
	'countries_tags',
	'lc',
];

// Non-food categories to exclude
const NON_FOOD_KEYWORDS = [
	'supplement',
	'cosmetic',
	'beauty',
	'personal-care',
	'hygiene',
	'cleaning',
	'pet-food',
	'pet-food-and-treats',
];

// Helper to parse CSV field (might be JSON array string or plain string)
function parseField(field: string | undefined): string {
	if (!field) return '';
	// Try to parse as JSON array first
	try {
		const parsed = JSON.parse(field);
		if (Array.isArray(parsed)) {
			return parsed.join(',');
		}
		return String(parsed);
	} catch {
		// Not JSON, return as-is
		return field;
	}
}

function isVegan(product: Record<string, string>): boolean {
	const analysisTags = parseField(product.ingredients_analysis_tags);
	if (!analysisTags) return false;
	
	// Check for exact tag match (comma-separated or as standalone)
	// Match "en:vegan" but not "en:vegan-status-unknown"
	const tags = analysisTags.split(',').map(t => t.trim());
	return tags.includes('en:vegan');
}

function isUSA(product: Record<string, string>): boolean {
	const countries = parseField(product.countries_tags);
	if (!countries) return false;
	
	// Check for exact country match
	const countryList = countries.split(',').map(c => c.trim());
	return countryList.includes('en:united-states');
}

function isEnglish(product: Record<string, string>): boolean {
	// Language code might not be in CSV export, so make this optional
	// We'll filter by USA products which are mostly English anyway
	const lc = product.lc || product.languages || '';
	if (!lc) return true; // If no language field, assume OK
	
	// Check if it's a language code (not a timestamp)
	if (lc.match(/^\d+$/)) return true; // Timestamp, skip language check
	
	return lc === 'en' || lc.startsWith('en:');
}

function isFood(product: Record<string, string>): boolean {
	const categories = parseField(product.categories_tags);
	const categoriesLower = categories.toLowerCase();
	
	// Exclude if any category contains non-food keywords
	return !NON_FOOD_KEYWORDS.some((keyword) =>
		categoriesLower.includes(keyword)
	);
}

function hasGoodDataQuality(product: Record<string, string>): boolean {
	// Require product name and brand, but make image optional
	// This will include more products (images can be added later or are optional)
	return !!(
		product.product_name &&
		product.product_name.length > 2 &&
		product.brands &&
		product.brands.length > 0
		// Image is optional - removed requirement for image_front_url or image_url
	);
}

async function filterCSV() {
	console.log('='.repeat(60));
	console.log('🌱 Filtering Open Food Facts CSV/TSV');
	console.log('='.repeat(60));
	console.log(`Input:  ${INPUT_FILE}`);
	console.log(`Output: ${OUTPUT_FILE}`);
	console.log('');

	if (!fs.existsSync(INPUT_FILE)) {
		console.error(`❌ Input file not found: ${INPUT_FILE}`);
		console.error('Usage: npm run filter:tsv <input.csv> [output.csv]');
		process.exit(1);
	}

	// Create output directory if it doesn't exist
	const outputDir = path.dirname(OUTPUT_FILE);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	let totalRows = 0;
	let passedRows = 0;
	let skippedVegan = 0;
	let skippedUSA = 0;
	let skippedEnglish = 0;
	let skippedNonFood = 0;
	let skippedQuality = 0;
	let parseErrors = 0;

	const readStream = fs.createReadStream(INPUT_FILE);
	const writeStream = fs.createWriteStream(OUTPUT_FILE);

	const parser = parse({
		columns: true,
		skip_empty_lines: true,
		relax_column_count: true,
		delimiter: '\t', // Open Food Facts CSV is tab-separated
		quote: '"',
		escape: '"',
		relax_quotes: true, // Handle malformed quotes gracefully
		skip_records_with_error: true, // Skip problematic rows instead of failing
	});

	const stringifier = stringify({
		header: true,
		columns: REQUIRED_FIELDS,
		delimiter: ',', // Output as CSV (comma-separated)
		quoted: true, // Quote fields that contain special characters
	});

	// Pipe TSV parsing
	readStream.pipe(parser);

	// Process each row
	parser.on('data', (row: Record<string, string>) => {
		totalRows++;

		// Progress indicator every 10k rows
		if (totalRows % 10000 === 0) {
			process.stdout.write(
				`\r📊 Processed: ${totalRows.toLocaleString()} rows | Passed: ${passedRows.toLocaleString()}`
			);
		}

		// Apply filters
		if (!isVegan(row)) {
			skippedVegan++;
			return;
		}

		if (!isUSA(row)) {
			skippedUSA++;
			return;
		}

		if (!isEnglish(row)) {
			skippedEnglish++;
			return;
		}

		if (!isFood(row)) {
			skippedNonFood++;
			return;
		}

		if (!hasGoodDataQuality(row)) {
			skippedQuality++;
			return;
		}

		// Row passed all filters
		passedRows++;
		stringifier.write(row);
	});

	parser.on('error', (error) => {
		parseErrors++;
		// Log first few errors, then just count them
		if (parseErrors <= 5) {
			console.error(`\n⚠️  Parse error (row ${totalRows}):`, error.message);
		}
		// Don't exit on parse errors - continue processing
	});

	parser.on('end', () => {
		stringifier.end();
		console.log('\n');
		console.log('='.repeat(60));
		console.log('✅ Filtering complete!');
		console.log('='.repeat(60));
		console.log(`Total rows processed: ${totalRows.toLocaleString()}`);
		console.log(`Rows passed filters: ${passedRows.toLocaleString()}`);
		console.log('');
		console.log('Skipped:');
		console.log(`  - Not vegan: ${skippedVegan.toLocaleString()}`);
		console.log(`  - Not USA: ${skippedUSA.toLocaleString()}`);
		console.log(`  - Not English: ${skippedEnglish.toLocaleString()}`);
		console.log(`  - Non-food: ${skippedNonFood.toLocaleString()}`);
		console.log(`  - Poor quality: ${skippedQuality.toLocaleString()}`);
		if (parseErrors > 0) {
			console.log(`  - Parse errors: ${parseErrors.toLocaleString()}`);
		}
		console.log('');
		console.log(`Output saved to: ${OUTPUT_FILE}`);
		console.log('');
	});

	// Pipe to output
	stringifier.pipe(writeStream);

	writeStream.on('finish', () => {
		console.log('✅ File written successfully');
		process.exit(0);
	});

	writeStream.on('error', (error) => {
		console.error('\n❌ Write error:', error);
		process.exit(1);
	});
}

filterCSV().catch((error) => {
	console.error('❌ Error:', error);
	process.exit(1);
});

