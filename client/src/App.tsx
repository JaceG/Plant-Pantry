import { useState, useEffect } from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	useLocation,
} from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { Header } from './components';
import { ProtectedRoute } from './components/Common/ProtectedRoute';
import {
	HomeScreen,
	LandingScreen,
	ProductDetailScreen,
	BrandScreen,
	RetailerScreen,
	ShoppingListScreen,
	AddProductScreen,
	LoginScreen,
	SignupScreen,
	ProfileScreen,
} from './screens';
import { CityLandingScreen } from './screens/CityLandingScreen';
import {
	AdminDashboard,
	AdminProducts,
	AdminStores,
	AdminUsers,
	AdminFilters,
	AdminReviews,
	AdminFeaturedProducts,
	AdminCityPages,
	AdminCityPageEditor,
	AdminCityContentEdits,
	AdminStoreAvailability,
	AdminPendingReports,
	AdminTrustedReview,
} from './screens/admin';
import { listsApi } from './api';
import './App.css';

// Google OAuth Client ID - Replace with your actual client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const isGoogleOAuthConfigured = !!GOOGLE_CLIENT_ID;

function AppContent() {
	const [defaultListId, setDefaultListId] = useState<string | null>(null);
	const { isAuthenticated, isLoading } = useAuth();
	const location = useLocation();

	// Check if we're on an admin route
	const isAdminRoute = location.pathname.startsWith('/admin');

	useEffect(() => {
		// Fetch or create default list on app load (only if authenticated)
		const loadDefaultList = async () => {
			if (!isAuthenticated) {
				setDefaultListId(null);
				return;
			}

			try {
				const response = await listsApi.getDefaultList();
				setDefaultListId(response.list.id);
			} catch (error) {
				console.error('Failed to load default list:', error);
			}
		};

		if (!isLoading) {
			loadDefaultList();
		}
	}, [isAuthenticated, isLoading]);

	// Don't render header/footer on admin routes
	if (isAdminRoute) {
		return (
			<Routes>
				{/* Admin routes (require admin role) */}
				<Route
					path='/admin'
					element={
						<ProtectedRoute requireAdmin>
							<AdminDashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/pending'
					element={
						<ProtectedRoute requireAdmin>
							<AdminPendingReports />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/trusted-review'
					element={
						<ProtectedRoute requireAdmin>
							<AdminTrustedReview />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/products'
					element={
						<ProtectedRoute requireAdmin>
							<AdminProducts />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/stores'
					element={
						<ProtectedRoute requireAdmin>
							<AdminStores />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/users'
					element={
						<ProtectedRoute requireAdmin>
							<AdminUsers />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/filters'
					element={
						<ProtectedRoute requireAdmin>
							<AdminFilters />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/reviews'
					element={
						<ProtectedRoute requireAdmin>
							<AdminReviews />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/featured'
					element={
						<ProtectedRoute requireAdmin>
							<AdminFeaturedProducts />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/cities'
					element={
						<ProtectedRoute requireAdmin>
							<AdminCityPages />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/cities/:slug'
					element={
						<ProtectedRoute requireAdmin>
							<AdminCityPageEditor />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/city-edits'
					element={
						<ProtectedRoute requireAdmin>
							<AdminCityContentEdits />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/availability'
					element={
						<ProtectedRoute requireAdmin>
							<AdminStoreAvailability />
						</ProtectedRoute>
					}
				/>
				<Route
					path='/admin/*'
					element={<Navigate to='/admin' replace />}
				/>
			</Routes>
		);
	}

	return (
		<div className='app'>
			<Header defaultListId={defaultListId} />
			<main className='app-main'>
				<Routes>
					{/* Public routes */}
					<Route path='/' element={<LandingScreen />} />
					<Route path='/search' element={<HomeScreen />} />
					<Route
						path='/cities/:slug'
						element={<CityLandingScreen />}
					/>
					<Route
						path='/products/:id'
						element={<ProductDetailScreen />}
					/>
					<Route
						path='/brands/:brandName'
						element={<BrandScreen />}
					/>
					<Route
						path='/retailers/chain/:identifier'
						element={<RetailerScreen />}
					/>
					<Route
						path='/retailers/store/:identifier'
						element={<RetailerScreen />}
					/>
					<Route path='/login' element={<LoginScreen />} />
					<Route path='/signup' element={<SignupScreen />} />

					{/* Protected routes (require auth) */}
					<Route
						path='/add-product'
						element={
							<ProtectedRoute>
								<AddProductScreen />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/lists'
						element={
							<ProtectedRoute>
								<ShoppingListScreen />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/lists/:id'
						element={
							<ProtectedRoute>
								<ShoppingListScreen />
							</ProtectedRoute>
						}
					/>
					<Route
						path='/profile'
						element={
							<ProtectedRoute>
								<ProfileScreen />
							</ProtectedRoute>
						}
					/>

					{/* Catch-all redirect */}
					<Route path='*' element={<Navigate to='/' replace />} />
				</Routes>
			</main>
			<footer className='app-footer'>
				<div className='footer-content'>
					<span className='footer-logo'>🌱 The Vegan Aisle</span>
					<span className='footer-tagline'>
						Discover vegan groceries everywhere
					</span>
				</div>
			</footer>
		</div>
	);
}

function AppWithRouter() {
	return (
		<Router
			future={{
				v7_startTransition: true,
				v7_relativeSplatPath: true,
			}}>
			<AuthProvider>
				<LocationProvider>
					<AppContent />
				</LocationProvider>
			</AuthProvider>
		</Router>
	);
}

function App() {
	// Only wrap with GoogleOAuthProvider if a client ID is configured
	if (isGoogleOAuthConfigured) {
		return (
			<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
				<AppWithRouter />
			</GoogleOAuthProvider>
		);
	}

	return <AppWithRouter />;
}

export default App;
