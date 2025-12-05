import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Common/Button';
import { Toast } from '../components/Common/Toast';
import './AuthScreens.css';

export function SignupScreen() {
	const navigate = useNavigate();
	const { signup, isLoading: authLoading } = useAuth();

	const [displayName, setDisplayName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!displayName || !email || !password || !confirmPassword) {
			setError('Please fill in all fields');
			return;
		}

		if (password.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}

		if (password !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		setLoading(true);

		const result = await signup({ email, password, displayName });

		if (result.success) {
			navigate('/', { replace: true });
		} else {
			setError(result.error || 'Signup failed');
		}

		setLoading(false);
	};

	if (authLoading) {
		return (
			<div className='auth-screen'>
				<div className='auth-container'>
					<div className='auth-loading'>
						<div className='loading-spinner' />
						<span>Loading...</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='auth-screen'>
			<div className='auth-container'>
				<div className='auth-header'>
					<div className='auth-logo'>🌱</div>
					<h1>Create Account</h1>
					<p className='auth-subtitle'>
						Join The Vegan Aisle and discover vegan products
					</p>
				</div>

				<form onSubmit={handleSubmit} className='auth-form'>
					<div className='form-group'>
						<label htmlFor='displayName'>Display Name</label>
						<input
							type='text'
							id='displayName'
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							placeholder='Your name'
							autoComplete='name'
							required
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='email'>Email</label>
						<input
							type='email'
							id='email'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder='you@example.com'
							autoComplete='email'
							required
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='password'>Password</label>
						<input
							type='password'
							id='password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder='At least 8 characters'
							autoComplete='new-password'
							minLength={8}
							required
						/>
					</div>

					<div className='form-group'>
						<label htmlFor='confirmPassword'>
							Confirm Password
						</label>
						<input
							type='password'
							id='confirmPassword'
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder='Confirm your password'
							autoComplete='new-password'
							required
						/>
					</div>

					<Button
						type='submit'
						variant='primary'
						isLoading={loading}
						size='lg'>
						{loading ? 'Creating account...' : 'Create Account'}
					</Button>
				</form>

				<div className='auth-footer'>
					<p>
						Already have an account?{' '}
						<Link to='/login' className='auth-link'>
							Sign in
						</Link>
					</p>
				</div>
			</div>

			{error && (
				<Toast
					message={error}
					type='error'
					onClose={() => setError(null)}
				/>
			)}
		</div>
	);
}
