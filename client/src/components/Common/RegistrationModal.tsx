import { useState, FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "./Button";
import { Toast } from "./Toast";
import "./RegistrationModal.css";

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}: RegistrationModalProps) {
  const { signup, login } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isLoginMode) {
      // Login
      if (!email || !password) {
        setError("Please fill in all fields");
        return;
      }

      setLoading(true);
      const result = await login({ email, password });

      if (result.success) {
        onSuccess?.();
        onClose();
        // Reset form
        setEmail("");
        setPassword("");
      } else {
        setError(result.error || "Login failed");
      }
      setLoading(false);
    } else {
      // Signup
      if (!displayName || !email || !password || !confirmPassword) {
        setError("Please fill in all fields");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      setLoading(true);
      const result = await signup({ email, password, displayName });

      if (result.success) {
        onSuccess?.();
        onClose();
        // Reset form
        setDisplayName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else {
        setError(result.error || "Signup failed");
      }
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setDisplayName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setIsLoginMode(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose} />
      <div className="modal-container">
        <div className="modal-header">
          <h2>{isLoginMode ? "Sign In" : "Create Account"}</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="auth-mode-toggle">
            <button
              type="button"
              className={`mode-button ${!isLoginMode ? "active" : ""}`}
              onClick={() => {
                setIsLoginMode(false);
                setError(null);
              }}
            >
              Sign Up
            </button>
            <button
              type="button"
              className={`mode-button ${isLoginMode ? "active" : ""}`}
              onClick={() => {
                setIsLoginMode(true);
                setError(null);
              }}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            {!isLoginMode && (
              <div className="form-group">
                <label htmlFor="modal-displayName">Display Name</label>
                <input
                  type="text"
                  id="modal-displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="modal-email">Email</label>
              <input
                type="email"
                id="modal-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="modal-password">Password</label>
              <input
                type="password"
                id="modal-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  isLoginMode ? "Your password" : "At least 8 characters"
                }
                autoComplete={isLoginMode ? "current-password" : "new-password"}
                minLength={isLoginMode ? undefined : 8}
                required
              />
            </div>

            {!isLoginMode && (
              <div className="form-group">
                <label htmlFor="modal-confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="modal-confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              size="lg"
              fullWidth
            >
              {loading
                ? isLoginMode
                  ? "Signing in..."
                  : "Creating account..."
                : isLoginMode
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </form>
        </div>
      </div>

      {error && (
        <Toast message={error} type="error" onClose={() => setError(null)} />
      )}
    </>
  );
}
