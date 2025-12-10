import { useState, FormEvent, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Common/Button';
import { Toast } from '../components/Common/Toast';
import { SocialLoginButtons } from '../components/Common/SocialLoginButtons';
import './AuthScreens.css';

interface FieldErrors {
	email?: string;
	password?: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
	const navigate = useNavigate();
	const location = useLocation();
	const { login, isLoading: authLoading } = useAuth();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [touched, setTouched] = useState<{
		email?: boolean;
		password?: boolean;
	}>({});

	// Get redirect path from location state
	const from =
		(location.state as { from?: { pathname: string } })?.from?.pathname ||
		'/';

	const validateEmail = useCallback((value: string): string | undefined => {
		if (!value.trim()) {
			return 'Email is required';
		}
		if (!EMAIL_REGEX.test(value)) {
			return 'Please enter a valid email address';
		}
		return undefined;
	}, []);

	const validatePassword = useCallback(
		(value: string): string | undefined => {
			if (!value) {
				return 'Password is required';
			}
			if (value.length < 8) {
				return 'Password must be at least 8 characters';
			}
			return undefined;
		},
		[]
	);

	const handleEmailChange = (value: string) => {
		setEmail(value);
		if (touched.email) {
			setFieldErrors((prev) => ({
				...prev,
				email: validateEmail(value),
			}));
		}
	};

	const handlePasswordChange = (value: string) => {
		setPassword(value);
		if (touched.password) {
			setFieldErrors((prev) => ({
				...prev,
				password: validatePassword(value),
			}));
		}
	};

	const handleBlur = (field: 'email' | 'password') => {
		setTouched((prev) => ({ ...prev, [field]: true }));
		if (field === 'email') {
			setFieldErrors((prev) => ({
				...prev,
				email: validateEmail(email),
			}));
		} else {
			setFieldErrors((prev) => ({
				...prev,
				password: validatePassword(password),
			}));
		}
	};

	const validateForm = (): boolean => {
		const emailError = validateEmail(email);
		const passwordError = validatePassword(password);

		setFieldErrors({
			email: emailError,
			password: passwordError,
		});

		setTouched({ email: true, password: true });

		return !emailError && !passwordError;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!validateForm()) {
			return;
		}

		setLoading(true);

		const result = await login({ email, password });

		if (result.success) {
			navigate(from, { replace: true });
		} else {
			setError(result.error || 'Login failed');
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
					<h1>Welcome Back</h1>
					<p className='auth-subtitle'>
						Sign in to your Vegan Aisle account
					</p>
				</div>

				<form onSubmit={handleSubmit} className='auth-form' noValidate>
					<div
						className={`form-group ${
							fieldErrors.email && touched.email
								? 'has-error'
								: ''
						}`}>
						<label htmlFor='email'>Email</label>
						<input
							type='email'
							id='email'
							value={email}
							onChange={(e) => handleEmailChange(e.target.value)}
							onBlur={() => handleBlur('email')}
							placeholder='you@example.com'
							autoComplete='email'
							className={
								fieldErrors.email && touched.email
									? 'input-error'
									: ''
							}
						/>
						{fieldErrors.email && touched.email && (
							<span className='field-error'>
								{fieldErrors.email}
							</span>
						)}
					</div>

					<div
						className={`form-group ${
							fieldErrors.password && touched.password
								? 'has-error'
								: ''
						}`}>
						<label htmlFor='password'>Password</label>
						<input
							type='password'
							id='password'
							value={password}
							onChange={(e) =>
								handlePasswordChange(e.target.value)
							}
							onBlur={() => handleBlur('password')}
							placeholder='••••••••'
							autoComplete='current-password'
							className={
								fieldErrors.password && touched.password
									? 'input-error'
									: ''
							}
						/>
						{fieldErrors.password && touched.password && (
							<span className='field-error'>
								{fieldErrors.password}
							</span>
						)}
						<div className='forgot-password-link'>
							<Link to='/forgot-password'>Forgot password?</Link>
						</div>
					</div>

					<Button
						type='submit'
						variant='primary'
						isLoading={loading}
						size='lg'>
						{loading ? 'Signing in...' : 'Sign In'}
					</Button>

					<SocialLoginButtons
						onSuccess={() => navigate(from, { replace: true })}
						onError={(err) => setError(err)}
						disabled={loading}
					/>
				</form>

				<div className='auth-footer'>
					<p>
						Don't have an account?{' '}
						<Link to='/signup' className='auth-link'>
							Create one
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
