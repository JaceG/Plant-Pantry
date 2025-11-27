import { Link, useLocation } from 'react-router-dom';
import './Header.css';

interface HeaderProps {
  defaultListId?: string | null;
}

export function Header({ defaultListId }: HeaderProps) {
  const location = useLocation();
  
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
          
          <Link
            to={defaultListId ? `/lists/${defaultListId}` : '/lists'}
            className={`nav-link ${location.pathname.startsWith('/lists') ? 'active' : ''}`}
          >
            <span className="nav-icon">📝</span>
            <span className="nav-text">My List</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

