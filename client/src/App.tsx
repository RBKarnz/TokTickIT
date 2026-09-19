import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.js';
import LoginPage from './pages/LoginPage.js';
import ChangePasswordPage from './pages/ChangePasswordPage.js';
import MyTicketsPage from './pages/MyTicketsPage.js';
import CreateTicketPage from './pages/CreateTicketPage.js';
import TicketDetailPage from './pages/TicketDetailPage.js';
import StaffTicketQueuePage from './pages/StaffTicketQueuePage.js';
import UserManagementPage from './pages/UserManagementPage.js';
import { logout, checkSystem, Category } from './api.js';

// Home Component restoring Lab 1 functionality
type UiState = "idle" | "loading" | "success" | "error";

export function TempHome() {
  const { user } = useAuth();
  
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      const data = await checkSystem();
      setCategories(data.categories || []);
      setState("success");
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to connect to the backend.");
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: '900px' }}>
      <div className="card shadow-sm border-0">
        <div className="card-body p-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h4 mb-0" style={{ color: '#1E293B' }}>IT Service Desk Portal</h2>
            <a href="/tickets/create" className="btn btn-zen-primary d-flex align-items-center shadow-sm">
              <i className="bi bi-plus-circle me-2"></i> Create Ticket
            </a>
          </div>
          <p className="text-muted mb-4 border-bottom pb-4">
            Active Requester: <strong style={{ color: '#0F172A' }}>{user?.name}</strong>
          </p>
          
          <div className="mb-3 text-muted">System Health & Catalog Status</div>
          
          <button 
            className="btn btn-zen-primary mb-4 d-flex align-items-center" 
            onClick={handleCheck} 
            disabled={state === "loading"}
          >
            {state === "loading" ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Loading...
              </>
            ) : "Check System"}
          </button>

          {state === "success" && (
            <div className="alert p-4" style={{ backgroundColor: '#EAF6EF', color: '#0B7A46', borderColor: '#A7F3D0' }}>
              <strong className="d-block mb-3">Status: Online</strong>
              <ul className="mb-0 ps-3">
                {categories.map((category) => (
                  <li key={category.id} className="mb-1">{category.name}</li>
                ))}
              </ul>
            </div>
          )}

          {state === "error" && (
            <div className="alert alert-danger p-4">
              <strong>Offline:</strong> {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading Spinner helper
const Spinner = () => (
  <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#F5F7F6' }}>
    <div className="spinner-border" style={{ color: '#006B3C', width: '3rem', height: '3rem' }} role="status">
      <span className="visually-hidden">TokTickIT Loading...</span>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

/** Blocks unauthenticated users and redirects first-login users to change password */
export function RequireAuth() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

/** Only accessible when mustChangePassword=true; redirects away once password is changed */
function RequirePasswordChange() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) {
    const landing = user.role === 'IT_STAFF' ? '/staff/queue'
                  : user.role === 'ADMINISTRATOR' ? '/admin/users'
                  : '/';
    return <Navigate to={landing} replace />;
  }
  return <Outlet />;
}

// ---------------------------------------------------------------------------
// Role Landings
// ---------------------------------------------------------------------------

function RoleLandingRoute() {
  const { user } = useAuth();
  if (user?.role === 'IT_STAFF') return <Navigate to="/staff/queue" replace />;
  if (user?.role === 'ADMINISTRATOR') return <Navigate to="/admin/users" replace />;
  return <MyTicketsPage />;
}

function RequireStaffQueue() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'REQUESTER') return <Navigate to="/tickets" replace />;
  if (user.role !== 'IT_STAFF') return <Navigate to="/" replace />;
  return <StaffTicketQueuePage />;
}

function StaffQueueLanding() {
  const { user } = useAuth();
  return (
    <div className="container py-5" style={{ maxWidth: '900px' }}>
      <div className="card shadow-sm border-0">
        <div className="card-body p-5">
          <div className="d-flex align-items-center mb-3">
            <i className="bi bi-inbox-fill fs-2 me-3" style={{ color: '#006B3C' }}></i>
            <div>
              <h2 className="h4 mb-0" style={{ color: '#1E293B' }}>IT Staff Ticket Queue</h2>
              <p className="text-muted small mb-0">Operational triage & resolution queue</p>
            </div>
          </div>
          <div className="alert p-4 mb-0" style={{ backgroundColor: '#EAF6EF', color: '#0B7A46', borderColor: '#A7F3D0' }}>
            <i className="bi bi-info-circle me-2"></i>
            Logged in as <strong>{user?.name}</strong> (IT Staff). The triage queue interface is scheduled for implementation in Issue #36.
          </div>
        </div>
      </div>
    </div>
  );
}

function RequireAdmin() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'REQUESTER') return <Navigate to="/tickets" replace />;
  if (user.role !== 'ADMINISTRATOR') return <Navigate to="/" replace />;
  return <UserManagementPage />;
}

// ---------------------------------------------------------------------------
// App Shell (Zen Green Navbar + User context + Logout)
// ---------------------------------------------------------------------------

function AppShell() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    setUser(null);
    navigate('/login', { replace: true });
  }

  const roleBadge = user?.role === 'ADMINISTRATOR' ? 'Admin'
                  : user?.role === 'IT_STAFF' ? 'IT Staff'
                  : 'Requester';

  const landingUrl = user?.role === 'IT_STAFF' ? '/staff/queue'
                   : user?.role === 'ADMINISTRATOR' ? '/admin/users'
                   : '/';

  return (
    <div style={{ backgroundColor: '#F5F7F6', minHeight: '100vh' }}>
      <nav className="navbar navbar-expand-lg" style={{ backgroundColor: '#006B3C' }}>
        <div className="container d-flex justify-content-between">
          <Link className="navbar-brand text-white fw-bold d-flex align-items-center" to={landingUrl}>
            <i className="bi bi-clock-history me-2"></i>TokTickIT
          </Link>
          <div className="d-flex align-items-center gap-2">
            {user?.role === 'IT_STAFF' && (
              <Link className="text-white text-decoration-none fw-semibold me-1 d-none d-sm-inline" to="/staff/queue">
                <i className="bi bi-inbox me-1"></i>Ticket Queue
              </Link>
            )}
            {user?.role === 'ADMINISTRATOR' && (
              <Link className="text-white text-decoration-none fw-semibold me-1 d-none d-sm-inline" to="/admin/users">
                <i className="bi bi-people me-1"></i>User Management
              </Link>
            )}
            <span className="badge bg-light text-dark d-none d-sm-inline">{roleBadge}</span>
            <span className="text-white small text-truncate d-none d-md-inline" style={{ maxWidth: '150px' }}>
              <i className="bi bi-person me-1"></i>{user?.name}
            </span>
            <button
              className="btn btn-sm btn-outline-light d-flex align-items-center"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-1"></i>Logout
            </button>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login */}
          <Route path="/login" element={<LoginPage />} />

          {/* First-login forced password change */}
          <Route element={<RequirePasswordChange />}>
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<RoleLandingRoute />} />
              <Route path="/tickets" element={<RoleLandingRoute />} />
              <Route path="/ticket" element={<Navigate to="/tickets" replace />} />
              <Route path="/staff/queue" element={<RequireStaffQueue />} />
              <Route path="/admin/users" element={<RequireAdmin />} />
              <Route path="/tickets/create" element={<CreateTicketPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
