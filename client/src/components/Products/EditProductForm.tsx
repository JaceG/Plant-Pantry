import { useState, useEffect, useCallback, useMemo } from 'react';
import {
	ProductDetail,
	CreateUserProductInput,
	StoreAvailabilityInput,
} from '../../types/product';
import { userProductsApi } from '../../api/userProductsApi';
import { productsApi } from '../../api/productsApi';
import { Button } from '../Common';
import { Toast } from '../Common/Toast';
import { useToast } from '../Common/useToast';
import { AutocompleteInput } from './AutocompleteInput';
import { StoreAvailabilitySelector } from './StoreAvailabilitySelector';
import './AddProductForm.css';

// Standard dietary tags that should always be available
const STANDARD_TAGS = [
	'vegan',
	'organic',
	'gluten-free',
	'raw',
	'no-sugar-added',
	'fair-trade',
	'palm-oil-free',
	'non-gmo',
	'soy-free',
	'nut-free',
];

// Format tag for display (e.g., "gluten-free" -> "Gluten Free")
function formatTagLabel(tag: string): string {
	return tag
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

interface EditProductFormProps {
	product: ProductDetail;
	onSave: (product: ProductDetail) => void;
	onCancel: () => void;
}

export function EditProductForm({
	product,
	onSave,
	onCancel,
}: EditProductFormProps) {
	const { showToast, toast, hideToast } = useToast();
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState<
		CreateUserProductInput & { sourceProductId?: string }
	>({
		name: product.name,
		brand: product.brand,
		description: product.description || '',
		sizeOrVariant: product.sizeOrVariant,
		categories: product.categories || [],
		tags: product.tags || ['vegan'],
		isStrictVegan: product.isStrictVegan,
		imageUrl: product.imageUrl || '',
		nutritionSummary: product.nutritionSummary || '',
		ingredientSummary: product.ingredientSummary || '',
		storeAvailabilities: (product.availability || []).map((avail) => ({
			storeId: avail.storeId,
			priceRange: avail.priceRange,
			status: avail.status as 'known' | 'user_reported' | 'unknown',
		})),
		sourceProductId: product._source === 'api' ? product.id : undefined,
	});

	const [newCategoryInput, setNewCategoryInput] = useState('');
	const [availableCategories, setAvailableCategories] = useState<string[]>(
		[]
	);
	const [loadingOptions, setLoadingOptions] = useState(true);

	// Fetch available categories on mount
	useEffect(() => {
		const fetchOptions = async () => {
			try {
				const categoriesRes = await productsApi.getAllCategories();
				setAvailableCategories(categoriesRes.categories);
			} catch (error) {
				console.error('Failed to fetch categories:', error);
				showToast('Failed to load categories', 'error');
			} finally {
				setLoadingOptions(false);
			}
		};
		fetchOptions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount

	// Combine standard tags with any additional tags from the product
	// Always show all standard tags, plus any additional tags the product has
	const allTags = useMemo(() => {
		const productTags = product.tags || [];
		const combined = new Set(STANDARD_TAGS);
		// Add any product tags that aren't in the standard list
		productTags.forEach((tag) => {
			combined.add(tag);
		});
		// Sort: standard tags first (in their defined order), then others alphabetically
		const standardSet = new Set(STANDARD_TAGS);
		return [
			...STANDARD_TAGS,
			...Array.from(combined)
				.filter((tag) => !standardSet.has(tag))
				.sort(),
		];
	}, [product.tags]);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, checked } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: checked,
		}));
	};

	const addCategory = useCallback(
		(category: string) => {
			if (
				category.trim() &&
				!formData.categories?.includes(category.trim())
			) {
				setFormData((prev) => ({
					...prev,
					categories: [...(prev.categories || []), category.trim()],
				}));
				setNewCategoryInput('');
			}
		},
		[formData.categories]
	);

	const removeCategory = useCallback((category: string) => {
		setFormData((prev) => ({
			...prev,
			categories: prev.categories?.filter((c) => c !== category) || [],
		}));
	}, []);

	const toggleTag = useCallback((tag: string) => {
		setFormData((prev) => {
			const currentTags = prev.tags || [];
			const isSelected = currentTags.includes(tag);

			if (isSelected) {
				// Remove tag
				return {
					...prev,
					tags: currentTags.filter((t) => t !== tag),
				};
			} else {
				// Add tag
				return {
					...prev,
					tags: [...currentTags, tag],
				};
			}
		});
	}, []);

	const handleStoreAvailabilitiesChange = useCallback(
		(availabilities: StoreAvailabilityInput[]) => {
			setFormData((prev) => ({
				...prev,
				storeAvailabilities: availabilities,
			}));
		},
		[]
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.name.trim() || !formData.brand.trim()) {
			showToast('Name and brand are required', 'error');
			return;
		}

		setLoading(true);
		try {
			let response;

			// If this is an API product (has sourceProductId), use edit-api-product endpoint
			// Otherwise, it's a user product, so use the regular update endpoint
			if (formData.sourceProductId && product._source === 'api') {
				// Editing an API product - use the edit endpoint
				response = await userProductsApi.editApiProduct({
					sourceProductId: formData.sourceProductId,
					name: formData.name,
					brand: formData.brand,
					description: formData.description,
					sizeOrVariant: formData.sizeOrVariant,
					categories: formData.categories,
					tags: formData.tags,
					isStrictVegan: formData.isStrictVegan,
					imageUrl: formData.imageUrl,
					nutritionSummary: formData.nutritionSummary,
					ingredientSummary: formData.ingredientSummary,
					storeAvailabilities: formData.storeAvailabilities,
				});
			} else {
				// Editing a user product - use update endpoint
				// Remove sourceProductId from the update payload for user products
				const { sourceProductId, ...updateData } = formData;
				response = await userProductsApi.updateProduct(
					product.id,
					updateData
				);
			}

			showToast('Product updated successfully!', 'success');
			onSave(response.product);
		} catch (error: any) {
			showToast(error.message || 'Failed to update product', 'error');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='add-product-form-container'>
			<div className='add-product-form-header'>
				<h1>Edit Product</h1>
				<p className='form-subtitle'>
					{product._source === 'api'
						? 'Editing API-sourced product. Changes will override the original.'
						: 'Edit product details'}
				</p>
			</div>

			<form onSubmit={handleSubmit} className='add-product-form'>
				<div className='form-section'>
					<h2>Basic Information</h2>

					<div className='form-group'>
						<label htmlFor='name'>
							Product Name <span className='required'>*</span>
						</label>
						<input
							type='text'
							id='name'
							name='name'
							value={formData.name}
							onChange={handleChange}
							required
							placeholder='e.g., Almond Milk'
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='brand'>
							Brand <span className='required'>*</span>
						</label>
						<input
							type='text'
							id='brand'
							name='brand'
							value={formData.brand}
							onChange={handleChange}
							required
							placeholder='e.g., Silk'
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='sizeOrVariant'>Size or Variant</label>
						<input
							type='text'
							id='sizeOrVariant'
							name='sizeOrVariant'
							value={formData.sizeOrVariant}
							onChange={handleChange}
							placeholder='e.g., 32 fl oz, Original'
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='description'>Description</label>
						<textarea
							id='description'
							name='description'
							value={formData.description}
							onChange={handleChange}
							rows={3}
							placeholder='Brief description of the product...'
						/>
					</div>
				</div>

				<div className='form-section'>
					<h2>Image</h2>

					<div className='form-group'>
						<label htmlFor='imageUrl'>Image URL</label>
						<input
							type='url'
							id='imageUrl'
							name='imageUrl'
							value={formData.imageUrl}
							onChange={handleChange}
							placeholder='https://example.com/image.jpg'
						/>
						{formData.imageUrl && (
							<div className='image-preview'>
								<img
									src={formData.imageUrl}
									alt='Preview'
									onError={(e) => {
										(
											e.target as HTMLImageElement
										).style.display = 'none';
									}}
								/>
							</div>
						)}
					</div>
				</div>

				<div className='form-section'>
					<h2>Categories</h2>

					<div className='form-group'>
						<label htmlFor='category-input'>Add Categories</label>
						<AutocompleteInput
							value={newCategoryInput}
							onChange={setNewCategoryInput}
							onSelect={addCategory}
							options={availableCategories}
							placeholder={
								loadingOptions
									? 'Loading categories...'
									: 'Search or add category'
							}
							disabled={loadingOptions}
							allowNew={true}
							newItemLabel='Add new category'
						/>
						{formData.categories &&
							formData.categories.length > 0 && (
								<div className='tag-list'>
									{formData.categories.map((cat) => (
										<span key={cat} className='tag-item'>
											{cat}
											<button
												type='button'
												onClick={() =>
													removeCategory(cat)
												}
												className='tag-remove'>
												×
											</button>
										</span>
									))}
								</div>
							)}
					</div>
				</div>

				<div className='form-section'>
					<h2>Tags</h2>

					<div className='form-group'>
						<label>Select Tags</label>
						<div className='tag-selection-list'>
							{allTags.map((tag) => {
								const isSelected =
									formData.tags?.includes(tag) || false;
								return (
									<button
										key={tag}
										type='button'
										className={`tag-selection-button ${
											isSelected ? 'selected' : ''
										}`}
										onClick={() => toggleTag(tag)}>
										{formatTagLabel(tag)}
										{isSelected && (
											<span className='tag-check'>✓</span>
										)}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				<div className='form-section'>
					<h2>Where to Buy</h2>
					<StoreAvailabilitySelector
						value={formData.storeAvailabilities || []}
						onChange={handleStoreAvailabilitiesChange}
					/>
				</div>

				<div className='form-section'>
					<h2>Additional Information</h2>

					<div className='form-group'>
						<label htmlFor='nutritionSummary'>
							Nutrition Summary
						</label>
						<textarea
							id='nutritionSummary'
							name='nutritionSummary'
							value={formData.nutritionSummary}
							onChange={handleChange}
							rows={2}
							placeholder='e.g., 60 calories per serving, 2g protein'
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='ingredientSummary'>
							Ingredient Summary
						</label>
						<textarea
							id='ingredientSummary'
							name='ingredientSummary'
							value={formData.ingredientSummary}
							onChange={handleChange}
							rows={2}
							placeholder='e.g., Almonds, water, vitamins'
						/>
					</div>

					<div className='form-group checkbox-group'>
						<label>
							<input
								type='checkbox'
								name='isStrictVegan'
								checked={formData.isStrictVegan}
								onChange={handleCheckboxChange}
							/>
							<span>
								Strictly vegan (no animal products or
								by-products)
							</span>
						</label>
					</div>
				</div>

				<div className='form-actions'>
					<Button
						type='button'
						variant='secondary'
						onClick={onCancel}
						disabled={loading}>
						Cancel
					</Button>
					<Button type='submit' variant='primary' disabled={loading}>
						{loading ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</form>

			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={hideToast}
				/>
			)}
		</div>
	);
}
