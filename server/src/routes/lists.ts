import { Router, Request, Response, NextFunction } from 'express';
import { listService } from '../services';
import { HttpError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all list routes
router.use(authMiddleware);

// POST /api/lists - Create a new shopping list
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { name } = req.body;

		if (!name || typeof name !== 'string') {
			throw new HttpError('Name is required', 400);
		}

		const list = await listService.createList(req.userId!, { name });
		res.status(201).json({ list });
	} catch (error) {
		next(error);
	}
});

// GET /api/lists - Get all shopping lists for current user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const lists = await listService.getLists(req.userId!);
		res.json({ items: lists });
	} catch (error) {
		next(error);
	}
});

// GET /api/lists/default - Get or create default list
router.get(
	'/default',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const list = await listService.getOrCreateDefaultList(req.userId!);
			res.json({ list });
		} catch (error) {
			next(error);
		}
	}
);

// GET /api/lists/:id - Get a specific shopping list with items
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const list = await listService.getListById(req.userId!, id);

		if (!list) {
			throw new HttpError('Shopping list not found', 404);
		}

		res.json(list);
	} catch (error) {
		next(error);
	}
});

// POST /api/lists/:id/items - Add item to shopping list
router.post(
	'/:id/items',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { productId, quantity, note } = req.body;

			if (!productId) {
				throw new HttpError('Product ID is required', 400);
			}

			console.log('Adding item to list:', {
				listId: id,
				productId,
				userId: req.userId,
			});

			const item = await listService.addItemToList(req.userId!, id, {
				productId,
				quantity,
				note,
			});

			if (!item) {
				console.error(
					'Failed to add item - addItemToList returned null'
				);
				throw new HttpError(
					'Could not add item. List or product not found.',
					404
				);
			}

			console.log('Item added successfully:', item.itemId);
			res.status(201).json({ item });
		} catch (error) {
			next(error);
		}
	}
);

// DELETE /api/lists/:listId/items/:itemId - Remove item from shopping list
router.delete(
	'/:listId/items/:itemId',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { listId, itemId } = req.params;
			const success = await listService.removeItemFromList(
				req.userId!,
				listId,
				itemId
			);

			if (!success) {
				throw new HttpError(
					'Item not found or could not be removed',
					404
				);
			}

			res.json({ success: true });
		} catch (error) {
			next(error);
		}
	}
);

export default router;
