import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { userProductsApi } from "../../api/userProductsApi";
import { productsApi } from "../../api/productsApi";
import { CreateUserProductInput, ProductSummary } from "../../types/product";
import { Button } from "../Common";
import { Toast } from "../Common/Toast";
import { useToast } from "../Common/useToast";
import { AutocompleteInput } from "./AutocompleteInput";
import { StoreAvailabilitySelector } from "./StoreAvailabilitySelector";
import { productEvents } from "../../utils/productEvents";
import "./AddProductForm.css";

// Fallback tags if API fails to load
const FALLBACK_TAGS = [
  "vegan",
  "organic",
  "gluten-free",
  "raw",
  "no-sugar-added",
  "fair-trade",
  "palm-oil-free",
  "non-gmo",
  "soy-free",
  "nut-free",
];

// Format tag for display (e.g., "gluten-free" -> "Gluten Free")
function formatTagLabel(tag: string): string {
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Normalize tag for comparison (lowercase, spaces to dashes)
function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, "-");
}

// Template data interface for navigation state
interface TemplateData {
  name?: string;
  brand?: string;
  description?: string;
  sizeOrVariant?: string;
  categories?: string[];
  tags?: string[];
  isStrictVegan?: boolean;
  imageUrl?: string;
  nutritionSummary?: string;
  ingredientSummary?: string;
}

interface LocationState {
  template?: TemplateData;
}

// Default empty form data
const getDefaultFormData = (): CreateUserProductInput => ({
  name: "",
  brand: "",
  description: "",
  sizeOrVariant: "",
  categories: [],
  tags: ["vegan"],
  isStrictVegan: true,
  imageUrl: "",
  nutritionSummary: "",
  ingredientSummary: "",
  storeAvailabilities: [],
  chainAvailabilities: [],
});

// Apply template to form data
const applyTemplate = (template: TemplateData): CreateUserProductInput => ({
  name: template.name || "",
  brand: template.brand || "",
  description: template.description || "",
  sizeOrVariant: template.sizeOrVariant || "",
  categories: template.categories || [],
  tags: template.tags || ["vegan"],
  isStrictVegan: template.isStrictVegan ?? true,
  imageUrl: template.imageUrl || "",
  nutritionSummary: template.nutritionSummary || "",
  ingredientSummary: template.ingredientSummary || "",
  storeAvailabilities: [],
  chainAvailabilities: [],
});

export function AddProductForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, toast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);

  // Check for template from navigation state
  const locationState = location.state as LocationState | null;
  const initialTemplate = locationState?.template;

  const [formData, setFormData] = useState<CreateUserProductInput>(() =>
    initialTemplate ? applyTemplate(initialTemplate) : getDefaultFormData(),
  );

  // Template search state
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [templateSearchResults, setTemplateSearchResults] = useState<
    ProductSummary[]
  >([]);
  const [isSearchingTemplates, setIsSearchingTemplates] = useState(false);
  const [showTemplateSearch, setShowTemplateSearch] =
    useState(!initialTemplate);
  const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(
    initialTemplate ? `${initialTemplate.brand} ${initialTemplate.name}` : null,
  );

  const [newCategory, setNewCategory] = useState("");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>(FALLBACK_TAGS);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Fetch available categories and tags on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          productsApi.getAllCategories(),
          productsApi.getAllTags(),
        ]);
        setAvailableCategories(categoriesRes.categories);
        if (tagsRes.tags && tagsRes.tags.length > 0) {
          // Normalize tags to use dashes (for consistency)
          setAvailableTags(tagsRes.tags.map(normalizeTag));
        }
      } catch (error) {
        console.error("Failed to fetch options:", error);
        showToast("Failed to load options", "error");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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

  const handleCategorySelect = (category: string) => {
    if (!formData.categories?.includes(category)) {
      setFormData((prev) => ({
        ...prev,
        categories: [...(prev.categories || []), category],
      }));
    }
  };

  const removeCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories?.filter((c) => c !== category) || [],
    }));
  };

  const toggleTag = (tag: string) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.brand.trim()) {
      showToast("Name and brand are required", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await userProductsApi.createProduct({
        ...formData,
        sizeOrVariant: formData.sizeOrVariant || "Standard",
      });

      showToast("Product added successfully!", "success");
      // Emit event so other pages can refresh their product data
      productEvents.emit("product:created", response.product.id);
      navigate(`/products/${response.product.id}`);
    } catch (error: any) {
      showToast(error.message || "Failed to add product", "error");
    } finally {
      setLoading(false);
    }
  };

  // Template search functionality
  const handleTemplateSearch = useCallback(async () => {
    if (!templateSearchQuery.trim()) {
      setTemplateSearchResults([]);
      return;
    }

    setIsSearchingTemplates(true);
    try {
      const response = await productsApi.getProducts({
        q: templateSearchQuery,
        pageSize: 10,
      });
      setTemplateSearchResults(response.items);
    } catch (error) {
      console.error("Failed to search products:", error);
      showToast("Failed to search products", "error");
    } finally {
      setIsSearchingTemplates(false);
    }
  }, [templateSearchQuery, showToast]);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (templateSearchQuery.trim()) {
        handleTemplateSearch();
      } else {
        setTemplateSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [templateSearchQuery, handleTemplateSearch]);

  const loadProductAsTemplate = useCallback(
    async (productId: string) => {
      try {
        const response = await productsApi.getProductById(productId);
        const product = response.product;

        setFormData({
          name: product.name,
          brand: product.brand,
          description: product.description || "",
          sizeOrVariant: product.sizeOrVariant || "",
          categories: product.categories || [],
          tags: product.tags || ["vegan"],
          isStrictVegan: product.isStrictVegan ?? true,
          imageUrl: product.imageUrl || "",
          nutritionSummary: product.nutritionSummary || "",
          ingredientSummary: product.ingredientSummary || "",
          storeAvailabilities: [],
        });

        setLoadedTemplateName(`${product.brand} ${product.name}`);
        setShowTemplateSearch(false);
        setTemplateSearchQuery("");
        setTemplateSearchResults([]);
        showToast(
          `Loaded "${product.brand} ${product.name}" as template`,
          "success",
        );
      } catch (error) {
        console.error("Failed to load product:", error);
        showToast("Failed to load product as template", "error");
      }
    },
    [showToast],
  );

  const clearTemplate = useCallback(() => {
    setFormData(getDefaultFormData());
    setLoadedTemplateName(null);
    setShowTemplateSearch(true);
    showToast("Form cleared", "success");
  }, [showToast]);

  return (
    <div className="add-product-form-container">
      <div className="add-product-form-header">
        <h1>Add a Product</h1>
        <p className="form-subtitle">
          Contribute a vegan product to help others discover it
        </p>
      </div>

      {/* Template Search Section */}
      <div className="template-section">
        {loadedTemplateName && (
          <div className="template-loaded-banner">
            <span className="template-loaded-icon">📋</span>
            <span className="template-loaded-text">
              Using template: <strong>{loadedTemplateName}</strong>
            </span>
            <div className="template-loaded-actions">
              <button
                type="button"
                className="template-change-btn"
                onClick={() => setShowTemplateSearch(true)}
              >
                Change
              </button>
              <button
                type="button"
                className="template-clear-btn"
                onClick={clearTemplate}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {showTemplateSearch && (
          <div className="template-search-container">
            <div className="template-search-header">
              <span className="template-search-icon">🔍</span>
              <h3>Start from an existing product</h3>
              <p>
                Search for a similar product to use as a template, or start from
                scratch below
              </p>
            </div>
            <div className="template-search-input-wrapper">
              <input
                type="text"
                className="template-search-input"
                placeholder="Search products to use as template..."
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
              />
              {isSearchingTemplates && (
                <span className="template-search-spinner" />
              )}
            </div>
            {templateSearchResults.length > 0 && (
              <div className="template-search-results">
                {templateSearchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="template-result-item"
                    onClick={() => loadProductAsTemplate(product.id)}
                  >
                    <div className="template-result-image">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} />
                      ) : (
                        <span className="template-result-placeholder">🌿</span>
                      )}
                    </div>
                    <div className="template-result-info">
                      <span className="template-result-brand">
                        {product.brand}
                      </span>
                      <span className="template-result-name">
                        {product.name}
                      </span>
                      <span className="template-result-size">
                        {product.sizeOrVariant}
                      </span>
                    </div>
                    <span className="template-use-btn">Use</span>
                  </button>
                ))}
              </div>
            )}
            {templateSearchQuery &&
              !isSearchingTemplates &&
              templateSearchResults.length === 0 && (
                <div className="template-no-results">
                  No products found. Start from scratch below!
                </div>
              )}
            {loadedTemplateName && (
              <button
                type="button"
                className="template-skip-btn"
                onClick={() => setShowTemplateSearch(false)}
              >
                Keep current template
              </button>
            )}
          </div>
        )}
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
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Categories</h2>

          <div className="form-group">
            <label>Search and select from existing categories</label>
            <AutocompleteInput
              value={newCategory}
              onChange={setNewCategory}
              onSelect={handleCategorySelect}
              options={availableCategories}
              placeholder="Search categories (e.g., en:plant-based-milks)"
              disabled={loadingOptions}
              allowNew={true}
              newItemLabel="Add new category"
            />
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
            <label>Select Tags</label>
            <div className="tag-selection-list">
              {availableTags.map((tag) => {
                const isSelected = formData.tags?.includes(tag) || false;
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-selection-button ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    {formatTagLabel(tag)}
                    {isSelected && <span className="tag-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Where to Buy</h2>

          <div className="form-group">
            <p className="form-help-text">
              Add stores where this product is available. You can search
              existing stores or add new ones using Google Places.
            </p>
            <StoreAvailabilitySelector
              value={formData.storeAvailabilities || []}
              chainValue={formData.chainAvailabilities || []}
              onChange={(availabilities) => {
                setFormData((prev) => ({
                  ...prev,
                  storeAvailabilities: availabilities,
                }));
              }}
              onChainChange={(chainAvailabilities) => {
                setFormData((prev) => ({
                  ...prev,
                  chainAvailabilities,
                }));
              }}
            />
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
            onClick={() => navigate("/")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Adding..." : "Add Product"}
          </Button>
        </div>
      </form>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}
