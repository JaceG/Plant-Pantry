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

// Helper to get user trust level for moderation decisions
// - Admin: trusted, no review needed
// - Moderator/Trusted contributor: trusted, needs review by admin later
// - Regular user: not trusted, stays pending until approved
async function getUserTrustLevel(
	userId: string
): Promise<{ isTrusted: boolean; needsReview: boolean }> {
	const user = await User.findById(userId)
		.select('trustedContributor role')
		.lean();
	if (!user) return { isTrusted: false, needsReview: true };

	if (user.role === 'admin') {
		return { isTrusted: true, needsReview: false };
	}
	if (user.role === 'moderator') {
		return { isTrusted: true, needsReview: true };
	}
	if (user.trustedContributor) {
		return { isTrusted: true, needsReview: true };
	}
	return { isTrusted: false, needsReview: true };
}

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
 * If brand has a parent, includes parent brand info for redirect/banner
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
						isOfficial: false,
						parentBrand: null,
						childBrands: [],
						exists: false, // Indicates this is auto-generated
					},
				});
			}

			// If this brand has a parent, fetch parent info
			let parentBrand = null;
			if (brandPage.parentBrandId) {
				const parent = await BrandPage.findById(brandPage.parentBrandId)
					.select('brandName slug displayName')
					.lean();
				if (parent) {
					parentBrand = {
						id: parent._id.toString(),
						brandName: parent.brandName,
						slug: parent.slug,
						displayName: parent.displayName,
					};
				}
			}

			// If this is an official brand, fetch child brands
			let childBrands: Array<{
				id: string;
				brandName: string;
				slug: string;
				displayName: string;
			}> = [];
			if (brandPage.isOfficial) {
				const children = await BrandPage.find({
					parentBrandId: brandPage._id,
					isActive: true,
				})
					.select('brandName slug displayName')
					.lean();
				childBrands = children.map((child) => ({
					id: child._id.toString(),
					brandName: child.brandName,
					slug: child.slug,
					displayName: child.displayName,
				}));
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
					isOfficial: brandPage.isOfficial || false,
					parentBrand,
					childBrands,
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

			// Check user trust level for moderation decisions
			const { isTrusted, needsReview } = await getUserTrustLevel(userId);

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

			// For trusted users (admin/mod/trusted contributor), auto-apply the edit
			if (isTrusted) {
				// Apply the edit directly
				const updateData: Record<string, any> = {};
				updateData[field] = trimmedValue;
				updateData.updatedBy = new mongoose.Types.ObjectId(userId);
				await BrandPage.findByIdAndUpdate(brandPage._id, updateData);

				// Create the edit record (already approved; admins don't need review, others do)
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
					autoApplied: needsReview, // Admin edits don't need review (autoApplied=false)
				});

				return res.status(201).json({
					message: 'Edit applied successfully',
					edit: {
						id: contentEdit._id.toString(),
						field: contentEdit.field,
						status: contentEdit.status,
					},
					autoApplied: needsReview,
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
