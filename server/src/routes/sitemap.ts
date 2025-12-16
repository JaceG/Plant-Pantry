import { Router, Request, Response } from 'express';
import {
	Product,
	UserProduct,
	CityLandingPage,
	BrandPage,
	StoreChain,
	Store,
} from '../models';

const router = Router();

// Use the canonical domain (non-www) since that's what the hosting is configured for
// The www version redirects to non-www, so sitemap must use non-www to avoid redirect issues
let BASE_URL =
	process.env.CANONICAL_URL ||
	process.env.CLIENT_URL ||
	'https://theveganaisle.com';

// Safety check: Never use Render URLs in sitemap - always use the canonical domain
if (BASE_URL.includes('onrender.com') || BASE_URL.includes('render.com')) {
	console.warn(
		'⚠️  CLIENT_URL contains Render URL. Using canonical domain instead.'
	);
	BASE_URL = 'https://theveganaisle.com';
}

/**
 * GET /sitemap.xml or /api/sitemap.xml
 * Generate XML sitemap for search engines
 */
router.get('/sitemap.xml', async (req: Request, res: Response) => {
	try {
		const urls: Array<{
			loc: string;
			lastmod?: string;
			changefreq?: string;
			priority?: number;
		}> = [];

		// Static pages
		urls.push({
			loc: `${BASE_URL}/`,
			changefreq: 'daily',
			priority: 1.0,
		});
		urls.push({
			loc: `${BASE_URL}/search`,
			changefreq: 'daily',
			priority: 0.9,
		});

		// City pages (only active ones)
		const cities = await CityLandingPage.find({ isActive: true })
			.select('slug updatedAt')
			.lean();
		for (const city of cities) {
			urls.push({
				loc: `${BASE_URL}/cities/${city.slug}`,
				lastmod: city.updatedAt?.toISOString().split('T')[0],
				changefreq: 'weekly',
				priority: 0.8,
			});
		}

		// Brand pages (only active ones)
		const brands = await BrandPage.find({ isActive: true })
			.select('slug updatedAt')
			.lean();
		for (const brand of brands) {
			urls.push({
				loc: `${BASE_URL}/brands/${encodeURIComponent(brand.slug)}`,
				lastmod: brand.updatedAt?.toISOString().split('T')[0],
				changefreq: 'weekly',
				priority: 0.7,
			});
		}

		// Store chains (only active ones)
		const chains = await StoreChain.find({ isActive: true })
			.select('slug updatedAt')
			.lean();
		for (const chain of chains) {
			urls.push({
				loc: `${BASE_URL}/retailers/chain/${chain.slug}`,
				lastmod: chain.updatedAt?.toISOString().split('T')[0],
				changefreq: 'weekly',
				priority: 0.6,
			});
		}

		// Featured products (higher priority)
		const featuredProducts = await Product.find({
			featured: true,
			archived: { $ne: true },
		})
			.select('_id updatedAt')
			.lean();
		for (const product of featuredProducts) {
			urls.push({
				loc: `${BASE_URL}/products/${product._id}`,
				lastmod: product.updatedAt?.toISOString().split('T')[0],
				changefreq: 'weekly',
				priority: 0.8,
			});
		}

		// Recent products (last 1000, lower priority)
		const recentProducts = await Product.find({
			archived: { $ne: true },
			featured: { $ne: true },
		})
			.sort({ updatedAt: -1 })
			.limit(1000)
			.select('_id updatedAt')
			.lean();
		for (const product of recentProducts) {
			urls.push({
				loc: `${BASE_URL}/products/${product._id}`,
				lastmod: product.updatedAt?.toISOString().split('T')[0],
				changefreq: 'monthly',
				priority: 0.5,
			});
		}

		// Generate XML
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>${
			url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''
		}${
			url.changefreq
				? `\n    <changefreq>${url.changefreq}</changefreq>`
				: ''
		}${
			url.priority !== undefined
				? `\n    <priority>${url.priority}</priority>`
				: ''
		}
  </url>`
	)
	.join('\n')}
</urlset>`;

		res.setHeader('Content-Type', 'application/xml');
		res.send(xml);
	} catch (error) {
		console.error('Error generating sitemap:', error);
		res.status(500).send('Error generating sitemap');
	}
});

/**
 * Helper function to escape XML special characters
 */
function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export default router;
