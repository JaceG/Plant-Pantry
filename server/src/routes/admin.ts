import { Router, Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService';
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

export default router;

