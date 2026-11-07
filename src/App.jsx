import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CarFront,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  Settings,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { AuthProvider } from "./auth/AuthProvider.jsx";
import { ROLE_NAVIGATION } from "./auth/AuthContext.js";
import { useAuth } from "./auth/useAuth.js";
import BookingsPage from "./pages/BookingsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegistrationPage from "./pages/RegistrationPage.jsx";
import MechanicsPage from "./pages/MechanicsPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import InvoicesPage from "./pages/InvoicesPage.jsx";
import ServiceHistoryPage from "./pages/ServiceHistoryPage.jsx";
import RemindersPage from "./pages/RemindersPage.jsx";
import VehiclesPage from "./pages/VehiclesPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { AppDataProvider } from "./context/AppDataProvider.jsx";
import { useAppData } from "./context/useAppData.js";
import "./App.css";

const menu = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Vehicles", path: "/vehicles", icon: CarFront },
  { name: "Bookings", path: "/bookings", icon: CalendarDays },
  { name: "Service History", path: "/service-history", icon: ClipboardList },
  { name: "Mechanics", path: "/mechanics", icon: Wrench },
  { name: "Inventory", path: "/inventory", icon: Package },
  { name: "Invoices", path: "/invoices", icon: FileText },
  { name: "Reminders", path: "/reminders", icon: Bell },
  { name: "Settings", path: "/settings", icon: Settings },
];

function Dashboard() {
  const { vehicles, bookings, mechanics, invoices, payments, companyDetails } = useAppData();
  const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: companyDetails.currency || "INR",
    maximumFractionDigits: 0,
  });
  const outstandingBalance = invoices.reduce((sum, invoice) => {
    const paid = payments
      .filter((payment) => payment.invoiceId === invoice.id)
      .reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
    return sum + Math.max(0, (Number(invoice.total) || 0) - paid);
  }, 0);
  const recentBookings = [...bookings]
    .sort((a, b) => b.bookingDate.localeCompare(a.bookingDate))
    .slice(0, 5);

  return (
    <>
      <h1>Dashboard</h1>
      <p className="subtitle">Current service and workshop overview.</p>
      <div className="stats">
        <div className="stat"><span>Total Vehicles</span><h2>{vehicles.length}</h2><small>Registered vehicles</small></div>
        <div className="stat"><span>Service Bookings</span><h2>{bookings.length}</h2><small>All bookings</small></div>
        <div className="stat"><span>Available Mechanics</span><h2>{mechanics.filter((mechanic) => mechanic.availability === "Available").length}</h2><small>Ready for assignment</small></div>
        <div className="stat"><span>Outstanding Balance</span><h2>{currency.format(outstandingBalance)}</h2><small>Across recorded invoices</small></div>
      </div>
      <div className="panel">
        <h2>Recent Service Bookings</h2>
        <table>
          <thead><tr><th>Vehicle</th><th>Service</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {recentBookings.map((booking) => (
              <tr key={booking.id}>
                <td><Link to="/bookings" state={{ bookingId: booking.id }}>{booking.vehicleNumber}</Link></td>
                <td>{booking.serviceType}</td>
                <td>{booking.bookingDate || "—"}</td>
                <td><span className={`status${booking.status === "In Progress" ? " progress" : ""}`}>{booking.status}</span></td>
              </tr>
            ))}
            {recentBookings.length === 0 && <tr><td className="dashboard-empty-state" colSpan="4">No service bookings yet. Create a booking to see activity here.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProtectedApplication() {
  const { user, checkingSession } = useAuth();
  const location = useLocation();
  if (checkingSession) return <div className="session-loading" role="status">Checking local account…</div>;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <AppLayout />;
}

function AppLayout() {
  const { user, logout } = useAuth();
  const {
    userPreferences,
    loading: dataLoading,
    saving: dataSaving,
    lastSavedAt,
    workspaceLoaded,
    persistenceError,
  } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerAtPath, setDrawerAtPath] = useState(null);
  const [userMenuAtPath, setUserMenuAtPath] = useState(null);
  const userMenuRef = useRef(null);
  const drawerOpen = drawerAtPath === location.pathname;
  const userMenuOpen = userMenuAtPath === location.pathname;
  const allowedPaths = ROLE_NAVIGATION[user.role] || ROLE_NAVIGATION.Customer;
  const visibleMenu = menu.filter((item) => allowedPaths.includes(item.path));
  const userInitial = user.name.trim().charAt(0).toUpperCase() || "A";

  useEffect(() => {
    document.documentElement.dataset.theme = userPreferences.appearance === "dark" ? "dark" : "light";
  }, [userPreferences.appearance]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserMenuAtPath(null);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  async function signOut() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      window.alert(error.message || "Unable to sign out.");
    }
  }

  return (
    <div className="app">
      {drawerOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setDrawerAtPath(null)} />}
      <aside className={`sidebar${drawerOpen ? " sidebar-open" : ""}`} aria-label="Main navigation">
        <Link className="brand" to="/" aria-label="AutoCare dashboard"><span className="brand-mark"><Wrench size={20} /></span><span>AutoCare</span></Link>
        <p className="menu-label">MAIN MENU</p>
        <nav>
          {visibleMenu.map(({ name, path, icon: Icon }) => (
            <NavLink className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`} to={path} key={path} end={path === "/"} onClick={() => setDrawerAtPath(null)}>
              <Icon size={19} /><span>{name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">Smart Vehicle Platform</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button type="button" className="mobile-menu-toggle" aria-label={drawerOpen ? "Close navigation" : "Open navigation"} aria-expanded={drawerOpen} onClick={() => setDrawerAtPath((path) => path === location.pathname ? null : location.pathname)}>
            {drawerOpen ? <X size={21} /> : <MenuIcon size={21} />}
          </button>
          <span className="topbar-title">Vehicle Service Management</span>
          <div className="user-menu-container" ref={userMenuRef}>
            <button type="button" className="user-menu-trigger" aria-haspopup="menu" aria-expanded={userMenuOpen} onClick={() => setUserMenuAtPath((path) => path === location.pathname ? null : location.pathname)}>
              <span className="avatar">{userInitial}</span><span className="user-menu-name">{user.name}</span><ChevronDown size={15} />
            </button>
            {userMenuOpen && (
              <div className="user-menu-popover" role="menu">
                <div className="user-menu-identity"><strong>{user.name}</strong><span>{user.email}</span><small>{user.role}</small></div>
                <Link to="/settings?section=account" role="menuitem" onClick={() => setUserMenuAtPath(null)}><UserRound size={16} />Profile &amp; account</Link>
                <Link to="/settings" role="menuitem" onClick={() => setUserMenuAtPath(null)}><Settings size={16} />Settings</Link>
                <button type="button" role="menuitem" onClick={signOut}><LogOut size={16} />Log out</button>
              </div>
            )}
          </div>
        </header>
        <section className="content">
          {dataLoading && <div className="app-data-status" role="status">Loading workspace data from this browser…</div>}
          {dataSaving && !dataLoading && <div className="app-data-status" role="status">Saving changes to this browser…</div>}
          {!dataSaving && !persistenceError && lastSavedAt && <div className="app-data-status" role="status">Workspace saved in this browser at {new Date(lastSavedAt).toLocaleTimeString()}.</div>}
          {persistenceError && <div className="app-data-error" role="alert">{persistenceError}</div>}
          {!dataLoading && workspaceLoaded && <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/mechanics" element={<MechanicsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/service-history" element={<ServiceHistoryPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppDataProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="*" element={<ProtectedApplication />} />
          </Routes>
        </AppDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
