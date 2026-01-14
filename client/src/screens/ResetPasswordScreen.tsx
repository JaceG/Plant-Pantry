import { useState, FormEvent, useCallback, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { Button } from "../components/Common/Button";
import { Toast } from "../components/Common/Toast";
import "./AuthScreens.css";

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

export function ResetPasswordScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<{
    password?: boolean;
    confirmPassword?: boolean;
  }>({});

  const validatePassword = useCallback((value: string): string | undefined => {
    if (!value) {
      return "Password is required";
    }
    if (value.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[a-zA-Z]/.test(value)) {
      return "Password must contain at least one letter";
    }
    if (!/[0-9]/.test(value)) {
      return "Password must contain at least one number";
    }
    return undefined;
  }, []);

  const validateConfirmPassword = useCallback(
    (value: string, pwd: string): string | undefined => {
      if (!value) {
        return "Please confirm your password";
      }
      if (value !== pwd) {
        return "Passwords do not match";
      }
      return undefined;
    },
    [],
  );

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (!password) return "";
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength === 2) return "Fair";
    if (passwordStrength === 3) return "Good";
    return "Strong";
  }, [password, passwordStrength]);

  const strengthColor = useMemo(() => {
    if (passwordStrength <= 1) return "#ef4444";
    if (passwordStrength === 2) return "#f59e0b";
    if (passwordStrength === 3) return "#22c55e";
    return "#22c55e";
  }, [passwordStrength]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      setFieldErrors((prev) => ({
        ...prev,
        password: validatePassword(value),
      }));
    }
    if (touched.confirmPassword && confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(confirmPassword, value),
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

  const handleBlur = (field: "password" | "confirmPassword") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "password") {
      setFieldErrors((prev) => ({
        ...prev,
        password: validatePassword(password),
      }));
    } else {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(confirmPassword, password),
      }));
    }
  };

  const validateForm = (): boolean => {
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(confirmPassword, password);

    setFieldErrors({
      password: passwordError,
      confirmPassword: confirmError,
    });

    setTouched({ password: true, confirmPassword: true });

    return !passwordError && !confirmError;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reset password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">⚠️</div>
            <h1>Invalid Reset Link</h1>
            <p className="auth-subtitle">
              This password reset link is invalid or has expired.
            </p>
          </div>

          <div className="auth-footer">
            <p>
              <Link to="/forgot-password" className="auth-link">
                Request a new reset link
              </Link>
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              <Link to="/login" className="auth-link">
                ← Back to Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="auth-screen">
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">✅</div>
            <h1>Password Reset!</h1>
            <p className="auth-subtitle">
              Your password has been successfully reset. You can now sign in
              with your new password.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate("/login")}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">🔑</div>
          <h1>Reset Password</h1>
          <p className="auth-subtitle">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div
            className={`form-group ${
              fieldErrors.password && touched.password ? "has-error" : ""
            }`}
          >
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={() => handleBlur("password")}
              placeholder="••••••••"
              autoComplete="new-password"
              autoFocus
              className={
                fieldErrors.password && touched.password ? "input-error" : ""
              }
            />
            {fieldErrors.password && touched.password && (
              <span className="field-error">{fieldErrors.password}</span>
            )}

            {password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`strength-bar ${
                        passwordStrength >= level ? "active" : ""
                      }`}
                      style={{
                        backgroundColor:
                          passwordStrength >= level ? strengthColor : undefined,
                      }}
                    />
                  ))}
                </div>
                <span
                  className="strength-label"
                  style={{ color: strengthColor }}
                >
                  {strengthLabel}
                </span>
              </div>
            )}

            <div className="password-requirements">
              <span className={password.length >= 8 ? "met" : ""}>
                At least 8 characters
              </span>
              <span className={/[a-zA-Z]/.test(password) ? "met" : ""}>
                Contains a letter
              </span>
              <span className={/[0-9]/.test(password) ? "met" : ""}>
                Contains a number
              </span>
            </div>
          </div>

          <div
            className={`form-group ${
              fieldErrors.confirmPassword && touched.confirmPassword
                ? "has-error"
                : ""
            }`}
          >
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              onBlur={() => handleBlur("confirmPassword")}
              placeholder="••••••••"
              autoComplete="new-password"
              className={
                fieldErrors.confirmPassword && touched.confirmPassword
                  ? "input-error"
                  : ""
              }
            />
            {fieldErrors.confirmPassword && touched.confirmPassword && (
              <span className="field-error">{fieldErrors.confirmPassword}</span>
            )}
            {confirmPassword &&
              !fieldErrors.confirmPassword &&
              touched.confirmPassword && (
                <span className="field-success">✓ Passwords match</span>
              )}
          </div>

          <Button type="submit" variant="primary" isLoading={loading} size="lg">
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login" className="auth-link">
              ← Back to Sign In
            </Link>
          </p>
        </div>
      </div>

      {error && (
        <Toast message={error} type="error" onClose={() => setError(null)} />
      )}
    </div>
  );
}
