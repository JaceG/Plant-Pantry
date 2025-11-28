import { Router, Request, Response, NextFunction } from 'express';
import { userProductService } from '../services';
import { HttpError } from '../middleware/errorHandler';
import { demoUserMiddleware } from '../middleware/demoUser';

const router = Router();

// All routes require authentication (using demo user for MVP)
router.use(demoUserMiddleware);

// POST /api/user-products - Create a new user product
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new HttpError('User not authenticated', 401);
    }

    const {
      name,
      brand,
      description,
      sizeOrVariant,
      categories,
      tags,
      isStrictVegan,
      imageUrl,
      nutritionSummary,
      ingredientSummary,
      storeAvailabilities,
    } = req.body;

    // Validation
    if (!name || !brand) {
      throw new HttpError('Name and brand are required', 400);
    }

    const product = await userProductService.createProduct({
      userId,
      name,
      brand,
      description,
      sizeOrVariant,
      categories: categories || [],
      tags: tags || ['vegan'],
      isStrictVegan: isStrictVegan !== false,
      imageUrl,
      nutritionSummary,
      ingredientSummary,
      storeAvailabilities: storeAvailabilities || [],
    });

    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});

// GET /api/user-products - Get all products by current user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new HttpError('User not authenticated', 401);
    }

    const products = await userProductService.getProductsByUser(userId);
    res.json({ items: products, totalCount: products.length });
  } catch (error) {
    next(error);
  }
});

// GET /api/user-products/:id - Get user product by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await userProductService.getProductById(id);

    if (!product) {
      throw new HttpError('Product not found', 404);
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

// PUT /api/user-products/:id - Update a user product
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new HttpError('User not authenticated', 401);
    }

    const { id } = req.params;
    const {
      name,
      brand,
      description,
      sizeOrVariant,
      categories,
      tags,
      isStrictVegan,
      imageUrl,
      nutritionSummary,
      ingredientSummary,
    } = req.body;

    const product = await userProductService.updateProduct(id, userId, {
      name,
      brand,
      description,
      sizeOrVariant,
      categories,
      tags,
      isStrictVegan,
      imageUrl,
      nutritionSummary,
      ingredientSummary,
    });

    if (!product) {
      throw new HttpError('Product not found or you do not have permission', 404);
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/user-products/:id - Delete a user product
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new HttpError('User not authenticated', 401);
    }

    const { id } = req.params;
    const deleted = await userProductService.deleteProduct(id, userId);

    if (!deleted) {
      throw new HttpError('Product not found or you do not have permission', 404);
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

