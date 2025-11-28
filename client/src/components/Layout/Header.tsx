import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

interface HeaderProps {
  defaultListId?: string | null;
}

export function Header({ defaultListId }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">PlantPantry</span>
        </Link>
        
        <nav className="header-nav">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <span className="nav-icon">🛒</span>
            <span className="nav-text">Browse</span>
          </Link>
          
          {isAuthenticated && (
            <>
              <Link
                to="/add-product"
                className={`nav-link ${location.pathname === '/add-product' ? 'active' : ''}`}
              >
                <span className="nav-icon">➕</span>
                <span className="nav-text">Add Product</span>
              </Link>
              
              <Link
                to={defaultListId ? `/lists/${defaultListId}` : '/lists'}
                className={`nav-link ${location.pathname.startsWith('/lists') ? 'active' : ''}`}
              >
                <span className="nav-icon">📝</span>
                <span className="nav-text">My List</span>
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className={`nav-link admin-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                >
                  <span className="nav-icon">⚙️</span>
                  <span className="nav-text">Admin</span>
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="header-auth">
          {isAuthenticated ? (
            <div className="auth-user-menu">
              <span className="user-greeting">
                Hi, {user?.displayName?.split(' ')[0] || 'User'}
              </span>
              <button onClick={handleLogout} className="auth-button logout-button">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="auth-button login-button">
                Sign In
              </Link>
              <Link to="/signup" className="auth-button signup-button">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

