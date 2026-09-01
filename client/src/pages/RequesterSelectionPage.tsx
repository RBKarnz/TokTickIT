import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequester, RequesterUser } from '../RequesterContext.js';
import { fetchRequesters } from '../api.js';

export default function RequesterSelectionPage() {
  const { activeRequester, setActiveRequester } = useRequester();
  const navigate = useNavigate();
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    async function loadRequesters() {
      try {
        const data = await fetchRequesters();
        setRequesters(data);
        if (data.length > 0) {
          if (activeRequester && data.find(r => r.id === activeRequester.id)) {
            setSelectedId(String(activeRequester.id));
          } else {
            setSelectedId(String(data[0].id));
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load requesters');
      } finally {
        setLoading(false);
      }
    }
    loadRequesters();
  }, []);

  const handleContinue = () => {
    const requester = requesters.find(r => r.id === parseInt(selectedId));
    if (requester) {
      setActiveRequester(requester);
      navigate('/');
    }
  };

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#F5F7F6' }}>
      <div className="card shadow-sm p-4 w-100" style={{ maxWidth: '500px', border: '1px solid #E2E8F0' }}>
        <div className="text-center mb-4">
          <h2 style={{ color: '#006B3C', fontWeight: 'bold' }}>
            <i className="bi bi-clock-history me-2"></i>
            TokTickIT
          </h2>
        </div>
        
        <div className="text-center mb-4">
          <div className="d-inline-flex justify-content-center align-items-center rounded-circle mb-3" style={{ width: '60px', height: '60px', backgroundColor: '#EAF6EF', color: '#0B7A46' }}>
            <i className="bi bi-person-fill fs-2"></i>
          </div>
          <h4 style={{ color: '#0F172A', fontWeight: 600 }}>Select Development Requester</h4>
          <p className="text-muted small">Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen.</p>
        </div>

        {loading ? (
          <div className="text-center py-4"><span className="spinner-border" style={{ color: '#0B7A46' }} role="status"></span></div>
        ) : error ? (
          <div className="alert alert-danger" style={{ borderColor: '#B91C1C', color: '#B91C1C', backgroundColor: '#FEF2F2' }}>{error}</div>
        ) : requesters.length === 0 ? (
          <div className="alert alert-warning" style={{ color: '#D97706', backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>No active requesters found in database.</div>
        ) : (
          <div className="mb-3">
            <label className="form-label" style={{ fontWeight: 500, color: '#1E293B' }}>Development Requester <span className="text-danger">*</span></label>
            <select 
              className="form-select mb-3" 
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{ borderColor: '#E2E8F0', height: '44px', color: '#1E293B' }}
            >
              {requesters.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <div className="alert d-flex align-items-center mb-3 p-2" style={{ backgroundColor: '#EAF6EF', color: '#0B7A46', fontSize: '0.875rem', border: '1px solid #A7F3D0' }}>
              <i className="bi bi-info-circle me-2 ms-1"></i>
              Only active development requesters are shown.
            </div>

            <div className="alert d-flex align-items-start mb-4 p-3 bg-light text-muted border" style={{ fontSize: '0.875rem' }}>
              <i className="bi bi-shield-lock me-2 fs-5 mt-n1"></i>
              <div>
                <strong style={{ color: '#1E293B' }}>Authentication coming in Lab 3</strong>
                <div className="small mt-1">In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.</div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button 
                className="btn" 
                style={{ borderColor: activeRequester ? '#006B3C' : '#CBD5E1', color: activeRequester ? '#006B3C' : '#94A3B8', minHeight: '44px', fontWeight: 500 }}
                disabled={!activeRequester}
                onClick={() => navigate('/')}
              >
                Cancel
              </button>
              <button 
                className="btn btn-zen-primary" 
                style={{ minHeight: '44px', fontWeight: 500 }}
                onClick={handleContinue}
              >
                Continue <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
