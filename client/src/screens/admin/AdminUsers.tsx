import { useState, useEffect, useCallback } from 'react';
import { adminApi, AdminUser } from '../../api/adminApi';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/Common/Button';
import { Toast } from '../../components/Common/Toast';
import { useAuth } from '../../context/AuthContext';
import './AdminUsers.css';

export function AdminUsers() {
	const { user: currentUser } = useAuth();
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [roleUpdateLoading, setRoleUpdateLoading] = useState<string | null>(
		null
	);
	const [trustedUpdateLoading, setTrustedUpdateLoading] = useState<
		string | null
	>(null);
	const [toast, setToast] = useState<{
		message: string;
		type: 'success' | 'error';
	} | null>(null);

	const fetchUsers = useCallback(async () => {
		try {
			setLoading(true);
			const response = await adminApi.getUsers(page, 20);
			setUsers(response.items);
			setTotal(response.total);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to load users'
			);
		} finally {
			setLoading(false);
		}
	}, [page]);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	const handleRoleChange = async (
		userId: string,
		newRole: 'user' | 'admin' | 'moderator'
	) => {
		setRoleUpdateLoading(userId);
		try {
			await adminApi.updateUserRole(userId, newRole);
			setUsers(
				users.map((u) =>
					u.id === userId ? { ...u, role: newRole } : u
				)
			);
			setToast({
				message: 'User role updated successfully',
				type: 'success',
			});
		} catch (err) {
			setToast({ message: 'Failed to update user role', type: 'error' });
		} finally {
			setRoleUpdateLoading(null);
		}
	};

	const handleTrustedToggle = async (
		userId: string,
		currentTrusted: boolean
	) => {
		setTrustedUpdateLoading(userId);
		try {
			await adminApi.setUserTrustedStatus(userId, !currentTrusted);
			setUsers(
				users.map((u) =>
					u.id === userId
						? { ...u, trustedContributor: !currentTrusted }
						: u
				)
			);
			setToast({
				message: !currentTrusted
					? 'User is now a trusted contributor'
					: 'User trusted status removed',
				type: 'success',
			});
		} catch (err) {
			setToast({
				message: 'Failed to update trusted status',
				type: 'error',
			});
		} finally {
			setTrustedUpdateLoading(null);
		}
	};

	const getRoleBadgeClass = (role: string) => {
		switch (role) {
			case 'admin':
				return 'role-admin';
			case 'moderator':
				return 'role-moderator';
			default:
				return 'role-user';
		}
	};

	if (loading && users.length === 0) {
		return (
			<AdminLayout>
				<div className='admin-loading'>
					<div className='loading-spinner' />
					<span>Loading users...</span>
				</div>
			</AdminLayout>
		);
	}

	return (
		<AdminLayout>
			<div className='admin-users'>
				<header className='page-header'>
					<div>
						<h1>User Management</h1>
						<p className='page-subtitle'>
							{total} user{total !== 1 ? 's' : ''} total
						</p>
					</div>
				</header>

				{error && (
					<div className='error-banner'>
						<span>⚠️ {error}</span>
					</div>
				)}

				{users.length === 0 ? (
					<div className='empty-state'>
						<span className='empty-icon'>👥</span>
						<h2>No Users Found</h2>
						<p>No users have registered yet.</p>
					</div>
				) : (
					<div className='users-table-container'>
						<table className='users-table'>
							<thead>
								<tr>
									<th>User</th>
									<th>Role</th>
									<th>Trusted</th>
									<th>Products</th>
									<th>Joined</th>
									<th>Last Login</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{users.map((user) => (
									<tr
										key={user.id}
										className={
											user.id === currentUser?.id
												? 'current-user'
												: ''
										}>
										<td className='user-info-cell'>
											<div className='user-avatar'>
												{user.displayName
													.charAt(0)
													.toUpperCase()}
											</div>
											<div className='user-details'>
												<span className='user-name'>
													{user.displayName}
													{user.id ===
														currentUser?.id && (
														<span className='you-badge'>
															(you)
														</span>
													)}
												</span>
												<span className='user-email'>
													{user.email}
												</span>
											</div>
										</td>
										<td>
											<span
												className={`role-badge ${getRoleBadgeClass(
													user.role
												)}`}>
												{user.role}
											</span>
										</td>
										<td className='trusted-cell'>
											{user.id !== currentUser?.id &&
											user.role === 'user' ? (
												<button
													className={`trusted-toggle ${
														user.trustedContributor
															? 'trusted'
															: ''
													}`}
													onClick={() =>
														handleTrustedToggle(
															user.id,
															user.trustedContributor
														)
													}
													disabled={
														trustedUpdateLoading ===
														user.id
													}
													title={
														user.trustedContributor
															? 'Remove trusted status'
															: 'Make trusted contributor'
													}>
													{trustedUpdateLoading ===
													user.id
														? '...'
														: user.trustedContributor
														? '✓ Yes'
														: 'No'}
												</button>
											) : (
												<span className='trusted-auto'>
													{user.role !== 'user'
														? '(auto)'
														: '—'}
												</span>
											)}
										</td>
										<td className='products-count'>
											{user.productsContributed}
										</td>
										<td className='date-cell'>
											{new Date(
												user.createdAt
											).toLocaleDateString()}
										</td>
										<td className='date-cell'>
											{user.lastLogin
												? new Date(
														user.lastLogin
												  ).toLocaleDateString()
												: '—'}
										</td>
										<td className='actions-cell'>
											{user.id !== currentUser?.id ? (
												<select
													value={user.role}
													onChange={(e) =>
														handleRoleChange(
															user.id,
															e.target.value as
																| 'user'
																| 'admin'
																| 'moderator'
														)
													}
													disabled={
														roleUpdateLoading ===
														user.id
													}
													className='role-select'>
													<option value='user'>
														User
													</option>
													<option value='moderator'>
														Moderator
													</option>
													<option value='admin'>
														Admin
													</option>
												</select>
											) : (
												<span className='no-action'>
													—
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Pagination */}
				{total > 20 && (
					<div className='pagination'>
						<Button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							variant='secondary'
							size='sm'>
							← Previous
						</Button>
						<span className='page-info'>
							Page {page} of {Math.ceil(total / 20)}
						</span>
						<Button
							onClick={() => setPage((p) => p + 1)}
							disabled={page >= Math.ceil(total / 20)}
							variant='secondary'
							size='sm'>
							Next →
						</Button>
					</div>
				)}
			</div>

			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}
		</AdminLayout>
	);
}
