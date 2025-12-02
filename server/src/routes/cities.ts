import { Router, Request, Response, NextFunction } from 'express';
import { cityService } from '../services/cityService';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

// GET /api/cities - Get all active city landing pages
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const cities = await cityService.getActiveCityPages();
		res.json({ cities });
	} catch (error) {
		console.error('Error in GET /api/cities:', error);
		next(error);
	}
});

// GET /api/cities/:slug - Get city landing page data
router.get(
	'/:slug',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const city = await cityService.getCityPage(slug);

			if (!city) {
				throw new HttpError('City page not found', 404);
			}

			res.json({ city });
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/cities/:slug/stores - Get stores in a city
router.get(
	'/:slug/stores',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;

			// Verify city exists
			const city = await cityService.getCityPage(slug);
			if (!city) {
				throw new HttpError('City page not found', 404);
			}

			const stores = await cityService.getCityStores(slug);
			res.json({ stores });
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/cities/:slug/products - Get products available at city stores
router.get(
	'/:slug/products',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { slug } = req.params;
			const { page, limit } = req.query;

			// Verify city exists
			const city = await cityService.getCityPage(slug);
			if (!city) {
				throw new HttpError('City page not found', 404);
			}

			const result = await cityService.getCityProducts(
				slug,
				limit ? parseInt(limit as string, 10) : 20,
				page ? parseInt(page as string, 10) : 1
			);

			res.json(result);
		} catch (error) {
			next(error);
		}
	}
);

export default router;
