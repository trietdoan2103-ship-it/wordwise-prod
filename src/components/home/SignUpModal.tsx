"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

interface SignUpModalProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

/**
 * SignUpModal — Real Supabase Auth registration form.
 *
 * Collects:
 * - Full Name / Display Name (required)
 * - High School Name (optional, defaults to "Le Hong Phong High School")
 * - Email Address (required)
 * - Password (required, min 6 characters)
 */
export default function SignUpModal({
  onClose,
  onSwitchToLogin,
}: SignUpModalProps) {
  const router = useRouter();
  const { signUp } = useSession();

  const [displayName, setDisplayName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
    if (!displayName.trim()) {
      next.displayName = "Full name / display name is required.";
    }
    if (!email.trim()) {
      next.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (!password) {
      next.password = "Password is required.";
    } else if (password.length < 6) {
      next.password = "Password must be at least 6 characters.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    const finalSchool = schoolName.trim() || "Le Hong Phong High School";

    const { error } = await signUp(
      email.trim(),
      password,
      displayName.trim(),
      finalSchool
    );

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
      aria-label="Create your Wordwise account"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="auth-modal">
        {/* Header */}
        <div className="auth-modal-header">
          <div>
            <p className="auth-modal-eyebrow">Start learning today</p>
            <h2 className="auth-modal-title">Create your account</h2>
          </div>
          <button
            ref={closeRef}
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
              🎉
            </span>
            <p className="auth-success-text">
              Welcome to Wordwise, {displayName.trim()}!
            </p>
            <p className="auth-success-sub">Setting up your dashboard…</p>
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

            {/* Full Name / Display Name */}
            <div className="auth-field">
              <label htmlFor="signup-name" className="auth-label">
                Full Name / Display Name
              </label>
              <input
                ref={firstInputRef}
                id="signup-name"
                type="text"
                className={`auth-input ${errors.displayName ? "auth-input--error" : ""}`}
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setErrors((p) => ({ ...p, displayName: undefined }));
                  setServerError(null);
                }}
                placeholder="e.g. Nguyen Minh Quan"
                autoComplete="name"
                disabled={submitting}
              />
              {errors.displayName && (
                <p className="auth-error-msg" role="alert">
                  {errors.displayName}
                </p>
              )}
            </div>

            {/* High School Name */}
            <div className="auth-field">
              <label htmlFor="signup-school" className="auth-label">
                High School Name{" "}
                <span className="text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>
              <input
                id="signup-school"
                type="text"
                className="auth-input"
                value={schoolName}
                onChange={(e) => {
                  setSchoolName(e.target.value);
                  setServerError(null);
                }}
                placeholder="Le Hong Phong High School"
                autoComplete="organization"
                disabled={submitting}
              />
              <p className="auth-hint">
                Displayed with your profile on the National Leaderboard.
              </p>
            </div>

            {/* Email Address */}
            <div className="auth-field">
              <label htmlFor="signup-email" className="auth-label">
                Email Address
              </label>
              <input
                id="signup-email"
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
              <label htmlFor="signup-password" className="auth-label">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                className={`auth-input ${errors.password ? "auth-input--error" : ""}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: undefined }));
                  setServerError(null);
                }}
                placeholder="At least 6 characters"
                autoComplete="new-password"
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
              {submitting ? "Creating Account..." : "Create account →"}
            </button>
          </form>
        )}

        {/* Switch link */}
        {!success && (
          <p className="auth-switch">
            Already have an account?{" "}
            <button
              type="button"
              className="auth-switch-link"
              onClick={onSwitchToLogin}
              disabled={submitting}
            >
              Log in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
