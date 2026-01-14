import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import { AdminLayout } from "./AdminLayout";
import { Button } from "../../components/Common/Button";
import "./AdminBrands.css";

export function AdminBrands() {
  const [stats, setStats] = useState({
    officialBrands: 0,
    unassignedBrands: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch brands to get counts
        const brandsRes = await adminApi.getBrands({});

        // Calculate totals from letter counts
        const totalUnassigned = Object.values(
          brandsRes.letterCounts || {},
        ).reduce((sum, count) => sum + count, 0);

        // Get official brands count
        const officialRes = await adminApi.getOfficialBrands();

        setStats({
          officialBrands: officialRes.brands?.length || 0,
          unassignedBrands: totalUnassigned,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load brand stats",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <div className="loading-spinner" />
          <span>Loading brand stats...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="admin-error">
          <h2>Error</h2>
          <p>{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-brands">
        <header className="admin-header">
          <div className="header-left">
            <h1>Brand Management</h1>
            <p className="header-subtitle">
              Consolidate brand variations under official brands
            </p>
          </div>
        </header>

        {/* Overview Cards */}
        <div className="brands-overview">
          <Link to="/admin/brands/official" className="overview-card official">
            <div className="overview-card-icon">🏷️</div>
            <div className="overview-card-content">
              <h2>Official Brands</h2>
              <p className="overview-card-description">
                Manage official brand pages and their sub-brands
              </p>
              <div className="overview-card-stat">
                <span className="stat-number">{stats.officialBrands}</span>
                <span className="stat-label">brands</span>
              </div>
            </div>
            <div className="overview-card-arrow">→</div>
          </Link>

          <Link to="/admin/brands/unassigned" className="overview-card warning">
            <div className="overview-card-icon">📋</div>
            <div className="overview-card-content">
              <h2>Unassigned Brands</h2>
              <p className="overview-card-description">
                Assign brand variations to official brands or make them official
              </p>
              <div className="overview-card-stat">
                <span className="stat-number warning">
                  {stats.unassignedBrands}
                </span>
                <span className="stat-label">to review</span>
              </div>
            </div>
            <div className="overview-card-arrow">→</div>
          </Link>
        </div>

        {/* Quick Actions */}
        <section className="quick-actions-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <Link to="/admin/brands/official" className="quick-action-btn">
              <span className="quick-action-icon">✨</span>
              Create Official Brand
            </Link>
            <Link to="/admin/brands/unassigned" className="quick-action-btn">
              <span className="quick-action-icon">🔗</span>
              Assign Brands
            </Link>
          </div>
        </section>

        {/* Info Section */}
        <section className="info-section">
          <h2>About Brand Management</h2>
          <div className="info-cards">
            <div className="info-card">
              <h3>🏷️ Official Brands</h3>
              <p>
                Official brands are the main brand pages that users see. They
                can have sub-brands assigned to them, consolidating all products
                under one brand page.
              </p>
            </div>
            <div className="info-card">
              <h3>🔗 Sub-brands</h3>
              <p>
                Sub-brands are brand variations that get linked to an official
                brand. Products from sub-brands appear on the parent brand's
                page alongside the parent's own products.
              </p>
            </div>
            <div className="info-card">
              <h3>📋 Unassigned Brands</h3>
              <p>
                Unassigned brands are brand names found in product data that
                haven't been organized yet. You can either make them official or
                assign them to an existing official brand.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
