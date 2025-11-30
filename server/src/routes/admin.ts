import { Router, Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService';
import { reviewService } from '../services/reviewService';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/products/pending
 * Get pending products for moderation
 */
router.get('/products/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const result = await adminService.getPendingProducts(page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/products/:id/approve
 * Approve a pending product
 */
router.post('/products/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const success = await adminService.approveProduct(id);
    
    if (!success) {
      throw new HttpError('Product not found', 404);
    }
    
    res.json({ message: 'Product approved successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/products/:id/reject
 * Reject a pending product
 */
router.post('/products/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const success = await adminService.rejectProduct(id, reason);
    
    if (!success) {
      throw new HttpError('Product not found', 404);
    }
    
    res.json({ message: 'Product rejected' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const result = await adminService.getUsers(page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user role
 */
router.put('/users/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin', 'moderator'].includes(role)) {
      throw new HttpError('Invalid role', 400);
    }
    
    const success = await adminService.updateUserRole(id, role);
    
    if (!success) {
      throw new HttpError('User not found', 404);
    }
    
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stores
 * Get all stores
 */
router.get('/stores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const type = req.query.type as string | undefined;
    
    const result = await adminService.getStores(page, pageSize, type);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/stores/:id
 * Delete a store
 */
router.delete('/stores/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const success = await adminService.deleteStore(id);
    
    if (!success) {
      throw new HttpError('Store not found', 404);
    }
    
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/products/archived
 * Get archived products only
 */
router.get('/products/archived', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const result = await adminService.getArchivedProducts(page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/products/user-generated
 * Get user-generated products only
 */
router.get('/products/user-generated', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const result = await adminService.getUserGeneratedProducts(page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/products/:id/archive
 * Archive a product
 */
router.post('/products/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      throw new HttpError('User not authenticated', 401);
    }
    
    const success = await adminService.archiveProduct(id, userId);
    
    if (!success) {
      throw new HttpError('Product not found', 404);
    }
    
    res.json({ message: 'Product archived successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/products/:id/unarchive
 * Unarchive a product
 */
router.post('/products/:id/unarchive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const success = await adminService.unarchiveProduct(id);
    
    if (!success) {
      throw new HttpError('Product not found', 404);
    }
    
    res.json({ message: 'Product unarchived successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/filters
 * Get all filters (categories or tags) for admin management
 */
router.get('/filters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as 'category' | 'tag';
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    
    if (!type || !['category', 'tag'].includes(type)) {
      throw new HttpError('Invalid filter type. Must be "category" or "tag"', 400);
    }
    
    const result = await adminService.getAllFilters(type, page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/filters/archive
 * Archive a filter
 */
router.post('/filters/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, value } = req.body;
    const userId = req.userId;
    
    if (!userId) {
      throw new HttpError('User not authenticated', 401);
    }
    
    if (!type || !['category', 'tag'].includes(type)) {
      throw new HttpError('Invalid filter type. Must be "category" or "tag"', 400);
    }
    
    if (!value || typeof value !== 'string') {
      throw new HttpError('Filter value is required', 400);
    }
    
    const success = await adminService.archiveFilter(type, value, userId);
    
    if (!success) {
      throw new HttpError('Failed to archive filter', 500);
    }
    
    res.json({ message: 'Filter archived successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/filters/unarchive
 * Unarchive a filter
 */
router.post('/filters/unarchive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, value } = req.body;
    
    if (!type || !['category', 'tag'].includes(type)) {
      throw new HttpError('Invalid filter type. Must be "category" or "tag"', 400);
    }
    
    if (!value || typeof value !== 'string') {
      throw new HttpError('Filter value is required', 400);
    }
    
    const success = await adminService.unarchiveFilter(type, value);
    
    if (!success) {
      throw new HttpError('Filter not found or already unarchived', 404);
    }
    
    res.json({ message: 'Filter unarchived successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/filters/display-name
 * Set or update a filter display name
 */
router.put('/filters/display-name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, value, displayName } = req.body;
    const userId = req.userId;
    
    if (!userId) {
      throw new HttpError('User not authenticated', 401);
    }
    
    if (!type || !['category', 'tag'].includes(type)) {
      throw new HttpError('Invalid filter type. Must be "category" or "tag"', 400);
    }
    
    if (!value || typeof value !== 'string') {
      throw new HttpError('Filter value is required', 400);
    }
    
    if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
      throw new HttpError('Display name is required', 400);
    }
    
    const success = await adminService.setFilterDisplayName(type, value, displayName, userId);
    
    if (!success) {
      throw new HttpError('Failed to set display name', 500);
    }
    
    res.json({ message: 'Display name updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/filters/display-name
 * Remove a filter display name (revert to default)
 */
router.delete('/filters/display-name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, value } = req.body;
    
    if (!type || !['category', 'tag'].includes(type)) {
      throw new HttpError('Invalid filter type. Must be "category" or "tag"', 400);
    }
    
    if (!value || typeof value !== 'string') {
      throw new HttpError('Filter value is required', 400);
    }
    
    const success = await adminService.removeFilterDisplayName(type, value);
    
    if (!success) {
      throw new HttpError('Display name not found', 404);
    }
    
    res.json({ message: 'Display name removed successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/reviews/pending
 * Get pending reviews for moderation
 */
router.get('/reviews/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const result = await reviewService.getPendingReviews(page, pageSize);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/reviews/:id/approve
 * Approve a review
 */
router.post('/reviews/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adminId = req.userId!;
    
    const review = await reviewService.approveReview(id, adminId);
    res.json({ message: 'Review approved successfully', review });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/reviews/:id/reject
 * Reject a review
 */
router.post('/reviews/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adminId = req.userId!;
    
    const review = await reviewService.rejectReview(id, adminId);
    res.json({ message: 'Review rejected', review });
  } catch (error) {
    next(error);
  }
});

export default router;

