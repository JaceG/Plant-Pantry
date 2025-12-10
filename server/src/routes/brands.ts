import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { HttpError } from '../middleware/errorHandler';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import {
	Product,
	UserProduct,
	BrandPage,
	BrandContentEdit,
	User,
} from '../models';

const router = Router();

/**
 * Helper to generate a URL-friendly slug from a brand name
 */
function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * GET /api/brands/:brandName/page
 * Get brand page data (creates one if it doesn't exist)
 */
router.get(
	'/:brandName/page',
	optionalAuthMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { brandName } = req.params;
			const decodedBrandName = decodeURIComponent(brandName);
			const slug = generateSlug(decodedBrandName);

			// Try to find existing brand page
			let brandPage = await BrandPage.findOne({
				$or: [
					{ slug },
					{
						brandName: {
							$regex: new RegExp(
								`^${decodedBrandName.replace(
									/[.*+?^${}()|[\]\\]/g,
									'\\$&'
								)}$`,
								'i'
							),
						},
					},
				],
			}).lean();

			// If no brand page exists, check if the brand has products
			if (!brandPage) {
				// Verify this brand exists by checking products
				const productCount = await Product.countDocuments({
					brand: {
						$regex: new RegExp(
							`^${decodedBrandName.replace(
								/[.*+?^${}()|[\]\\]/g,
								'\\$&'
							)}$`,
							'i'
						),
					},
					archived: { $ne: true },
				});

				const userProductCount = await UserProduct.countDocuments({
					brand: {
						$regex: new RegExp(
							`^${decodedBrandName.replace(
								/[.*+?^${}()|[\]\\]/g,
								'\\$&'
							)}$`,
							'i'
						),
					},
					status: 'approved',
					archived: { $ne: true },
				});

				if (productCount === 0 && userProductCount === 0) {
					throw new HttpError('Brand not found', 404);
				}

				// Return minimal brand page data (page doesn't exist yet)
				return res.json({
					brandPage: {
						brandName: decodedBrandName,
						slug,
						displayName: decodedBrandName,
						description: null,
						logoUrl: null,
						websiteUrl: null,
						isActive: true,
						exists: false, // Indicates this is auto-generated
					},
				});
			}

			res.json({
				brandPage: {
					id: brandPage._id.toString(),
					brandName: brandPage.brandName,
					slug: brandPage.slug,
					displayName: brandPage.displayName,
					description: brandPage.description,
					logoUrl: brandPage.logoUrl,
					websiteUrl: brandPage.websiteUrl,
					isActive: brandPage.isActive,
					exists: true,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

/**
 * POST /api/brands/:brandName/suggest-edit
 * Submit a suggested edit for a brand page
 */
router.post(
	'/:brandName/suggest-edit',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { brandName } = req.params;
			const { field, suggestedValue, reason } = req.body;
			const userId = req.userId;

			if (!userId) {
				throw new HttpError('User not authenticated', 401);
			}

			const decodedBrandName = decodeURIComponent(brandName);
			const slug = generateSlug(decodedBrandName);

			// Validate field
			const validFields = ['displayName', 'description', 'websiteUrl'];
			if (!field || !validFields.includes(field)) {
				throw new HttpError(
					'Invalid field. Must be displayName, description, or websiteUrl',
					400
				);
			}

			if (suggestedValue === undefined || suggestedValue === null) {
				throw new HttpError('suggestedValue is required', 400);
			}

			// Try to find or create brand page
			let brandPage = await BrandPage.findOne({
				$or: [
					{ slug },
					{
						brandName: {
							$regex: new RegExp(
								`^${decodedBrandName.replace(
									/[.*+?^${}()|[\]\\]/g,
									'\\$&'
								)}$`,
								'i'
							),
						},
					},
				],
			});

			// Check if user is a trusted contributor
			const user = await User.findById(userId).lean();
			const isTrusted = user?.trustedContributor || false;

			const trimmedValue =
				typeof suggestedValue === 'string'
					? suggestedValue.trim()
					: suggestedValue;

			// If brand page doesn't exist, create it
			if (!brandPage) {
				// Verify this brand exists by checking products
				const productCount = await Product.countDocuments({
					brand: {
						$regex: new RegExp(
							`^${decodedBrandName.replace(
								/[.*+?^${}()|[\]\\]/g,
								'\\$&'
							)}$`,
							'i'
						),
					},
					archived: { $ne: true },
				});

				if (productCount === 0) {
					throw new HttpError('Brand not found', 404);
				}

				// Create the brand page
				brandPage = await BrandPage.create({
					brandName: decodedBrandName,
					slug,
					displayName: decodedBrandName,
					createdBy: new mongoose.Types.ObjectId(userId),
				});
			}

			// Get the original value
			const originalValue =
				(brandPage[field as keyof typeof brandPage] as string) || '';

			// Don't create edit if values are the same
			if (originalValue === trimmedValue) {
				throw new HttpError(
					'Suggested value is the same as the current value',
					400
				);
			}

			// For trusted users, auto-apply the edit but flag for review
			if (isTrusted) {
				// Apply the edit directly
				const updateData: Record<string, any> = {};
				updateData[field] = trimmedValue;
				updateData.updatedBy = new mongoose.Types.ObjectId(userId);
				await BrandPage.findByIdAndUpdate(brandPage._id, updateData);

				// Create the edit record (already approved but flagged for review)
				const contentEdit = await BrandContentEdit.create({
					brandPageId: brandPage._id,
					brandName: brandPage.brandName,
					brandSlug: brandPage.slug,
					field,
					originalValue,
					suggestedValue: trimmedValue,
					reason: reason?.trim(),
					userId: new mongoose.Types.ObjectId(userId),
					status: 'approved',
					trustedContribution: true,
					autoApplied: true,
				});

				return res.status(201).json({
					message: 'Edit applied successfully',
					edit: {
						id: contentEdit._id.toString(),
						field: contentEdit.field,
						status: contentEdit.status,
					},
					autoApplied: true,
				});
			}

			// For regular users, create pending edit
			const contentEdit = await BrandContentEdit.create({
				brandPageId: brandPage._id,
				brandName: brandPage.brandName,
				brandSlug: brandPage.slug,
				field,
				originalValue,
				suggestedValue: trimmedValue,
				reason: reason?.trim(),
				userId: new mongoose.Types.ObjectId(userId),
				status: 'pending',
				trustedContribution: false,
				autoApplied: false,
			});

			res.status(201).json({
				message: 'Edit suggestion submitted for review',
				edit: {
					id: contentEdit._id.toString(),
					field: contentEdit.field,
					status: contentEdit.status,
				},
				autoApplied: false,
			});
		} catch (error) {
			next(error);
		}
	}
);

export default router;
