import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userProductsApi } from '../../api/userProductsApi';
import { CreateUserProductInput } from '../../types/product';
import { Button } from '../Common';
import { Toast } from '../Common/Toast';
import { useToast } from '../Common/useToast';
import './AddProductForm.css';

export function AddProductForm() {
  const navigate = useNavigate();
  const { showToast, toast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserProductInput>({
    name: '',
    brand: '',
    description: '',
    sizeOrVariant: '',
    categories: [],
    tags: ['vegan'],
    isStrictVegan: true,
    imageUrl: '',
    nutritionSummary: '',
    ingredientSummary: '',
  });

  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const addCategory = () => {
    if (newCategory.trim() && !formData.categories?.includes(newCategory.trim())) {
      setFormData((prev) => ({
        ...prev,
        categories: [...(prev.categories || []), newCategory.trim()],
      }));
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories?.filter((c) => c !== category) || [],
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.brand.trim()) {
      showToast('Name and brand are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await userProductsApi.createProduct({
        ...formData,
        sizeOrVariant: formData.sizeOrVariant || 'Standard',
      });
      
      showToast('Product added successfully!', 'success');
      navigate(`/products/${response.product.id}`);
    } catch (error: any) {
      showToast(error.message || 'Failed to add product', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-product-form-container">
      <div className="add-product-form-header">
        <h1>Add a Product</h1>
        <p className="form-subtitle">
          Contribute a vegan product to help others discover it
        </p>
      </div>

      <form onSubmit={handleSubmit} className="add-product-form">
        <div className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-group">
            <label htmlFor="name">
              Product Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Almond Milk"
            />
          </div>

          <div className="form-group">
            <label htmlFor="brand">
              Brand <span className="required">*</span>
            </label>
            <input
              type="text"
              id="brand"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              required
              placeholder="e.g., Silk"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sizeOrVariant">Size or Variant</label>
            <input
              type="text"
              id="sizeOrVariant"
              name="sizeOrVariant"
              value={formData.sizeOrVariant}
              onChange={handleChange}
              placeholder="e.g., 32 fl oz, Original"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of the product..."
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Image</h2>
          
          <div className="form-group">
            <label htmlFor="imageUrl">Image URL</label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
            {formData.imageUrl && (
              <div className="image-preview">
                <img src={formData.imageUrl} alt="Preview" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }} />
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Categories</h2>
          
          <div className="form-group">
            <div className="tag-input-group">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                placeholder="Add category (e.g., en:plant-based-milks)"
              />
              <Button type="button" onClick={addCategory} variant="secondary" size="small">
                Add
              </Button>
            </div>
            {formData.categories && formData.categories.length > 0 && (
              <div className="tag-list">
                {formData.categories.map((cat) => (
                  <span key={cat} className="tag-item">
                    {cat}
                    <button
                      type="button"
                      onClick={() => removeCategory(cat)}
                      className="tag-remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Tags</h2>
          
          <div className="form-group">
            <div className="tag-input-group">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag (e.g., organic, gluten-free)"
              />
              <Button type="button" onClick={addTag} variant="secondary" size="small">
                Add
              </Button>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="tag-list">
                {formData.tags.map((tag) => (
                  <span key={tag} className="tag-item">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="tag-remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Additional Information</h2>
          
          <div className="form-group">
            <label htmlFor="nutritionSummary">Nutrition Summary</label>
            <textarea
              id="nutritionSummary"
              name="nutritionSummary"
              value={formData.nutritionSummary}
              onChange={handleChange}
              rows={2}
              placeholder="e.g., 60 calories per serving, 2g protein"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ingredientSummary">Ingredient Summary</label>
            <textarea
              id="ingredientSummary"
              name="ingredientSummary"
              value={formData.ingredientSummary}
              onChange={handleChange}
              rows={2}
              placeholder="e.g., Almonds, water, vitamins"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isStrictVegan"
                checked={formData.isStrictVegan}
                onChange={handleCheckboxChange}
              />
              <span>Strictly vegan (no animal products or by-products)</span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Product'}
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

