import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  CircleHelp,
  Clock3,
  LogOut,
  Palette,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useAuth } from "../auth/useAuth.js";
import { useAppData } from "../context/useAppData.js";
import { APP_DATA_STORAGE_KEY } from "../context/appDataStorage.js";
import { changeLocalPassword } from "../services/localAuth.js";
import "./SettingsPage.css";

const SECTIONS = [
  { id: "workshop", label: "Workshop profile", icon: Building2 },
  { id: "services", label: "Service configuration", icon: SlidersHorizontal },
  { id: "preferences", label: "User preferences", icon: Palette },
  { id: "account", label: "Account settings", icon: ShieldCheck },
];

function createDraft(company, services, preferences) {
  return {
    company: { ...company },
    services: {
      ...services,
      serviceTypesText: services.serviceTypes.join("\n"),
    },
    preferences: {
      ...preferences,
      notifications: { ...preferences.notifications },
    },
  };
}

function initialsFromName(name) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

export default function SettingsPage() {
  const {
    companyDetails,
    serviceConfiguration,
    userPreferences,
    updateWorkspace,
  } = useAppData();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get("section");
  const [activeSection, setActiveSection] = useState(SECTIONS.some((section) => section.id === initialSection) ? initialSection : "workshop");
  const [draft, setDraft] = useState(() => createDraft(companyDetails, serviceConfiguration, userPreferences));
  const [message, setMessage] = useState(null);
  const [passwordDraft, setPasswordDraft] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");

  const savedDraft = useMemo(
    () => createDraft(companyDetails, serviceConfiguration, userPreferences),
    [companyDetails, serviceConfiguration, userPreferences],
  );
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  useEffect(() => {
    function warnBeforeExit(event) {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeExit);
    return () => window.removeEventListener("beforeunload", warnBeforeExit);
  }, [hasChanges]);

  function updateCompany(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, company: { ...current.company, [name]: value } }));
  }

  function updateService(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, services: { ...current.services, [name]: value } }));
  }

  function updatePreference(event) {
    const { name, value, checked, type } = event.target;
    if (name.startsWith("notification-")) {
      const key = name.slice("notification-".length);
      setDraft((current) => ({
        ...current,
        preferences: {
          ...current.preferences,
          notifications: { ...current.preferences.notifications, [key]: checked },
        },
      }));
      return;
    }
    setDraft((current) => ({
      ...current,
      preferences: { ...current.preferences, [name]: type === "checkbox" ? checked : value },
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    const company = draft.company;
    const phoneDigits = company.phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setMessage({ type: "error", text: "Enter a valid workshop phone number." });
      return;
    }
    if (company.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.email.trim())) {
      setMessage({ type: "error", text: "Enter a valid workshop email address." });
      return;
    }
    const labour = Number(draft.services.defaultLabourCharge);
    const tax = Number(draft.services.taxRate);
    const duration = Number(draft.services.bookingDuration);
    if (!Number.isFinite(labour) || labour < 0 || !Number.isFinite(tax) || tax < 0 || tax > 100) {
      setMessage({ type: "error", text: "Labour charge must be zero or more and tax rate must be between 0% and 100%." });
      return;
    }
    if (!Number.isInteger(duration) || duration < 15 || duration > 480) {
      setMessage({ type: "error", text: "Booking duration must be between 15 and 480 whole minutes." });
      return;
    }
    const serviceTypes = [...new Set(draft.services.serviceTypesText.split("\n").map((item) => item.trim()).filter(Boolean))];
    if (!serviceTypes.length) {
      setMessage({ type: "error", text: "Add at least one available service type." });
      return;
    }
    const normalized = {
      company: {
        ...company,
        name: company.name.trim(),
        logoInitials: (company.logoInitials.trim() || initialsFromName(company.name)).slice(0, 3).toUpperCase(),
        address: company.address.trim(),
        phone: company.phone.trim(),
        email: company.email.trim().toLowerCase(),
        taxId: company.taxId.trim(),
        currency: company.currency,
      },
      services: { ...draft.services, defaultLabourCharge: labour, taxRate: tax, bookingDuration: duration, serviceTypes },
      preferences: draft.preferences,
    };

    try {
      await updateWorkspace((current) => ({
        ...current,
        companyDetails: normalized.company,
        serviceConfiguration: normalized.services,
        userPreferences: normalized.preferences,
      }));
      setDraft(createDraft(normalized.company, normalized.services, normalized.preferences));
      setMessage({ type: "success", text: "Settings saved in this browser." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  function cancelChanges() {
    if (hasChanges && !window.confirm("Discard your unsaved settings changes?")) return;
    setDraft(createDraft(companyDetails, serviceConfiguration, userPreferences));
    setMessage(null);
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");
    if (!passwordDraft.current || passwordDraft.next.length < 12) {
      setPasswordError("Enter your current password and a new password with at least 12 characters.");
      return;
    }
    if (passwordDraft.next !== passwordDraft.confirm) {
      setPasswordError("The new password and confirmation do not match.");
      return;
    }
    try {
      await changeLocalPassword({
        userId: user.id,
        currentPassword: passwordDraft.current,
        newPassword: passwordDraft.next,
      });
      setPasswordDraft({ current: "", next: "", confirm: "" });
      setPasswordNotice("Password changed successfully.");
    } catch (error) {
      setPasswordError(error.message || "Unable to change password.");
    }
  }

  async function signOut() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setPasswordError(error.message || "Unable to sign out.");
    }
  }

  function exportLegacyBrowserData() {
    const exportData = {};
    try {
      for (const key of [APP_DATA_STORAGE_KEY, "autocare-user-preferences"]) {
        const raw = window.localStorage.getItem(key);
        if (raw === null) continue;
        try {
          exportData[key] = JSON.parse(raw);
        } catch {
          exportData[key] = { preservedRawValue: raw, parseError: true };
        }
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `Browser data could not be read for export. ${error instanceof Error ? error.message : "Storage access failed."}`,
      });
      return;
    }
    if (!Object.keys(exportData).length) {
      setMessage({ type: "error", text: "No legacy browser data was found. Nothing was changed." });
      return;
    }
    const content = JSON.stringify(exportData, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "autocare-browser-export.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="settings-page">
      <header className="settings-page-heading">
        <div><span className="settings-eyebrow">WORKSPACE CONTROL</span><h1>Settings</h1><p>Configure workshop details, service defaults, and your preferences.</p></div>
      </header>
      <div className="settings-mock-warning"><CircleHelp size={17} /><span>This prototype stores business records, accounts, and settings only in this browser. Browser storage is not a secure backup or authentication system.</span></div>
      {message && <div className={`settings-message settings-message-${message.type}`} role={message.type === "error" ? "alert" : "status"}><span>{message.text}</span><button type="button" onClick={() => setMessage(null)} aria-label="Dismiss"><X size={16} /></button></div>}

      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Settings sections" role="tablist" aria-orientation="vertical">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} role="tab" aria-selected={activeSection === id} className={activeSection === id ? "settings-tab settings-tab-active" : "settings-tab"} onClick={() => { setActiveSection(id); setMessage(null); }}>
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
          {hasChanges && <p className="settings-unsaved-indicator">You have unsaved changes.</p>}
        </nav>

        <section className="settings-content" aria-live="polite">
          {activeSection === "workshop" && (
            <form onSubmit={saveSettings}>
              <div className="settings-section-heading"><span className="settings-section-icon"><Building2 size={19} /></span><div><h2>Workshop profile</h2><p>Business details appear on customer invoices.</p></div></div>
              <div className="settings-form-grid">
                <label className="settings-full-width">Workshop name <b>*</b><input name="name" value={draft.company.name} onChange={updateCompany} required maxLength={120} /></label>
                <label>Logo initials<input name="logoInitials" value={draft.company.logoInitials} onChange={updateCompany} maxLength={3} placeholder={initialsFromName(draft.company.name)} /><small>Used as a simple text mark.</small></label>
                <label>Currency <b>*</b><select name="currency" value={draft.company.currency || "INR"} onChange={updateCompany}><option value="INR">INR · Indian Rupee (₹)</option><option value="USD">USD · US Dollar ($)</option><option value="EUR">EUR · Euro (€)</option><option value="GBP">GBP · Pound Sterling (£)</option></select></label>
                <label className="settings-full-width">Address <b>*</b><textarea name="address" value={draft.company.address} onChange={updateCompany} required rows="3" maxLength={300} /></label>
                <label>Phone number <b>*</b><input name="phone" type="tel" value={draft.company.phone} onChange={updateCompany} required maxLength={30} /></label>
                <label>Email address<input name="email" type="email" value={draft.company.email} onChange={updateCompany} maxLength={120} /></label>
                <label className="settings-full-width">GSTIN (optional)<input name="taxId" value={draft.company.taxId} onChange={updateCompany} maxLength={40} placeholder="Enter your GSTIN if applicable" /></label>
              </div>
              <SettingsActions dirty={hasChanges} onCancel={cancelChanges} />
            </form>
          )}

          {activeSection === "services" && (
            <form onSubmit={saveSettings}>
              <div className="settings-section-heading"><span className="settings-section-icon"><SlidersHorizontal size={19} /></span><div><h2>Service configuration</h2><p>Default rates and services used when creating appointments.</p></div></div>
              <div className="settings-form-grid">
                <label>Default labour charge (₹) <b>*</b><input name="defaultLabourCharge" type="number" min="0" step="0.01" value={draft.services.defaultLabourCharge} onChange={updateService} required /></label>
                <label>Tax rate (%) <b>*</b><input name="taxRate" type="number" min="0" max="100" step="0.01" value={draft.services.taxRate} onChange={updateService} required /></label>
                <label>Default booking duration (minutes) <b>*</b><input name="bookingDuration" type="number" min="15" max="480" step="15" value={draft.services.bookingDuration} onChange={updateService} required /><small>Between 15 minutes and 8 hours.</small></label>
                <label className="settings-full-width">Available service types <b>*</b><textarea name="serviceTypesText" value={draft.services.serviceTypesText} onChange={updateService} rows="8" required /><small>Enter one service type per line.</small></label>
              </div>
              <SettingsActions dirty={hasChanges} onCancel={cancelChanges} />
            </form>
          )}

          {activeSection === "preferences" && (
            <form onSubmit={saveSettings}>
              <div className="settings-section-heading"><span className="settings-section-icon"><Palette size={19} /></span><div><h2>User preferences</h2><p>Non-sensitive display preferences are saved to this browser.</p></div></div>
              <div className="settings-preference-group">
                <div><strong>Appearance</strong><span>Select the application color theme; this is saved with your local workspace.</span></div>
                <div className="settings-theme-options">
                  {["light", "dark"].map((theme) => <label key={theme} className={draft.preferences.appearance === theme ? "settings-theme-option settings-theme-selected" : "settings-theme-option"}><input type="radio" name="appearance" value={theme} checked={draft.preferences.appearance === theme} onChange={updatePreference} /><span className={`settings-theme-preview theme-preview-${theme}`} /><span>{theme === "light" ? "Light" : "Dark"}</span></label>)}
                </div>
              </div>
              <div className="settings-preference-group">
                <div><strong>Notifications</strong><span>Preferences are saved with the workspace, but delivery integrations are not configured.</span></div>
                <div className="settings-toggle-list">
                  <label><span><strong>Booking updates</strong><small>Appointment status and assignment changes</small></span><input type="checkbox" name="notification-bookingUpdates" checked={draft.preferences.notifications.bookingUpdates} onChange={updatePreference} /></label>
                  <label><span><strong>Low stock alerts</strong><small>Inventory below its minimum threshold</small></span><input type="checkbox" name="notification-lowStockAlerts" checked={draft.preferences.notifications.lowStockAlerts} onChange={updatePreference} /></label>
                  <label><span><strong>Payment reminders</strong><small>Unpaid and overdue invoices</small></span><input type="checkbox" name="notification-paymentReminders" checked={draft.preferences.notifications.paymentReminders} onChange={updatePreference} /></label>
                </div>
              </div>
              <div className="settings-form-grid settings-format-grid">
                <label>Date format <b>*</b><select name="dateFormat" value={draft.preferences.dateFormat} onChange={updatePreference}><option>dd MMM yyyy</option><option>dd/MM/yyyy</option><option>yyyy-MM-dd</option></select></label>
                <label>Number / currency locale <b>*</b><select name="currencyFormat" value={draft.preferences.currencyFormat} onChange={updatePreference}><option value="en-IN">India · 1,23,456.78</option><option value="en-US">United States · 123,456.78</option><option value="en-GB">United Kingdom · 123,456.78</option></select></label>
              </div>
              <SettingsActions dirty={hasChanges} onCancel={cancelChanges} />
            </form>
          )}

          {activeSection === "account" && (
            <div>
              <div className="settings-section-heading"><span className="settings-section-icon"><ShieldCheck size={19} /></span><div><h2>Account settings</h2><p>Signed-in workspace account and session controls.</p></div></div>
              <div className="settings-account-card">
                <span className="settings-account-avatar">{initialsFromName(user?.name || "A")}</span>
                <div><strong>{user?.name}</strong><span>{user?.email}</span></div>
                <span className="settings-role-badge">{user?.role}</span>
              </div>
              <div className="settings-security-note"><ShieldCheck size={17} /><span>Your account and password hash are stored in this browser. Roles are local UI settings and are not security controls.</span></div>
              <form className="settings-password-form" onSubmit={submitPasswordChange}>
                <h3>Change password</h3>
                <p>Use a unique password of at least 12 characters.</p>
                {passwordError && <p className="settings-password-error" role="alert">{passwordError}</p>}
                {passwordNotice && <p className="settings-password-success" role="status">{passwordNotice}</p>}
                <div className="settings-form-grid">
                  <label className="settings-full-width">Current password<input type="password" autoComplete="current-password" value={passwordDraft.current} onChange={(event) => setPasswordDraft((current) => ({ ...current, current: event.target.value }))} /></label>
                  <label>New password<input type="password" autoComplete="new-password" minLength={12} value={passwordDraft.next} onChange={(event) => setPasswordDraft((current) => ({ ...current, next: event.target.value }))} /></label>
                  <label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} value={passwordDraft.confirm} onChange={(event) => setPasswordDraft((current) => ({ ...current, confirm: event.target.value }))} /></label>
                </div>
                <button type="submit" className="settings-button settings-button-secondary">Change password</button>
              </form>
              <div className="settings-account-actions">
                <div><strong>Sign out</strong><span>Sign out of this browser session.</span></div>
                <button type="button" className="settings-button settings-button-danger" onClick={signOut}><LogOut size={16} />Log out</button>
              </div>
            </div>
          )}
        </section>
      </div>
      <div className="settings-help-link"><Clock3 size={15} />Workspace data is stored locally in this browser. <button type="button" className="settings-export-button" onClick={exportLegacyBrowserData}>Export legacy browser data</button> <Link to="/invoices">View invoices</Link></div>
    </div>
  );
}

function SettingsActions({ dirty, onCancel }) {
  return (
    <div className="settings-form-actions">
      <button type="button" className="settings-button settings-button-secondary" onClick={onCancel}><X size={15} />Cancel</button>
      <button type="submit" className="settings-button settings-button-primary" disabled={!dirty}><Save size={16} />Save settings</button>
    </div>
  );
}
