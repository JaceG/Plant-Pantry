import { useState, FormEvent, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Common/Button';
import { Toast } from '../components/Common/Toast';
import { SocialLoginButtons } from '../components/Common/SocialLoginButtons';
import './AuthScreens.css';

interface FieldErrors {
	displayName?: string;
	email?: string;
	password?: string;
	confirmPassword?: string;
}

interface TouchedFields {
	displayName?: boolean;
	email?: boolean;
	password?: boolean;
	confirmPassword?: boolean;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
const PASSWORD_MIN_LENGTH = 8;

export function SignupScreen() {
	const navigate = useNavigate();
	const { signup, isLoading: authLoading } = useAuth();

	const [name, setName] = useState(''); // Real name (optional)
	const [displayName, setDisplayName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [touched, setTouched] = useState<TouchedFields>({});

	const validateDisplayName = useCallback(
		(value: string): string | undefined => {
			if (!value.trim()) {
				return 'Display name is required';
			}
			if (value.trim().length < 2) {
				return 'Display name must be at least 2 characters';
			}
			if (value.trim().length > 50) {
				return 'Display name must be less than 50 characters';
			}
			return undefined;
		},
		[]
	);

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
			if (value.length < PASSWORD_MIN_LENGTH) {
				return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
			}
			// Check for at least one letter and one number
			if (!/[a-zA-Z]/.test(value)) {
				return 'Password must contain at least one letter';
			}
			if (!/[0-9]/.test(value)) {
				return 'Password must contain at least one number';
			}
			return undefined;
		},
		[]
	);

	const validateConfirmPassword = useCallback(
		(value: string, passwordValue: string): string | undefined => {
			if (!value) {
				return 'Please confirm your password';
			}
			if (value !== passwordValue) {
				return 'Passwords do not match';
			}
			return undefined;
		},
		[]
	);

	const handleDisplayNameChange = (value: string) => {
		setDisplayName(value);
		if (touched.displayName) {
			setFieldErrors((prev) => ({
				...prev,
				displayName: validateDisplayName(value),
			}));
		}
	};

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
		// Also revalidate confirm password if it's been touched
		if (touched.confirmPassword && confirmPassword) {
			setFieldErrors((prev) => ({
				...prev,
				confirmPassword: validateConfirmPassword(
					confirmPassword,
					value
				),
			}));
		}
	};

	const handleConfirmPasswordChange = (value: string) => {
		setConfirmPassword(value);
		if (touched.confirmPassword) {
			setFieldErrors((prev) => ({
				...prev,
				confirmPassword: validateConfirmPassword(value, password),
			}));
		}
	};

	const handleBlur = (field: keyof TouchedFields) => {
		setTouched((prev) => ({ ...prev, [field]: true }));

		switch (field) {
			case 'displayName':
				setFieldErrors((prev) => ({
					...prev,
					displayName: validateDisplayName(displayName),
				}));
				break;
			case 'email':
				setFieldErrors((prev) => ({
					...prev,
					email: validateEmail(email),
				}));
				break;
			case 'password':
				setFieldErrors((prev) => ({
					...prev,
					password: validatePassword(password),
				}));
				break;
			case 'confirmPassword':
				setFieldErrors((prev) => ({
					...prev,
					confirmPassword: validateConfirmPassword(
						confirmPassword,
						password
					),
				}));
				break;
		}
	};

	const validateForm = (): boolean => {
		const displayNameError = validateDisplayName(displayName);
		const emailError = validateEmail(email);
		const passwordError = validatePassword(password);
		const confirmPasswordError = validateConfirmPassword(
			confirmPassword,
			password
		);

		setFieldErrors({
			displayName: displayNameError,
			email: emailError,
			password: passwordError,
			confirmPassword: confirmPasswordError,
		});

		setTouched({
			displayName: true,
			email: true,
			password: true,
			confirmPassword: true,
		});

		return (
			!displayNameError &&
			!emailError &&
			!passwordError &&
			!confirmPasswordError
		);
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!validateForm()) {
			return;
		}

		setLoading(true);

		const result = await signup({
			email,
			password,
			name: name.trim() || undefined,
			displayName,
		});

		if (result.success) {
			navigate('/', { replace: true });
		} else {
			setError(result.error || 'Signup failed');
		}

		setLoading(false);
	};

	// Password strength indicator
	const getPasswordStrength = (): {
		strength: number;
		label: string;
		color: string;
	} => {
		if (!password) return { strength: 0, label: '', color: '' };

		let strength = 0;
		if (password.length >= PASSWORD_MIN_LENGTH) strength++;
		if (/[a-zA-Z]/.test(password)) strength++;
		if (/[0-9]/.test(password)) strength++;
		if (/[^a-zA-Z0-9]/.test(password)) strength++;
		if (password.length >= 12) strength++;

		if (strength <= 2) return { strength, label: 'Weak', color: '#ef4444' };
		if (strength <= 3) return { strength, label: 'Fair', color: '#f59e0b' };
		if (strength <= 4) return { strength, label: 'Good', color: '#22c55e' };
		return { strength, label: 'Strong', color: '#10b981' };
	};

	const passwordStrength = getPasswordStrength();

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

				<form onSubmit={handleSubmit} className='auth-form' noValidate>
					<div className='form-group'>
						<label htmlFor='name'>
							Full Name{' '}
							<span className='optional-label'>(optional)</span>
						</label>
						<input
							type='text'
							id='name'
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder='Your full name'
							autoComplete='name'
						/>
						<span className='field-hint'>
							Your real name is kept private and never displayed
							publicly
						</span>
					</div>

					<div
						className={`form-group ${
							fieldErrors.displayName && touched.displayName
								? 'has-error'
								: ''
						}`}>
						<label htmlFor='displayName'>Display Name</label>
						<input
							type='text'
							id='displayName'
							value={displayName}
							onChange={(e) =>
								handleDisplayNameChange(e.target.value)
							}
							onBlur={() => handleBlur('displayName')}
							placeholder='How you appear to others'
							autoComplete='nickname'
							className={
								fieldErrors.displayName && touched.displayName
									? 'input-error'
									: ''
							}
						/>
						{fieldErrors.displayName && touched.displayName && (
							<span className='field-error'>
								{fieldErrors.displayName}
							</span>
						)}
					</div>

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
							placeholder='At least 8 characters'
							autoComplete='new-password'
							className={
								fieldErrors.password && touched.password
									? 'input-error'
									: ''
							}
						/>
						{password && !fieldErrors.password && (
							<div className='password-strength'>
								<div className='strength-bars'>
									{[1, 2, 3, 4, 5].map((i) => (
										<div
											key={i}
											className={`strength-bar ${
												i <= passwordStrength.strength
													? 'active'
													: ''
											}`}
											style={{
												backgroundColor:
													i <=
													passwordStrength.strength
														? passwordStrength.color
														: undefined,
											}}
										/>
									))}
								</div>
								<span
									className='strength-label'
									style={{ color: passwordStrength.color }}>
									{passwordStrength.label}
								</span>
							</div>
						)}
						{fieldErrors.password && touched.password && (
							<span className='field-error'>
								{fieldErrors.password}
							</span>
						)}
						<div className='password-requirements'>
							<span
								className={
									password.length >= PASSWORD_MIN_LENGTH
										? 'met'
										: ''
								}>
								• At least 8 characters
							</span>
							<span
								className={
									/[a-zA-Z]/.test(password) ? 'met' : ''
								}>
								• Contains a letter
							</span>
							<span
								className={/[0-9]/.test(password) ? 'met' : ''}>
								• Contains a number
							</span>
						</div>
					</div>

					<div
						className={`form-group ${
							fieldErrors.confirmPassword &&
							touched.confirmPassword
								? 'has-error'
								: ''
						}`}>
						<label htmlFor='confirmPassword'>
							Confirm Password
						</label>
						<input
							type='password'
							id='confirmPassword'
							value={confirmPassword}
							onChange={(e) =>
								handleConfirmPasswordChange(e.target.value)
							}
							onBlur={() => handleBlur('confirmPassword')}
							placeholder='Confirm your password'
							autoComplete='new-password'
							className={
								fieldErrors.confirmPassword &&
								touched.confirmPassword
									? 'input-error'
									: ''
							}
						/>
						{fieldErrors.confirmPassword &&
							touched.confirmPassword && (
								<span className='field-error'>
									{fieldErrors.confirmPassword}
								</span>
							)}
						{confirmPassword &&
							!fieldErrors.confirmPassword &&
							touched.confirmPassword && (
								<span className='field-success'>
									✓ Passwords match
								</span>
							)}
					</div>

					<Button
						type='submit'
						variant='primary'
						isLoading={loading}
						size='lg'>
						{loading ? 'Creating account...' : 'Create Account'}
					</Button>

					<SocialLoginButtons
						onSuccess={() => navigate('/', { replace: true })}
						onError={(err) => setError(err)}
						disabled={loading}
					/>
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
