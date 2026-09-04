import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRequester } from '../RequesterContext.js';
import { fetchTicketDetail, uploadAttachment, downloadAttachment, removeAttachment } from '../api.js';
import { getPriorityBadge, getStatusBadge } from '../utils.js';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { activeRequester } = useRequester();
  
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Attachments state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);
  
  // Custom Modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [fileToRemove, setFileToRemove] = useState<number | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  const loadTicket = async () => {
    if (!activeRequester || !id) return;
    try {
      const data = await fetchTicketDetail(parseInt(id), activeRequester.id);
      setTicket(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTicket();
  }, [id, activeRequester]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadError('');
    setIsUploading(true);

    try {
      await uploadAttachment(parseInt(id!), file, activeRequester!.id);
      await loadTicket();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (attachmentId: number, filename: string) => {
    try {
      await downloadAttachment(attachmentId, filename, activeRequester!.id);
    } catch (err: any) {
      alert(err.message || 'Failed to download file');
    }
  };

  const openRemoveModal = (attachmentId: number) => {
    setFileToRemove(attachmentId);
    setRemoveReason('');
    setShowRemoveModal(true);
  };

  const confirmRemove = async () => {
    if (removeReason.trim() === '') {
      alert("Removal reason is required.");
      return;
    }
    
    setRemovingId(fileToRemove);
    try {
      await removeAttachment(fileToRemove!, removeReason, activeRequester!.id);
      await loadTicket();
      setShowRemoveModal(false);
      setFileToRemove(null);
      setRemoveReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to remove file');
    } finally {
      setRemovingId(null);
    }
  };


  if (loading) {
    return <div className="text-center py-5"><span className="spinner-border" style={{ color: '#0B7A46' }} role="status"></span></div>;
  }

  if (error) {
    const isNotFound = error.toLowerCase().includes('not found');
    
    return (
      <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="card shadow border-danger" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="card-body text-center p-5">
            <i className={`bi ${isNotFound ? 'bi-search' : 'bi-shield-x'} text-danger`} style={{ fontSize: '4rem' }}></i>
            <h2 className="mt-3 text-danger fw-bold">
              {isNotFound ? 'Ticket Not Found' : 'Access Denied'}
            </h2>
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

  const activeAttachments = ticket.attachments?.filter((a: any) => !a.isRemoved) || [];
  
  // Sort attachments: Active first, Removed later. Within each group: Oldest to Newest.
  const sortedAttachments = [...(ticket.attachments || [])].sort((a: any, b: any) => {
    if (a.isRemoved !== b.isRemoved) {
      return a.isRemoved ? 1 : -1; // Active (-1) comes before Removed (1)
    }
    return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(); // Ascending
  });

  return (
    <>
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

        {/* Tabs Section - Lab 2 Placeholder Specs */}
        <ul className="nav nav-tabs mb-3" style={{ borderBottomColor: '#E2E8F0' }}>
          <li className="nav-item">
            <button className="nav-link active fw-bold" style={{ color: '#0B7A46', borderBottomColor: '#F5F7F6' }}>
              <i className="bi bi-paperclip me-1"></i> Attachments ({activeAttachments.length})
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
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="mb-0" style={{ color: '#1E293B' }}>Attached Files <span className="badge bg-secondary ms-2">{activeAttachments.length} / 5</span></h6>
                <div>
                  <input
                    type="file"
                    id="detailUpload"
                    className="d-none"
                    onChange={handleFileUpload}
                    disabled={isUploading || activeAttachments.length >= 5}
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                  />
                  <label htmlFor="detailUpload" className={`btn btn-sm btn-outline-secondary d-flex align-items-center ${isUploading || activeAttachments.length >= 5 ? 'disabled' : ''}`} style={{ borderColor: '#006B3C', color: '#006B3C', cursor: activeAttachments.length >= 5 ? 'not-allowed' : 'pointer' }}>
                    {isUploading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-plus-circle me-2"></i>}
                    Add Attachment
                  </label>
                </div>
              </div>

              {uploadError && <div className="alert alert-danger py-2 small">{uploadError}</div>}

              {(!ticket.attachments || ticket.attachments.length === 0) ? (
                <div className="text-center py-4 rounded" style={{ backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1' }}>
                  <i className="bi bi-file-earmark-x fs-3 text-muted mb-2 d-block"></i>
                  <p className="text-muted small mb-0">No attachments found for this ticket.</p>
                </div>
              ) : (
                <div className="list-group">
                  {sortedAttachments.map((file: any) => (
                    <div key={file.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 border-0 rounded shadow-sm mb-2" style={{ backgroundColor: file.isRemoved ? '#F1F5F9' : '#F8FAFC' }}>
                      <div className="d-flex align-items-center text-truncate" style={{ maxWidth: '75%', opacity: file.isRemoved ? 0.6 : 1 }}>
                        <i className={`bi ${file.isRemoved ? 'bi-file-earmark-x' : 'bi-file-earmark-text'} fs-4 me-3`} style={{ color: file.isRemoved ? '#94A3B8' : '#006B3C' }}></i>
                        <div className="text-truncate">
                          <h6 className="mb-0 text-truncate" style={{ color: '#1E293B', fontSize: '0.95rem', textDecoration: file.isRemoved ? 'line-through' : 'none' }}>
                            {file.originalFilename}
                          </h6>
                          <small className="text-muted">
                            {(file.fileSize / 1024 / 1024).toFixed(2)} MB • Uploaded {new Date(file.uploadedAt).toLocaleString('en-US')}
                            {file.isRemoved && (
                              <span className="badge bg-danger ms-2">Removed</span>
                            )}
                          </small>
                        </div>
                      </div>
                      <div className="d-flex">
                        {!file.isRemoved && (
                          <>
                            <button 
                              className="btn btn-sm btn-light me-2" 
                              title="Download"
                              onClick={() => handleDownload(file.id, file.originalFilename)}
                            >
                              <i className="bi bi-download text-primary"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-light" 
                              title="Remove"
                              onClick={() => openRemoveModal(file.id)}
                            >
                              <i className="bi bi-trash text-danger"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Modal for Removal Reason */}
      {showRemoveModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header" style={{ borderBottomColor: '#E2E8F0' }}>
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i> Remove Attachment
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowRemoveModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Please provide a reason for removing this file. This action cannot be undone.</p>
                <div className="mb-3">
                  <label className="form-label fw-bold">Reason</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    value={removeReason} 
                    onChange={(e) => setRemoveReason(e.target.value)}
                    placeholder="Enter reason here..."
                    autoFocus
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTopColor: '#E2E8F0' }}>
                <button type="button" className="btn btn-light" onClick={() => setShowRemoveModal(false)}>Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-danger d-flex align-items-center" 
                  onClick={confirmRemove}
                  disabled={removingId !== null || removeReason.trim() === ''}
                >
                  {removingId !== null ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-trash me-2"></i>}
                  Confirm Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
