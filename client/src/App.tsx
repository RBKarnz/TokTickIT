import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { RequesterProvider, useRequester } from "./RequesterContext.js";
import RequesterSelectionPage from "./pages/RequesterSelectionPage.js";
import CreateTicketPage from "./pages/CreateTicketPage.js";

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
          <a className="navbar-brand text-white fw-bold" href="/">
            <i className="bi bi-clock-history me-2"></i>TokTickIT
          </a>
          <div className="d-flex align-items-center text-white">
            <span className="me-3 d-flex align-items-center bg-white bg-opacity-10 px-3 py-1 rounded-pill">
              <i className="bi bi-person-circle me-2"></i>
              {activeRequester.name}
            </span>
            <button className="btn btn-sm text-white" style={{ borderColor: 'rgba(255,255,255,0.5)' }} onClick={() => {
              setActiveRequester(null);
            }}>Change</button>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

// Temporary Home Component to show context works
function TempHome() {
  const { activeRequester } = useRequester();
  return (
    <div className="container py-5">
      <div className="alert" style={{ backgroundColor: '#EAF6EF', color: '#0B7A46', borderColor: '#A7F3D0' }}>
        <h4><i className="bi bi-check-circle-fill me-2"></i>Context Active</h4>
        <p className="mb-0">You are currently testing as <strong>{activeRequester?.name}</strong> (ID: {activeRequester?.id}).</p>
        <p className="mb-0 small">The <code>X-Requester-Id</code> header will now be used for API requests.</p>
      </div>
      
      <div className="mt-4">
        <a href="/tickets/create" className="btn text-white" style={{ backgroundColor: '#006B3C' }}>
          Create New Ticket
        </a>
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
