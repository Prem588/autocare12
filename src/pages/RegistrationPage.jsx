import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Wrench } from "lucide-react";
import { useAuth } from "../auth/useAuth.js";
import "./LoginPage.css";

function passwordByteLength(password) {
  return new TextEncoder().encode(password).length;
}

export default function RegistrationPage() {
  const { user, checkingSession, register } = useAuth();
  const navigate = useNavigate();
  const submitting = useRef(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (checkingSession) return <div className="session-loading" role="status">Checking local account…</div>;
  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");

    const name = fullName.trim();
    const normalizedEmail = email.trim();
    if (!name) {
      setError("Enter your full name.");
      return;
    }
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    const bytes = passwordByteLength(password);
    if (bytes < 12 || bytes > 72) {
      setError("Choose a password between 12 and 72 UTF-8 bytes.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      await register({
        name,
        email: normalizedEmail,
        password,
      });
      navigate("/login", {
        replace: true,
        state: { registrationSuccess: "Your account has been created. Sign in to continue." },
      });
    } catch (registrationError) {
      setError(registrationError.message || "Unable to create your account.");
    } finally {
      submitting.current = false;
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
          <span className="login-eyebrow">CREATE YOUR ACCOUNT</span>
          <h2>Create an AutoCare account</h2>
          <p className="login-intro">Create an account stored in this browser.</p>
          {error && <p className="login-error" role="alert">{error}</p>}
          <form onSubmit={submit} noValidate>
            <label className="login-field">Full name
              <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required maxLength={120} placeholder="Your full name" />
            </label>
            <label className="login-field">Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength={254} placeholder="you@workshop.com" />
            </label>
            <label className="login-field">Password
              <span className="login-password-input">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required maxLength={72} placeholder="At least 12 characters" />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            <label className="login-field">Confirm password
              <span className="login-password-input">
                <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required maxLength={72} placeholder="Enter your password again" />
                <button type="button" onClick={() => setShowConfirmPassword((shown) => !shown)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            <button type="submit" className="login-submit" disabled={loading}>{loading ? <><span className="login-spinner" />Creating account…</> : "Create Account"}</button>
          </form>
          <p className="login-account-link">Already have an account? <Link to="/login">Sign in</Link></p>
          <p className="login-security-note">This prototype stores a password hash in this browser. It does not provide secure, server-backed authentication.</p>
        </div>
      </section>
    </main>
  );
}
