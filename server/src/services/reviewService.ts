import mongoose from 'mongoose';
import { Review, Product, UserProduct, User } from '../models';

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

export interface CreateReviewInput {
	rating: number;
	title?: string;
	comment: string;
	photoUrls?: string[];
}

export interface UpdateReviewInput {
	rating?: number;
	title?: string;
	comment?: string;
	photoUrls?: string[];
}

export interface ReviewFilters {
	page?: number;
	pageSize?: number;
	sortBy?: 'newest' | 'oldest' | 'helpful' | 'rating';
}

export interface ReviewDetail {
	id: string;
	productId: string;
	userId: string;
	userName: string;
	rating: number;
	title?: string;
	comment: string;
	photoUrls: string[];
	status: 'pending' | 'approved' | 'rejected';
	helpfulCount: number;
	isHelpful: boolean; // Whether current user voted helpful
	reviewedAt: Date;
	approvedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
	productName?: string; // Populated for admin pending reviews
	productBrand?: string; // Populated for admin pending reviews
}

export interface ReviewListResult {
	items: ReviewDetail[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface ReviewStats {
	averageRating: number;
	totalCount: number;
	distribution: {
		5: number;
		4: number;
		3: number;
		2: number;
		1: number;
	};
}

export const reviewService = {
	async createReview(
		userId: string,
		productId: string,
		input: CreateReviewInput
	): Promise<ReviewDetail> {
		// Check if product exists (either in Product or UserProduct)
		const [product, userProduct] = await Promise.all([
			Product.findById(productId),
			UserProduct.findById(productId),
		]);

		if (!product && !userProduct) {
			throw new Error('Product not found');
		}

		// Check if user already has a review for this product
		const existingReview = await Review.findOne({
			userId: new mongoose.Types.ObjectId(userId),
			productId: new mongoose.Types.ObjectId(productId),
		});

		if (existingReview) {
			throw new Error('You have already reviewed this product');
		}

		// Validate rating
		if (input.rating < 1 || input.rating > 5) {
			throw new Error('Rating must be between 1 and 5');
		}

		// Validate photo URLs count
		if (input.photoUrls && input.photoUrls.length > 5) {
			throw new Error('Maximum 5 photos allowed per review');
		}

		// Check user trust level for moderation decisions
		const { isTrusted, needsReview } = await getUserTrustLevel(userId);

		const review = await Review.create({
			productId: new mongoose.Types.ObjectId(productId),
			userId: new mongoose.Types.ObjectId(userId),
			rating: input.rating,
			title: input.title?.trim(),
			comment: input.comment.trim(),
			photoUrls: input.photoUrls || [],
			status: isTrusted ? 'approved' : 'pending', // Trusted users' reviews go live immediately
			trustedContribution: isTrusted,
			needsReview: needsReview, // Admin reviews don't need review; moderator/trusted reviews do
			reviewedAt: new Date(),
			...(isTrusted && { approvedAt: new Date() }), // Set approvedAt for auto-approved reviews
		});

		return this.formatReview(review, userId);
	},

	async getReviews(
		productId: string,
		filters: ReviewFilters = {},
		currentUserId?: string
	): Promise<ReviewListResult> {
		const { page = 1, pageSize = 20, sortBy = 'newest' } = filters;
		const skip = (page - 1) * pageSize;

		// Build sort query
		let sort: Record<string, 1 | -1> = {};
		switch (sortBy) {
			case 'newest':
				sort = { reviewedAt: -1 };
				break;
			case 'oldest':
				sort = { reviewedAt: 1 };
				break;
			case 'helpful':
				sort = { helpfulCount: -1, reviewedAt: -1 };
				break;
			case 'rating':
				sort = { rating: -1, reviewedAt: -1 };
				break;
		}

		const [reviews, totalCount] = await Promise.all([
			Review.find({
				productId: new mongoose.Types.ObjectId(productId),
				status: 'approved',
			})
				.sort(sort)
				.skip(skip)
				.limit(pageSize)
				.populate('userId', 'displayName')
				.lean(),
			Review.countDocuments({
				productId: new mongoose.Types.ObjectId(productId),
				status: 'approved',
			}),
		]);

		const items = reviews.map((review) =>
			this.formatReview(review, currentUserId)
		);

		return {
			items,
			page,
			pageSize,
			totalCount,
		};
	},

	async getUserReview(
		userId: string,
		productId: string
	): Promise<ReviewDetail | null> {
		const review = await Review.findOne({
			userId: new mongoose.Types.ObjectId(userId),
			productId: new mongoose.Types.ObjectId(productId),
		})
			.populate('userId', 'displayName')
			.lean();

		if (!review) {
			return null;
		}

		return this.formatReview(review, userId);
	},

	async updateReview(
		userId: string,
		reviewId: string,
		updates: UpdateReviewInput
	): Promise<ReviewDetail> {
		const review = await Review.findOne({
			_id: new mongoose.Types.ObjectId(reviewId),
			userId: new mongoose.Types.ObjectId(userId),
		});

		if (!review) {
			throw new Error('Review not found');
		}

		// If review was approved, reset to pending when edited
		if (review.status === 'approved') {
			review.status = 'pending';
			review.approvedAt = undefined;
			review.approvedBy = undefined;
		}

		// Update fields
		if (updates.rating !== undefined) {
			if (updates.rating < 1 || updates.rating > 5) {
				throw new Error('Rating must be between 1 and 5');
			}
			review.rating = updates.rating;
		}

		if (updates.title !== undefined) {
			review.title = updates.title.trim() || undefined;
		}

		if (updates.comment !== undefined) {
			review.comment = updates.comment.trim();
		}

		if (updates.photoUrls !== undefined) {
			if (updates.photoUrls.length > 5) {
				throw new Error('Maximum 5 photos allowed per review');
			}
			review.photoUrls = updates.photoUrls;
		}

		await review.save();

		return this.formatReview(review, userId);
	},

	async deleteReview(userId: string, reviewId: string): Promise<boolean> {
		const result = await Review.deleteOne({
			_id: new mongoose.Types.ObjectId(reviewId),
			userId: new mongoose.Types.ObjectId(userId),
		});

		return result.deletedCount > 0;
	},

	async voteHelpful(userId: string, reviewId: string): Promise<ReviewDetail> {
		const review = await Review.findById(reviewId);

		if (!review) {
			throw new Error('Review not found');
		}

		if (review.status !== 'approved') {
			throw new Error('Can only vote on approved reviews');
		}

		const userIdObj = new mongoose.Types.ObjectId(userId);
		const hasVoted = review.helpfulVotes.some(
			(id) => id.toString() === userId
		);

		if (hasVoted) {
			// Remove vote
			review.helpfulVotes = review.helpfulVotes.filter(
				(id) => id.toString() !== userId
			);
			review.helpfulCount = Math.max(0, review.helpfulCount - 1);
		} else {
			// Add vote
			review.helpfulVotes.push(userIdObj);
			review.helpfulCount = review.helpfulCount + 1;
		}

		await review.save();

		return this.formatReview(review, userId);
	},

	async getProductRatingStats(productId: string): Promise<ReviewStats> {
		const reviews = await Review.find({
			productId: new mongoose.Types.ObjectId(productId),
			status: 'approved',
		}).lean();

		if (reviews.length === 0) {
			return {
				averageRating: 0,
				totalCount: 0,
				distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
			};
		}

		const totalRating = reviews.reduce(
			(sum, review) => sum + review.rating,
			0
		);
		const averageRating = totalRating / reviews.length;

		const distribution = {
			5: reviews.filter((r) => r.rating === 5).length,
			4: reviews.filter((r) => r.rating === 4).length,
			3: reviews.filter((r) => r.rating === 3).length,
			2: reviews.filter((r) => r.rating === 2).length,
			1: reviews.filter((r) => r.rating === 1).length,
		};

		return {
			averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
			totalCount: reviews.length,
			distribution,
		};
	},

	async approveReview(
		reviewId: string,
		adminId: string
	): Promise<ReviewDetail> {
		const review = await Review.findById(reviewId);

		if (!review) {
			throw new Error('Review not found');
		}

		review.status = 'approved';
		review.approvedAt = new Date();
		review.approvedBy = new mongoose.Types.ObjectId(adminId);

		await review.save();

		return this.formatReview(review);
	},

	async rejectReview(
		reviewId: string,
		adminId: string
	): Promise<ReviewDetail> {
		const review = await Review.findById(reviewId);

		if (!review) {
			throw new Error('Review not found');
		}

		review.status = 'rejected';
		// Don't set approvedAt for rejected reviews

		await review.save();

		return this.formatReview(review);
	},

	async getPendingReviews(
		page: number = 1,
		pageSize: number = 20
	): Promise<ReviewListResult> {
		const skip = (page - 1) * pageSize;

		const [reviews, totalCount] = await Promise.all([
			Review.find({ status: 'pending' })
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(pageSize)
				.populate('userId', 'displayName')
				.populate('productId', 'name brand')
				.lean(),
			Review.countDocuments({ status: 'pending' }),
		]);

		const items = reviews.map((review) => this.formatReview(review));

		return {
			items,
			page,
			pageSize,
			totalCount,
		};
	},

	// Helper to format review for API response
	formatReview(review: any, currentUserId?: string): ReviewDetail {
		const userIdStr =
			review.userId?._id?.toString() || review.userId?.toString();
		const productIdStr =
			review.productId?._id?.toString() || review.productId?.toString();
		const isHelpful =
			currentUserId &&
			review.helpfulVotes?.some(
				(id: any) => id.toString() === currentUserId
			);

		const result: any = {
			id: review._id.toString(),
			productId: productIdStr,
			userId: userIdStr,
			userName: (review.userId as any)?.displayName || 'Unknown User',
			rating: review.rating,
			title: review.title,
			comment: review.comment,
			photoUrls: review.photoUrls || [],
			status: review.status,
			helpfulCount: review.helpfulCount || 0,
			isHelpful: !!isHelpful,
			reviewedAt: review.reviewedAt || review.createdAt,
			approvedAt: review.approvedAt,
			createdAt: review.createdAt,
			updatedAt: review.updatedAt,
		};

		// Include product name/brand if populated (for admin pending reviews)
		if (review.productId && typeof review.productId === 'object') {
			result.productName = (review.productId as any).name;
			result.productBrand = (review.productId as any).brand;
		}

		return result;
	},
};
