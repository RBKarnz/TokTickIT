import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { RequesterProvider, useRequester } from "./RequesterContext.js";
import RequesterSelectionPage from "./pages/RequesterSelectionPage.js";
import CreateTicketPage from "./pages/CreateTicketPage.js";
import { checkSystem, Category } from "./api.js";

function ProtectedLayout() {
  const { activeRequester, setActiveRequester } = useRequester();
  
  if (!activeRequester) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ backgroundColor: '#F5F7F6', minHeight: '100vh' }}>
      {/* Zen Green Theme Navbar */}
      <nav className="navbar navbar-expand-lg" style={{ backgroundColor: '#006B3C' }}>
        <div className="container">
          <a className="navbar-brand text-white fw-bold d-flex align-items-center" href="/">
            <i className="bi bi-clock-history me-2"></i>TokTickIT
          </a>
          
          <div className="collapse navbar-collapse justify-content-end">
            <div className="dropdown">
              <button 
                className="btn text-white dropdown-toggle d-flex align-items-center border-0" 
                type="button" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
                style={{ backgroundColor: 'transparent' }}
              >
                <i className="bi bi-person me-2 fs-5"></i> {activeRequester.name}
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                <li><h6 className="dropdown-header">Context Menu</h6></li>
                <li>
                  <button className="dropdown-item text-danger" onClick={() => setActiveRequester(null)}>
                    <i className="bi bi-box-arrow-right me-2"></i> Switch Requester
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

// Home Component restoring Lab 1 functionality
type UiState = "idle" | "loading" | "success" | "error";

function TempHome() {
  const { activeRequester } = useRequester();
  
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
            Active Requester: <strong style={{ color: '#0F172A' }}>{activeRequester?.name}</strong>
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

export default function App() {
  return (
    <RequesterProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<RequesterSelectionPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<TempHome />} />
            <Route path="/tickets/create" element={<CreateTicketPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RequesterProvider>
  );
}
