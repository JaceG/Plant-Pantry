import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { citiesApi } from '../api';
import { CityPageData, CityStore, CityProduct } from '../api/citiesApi';
import { SearchBar } from '../components';
import './CityLandingScreen.css';

export function CityLandingScreen() {
	const { slug } = useParams<{ slug: string }>();
	const navigate = useNavigate();

	const [cityData, setCityData] = useState<CityPageData | null>(null);
	const [stores, setStores] = useState<CityStore[]>([]);
	const [products, setProducts] = useState<CityProduct[]>([]);
	const [totalProducts, setTotalProducts] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchCityData = async () => {
			if (!slug) return;

			setLoading(true);
			setError(null);

			try {
				const [cityRes, storesRes, productsRes] = await Promise.all([
					citiesApi.getCityPage(slug),
					citiesApi.getCityStores(slug),
					citiesApi.getCityProducts(slug, 1, 12),
				]);

				setCityData(cityRes.city);
				setStores(storesRes.stores);
				setProducts(productsRes.products);
				setTotalProducts(productsRes.totalCount);
			} catch (err) {
				console.error('Error fetching city data:', err);
				setError('City page not found');
			} finally {
				setLoading(false);
			}
		};

		fetchCityData();
	}, [slug]);

	const handleSearch = (query: string) => {
		// Navigate to search with city context
		navigate(`/search?q=${encodeURIComponent(query.trim())}`);
	};

	if (loading) {
		return (
			<div className='city-landing-screen'>
				<div className='city-loading'>
					<div className='loading-spinner'></div>
					<p>Loading city data...</p>
				</div>
			</div>
		);
	}

	if (error || !cityData) {
		return (
			<div className='city-landing-screen'>
				<div className='city-error'>
					<h2>City Not Found</h2>
					<p>
						The city page you're looking for doesn't exist or isn't
						available yet.
					</p>
					<Link to='/' className='back-home-btn'>
						Back to Home
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className='city-landing-screen'>
			{/* City Hero */}
			<section className='city-hero'>
				<div className='city-hero-background'>
					<div className='city-hero-gradient'></div>
				</div>

				<div className='city-hero-content'>
					<div className='city-badge'>
						<span className='city-badge-icon'>📍</span>
						Local Guide
					</div>

					<h1 className='city-title'>
						{cityData.cityName}, {cityData.state}
					</h1>
					<p className='city-headline'>{cityData.headline}</p>
					<p className='city-description'>{cityData.description}</p>

					<div className='city-search'>
						<SearchBar
							onSearch={handleSearch}
							placeholder={`Search products in ${cityData.cityName}...`}
						/>
					</div>
				</div>
			</section>

			{/* Local Stores Section */}
			<section className='city-section stores-section'>
				<div className='section-container'>
					<div className='section-header'>
						<h2 className='section-title'>
							<span className='title-icon'>🏪</span>
							Local Stores
						</h2>
						<p className='section-subtitle'>
							{stores.length}{' '}
							{stores.length === 1 ? 'store' : 'stores'} with
							vegan products
						</p>
					</div>

					{stores.length > 0 ? (
						<div className='stores-grid'>
							{stores.map((store) => (
								<div key={store.id} className='store-card'>
									<div className='store-header'>
										<h3 className='store-name'>
											{store.name}
										</h3>
										{store.productCount !== undefined &&
											store.productCount > 0 && (
												<span className='store-product-count'>
													{store.productCount}{' '}
													{store.productCount === 1
														? 'product'
														: 'products'}
												</span>
											)}
									</div>

									{store.address && (
										<p className='store-address'>
											{store.address}
											{store.city && `, ${store.city}`}
											{store.state && `, ${store.state}`}
											{store.zipCode &&
												` ${store.zipCode}`}
										</p>
									)}

									<div className='store-actions'>
										{store.websiteUrl && (
											<a
												href={store.websiteUrl}
												target='_blank'
												rel='noopener noreferrer'
												className='store-link'>
												Website →
											</a>
										)}
										{store.phoneNumber && (
											<a
												href={`tel:${store.phoneNumber}`}
												className='store-link'>
												{store.phoneNumber}
											</a>
										)}
										{store.latitude && store.longitude && (
											<a
												href={`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`}
												target='_blank'
												rel='noopener noreferrer'
												className='store-link directions-link'>
												Get Directions
											</a>
										)}
									</div>
								</div>
							))}
						</div>
					) : (
						<div className='empty-stores'>
							<p>No stores found in this area yet.</p>
							<p className='empty-subtitle'>
								Know a store with vegan products? Help us grow
								our database!
							</p>
						</div>
					)}
				</div>
			</section>

			{/* Products Section */}
			<section className='city-section products-section'>
				<div className='section-container'>
					<div className='section-header'>
						<h2 className='section-title'>
							<span className='title-icon'>🥬</span>
							Available Products
						</h2>
						<p className='section-subtitle'>
							{totalProducts}{' '}
							{totalProducts === 1 ? 'product' : 'products'} found
							at local stores
						</p>
					</div>

					{products.length > 0 ? (
						<>
							<div className='city-products-grid'>
								{products.map((product) => (
									<Link
										key={product.id}
										to={`/products/${product.id}`}
										className='city-product-card'>
										<div className='product-image-container'>
											{product.imageUrl ? (
												<img
													src={product.imageUrl}
													alt={product.name}
													className='product-image'
													onError={(e) => {
														(
															e.target as HTMLImageElement
														).style.display =
															'none';
													}}
												/>
											) : (
												<div className='product-placeholder'>
													🌱
												</div>
											)}
										</div>

										<div className='product-info'>
											<h3 className='product-name'>
												{product.name}
											</h3>
											<p className='product-brand'>
												{product.brand}
											</p>

											{product.averageRating && (
												<div className='product-rating'>
													<span className='rating-stars'>
														★
													</span>
													<span className='rating-value'>
														{product.averageRating.toFixed(
															1
														)}
													</span>
													{product.reviewCount && (
														<span className='rating-count'>
															(
															{
																product.reviewCount
															}
															)
														</span>
													)}
												</div>
											)}

											{product.storeNames.length > 0 && (
												<div className='product-stores'>
													<span className='stores-label'>
														Available at:
													</span>
													<span className='stores-list'>
														{product.storeNames
															.slice(0, 2)
															.join(', ')}
														{product.storeNames
															.length > 2 &&
															` +${
																product
																	.storeNames
																	.length - 2
															} more`}
													</span>
												</div>
											)}
										</div>
									</Link>
								))}
							</div>

							{totalProducts > 12 && (
								<div className='section-footer'>
									<Link
										to='/search'
										className='view-all-link'>
										View all {totalProducts} products →
									</Link>
								</div>
							)}
						</>
					) : (
						<div className='empty-products'>
							<p>No products found at local stores yet.</p>
							<Link
								to='/add-product'
								className='add-product-link'>
								Add a product you've found →
							</Link>
						</div>
					)}
				</div>
			</section>

			{/* Back to Home */}
			<section className='city-section back-section'>
				<div className='section-container'>
					<Link to='/' className='back-home-link'>
						← Explore other cities
					</Link>
				</div>
			</section>
		</div>
	);
}
