import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productsApi } from '../api';
import { ProductSummary } from '../types';
import { ProductCard, SearchBar, Pagination } from '../components';
import './BrandScreen.css';

export function BrandScreen() {
	const { brandName } = useParams<{ brandName: string }>();
	const decodedBrandName = brandName ? decodeURIComponent(brandName) : '';

	const [products, setProducts] = useState<ProductSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const pageSize = 24;

	const fetchProducts = useCallback(async () => {
		if (!decodedBrandName) return;

		setLoading(true);
		setError(null);

		try {
			const res = await productsApi.getProducts({
				brand: decodedBrandName,
				page,
				pageSize,
			});
			setProducts(res.items);
			setTotalCount(res.totalCount);
		} catch (err) {
			console.error('Error fetching brand products:', err);
			setError('Failed to load products');
		} finally {
			setLoading(false);
		}
	}, [decodedBrandName, page]);

	useEffect(() => {
		fetchProducts();
	}, [fetchProducts]);

	const totalPages = Math.ceil(totalCount / pageSize);

	if (!decodedBrandName) {
		return (
			<div className='brand-screen'>
				<div className='brand-error'>
					<h2>Brand Not Found</h2>
					<p>No brand name was provided.</p>
					<Link to='/' className='back-home-btn'>
						← Back to Products
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className='brand-screen'>
			<div className='brand-hero'>
				<div className='brand-hero-content'>
					<nav className='breadcrumb'>
						<Link to='/'>Products</Link>
						<span className='separator'>/</span>
						<span>{decodedBrandName}</span>
					</nav>
					<h1 className='brand-title'>{decodedBrandName}</h1>
					<p className='brand-subtitle'>
						{loading
							? 'Loading...'
							: `${totalCount} product${
									totalCount !== 1 ? 's' : ''
							  }`}
					</p>
				</div>
			</div>

			<div className='brand-content'>
				{loading ? (
					<div className='brand-loading'>
						<div className='loading-spinner' />
						<span>Loading products...</span>
					</div>
				) : error ? (
					<div className='brand-error'>
						<h2>Error</h2>
						<p>{error}</p>
						<button onClick={fetchProducts} className='retry-btn'>
							Try Again
						</button>
					</div>
				) : products.length === 0 ? (
					<div className='brand-empty'>
						<p>No products found for this brand.</p>
						<Link to='/' className='back-home-btn'>
							← Browse All Products
						</Link>
					</div>
				) : (
					<>
						<div className='products-grid'>
							{products.map((product) => (
								<ProductCard
									key={product.id}
									product={product}
								/>
							))}
						</div>

						{totalPages > 1 && (
							<div className='pagination-container'>
								<Pagination
									currentPage={page}
									totalPages={totalPages}
									onPageChange={setPage}
								/>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
