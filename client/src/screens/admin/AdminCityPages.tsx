import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi, AdminCityPage } from "../../api/adminApi";
import { AdminLayout } from "./AdminLayout";
import "./AdminCityPages.css";

export function AdminCityPages() {
  const navigate = useNavigate();
  const [cityPages, setCityPages] = useState<AdminCityPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCityPages = useCallback(async () => {
    try {
      const response = await adminApi.getCityPages();
      setCityPages(response.cityPages);
    } catch (err) {
      setError("Failed to load city pages");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCityPages();
  }, [fetchCityPages]);

  const handleDelete = async (slug: string) => {
    if (!window.confirm("Are you sure you want to delete this city page?"))
      return;

    try {
      await adminApi.deleteCityPage(slug);
      setSuccessMessage("City page deleted");
      await fetchCityPages();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to delete city page");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleToggleActive = async (city: AdminCityPage) => {
    try {
      await adminApi.updateCityPage(city.slug, {
        isActive: !city.isActive,
      });
      await fetchCityPages();
      setSuccessMessage(
        city.isActive ? "City page deactivated" : "City page activated",
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to update city page");
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <div className="loading-spinner" />
          <span>Loading city pages...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-city-pages">
        <header className="page-header">
          <div className="header-content">
            <h1>City Landing Pages</h1>
            <p className="page-subtitle">
              Create and manage city-specific landing pages with local stores
              and products
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/cities/new")}
            className="add-button"
          >
            + Add City Page
          </button>
        </header>

        {error && (
          <div className="message error-message">
            <span className="message-icon">⚠️</span>
            {error}
          </div>
        )}

        {successMessage && (
          <div className="message success-message">
            <span className="message-icon">✓</span>
            {successMessage}
          </div>
        )}

        {/* City Pages List */}
        <section className="list-section">
          <h2>All City Pages ({cityPages.length})</h2>

          {cityPages.length === 0 ? (
            <div className="empty-state">
              <p>No city pages yet. Create your first one to get started!</p>
            </div>
          ) : (
            <div className="city-list">
              {cityPages.map((city) => (
                <div
                  key={city.slug}
                  className={`city-item ${
                    city.isActive ? "active" : "inactive"
                  }`}
                >
                  <div className="city-status">
                    <span
                      className={`status-badge ${
                        city.isActive ? "active" : "draft"
                      }`}
                    >
                      {city.isActive ? "Active" : "Draft"}
                    </span>
                  </div>

                  <div className="city-info">
                    <h3 className="city-name">
                      {city.cityName}, {city.state}
                    </h3>
                    <p className="city-headline">{city.headline}</p>
                    <span className="city-slug">/cities/{city.slug}</span>
                  </div>

                  <div className="city-actions">
                    <button
                      onClick={() => handleToggleActive(city)}
                      className={`toggle-button ${
                        city.isActive ? "deactivate" : "activate"
                      }`}
                    >
                      {city.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <a
                      href={`/cities/${city.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="preview-button"
                    >
                      Preview
                    </a>
                    <button
                      onClick={() => navigate(`/admin/cities/${city.slug}`)}
                      className="edit-button"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(city.slug)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
