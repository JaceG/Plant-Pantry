export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  photoUrls: string[];
  status: "pending" | "approved" | "rejected";
  helpfulCount: number;
  isHelpful: boolean;
  reviewedAt: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
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

export interface ReviewListResponse {
  items: Review[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ReviewStatsResponse {
  stats: ReviewStats;
}

export interface ReviewResponse {
  review: Review;
}

export interface PendingReview extends Review {
  productName?: string;
  productBrand?: string;
}
