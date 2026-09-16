import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.js';
import LoginPage from './pages/LoginPage.js';
import ChangePasswordPage from './pages/ChangePasswordPage.js';
import MyTicketsPage from './pages/MyTicketsPage.js';
import CreateTicketPage from './pages/CreateTicketPage.js';
import TicketDetailPage from './pages/TicketDetailPage.js';
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
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#F5F7F6' }}>
    <div className="spinner-border" style={{ color: '#006B3C', width: '3rem', height: '3rem' }} role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

/** Blocks unauthenticated users and redirects first-login users to change password */
function RequireAuth() {
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
  if (!user.mustChangePassword) return <Navigate to="/" replace />;
  return <Outlet />;
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

  return (
    <div style={{ backgroundColor: '#F5F7F6', minHeight: '100vh' }}>
      <nav className="navbar navbar-expand-lg" style={{ backgroundColor: '#006B3C' }}>
        <div className="container d-flex justify-content-between">
          <a className="navbar-brand text-white fw-bold d-flex align-items-center" href="/">
            <i className="bi bi-clock-history me-2"></i>TokTickIT
          </a>
          <div className="d-flex align-items-center gap-3">
            <span className="badge bg-light text-dark">{roleBadge}</span>
            <span className="text-white small text-truncate" style={{ maxWidth: '150px' }}>
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
              <Route path="/" element={<MyTicketsPage />} />
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
