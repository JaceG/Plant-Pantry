import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RegistrationModal } from '../Common/RegistrationModal';
import { SearchBar } from '../Products/SearchBar';
import './Header.css';

interface HeaderProps {
	defaultListId?: string | null;
}

export function Header({ defaultListId }: HeaderProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const { isAuthenticated, isAdmin, user, logout } = useAuth();
	const [showRegistrationModal, setShowRegistrationModal] = useState(false);
	const [modalAction, setModalAction] = useState<
		'add-product' | 'my-list' | null
	>(null);

	const handleLogout = () => {
		logout();
		navigate('/');
	};

	const handleAddProductClick = (e: React.MouseEvent) => {
		if (!isAuthenticated) {
			e.preventDefault();
			setModalAction('add-product');
			setShowRegistrationModal(true);
		}
	};

	const handleMyListClick = (e: React.MouseEvent) => {
		if (!isAuthenticated) {
			e.preventDefault();
			setModalAction('my-list');
			setShowRegistrationModal(true);
		}
	};

	const handleRegistrationSuccess = () => {
		// After successful registration/login, navigate to the intended page
		if (modalAction === 'add-product') {
			navigate('/add-product');
		} else if (modalAction === 'my-list') {
			navigate('/lists');
		}
		setModalAction(null);
	};

	const handleHeaderSearch = useCallback(
		(query: string) => {
			// Navigate to home page with search query
			if (query.trim()) {
				navigate(`/?q=${encodeURIComponent(query.trim())}`);
			} else {
				navigate('/');
			}
		},
		[navigate]
	);

	const isHomePage = location.pathname === '/';

	return (
		<>
			<header className='header'>
				<div className='header-container'>
					<Link to='/' className='header-logo'>
						<span className='logo-icon'>🌱</span>
						<span className='logo-text'>The Vegan Aisle</span>
					</Link>

					{!isHomePage && (
						<div className='header-search'>
							<SearchBar
								initialValue={
									new URLSearchParams(location.search).get(
										'q'
									) || ''
								}
								onSearch={handleHeaderSearch}
								placeholder='Search products...'
							/>
						</div>
					)}

					<nav className='header-nav'>
						<Link
							to='/'
							className={`nav-link ${
								location.pathname === '/' ? 'active' : ''
							}`}>
							<span className='nav-icon'>🛍️</span>
							<span className='nav-text'>Browse</span>
						</Link>

						<Link
							to='/add-product'
							onClick={handleAddProductClick}
							className={`nav-link ${
								location.pathname === '/add-product'
									? 'active'
									: ''
							}`}>
							<span className='nav-icon'>➕</span>
							<span className='nav-text'>Add Product</span>
						</Link>

						<Link
							to={
								defaultListId
									? `/lists/${defaultListId}`
									: '/lists'
							}
							onClick={handleMyListClick}
							className={`nav-link ${
								location.pathname.startsWith('/lists')
									? 'active'
									: ''
							}`}>
							<span className='nav-icon'>📝</span>
							<span className='nav-text'>My List</span>
						</Link>

						{isAdmin && (
							<Link
								to='/admin'
								className={`nav-link admin-link ${
									location.pathname.startsWith('/admin')
										? 'active'
										: ''
								}`}>
								<span className='nav-icon'>⚙️</span>
								<span className='nav-text'>Admin</span>
							</Link>
						)}
					</nav>

					<div className='header-auth'>
						{isAuthenticated ? (
							<div className='auth-user-menu'>
								<span className='user-greeting'>
									Hi,{' '}
									{user?.displayName?.split(' ')[0] || 'User'}
								</span>
								<button
									onClick={handleLogout}
									className='auth-button logout-button'>
									Logout
								</button>
							</div>
						) : (
							<div className='auth-buttons'>
								<Link
									to='/login'
									className='auth-button login-button'>
									Sign In
								</Link>
								<Link
									to='/signup'
									className='auth-button signup-button'>
									Sign Up
								</Link>
							</div>
						)}
					</div>
				</div>
			</header>

			<RegistrationModal
				isOpen={showRegistrationModal}
				onClose={() => {
					setShowRegistrationModal(false);
					setModalAction(null);
				}}
				onSuccess={handleRegistrationSuccess}
			/>
		</>
	);
}
