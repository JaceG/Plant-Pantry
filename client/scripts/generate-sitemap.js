/**
 * Generate sitemap.xml during build by fetching from backend API
 * This script runs during the build process to create a static sitemap.xml file
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get backend URL from environment variable or use default
const BACKEND_URL =
	process.env.VITE_API_BASE_URL?.replace('/api', '') ||
	process.env.BACKEND_URL ||
	process.env.RENDER_EXTERNAL_URL ||
	'https://plant-pantry-be0g.onrender.com';

const SITEMAP_URL = `${BACKEND_URL}/sitemap.xml`;
const OUTPUT_PATH = join(__dirname, '../public/sitemap.xml');

async function generateSitemap() {
	try {
		console.log(`🌱 Fetching sitemap from ${SITEMAP_URL}...`);

		const response = await fetch(SITEMAP_URL);

		if (!response.ok) {
			throw new Error(
				`Failed to fetch sitemap: ${response.status} ${response.statusText}`
			);
		}

		const xml = await response.text();

		// Write to public directory so it gets included in the build
		writeFileSync(OUTPUT_PATH, xml, 'utf-8');

		console.log(`✅ Sitemap generated successfully at ${OUTPUT_PATH}`);
		console.log(`   Sitemap size: ${(xml.length / 1024).toFixed(2)} KB`);
	} catch (error) {
		console.error('❌ Error generating sitemap:', error.message);
		console.error(
			'   Make sure your backend server is running and accessible at:',
			BACKEND_URL
		);
		console.error(
			'   You can set BACKEND_URL environment variable to point to your backend.'
		);
		// Don't fail the build if sitemap generation fails
		// Just create an empty/minimal sitemap
		const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://theveganaisle.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
		writeFileSync(OUTPUT_PATH, fallbackSitemap, 'utf-8');
		console.log('   Created fallback sitemap with homepage only.');
	}
}

generateSitemap();
