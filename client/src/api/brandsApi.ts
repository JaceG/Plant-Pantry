import { httpClient } from './httpClient';

// Brand page types
export interface BrandPageData {
	id?: string;
	brandName: string;
	slug: string;
	displayName: string;
	description?: string | null;
	logoUrl?: string | null;
	websiteUrl?: string | null;
	isActive: boolean;
	exists: boolean; // false if auto-generated (page doesn't exist in DB yet)
}

// Edit types
export type BrandEditField = 'displayName' | 'description' | 'websiteUrl';

export interface BrandEditSubmission {
	field: BrandEditField;
	suggestedValue: string;
	reason?: string;
}

export interface BrandEditResponse {
	message: string;
	edit: {
		id: string;
		field: string;
		status: string;
	};
	autoApplied: boolean;
}

export const brandsApi = {
	/**
	 * Get brand page data (creates placeholder if doesn't exist)
	 */
	getBrandPage(brandName: string): Promise<{ brandPage: BrandPageData }> {
		return httpClient.get<{ brandPage: BrandPageData }>(
			`/brands/${encodeURIComponent(brandName)}/page`
		);
	},

	/**
	 * Submit a suggested edit for a brand page
	 */
	suggestEdit(
		brandName: string,
		data: BrandEditSubmission
	): Promise<BrandEditResponse> {
		return httpClient.post<BrandEditResponse>(
			`/brands/${encodeURIComponent(brandName)}/suggest-edit`,
			data
		);
	},
};
