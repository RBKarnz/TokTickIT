import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.js';
import { fetchTicketDetail, uploadAttachment, downloadAttachment, removeAttachment, fetchPublicComments, postPublicComment, markProblemResolved, PublicComment } from '../api.js';
import { getPriorityBadge, getStatusBadge } from '../utils.js';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
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

  // Public Comments state
  const [activeTab, setActiveTab] = useState<'attachments' | 'comments'>('attachments');
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Problem Appears Resolved state
  const [isMarkingResolved, setIsMarkingResolved] = useState(false);
  const [resolveSuccessMsg, setResolveSuccessMsg] = useState('');
  const [resolveError, setResolveError] = useState('');

  const loadComments = async (ticketId: number) => {
    setLoadingComments(true);
    try {
      const data = await fetchPublicComments(ticketId);
      setComments(data);
    } catch (err: any) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadTicket = async () => {
    if (!user || !id) return;
    try {
      const data = await fetchTicketDetail(parseInt(id));
      setTicket(data);
      setError('');
      loadComments(data.id);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTicket();
  }, [id, user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadError('');
    setIsUploading(true);

    try {
      await uploadAttachment(parseInt(id!), file);
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
      await downloadAttachment(attachmentId, filename);
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
      await removeAttachment(fileToRemove!, removeReason);
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

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || newComment.length > 4000) return;
    setIsPostingComment(true);
    setCommentError('');
    try {
      const created = await postPublicComment(ticket.id, newComment.trim());
      setComments((prev) => [...prev, created]);
      setNewComment('');
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleProblemResolved = async () => {
    if (!ticket) return;
    setIsMarkingResolved(true);
    setResolveError('');
    setResolveSuccessMsg('');
    try {
      const result = await markProblemResolved(ticket.id);
      setTicket((prev: any) => ({
        ...prev,
        requesterResolvedAt: result.requesterResolvedAt,
      }));
      setResolveSuccessMsg('You indicated that the problem appears resolved. IT Staff has been notified.');
    } catch (err: any) {
      setResolveError(err.message || 'Failed to mark problem as resolved');
    } finally {
      setIsMarkingResolved(false);
    }
  };



  if (loading) {
    return <div className="text-center py-5"><span className="spinner-border" style={{ color: '#0B7A46' }} role="status"></span></div>;
  }

  if (error) {
    const isNotFound = error.toLowerCase().includes('not found');
    const isAccessDenied = !isNotFound && (error.toLowerCase().includes('access denied') || error.toLowerCase().includes('forbidden') || error.toLowerCase().includes('permission'));
    const isStaff = user?.role === 'IT_STAFF';

    let errorDetail = error;
    if (isNotFound) {
      errorDetail = 'The requested ticket could not be found or may have been deleted.';
    } else if (isAccessDenied) {
      errorDetail = 'You do not have permission to view or manage this ticket.';
    }

    return (
      <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="card shadow border-danger" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="card-body text-center p-5">
            <i className={`bi ${isNotFound ? 'bi-search' : 'bi-shield-x'} text-danger`} style={{ fontSize: '4rem' }}></i>
            <h2 className="mt-3 text-danger fw-bold">
              {isNotFound ? 'Ticket Not Found' : 'Access Denied'}
            </h2>
            <p className="lead text-muted mt-3 mb-4">{errorDetail}</p>
            <Link
              to={isStaff ? '/staff/queue' : '/'}
              className="btn btn-outline-danger px-4 py-2 fw-bold"
            >
              <i className="bi bi-arrow-left me-2"></i> {isStaff ? 'Return to Ticket Queue' : 'Return to My Tickets'}
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
                <Link
                  to={user?.role === 'IT_STAFF' ? '/staff/queue' : '/'}
                  className="text-decoration-none"
                  style={{ color: '#0B7A46' }}
                >
                  {user?.role === 'IT_STAFF' ? 'Ticket Queue' : 'My Tickets'}
                </Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page" style={{ color: '#1E293B' }}>
                {ticket.ticketNumber}
              </li>
            </ol>
          </nav>
          <Link
            to={user?.role === 'IT_STAFF' ? '/staff/queue' : '/'}
            className="btn btn-sm btn-outline-secondary d-flex align-items-center"
            style={{ borderColor: '#006B3C', color: '#006B3C' }}
          >
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

            {/* Problem Appears Resolved Section */}
            {ticket.requesterResolvedAt ? (
              <div className="alert alert-success d-flex align-items-center mt-3 py-2 px-3 small" role="alert">
                <i className="bi bi-check-circle-fill fs-5 me-2" style={{ color: '#006B3C' }}></i>
                <span>
                  <strong>Problem marked as resolved:</strong> You indicated this issue appears resolved on {new Date(ticket.requesterResolvedAt).toLocaleString()}. Note: formal ticket status is determined by IT Staff.
                </span>
              </div>
            ) : (
              user?.role === 'REQUESTER' &&
              ticket.requesterId === user.id &&
              ticket.currentStatus !== 'CLOSED' &&
              ticket.currentStatus !== 'CANCELLED' && (
                <div className="mt-3 pt-3 border-top">
                  {resolveError && <div className="alert alert-danger py-1 small mb-2">{resolveError}</div>}
                  {resolveSuccessMsg && <div className="alert alert-success py-1 small mb-2">{resolveSuccessMsg}</div>}
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                    <div>
                      <h6 className="mb-0 fw-bold" style={{ color: '#1E293B', fontSize: '0.9rem' }}>Is your issue resolved?</h6>
                      <small className="text-muted">
                        Notifies IT staff that your issue may be resolved. This does not immediately close the ticket.
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success d-flex align-items-center flex-shrink-0"
                      style={{ borderColor: '#006B3C', color: '#006B3C' }}
                      onClick={handleProblemResolved}
                      disabled={isMarkingResolved}
                    >
                      {isMarkingResolved ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-circle me-2"></i>
                          Problem Appears Resolved
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <ul className="nav nav-tabs mb-3" style={{ borderBottomColor: '#E2E8F0' }}>
          <li className="nav-item">
            <button
              className={`nav-link fw-bold ${activeTab === 'attachments' ? 'active' : 'text-muted'}`}
              style={{
                color: activeTab === 'attachments' ? '#0B7A46' : undefined,
                borderBottomColor: activeTab === 'attachments' ? '#F5F7F6' : undefined,
              }}
              onClick={() => setActiveTab('attachments')}
            >
              <i className="bi bi-paperclip me-1"></i> Attachments ({activeAttachments.length})
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link fw-bold ${activeTab === 'comments' ? 'active' : 'text-muted'}`}
              style={{
                color: activeTab === 'comments' ? '#0B7A46' : undefined,
                borderBottomColor: activeTab === 'comments' ? '#F5F7F6' : undefined,
              }}
              onClick={() => setActiveTab('comments')}
            >
              <i className="bi bi-chat-left-text me-1"></i> Public Comments <span className="badge bg-secondary ms-1">{comments.length}</span>
            </button>
          </li>
        </ul>

        <div className="card shadow-sm border-0 mb-5">
          <div className="card-body p-4">
            {activeTab === 'attachments' && (
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
            )}

            {activeTab === 'comments' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 fw-bold" style={{ color: '#1E293B' }}>
                    <i className="bi bi-chat-left-text me-2" style={{ color: '#006B3C' }}></i>
                    Public Comments
                  </h6>
                  <small className="text-muted">Comments are visible to you and IT Staff</small>
                </div>

                {commentError && (
                  <div className="alert alert-danger py-2 small mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>{commentError}
                  </div>
                )}

                {loadingComments ? (
                  <div className="text-center py-4">
                    <span className="spinner-border spinner-border-sm text-success me-2"></span>
                    <span className="text-muted small">Loading comments...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-4 rounded mb-4" style={{ backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1' }}>
                    <i className="bi bi-chat-dots fs-3 text-muted mb-2 d-block"></i>
                    <p className="text-muted small mb-0">No public comments yet.</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    {comments.map((cmt) => (
                      <div
                        key={cmt.id}
                        className="card mb-3 border-0 shadow-sm"
                        style={{ backgroundColor: cmt.author?.role === 'REQUESTER' ? '#F8FAFC' : '#F0FDF4' }}
                      >
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center">
                              <span className="fw-bold me-2" style={{ color: '#1E293B', fontSize: '0.9rem' }}>
                                {cmt.author?.name || 'User'}
                              </span>
                              <span
                                className={`badge ${
                                  cmt.author?.role === 'REQUESTER'
                                    ? 'bg-secondary'
                                    : cmt.author?.role === 'IT_STAFF'
                                    ? 'bg-success'
                                    : 'bg-primary'
                                }`}
                                style={{ fontSize: '0.75rem' }}
                              >
                                {cmt.author?.role === 'IT_STAFF' ? 'IT Staff' : cmt.author?.role === 'ADMINISTRATOR' ? 'Admin' : 'Requester'}
                              </span>
                            </div>
                            <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                              {new Date(cmt.createdAt).toLocaleString()}
                            </small>
                          </div>
                          <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: '0.95rem' }}>
                            {cmt.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Compose Comment Form */}
                <form onSubmit={handlePostComment} className="mt-4 pt-3 border-top">
                  <label htmlFor="newCommentContent" className="form-label fw-bold small text-muted">
                    Add a Public Comment
                  </label>
                  <textarea
                    id="newCommentContent"
                    className="form-control mb-2"
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Provide additional details, respond to questions, or update IT staff..."
                    disabled={isPostingComment}
                    maxLength={4000}
                  ></textarea>
                  <div className="d-flex justify-content-between align-items-center">
                    <small className={`small ${newComment.length > 3900 ? 'text-danger fw-bold' : 'text-muted'}`}>
                      {newComment.length} / 4000 characters
                    </small>
                    <button
                      type="submit"
                      className="btn btn-sm btn-zen-primary"
                      style={{ backgroundColor: '#006B3C', borderColor: '#006B3C', color: '#FFFFFF' }}
                      disabled={isPostingComment || newComment.trim().length === 0 || newComment.length > 4000}
                    >
                      {isPostingComment ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Posting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send me-1"></i> Post Comment
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
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
