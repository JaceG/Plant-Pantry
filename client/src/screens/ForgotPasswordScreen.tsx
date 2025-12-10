import { useState, FormEvent, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Button } from '../components/Common/Button';
import { Toast } from '../components/Common/Toast';
import './AuthScreens.css';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordScreen() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [fieldError, setFieldError] = useState<string | undefined>();
	const [touched, setTouched] = useState(false);

	const validateEmail = useCallback((value: string): string | undefined => {
		if (!value.trim()) {
			return 'Email is required';
		}
		if (!EMAIL_REGEX.test(value)) {
			return 'Please enter a valid email address';
		}
		return undefined;
	}, []);

	const handleEmailChange = (value: string) => {
		setEmail(value);
		if (touched) {
			setFieldError(validateEmail(value));
		}
	};

	const handleBlur = () => {
		setTouched(true);
		setFieldError(validateEmail(email));
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);

		const emailError = validateEmail(email);
		setFieldError(emailError);
		setTouched(true);

		if (emailError) {
			return;
		}

		setLoading(true);

		try {
			await authApi.forgotPassword(email);
			setSuccess(true);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: 'Failed to send reset email';
			setError(message);
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<div className='auth-screen'>
				<div className='auth-container'>
					<div className='auth-header'>
						<div className='auth-logo'>✉️</div>
						<h1>Check Your Email</h1>
						<p className='auth-subtitle'>
							If an account exists for <strong>{email}</strong>,
							we've sent a password reset link.
						</p>
					</div>

					<div className='auth-success-message'>
						<p>
							The link will expire in 1 hour. Be sure to check
							your spam folder if you don't see the email.
						</p>
					</div>

					<div className='auth-footer'>
						<p>
							<Link to='/login' className='auth-link'>
								← Back to Sign In
							</Link>
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='auth-screen'>
			<div className='auth-container'>
				<div className='auth-header'>
					<div className='auth-logo'>🔐</div>
					<h1>Forgot Password?</h1>
					<p className='auth-subtitle'>
						Enter your email and we'll send you a link to reset your
						password.
					</p>
				</div>

				<form onSubmit={handleSubmit} className='auth-form' noValidate>
					<div
						className={`form-group ${
							fieldError && touched ? 'has-error' : ''
						}`}>
						<label htmlFor='email'>Email</label>
						<input
							type='email'
							id='email'
							value={email}
							onChange={(e) => handleEmailChange(e.target.value)}
							onBlur={handleBlur}
							placeholder='you@example.com'
							autoComplete='email'
							autoFocus
							className={
								fieldError && touched ? 'input-error' : ''
							}
						/>
						{fieldError && touched && (
							<span className='field-error'>{fieldError}</span>
						)}
					</div>

					<Button
						type='submit'
						variant='primary'
						isLoading={loading}
						size='lg'>
						{loading ? 'Sending...' : 'Send Reset Link'}
					</Button>
				</form>

				<div className='auth-footer'>
					<p>
						Remember your password?{' '}
						<Link to='/login' className='auth-link'>
							Sign In
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
