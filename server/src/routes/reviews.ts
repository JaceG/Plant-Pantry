import { Router, Request, Response, NextFunction } from "express";
import { reviewService } from "../services";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

// POST /api/reviews - Create review (auth required)
router.post(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { productId, rating, title, comment, photoUrls } = req.body;

      if (!productId) {
        throw new HttpError("Product ID is required", 400);
      }

      if (!rating || rating < 1 || rating > 5) {
        throw new HttpError("Rating must be between 1 and 5", 400);
      }

      if (!comment || !comment.trim()) {
        throw new HttpError("Comment is required", 400);
      }

      const review = await reviewService.createReview(userId, productId, {
        rating,
        title,
        comment,
        photoUrls,
      });

      res.status(201).json({ review });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/reviews/product/:productId - Get reviews for product
router.get(
  "/product/:productId",
  optionalAuthMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const { page, pageSize, sortBy } = req.query;
      const currentUserId = req.userId;

      const filters = {
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
        sortBy: sortBy as
          | "newest"
          | "oldest"
          | "helpful"
          | "rating"
          | undefined,
      };

      const result = await reviewService.getReviews(
        productId,
        filters,
        currentUserId,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/reviews/product/:productId/user - Get current user's review (auth required)
router.get(
  "/product/:productId/user",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { productId } = req.params;

      const review = await reviewService.getUserReview(userId, productId);

      if (!review) {
        return res.json({ review: null });
      }

      res.json({ review });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/reviews/product/:productId/stats - Get rating statistics
router.get(
  "/product/:productId/stats",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const stats = await reviewService.getProductRatingStats(productId);
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/reviews/:id - Update own review (auth required)
router.put(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { rating, title, comment, photoUrls } = req.body;

      const updates: any = {};
      if (rating !== undefined) updates.rating = rating;
      if (title !== undefined) updates.title = title;
      if (comment !== undefined) updates.comment = comment;
      if (photoUrls !== undefined) updates.photoUrls = photoUrls;

      const review = await reviewService.updateReview(userId, id, updates);
      res.json({ review });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/reviews/:id - Delete own review (auth required)
router.delete(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const success = await reviewService.deleteReview(userId, id);

      if (!success) {
        throw new HttpError("Review not found", 404);
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/reviews/:id/helpful - Vote helpful (auth required)
router.post(
  "/:id/helpful",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const review = await reviewService.voteHelpful(userId, id);
      res.json({ review });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
