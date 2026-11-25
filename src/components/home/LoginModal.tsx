"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

interface LoginModalProps {
  onClose: () => void;
  onSwitchToSignUp: () => void;
}

/**
 * LoginModal — Real Supabase Auth login form.
 *
 * Collects Email Address and Password and authenticates via
 * supabase.auth.signInWithPassword({ email, password }).
 */
export default function LoginModal({
  onClose,
  onSwitchToSignUp,
}: LoginModalProps) {
  const router = useRouter();
  const { signIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus first field on open
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!email.trim()) {
      next.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (!password) {
      next.password = "Password is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);

    const { error } = await signIn(email.trim(), password);

    if (error) {
      setSubmitting(false);
      setServerError(error);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => {
      router.push("/dashboard");
      onClose();
    }, 600);
  }

  return (
    <div
      className="auth-backdrop"
      aria-modal="true"
      role="dialog"
      aria-label="Log in to Wordwise"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="auth-modal">
        {/* Header */}
        <div className="auth-modal-header">
          <div>
            <p className="auth-modal-eyebrow">Welcome back</p>
            <h2 className="auth-modal-title">Log in to Wordwise</h2>
          </div>
          <button
            type="button"
            className="auth-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="auth-success">
            <span className="auth-success-icon" aria-hidden="true">
              ✨
            </span>
            <p className="auth-success-text">You&apos;re signed in!</p>
            <p className="auth-success-sub">Loading your dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {serverError && (
              <div
                className="rounded-xl border border-amber-300 bg-orange-50/90 px-4 py-3 text-sm font-medium text-orange-900 shadow-xs"
                role="alert"
              >
                ⚠️ {serverError}
              </div>
            )}

            {/* Email Address */}
            <div className="auth-field">
              <label htmlFor="login-email" className="auth-label">
                Email Address
              </label>
              <input
                ref={firstInputRef}
                id="login-email"
                type="email"
                className={`auth-input ${errors.email ? "auth-input--error" : ""}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined }));
                  setServerError(null);
                }}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={submitting}
              />
              {errors.email && (
                <p className="auth-error-msg" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="login-password" className="auth-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className={`auth-input ${errors.password ? "auth-input--error" : ""}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: undefined }));
                  setServerError(null);
                }}
                placeholder="Your password"
                autoComplete="current-password"
                disabled={submitting}
              />
              {errors.password && (
                <p className="auth-error-msg" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
            >
              {submitting ? "Signing In..." : "Sign in →"}
            </button>
          </form>
        )}

        {/* Switch link */}
        {!success && (
          <p className="auth-switch">
            New to Wordwise?{" "}
            <button
              type="button"
              className="auth-switch-link"
              onClick={onSwitchToSignUp}
              disabled={submitting}
            >
              Create an account
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
