import { httpClient } from "./httpClient";
import {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListResponse,
  ReviewStatsResponse,
  ReviewResponse,
} from "../types/review";

export const reviewsApi = {
  createReview(
    productId: string,
    input: CreateReviewInput,
  ): Promise<ReviewResponse> {
    return httpClient.post<ReviewResponse>("/reviews", {
      productId,
      ...input,
    });
  },

  getReviews(
    productId: string,
    page: number = 1,
    pageSize: number = 20,
    sortBy: "newest" | "oldest" | "helpful" | "rating" = "newest",
  ): Promise<ReviewListResponse> {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());
    if (sortBy) params.set("sortBy", sortBy);

    return httpClient.get<ReviewListResponse>(
      `/reviews/product/${productId}?${params.toString()}`,
    );
  },

  getUserReview(productId: string): Promise<ReviewResponse> {
    return httpClient.get<ReviewResponse>(`/reviews/product/${productId}/user`);
  },

  updateReview(
    reviewId: string,
    updates: UpdateReviewInput,
  ): Promise<ReviewResponse> {
    return httpClient.put<ReviewResponse>(`/reviews/${reviewId}`, updates);
  },

  deleteReview(reviewId: string): Promise<{ success: boolean }> {
    return httpClient.delete<{ success: boolean }>(`/reviews/${reviewId}`);
  },

  voteHelpful(reviewId: string): Promise<ReviewResponse> {
    return httpClient.post<ReviewResponse>(`/reviews/${reviewId}/helpful`, {});
  },

  getReviewStats(productId: string): Promise<ReviewStatsResponse> {
    return httpClient.get<ReviewStatsResponse>(
      `/reviews/product/${productId}/stats`,
    );
  },

  // Admin methods
  getPendingReviews(
    page: number = 1,
    pageSize: number = 20,
  ): Promise<ReviewListResponse> {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());

    return httpClient.get<ReviewListResponse>(
      `/admin/reviews/pending?${params.toString()}`,
    );
  },

  approveReview(reviewId: string): Promise<ReviewResponse> {
    return httpClient.post<ReviewResponse>(
      `/admin/reviews/${reviewId}/approve`,
      {},
    );
  },

  rejectReview(reviewId: string): Promise<ReviewResponse> {
    return httpClient.post<ReviewResponse>(
      `/admin/reviews/${reviewId}/reject`,
      {},
    );
  },
};
