import { ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './AdminLayout.css';

interface AdminLayoutProps {
	children: ReactNode;
}

interface NavItem {
	path: string;
	label: string;
	icon: string;
	exact?: boolean;
	children?: { path: string; label: string }[];
}

export function AdminLayout({ children }: AdminLayoutProps) {
	const location = useLocation();
	const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
		// Auto-expand menus that contain the current path
		const expanded = new Set<string>();
		if (location.pathname.startsWith('/admin/brands')) {
			expanded.add('/admin/brands');
		}
		return expanded;
	});

	const navItems: NavItem[] = [
		{ path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
		{ path: '/admin/pending', label: 'Pending Reports', icon: '📋' },
		{ path: '/admin/trusted-review', label: 'Trusted Review', icon: '⭐' },
		{ path: '/admin/products', label: 'Products', icon: '📦' },
		{
			path: '/admin/brands',
			label: 'Brands',
			icon: '🏷️',
			children: [
				{ path: '/admin/brands/official', label: 'Official Brands' },
				{ path: '/admin/brands/unassigned', label: 'Unassigned Brands' },
			],
		},
		{ path: '/admin/stores', label: 'Stores', icon: '🏪' },
		{ path: '/admin/users', label: 'Users', icon: '👥' },
		{ path: '/admin/filters', label: 'Filters', icon: '🔖' },
		{ path: '/admin/reviews', label: 'Reviews', icon: '⭐' },
		{ path: '/admin/featured', label: 'Featured', icon: '✨' },
		{ path: '/admin/cities', label: 'City Pages', icon: '📍' },
		{ path: '/admin/city-edits', label: 'City Edits', icon: '✏️' },
	];

	const toggleMenu = (path: string) => {
		setExpandedMenus((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	};

	const isPathActive = (path: string, exact?: boolean) => {
		if (exact) {
			return location.pathname === path;
		}
		return location.pathname.startsWith(path);
	};

	return (
		<div className='admin-layout'>
			<aside className='admin-sidebar'>
				<div className='admin-sidebar-header'>
					<span className='admin-logo'>⚙️</span>
					<h2>Admin Panel</h2>
				</div>

				<nav className='admin-nav'>
					{navItems.map((item) => (
						<div key={item.path} className='nav-item-wrapper'>
							{item.children ? (
								<>
									<button
										className={`admin-nav-item has-children ${
											isPathActive(item.path) ? 'active' : ''
										}`}
										onClick={() => toggleMenu(item.path)}>
										<span className='nav-item-icon'>{item.icon}</span>
										<span className='nav-item-label'>{item.label}</span>
										<span className={`nav-item-chevron ${expandedMenus.has(item.path) ? 'expanded' : ''}`}>
											▶
										</span>
									</button>
									{expandedMenus.has(item.path) && (
										<div className='nav-item-children'>
											<NavLink
												to={item.path}
												end
												className={({ isActive }) =>
													`admin-nav-subitem ${isActive ? 'active' : ''}`
												}>
												Overview
											</NavLink>
											{item.children.map((child) => (
												<NavLink
													key={child.path}
													to={child.path}
													className={({ isActive }) =>
														`admin-nav-subitem ${isActive ? 'active' : ''}`
													}>
													{child.label}
												</NavLink>
											))}
										</div>
									)}
								</>
							) : (
								<NavLink
									to={item.path}
									end={item.exact}
									className={({ isActive }) =>
										`admin-nav-item ${isActive ? 'active' : ''}`
									}>
									<span className='nav-item-icon'>{item.icon}</span>
									<span className='nav-item-label'>{item.label}</span>
								</NavLink>
							)}
						</div>
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
