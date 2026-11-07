import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Wrench } from "lucide-react";
import { useAuth } from "../auth/useAuth.js";
import "./LoginPage.css";

export default function LoginPage() {
  const { user, login, sessionError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestedPath = location.state?.from?.pathname;
  const destination = requestedPath && requestedPath !== "/login" && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? `${requestedPath}${location.state?.from?.search || ""}${location.state?.from?.hash || ""}`
    : "/";

  if (user) return <Navigate to={destination} replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!identifier.trim()) {
      setError("Enter your username or email.");
      return;
    }
    if (password.length < 1) {
      setError("Enter your password.");
      return;
    }
    setLoading(true);
    try {
      await login({ identifier, password });
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand"><span><Wrench size={24} /></span><strong>AutoCare</strong></div>
        <div className="login-brand-copy">
          <span className="login-eyebrow">SMART VEHICLE SERVICE PLATFORM</span>
          <h1>One workspace for every service.</h1>
          <p>Manage your workshop operations, service history, inventory, and customer care in one place.</p>
        </div>
        <span className="login-brand-footer">AutoCare · Workshop operations</span>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-mobile-brand"><span><Wrench size={21} /></span><strong>AutoCare</strong></div>
          <span className="login-eyebrow">WELCOME BACK</span>
          <h2>Sign in to your workspace</h2>
          <p className="login-intro">Sign in with an account saved in this browser.</p>
          {location.state?.registrationSuccess && <p className="login-success" role="status">{location.state.registrationSuccess}</p>}
          <div className="login-development-warning" role="note">
            <LockKeyhole size={17} />
            <span><strong>Local prototype sign-in</strong><br />Accounts and workspace data stay in this browser. This is not secure authentication.</span>
          </div>
          {sessionError && <p className="login-error" role="alert">{sessionError}</p>}
          {error && <p className="login-error" role="alert">{error}</p>}
          <form onSubmit={submit}>
            <label className="login-field">Email address
              <input type="email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required maxLength={150} placeholder="you@workshop.com" />
            </label>
            <label className="login-field">Password
              <span className="login-password-input">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={12} maxLength={128} placeholder="Workspace password" />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            <button type="submit" className="login-submit" disabled={loading}>{loading ? <><span className="login-spinner" />Signing in…</> : "Sign in"}</button>
          </form>
          <p className="login-security-note">Passwords are checked locally using a password hash. Do not reuse a sensitive password in this prototype.</p>
          <p className="login-account-link">Don't have an account? <Link to="/register">Create account</Link></p>
        </div>
      </section>
    </main>
  );
}
