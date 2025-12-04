# Product Reviews Feature Implementation Plan

## Overview

Add a complete product review system allowing authenticated users to rate products (1-5 stars), write reviews with optional photos, vote on helpful reviews, and filter products by rating. Reviews require admin moderation before appearing publicly.

## Database Schema

### New Model: `Review` (`server/src/models/Review.ts`)

- ✅ `_id`: ObjectId
- ✅ `productId`: ObjectId (ref: Product) - indexed
- ✅ `userId`: ObjectId (ref: User) - indexed
- ✅ `rating`: Number (1-5, required)
- ✅ `title`: String (optional)
- ✅ `comment`: String (required, max length)
- ✅ `photoUrls`: String[] (array of image URLs)
- ✅ `status`: String enum ('pending', 'approved', 'rejected') - default 'pending'
- ✅ `helpfulCount`: Number (default 0)
- ✅ `helpfulVotes`: ObjectId[] (users who voted helpful)
- ✅ `reviewedAt`: Date
- ✅ `approvedAt`: Date (when admin approved)
- ✅ `approvedBy`: ObjectId (ref: User)
- ✅ `createdAt`, `updatedAt`: timestamps
- ✅ Indexes: `{ productId: 1, status: 1 }`, `{ userId: 1, productId: 1 }` (unique), `{ rating: 1 }`

### Update: `Product` Model

- ✅ Add virtual field `averageRating` (calculated from approved reviews)
- ✅ Add virtual field `reviewCount` (count of approved reviews)

## Backend Implementation

### 1. Review Service (`server/src/services/reviewService.ts`)

- ✅ `createReview(userId, productId, input)`: Create new review (status: 'pending')
- ✅ `getReviews(productId, filters)`: Get approved reviews for a product (paginated)
- ✅ `getUserReview(userId, productId)`: Get user's review for a product (if exists)
- ✅ `updateReview(userId, reviewId, updates)`: Update own review (resets to 'pending' if approved)
- ✅ `deleteReview(userId, reviewId)`: Delete own review
- ✅ `voteHelpful(userId, reviewId)`: Toggle helpful vote
- ✅ `getProductRatingStats(productId)`: Get aggregate stats (avg rating, count, distribution)
- ✅ `approveReview(reviewId, adminId)`: Admin approve review
- ✅ `rejectReview(reviewId, adminId)`: Admin reject review
- ✅ `getPendingReviews(page, pageSize)`: Get reviews awaiting moderation

### 2. Review Routes (`server/src/routes/reviews.ts`)

- ✅ `POST /api/reviews` - Create review (auth required)
- ✅ `GET /api/reviews/product/:productId` - Get reviews for product
- ✅ `GET /api/reviews/product/:productId/user` - Get current user's review (auth required)
- ✅ `PUT /api/reviews/:id` - Update own review (auth required)
- ✅ `DELETE /api/reviews/:id` - Delete own review (auth required)
- ✅ `POST /api/reviews/:id/helpful` - Vote helpful (auth required)
- ✅ `GET /api/reviews/product/:productId/stats` - Get rating statistics

### 3. Admin Review Routes (`server/src/routes/admin.ts`)

- ✅ `GET /api/admin/reviews/pending` - Get pending reviews (paginated)
- ✅ `POST /api/admin/reviews/:id/approve` - Approve review
- ✅ `POST /api/admin/reviews/:id/reject` - Reject review

### 4. Update Product Service (`server/src/services/productService.ts`)

- ✅ Modify `getProducts()` to support `minRating` filter
- ✅ Add rating aggregation to product queries
- ✅ Include `averageRating` and `reviewCount` in product summaries

## Frontend Implementation

### 5. Review Types (`client/src/types/review.ts`)

- ✅ `Review` interface
- ✅ `ReviewStats` interface (averageRating, totalCount, distribution)
- ✅ `CreateReviewInput` interface
- ✅ `UpdateReviewInput` interface

### 6. Review API Client (`client/src/api/reviewsApi.ts`)

- ✅ `createReview(productId, input)`
- ✅ `getReviews(productId, page, pageSize)`
- ✅ `getUserReview(productId)`
- ✅ `updateReview(reviewId, updates)`
- ✅ `deleteReview(reviewId)`
- ✅ `voteHelpful(reviewId)`
- ✅ `getReviewStats(productId)`
- ✅ Admin methods: `getPendingReviews()`, `approveReview()`, `rejectReview()`

### 7. Review Components

#### ✅ `client/src/components/Reviews/ReviewCard.tsx`

- ✅ Display individual review with:
- ✅ Star rating display
- ✅ User name/avatar
- ✅ Review title and comment
- ✅ Photo gallery (if photos)
- ✅ Helpful button and count
- ✅ Edit/Delete buttons (if own review)
- ✅ Timestamp

#### ✅ `client/src/components/Reviews/ReviewForm.tsx`

- ✅ Form for creating/editing reviews:
- ✅ Star rating selector (1-5)
- ✅ Title input (optional)
- ✅ Comment textarea (required)
- ✅ Photo URL inputs (add/remove multiple)
- ✅ Image previews
- ✅ Submit button

#### ✅ `client/src/components/Reviews/ReviewList.tsx`

- ✅ Container for displaying list of reviews
- ✅ Pagination support
- ✅ Empty state
- ✅ Loading state

#### ✅ `client/src/components/Reviews/ReviewStats.tsx`

- ✅ Display aggregate rating statistics:
- ✅ Average rating with stars
- ✅ Total review count
- ✅ Rating distribution (5 stars: X, 4 stars: Y, etc.)

#### ✅ `client/src/components/Reviews/RatingFilter.tsx`

- ✅ Filter component for minimum rating
- ✅ Used in FilterSidebar

### 8. Update Product Detail Screen (`client/src/screens/ProductDetailScreen.tsx`)

- ✅ Add reviews section below product details
- ✅ Show review stats at top
- ✅ Display review list
- ✅ Show "Write a Review" button (if authenticated and no existing review)
- ✅ Show "Edit Review" button (if user has existing review)
- ✅ Handle review creation/editing modals

### 9. Update Product Card (`client/src/components/Products/ProductCard.tsx`)

- ✅ Add star rating display (if reviewCount > 0)
- ✅ Show format: "⭐⭐⭐⭐☆ (12 reviews)" or similar
- ✅ Link to product detail page

### 10. Update Filter Sidebar (`client/src/components/Products/FilterSidebar.tsx`)

- ✅ Add "Minimum Rating" filter section
- ✅ Options: 4+ stars, 3+ stars, 2+ stars, 1+ stars
- ✅ Update URL params when selected

### 11. Update HomeScreen (`client/src/screens/HomeScreen.tsx`)

- ✅ Add `minRating` to filter state
- ✅ Pass to `useProducts` hook
- ✅ Update URL params

### 12. Update useProducts Hook (`client/src/hooks/useProducts.ts`)

- ✅ Add `minRating` to `ProductFilters` interface
- ✅ Pass to API calls

### 13. Admin Panel - Review Moderation (`client/src/screens/admin/AdminReviews.tsx`)

- ✅ New admin screen for moderating reviews
- ✅ List pending reviews with:
- ✅ Product name/link
- ✅ User name
- ✅ Rating and comment preview
- ✅ Photo previews
- ✅ Approve/Reject buttons
- ✅ Pagination

### 14. Update Admin Layout (`client/src/screens/admin/AdminLayout.tsx`)

- ✅ Add "Reviews" navigation item

## Key Implementation Details

### Review Moderation Flow

1. ✅ User submits review → status: 'pending'
2. ✅ Review stored but not visible publicly
3. ✅ Admin sees in pending reviews list
4. ✅ Admin approves → status: 'approved', visible publicly
5. ✅ Admin rejects → status: 'rejected', hidden

### Rating Aggregation

- ✅ Calculate average rating from approved reviews only
- ✅ Update product's `averageRating` and `reviewCount` on review approval/rejection
- ✅ Efficient aggregation queries for performance

### Helpful Votes

- ✅ Store array of user IDs who voted helpful
- ✅ Prevent duplicate votes (check if userId in array)
- ✅ Update `helpfulCount` when vote added/removed

### Edit/Delete Reviews

- ✅ Users can only edit/delete their own reviews
- ✅ Editing an approved review resets status to 'pending' (requires re-approval)
- ✅ Deletion is permanent

### Photo Handling

- ✅ Store as array of URLs (like current product images)
- ✅ Validate URLs on submission
- ✅ Display in gallery format on review cards
- ✅ Support multiple photos per review (max 5)

## Files Created

- ✅ `server/src/models/Review.ts`
- ✅ `server/src/services/reviewService.ts`
- ✅ `server/src/routes/reviews.ts`
- ✅ `client/src/types/review.ts`
- ✅ `client/src/api/reviewsApi.ts`
- ✅ `client/src/components/Reviews/ReviewCard.tsx`
- ✅ `client/src/components/Reviews/ReviewCard.css`
- ✅ `client/src/components/Reviews/ReviewForm.tsx`
- ✅ `client/src/components/Reviews/ReviewForm.css`
- ✅ `client/src/components/Reviews/ReviewList.tsx`
- ✅ `client/src/components/Reviews/ReviewList.css`
- ✅ `client/src/components/Reviews/ReviewStats.tsx`
- ✅ `client/src/components/Reviews/ReviewStats.css`
- ✅ `client/src/components/Reviews/RatingFilter.tsx`
- ✅ `client/src/components/Reviews/RatingFilter.css`
- ✅ `client/src/components/Reviews/index.ts`
- ✅ `client/src/screens/admin/AdminReviews.tsx`
- ✅ `client/src/screens/admin/AdminReviews.css`

## Files Modified

- ✅ `server/src/models/index.ts` - Export Review model
- ✅ `server/src/services/productService.ts` - Add rating filter, include rating stats
- ✅ `server/src/routes/admin.ts` - Add review moderation routes
- ✅ `server/src/routes/index.ts` - Add reviews routes
- ✅ `client/src/types/product.ts` - Add rating fields to ProductSummary/ProductDetail
- ✅ `client/src/api/productsApi.ts` - Update ProductFilters interface
- ✅ `client/src/components/Products/ProductCard.tsx` - Add rating display
- ✅ `client/src/components/Products/FilterSidebar.tsx` - Add rating filter
- ✅ `client/src/screens/HomeScreen.tsx` - Handle rating filter
- ✅ `client/src/hooks/useProducts.ts` - Support rating filter
- ✅ `client/src/screens/ProductDetailScreen.tsx` - Add reviews section
- ✅ `client/src/screens/admin/AdminLayout.tsx` - Add Reviews nav item
- ✅ `client/src/api/adminApi.ts` - Add review moderation methods

## Status: ✅ COMPLETE

All features from the Product Reviews Feature Implementation Plan have been successfully implemented and are working correctly.

