import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, DashboardStats } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import './AdminDashboard.css';

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminApi.getDashboardStats();
        setStats(response.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
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
          <span>Loading dashboard...</span>
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
        </div>
      </AdminLayout>
    );
  }

  if (!stats) return null;

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Overview of your PlantPantry platform</p>
        </header>

        {/* Quick Actions */}
        {stats.products.pendingApproval > 0 && (
          <div className="pending-alert">
            <span className="alert-icon">⚠️</span>
            <span className="alert-text">
              You have <strong>{stats.products.pendingApproval}</strong> products waiting for approval
            </span>
            <Link to="/admin/products" className="alert-action">
              Review Now →
            </Link>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="stats-grid">
          {/* Products Card */}
          <div className="stat-card products-card">
            <div className="stat-card-header">
              <span className="stat-icon">📦</span>
              <h3>Products</h3>
            </div>
            <div className="stat-value">{stats.products.total.toLocaleString()}</div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-label">API Sourced</span>
                <span className="stat-number">{stats.products.apiSourced.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">User Contributed</span>
                <span className="stat-number">{stats.products.userContributed.toLocaleString()}</span>
              </div>
              <div className="stat-item highlight">
                <span className="stat-label">Pending</span>
                <span className="stat-number">{stats.products.pendingApproval}</span>
              </div>
            </div>
          </div>

          {/* Stores Card */}
          <div className="stat-card stores-card">
            <div className="stat-card-header">
              <span className="stat-icon">🏪</span>
              <h3>Stores</h3>
            </div>
            <div className="stat-value">{stats.stores.total.toLocaleString()}</div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-label">Physical</span>
                <span className="stat-number">{stats.stores.physical}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Online</span>
                <span className="stat-number">{stats.stores.online}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Brand Direct</span>
                <span className="stat-number">{stats.stores.brandDirect}</span>
              </div>
            </div>
          </div>

          {/* Users Card */}
          <div className="stat-card users-card">
            <div className="stat-card-header">
              <span className="stat-icon">👥</span>
              <h3>Users</h3>
            </div>
            <div className="stat-value">{stats.users.total.toLocaleString()}</div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-label">Regular</span>
                <span className="stat-number">{stats.users.regularUsers}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Moderators</span>
                <span className="stat-number">{stats.users.moderators}</span>
              </div>
              <div className="stat-item admin-highlight">
                <span className="stat-label">Admins</span>
                <span className="stat-number">{stats.users.admins}</span>
              </div>
            </div>
          </div>

          {/* Availability Card */}
          <div className="stat-card availability-card">
            <div className="stat-card-header">
              <span className="stat-icon">📍</span>
              <h3>Availability</h3>
            </div>
            <div className="stat-value">{stats.availability.total.toLocaleString()}</div>
            <div className="stat-breakdown">
              <div className="stat-item">
                <span className="stat-label">User Contributed</span>
                <span className="stat-number">{stats.availability.userContributed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <h2>Recent Activity (Last 7 Days)</h2>
          <div className="activity-grid">
            <div className="activity-card">
              <span className="activity-icon">📦</span>
              <div className="activity-info">
                <span className="activity-value">{stats.recentActivity.newProductsThisWeek}</span>
                <span className="activity-label">New Products</span>
              </div>
            </div>
            <div className="activity-card">
              <span className="activity-icon">👤</span>
              <div className="activity-info">
                <span className="activity-value">{stats.recentActivity.newUsersThisWeek}</span>
                <span className="activity-label">New Users</span>
              </div>
            </div>
            <div className="activity-card">
              <span className="activity-icon">🏪</span>
              <div className="activity-info">
                <span className="activity-value">{stats.recentActivity.newStoresThisWeek}</span>
                <span className="activity-label">New Stores</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="quick-links">
          <h2>Quick Actions</h2>
          <div className="quick-links-grid">
            <Link to="/admin/products" className="quick-link-card">
              <span className="quick-link-icon">✅</span>
              <span className="quick-link-label">Review Products</span>
            </Link>
            <Link to="/admin/stores" className="quick-link-card">
              <span className="quick-link-icon">🏪</span>
              <span className="quick-link-label">Manage Stores</span>
            </Link>
            <Link to="/admin/users" className="quick-link-card">
              <span className="quick-link-icon">👥</span>
              <span className="quick-link-label">Manage Users</span>
            </Link>
            <Link to="/" className="quick-link-card">
              <span className="quick-link-icon">🌱</span>
              <span className="quick-link-label">View App</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

