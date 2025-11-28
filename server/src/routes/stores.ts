import { Router, Request, Response, NextFunction } from 'express';
import { storeService } from '../services';
import { googlePlacesService } from '../services/googlePlacesService';
import { HttpError } from '../middleware/errorHandler';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/stores - List all stores
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    
    if (q && typeof q === 'string') {
      const result = await storeService.searchStores(q);
      res.json(result);
    } else {
      const result = await storeService.getStores();
      res.json(result);
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/stores/:id - Get store by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const store = await storeService.getStoreById(id);
    
    if (!store) {
      throw new HttpError('Store not found', 404);
    }
    
    res.json({ store });
  } catch (error) {
    next(error);
  }
});

// POST /api/stores - Create a new store (requires auth)
router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      type,
      regionOrScope,
      websiteUrl,
      address,
      city,
      state,
      zipCode,
      country,
      latitude,
      longitude,
      googlePlaceId,
      phoneNumber,
    } = req.body;

    if (!name || !type) {
      throw new HttpError('Name and type are required', 400);
    }

    const store = await storeService.createStore({
      name,
      type,
      regionOrScope: regionOrScope || 'Unknown',
      websiteUrl,
      address,
      city,
      state,
      zipCode,
      country: country || 'US',
      latitude,
      longitude,
      googlePlaceId,
      phoneNumber,
    });

    res.status(201).json({ store });
  } catch (error) {
    next(error);
  }
});

// GET /api/stores/places/autocomplete - Search Google Places
router.get('/places/autocomplete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { input, types, lat, lng, radius } = req.query;

    if (!input || typeof input !== 'string') {
      throw new HttpError('Input query is required', 400);
    }

    if (input.trim().length < 2) {
      throw new HttpError('Input query must be at least 2 characters', 400);
    }

    const location = lat && lng
      ? { lat: parseFloat(lat as string), lng: parseFloat(lng as string) }
      : undefined;

    const predictions = await googlePlacesService.autocompletePlaces(
      input,
      types ? (types as string).split(',') : undefined,
      location,
      radius ? parseInt(radius as string, 10) : undefined
    );

    res.json({ predictions });
  } catch (error) {
    console.error('Error in /places/autocomplete:', error);
    next(error);
  }
});

// GET /api/stores/places/details/:placeId - Get Google Place details
router.get('/places/details/:placeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { placeId } = req.params;

    if (!placeId || placeId.trim().length === 0) {
      throw new HttpError('Place ID is required', 400);
    }

    const placeDetails = await googlePlacesService.getPlaceDetails(placeId);

    if (!placeDetails) {
      throw new HttpError('Place not found or API error', 404);
    }

    // Parse address components
    const addressComponents = googlePlacesService.parseAddressComponents(
      placeDetails.address_components
    );

    res.json({
      place: {
        placeId: placeDetails.place_id,
        name: placeDetails.name,
        formattedAddress: placeDetails.formatted_address,
        website: placeDetails.website,
        phoneNumber: placeDetails.formatted_phone_number,
        latitude: placeDetails.geometry?.location.lat,
        longitude: placeDetails.geometry?.location.lng,
        ...addressComponents,
      },
    });
  } catch (error) {
    console.error('Error in /places/details:', error);
    next(error);
  }
});

export default router;

