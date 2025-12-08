import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import './AdminLayout.css';

interface AdminLayoutProps {
	children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
	const navItems = [
		{ path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
		{ path: '/admin/pending', label: 'Pending Reports', icon: '📋' },
		{ path: '/admin/trusted-review', label: 'Trusted Review', icon: '⭐' },
		{ path: '/admin/products', label: 'Products', icon: '📦' },
		{ path: '/admin/stores', label: 'Stores', icon: '🏪' },
		{ path: '/admin/users', label: 'Users', icon: '👥' },
		{ path: '/admin/filters', label: 'Filters', icon: '🏷️' },
		{ path: '/admin/reviews', label: 'Reviews', icon: '⭐' },
		{ path: '/admin/featured', label: 'Featured', icon: '✨' },
		{ path: '/admin/cities', label: 'City Pages', icon: '📍' },
	];

	return (
		<div className='admin-layout'>
			<aside className='admin-sidebar'>
				<div className='admin-sidebar-header'>
					<span className='admin-logo'>⚙️</span>
					<h2>Admin Panel</h2>
				</div>

				<nav className='admin-nav'>
					{navItems.map((item) => (
						<NavLink
							key={item.path}
							to={item.path}
							end={item.exact}
							className={({ isActive }) =>
								`admin-nav-item ${isActive ? 'active' : ''}`
							}>
							<span className='nav-item-icon'>{item.icon}</span>
							<span className='nav-item-label'>{item.label}</span>
						</NavLink>
					))}
				</nav>

				<div className='admin-sidebar-footer'>
					<NavLink to='/' className='back-to-app'>
						← Back to App
					</NavLink>
				</div>
			</aside>

			<main className='admin-main'>{children}</main>
		</div>
	);
}
