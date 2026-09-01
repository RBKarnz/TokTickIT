import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRequester } from '../RequesterContext.js';
import { fetchTicketDetail } from '../api.js';
import { getPriorityBadge, getStatusBadge } from '../utils.js';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { activeRequester } = useRequester();
  
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dummy tab state
  const [activeTab, setActiveTab] = useState('attachments');

  useEffect(() => {
    async function loadTicket() {
      if (!activeRequester || !id) return;
      setLoading(true);
      try {
        const data = await fetchTicketDetail(parseInt(id), activeRequester.id);
        setTicket(data);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    }
    loadTicket();
  }, [id, activeRequester]);



  if (loading) {
    return <div className="text-center py-5"><span className="spinner-border" style={{ color: '#0B7A46' }} role="status"></span></div>;
  }

  if (error) {
    return (
      <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="card shadow border-danger" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="card-body text-center p-5">
            <i className="bi bi-shield-x text-danger" style={{ fontSize: '4rem' }}></i>
            <h2 className="mt-3 text-danger fw-bold">Access Denied / Not Found</h2>
            <p className="lead text-muted mt-3 mb-4">{error}</p>
            <Link to="/" className="btn btn-outline-danger px-4 py-2 fw-bold">
              <i className="bi bi-arrow-left me-2"></i> Return to My Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="container py-4" style={{ maxWidth: '900px' }}>
      {/* Header & Breadcrumb */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to="/" className="text-decoration-none" style={{ color: '#0B7A46' }}>My Tickets</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page" style={{ color: '#1E293B' }}>
              {ticket.ticketNumber}
            </li>
          </ol>
        </nav>
        <Link to="/" className="btn btn-sm btn-outline-secondary d-flex align-items-center" style={{ borderColor: '#006B3C', color: '#006B3C' }}>
          <i className="bi bi-arrow-left me-2"></i> Back
        </Link>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0" style={{ color: '#1E293B', fontWeight: 600 }}>Ticket Details</h5>
          <div className="text-muted small">
            Created: {new Date(ticket.createdAt).toLocaleDateString()}
          </div>
        </div>
        
        <div className="card-body p-4">
          <div className="row g-4 mb-4">
            <div className="col-12 col-md-4">
              <label className="form-label text-muted small fw-bold mb-1">Requester</label>
              <div className="form-control" style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}>
                {ticket.requester.name}
              </div>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label text-muted small fw-bold mb-1">Category</label>
              <div className="form-control" style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}>
                {ticket.category.name}
              </div>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label text-muted small fw-bold mb-1">Related System</label>
              <div className="form-control" style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}>
                {ticket.relatedSystem.name}
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-6 col-md-4">
              <label className="form-label text-muted small fw-bold mb-1">Priority</label>
              <div className="d-block mt-2">{getPriorityBadge(ticket.requestedPriority)}</div>
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label text-muted small fw-bold mb-1">Status</label>
              <div className="d-block mt-2">{getStatusBadge(ticket.currentStatus)}</div>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label text-muted small fw-bold mb-1">Last Updated</label>
              <div className="form-control" style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}>
                {new Date(ticket.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          <hr style={{ borderColor: '#E2E8F0' }} />

          <div className="mb-4 mt-4">
            <label className="form-label text-muted small fw-bold mb-1">Summary</label>
            <div className="form-control" style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}>
              {ticket.summary}
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label text-muted small fw-bold mb-1">Description</label>
            <div className="form-control" style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155', minHeight: '120px', whiteSpace: 'pre-wrap' }}>
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <ul className="nav nav-tabs mb-3" style={{ borderBottomColor: '#E2E8F0' }}>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'attachments' ? 'active fw-bold' : 'text-muted'}`} onClick={() => setActiveTab('attachments')} style={{ color: activeTab === 'attachments' ? '#0B7A46' : '', borderBottomColor: activeTab === 'attachments' ? '#F5F7F6' : '' }}>
            <i className="bi bi-paperclip me-1"></i> Attachments ({ticket.attachments?.length || 0})
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link text-muted disabled" style={{ cursor: 'not-allowed' }}>
            Public Comments <span className="badge bg-secondary ms-1">0</span>
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link text-muted disabled" style={{ cursor: 'not-allowed' }}>
            Internal Notes
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link text-muted disabled" style={{ cursor: 'not-allowed' }}>
            Actions Taken
          </button>
        </li>
      </ul>

      <div className="card shadow-sm border-0 mb-5">
        <div className="card-body p-4">
          {activeTab === 'attachments' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="mb-0" style={{ color: '#1E293B' }}>Attached Files</h6>
                <button className="btn btn-sm btn-outline-secondary d-flex align-items-center disabled" style={{ borderColor: '#006B3C', color: '#006B3C', cursor: 'not-allowed' }}>
                  <i className="bi bi-plus-circle me-2"></i> Add Attachment
                </button>
              </div>

              {(!ticket.attachments || ticket.attachments.length === 0) ? (
                <div className="text-center py-4 rounded" style={{ backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1' }}>
                  <i className="bi bi-file-earmark-x fs-3 text-muted mb-2 d-block"></i>
                  <p className="text-muted small mb-0">No attachments found for this ticket.</p>
                </div>
              ) : (
                <div className="list-group">
                  {ticket.attachments.map((file: any) => (
                    <div key={file.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 border-0 rounded shadow-sm mb-2" style={{ backgroundColor: '#F8FAFC' }}>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-file-earmark-text fs-4 me-3" style={{ color: '#006B3C' }}></i>
                        <div>
                          <h6 className="mb-0" style={{ color: '#1E293B', fontSize: '0.95rem' }}>{file.originalFilename}</h6>
                          <small className="text-muted">{(file.fileSize / 1024).toFixed(2)} KB • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</small>
                        </div>
                      </div>
                      <div>
                        <button className="btn btn-sm btn-light me-2 disabled" title="Download">
                          <i className="bi bi-download text-primary"></i>
                        </button>
                        <button className="btn btn-sm btn-light disabled" title="Remove">
                          <i className="bi bi-trash text-danger"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
