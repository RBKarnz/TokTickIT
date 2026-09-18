import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.js';
import {
  fetchTicketDetail,
  fetchStaffTicketDetail,
  uploadAttachment,
  downloadAttachment,
  removeAttachment,
  fetchPublicComments,
  postPublicComment,
  markProblemResolved,
  claimTicket,
  assignTicketOwner,
  updateTicketItPriority,
  updateTicketStatus,
  fetchStaffUsers,
  fetchInternalNotes,
  postInternalNote,
  PublicComment,
  InternalNote,
} from '../api.js';
import { getPriorityBadge, getStatusBadge } from '../utils.js';

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  CANCELLED: [],
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_REQUESTER: 'Waiting for Requester',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled',
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const isStaff = user?.role === 'IT_STAFF';
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const isStaffOrAdmin = isStaff || isAdmin;

  const [ticket, setTicket] = useState<any>(null);
  const isOwnerRequester = user?.role === 'REQUESTER' && ticket?.requesterId === user?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Operations state
  const [staffUsers, setStaffUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | string>('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedItPriority, setSelectedItPriority] = useState('');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [operationSuccessMsg, setOperationSuccessMsg] = useState('');
  const [operationErrorMsg, setOperationErrorMsg] = useState('');

  // Status transition & Confirmation Modal state
  const [selectedTargetStatus, setSelectedTargetStatus] = useState<string>('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [resolutionSummaryInput, setResolutionSummaryInput] = useState('');
  const [isTransitioningStatus, setIsTransitioningStatus] = useState(false);
  const [statusModalError, setStatusModalError] = useState('');

  // Attachments state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [fileToRemove, setFileToRemove] = useState<number | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  // Public Comments state
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Internal Notes state (Staff & Admin only)
  const [activeTab, setActiveTab] = useState<'attachments' | 'comments' | 'notes'>('attachments');
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isPostingNote, setIsPostingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  // Problem Appears Resolved state (Requester only)
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

  const loadNotes = async (ticketId: number) => {
    setLoadingNotes(true);
    try {
      const data = await fetchInternalNotes(ticketId);
      setInternalNotes(data);
    } catch (err: any) {
      console.error('Failed to load internal notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const loadTicket = async () => {
    if (!user || !id) return;
    try {
      const ticketId = parseInt(id);
      const data = isStaffOrAdmin ? await fetchStaffTicketDetail(ticketId) : await fetchTicketDetail(ticketId);
      setTicket(data);
      setSelectedItPriority(data.itPriority || data.requestedPriority || 'MEDIUM');
      setSelectedOwnerId(data.ownerId || (data.owner ? data.owner.id : ''));
      setError('');
      loadComments(data.id);
      if (isStaffOrAdmin) {
        loadNotes(data.id);
      }
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

  useEffect(() => {
    if (isStaff) {
      fetchStaffUsers()
        .then((res) => {
          if (res && res.users) {
            setStaffUsers(res.users);
          }
        })
        .catch(console.error);
    }
  }, [isStaff]);

  const handleClaim = async () => {
    if (!ticket) return;
    setIsClaiming(true);
    setOperationErrorMsg('');
    setOperationSuccessMsg('');
    try {
      const updated = await claimTicket(ticket.id);
      setTicket((prev: any) => ({
        ...prev,
        ownerId: user?.id,
        owner: updated.owner || { id: user?.id, name: user?.name, email: user?.email },
      }));
      setSelectedOwnerId(user?.id || '');
      setOperationSuccessMsg('Ticket successfully claimed!');
    } catch (err: any) {
      setOperationErrorMsg(err.message || 'Failed to claim ticket');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleAssignOwner = async () => {
    if (!ticket || !selectedOwnerId) return;
    setIsAssigning(true);
    setOperationErrorMsg('');
    setOperationSuccessMsg('');
    try {
      const updated = await assignTicketOwner(ticket.id, Number(selectedOwnerId));
      const targetUser = staffUsers.find((u) => u.id === Number(selectedOwnerId));
      setTicket((prev: any) => ({
        ...prev,
        ownerId: Number(selectedOwnerId),
        owner: updated.owner || targetUser || prev.owner,
      }));
      setOperationSuccessMsg('Ticket owner updated successfully!');
    } catch (err: any) {
      setOperationErrorMsg(err.message || 'Failed to assign owner');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateItPriority = async (newPriority: string) => {
    if (!ticket) return;
    setIsUpdatingPriority(true);
    setSelectedItPriority(newPriority);
    setOperationErrorMsg('');
    setOperationSuccessMsg('');
    try {
      const updated = await updateTicketItPriority(ticket.id, newPriority);
      setTicket((prev: any) => ({
        ...prev,
        itPriority: updated.itPriority || newPriority,
      }));
      setOperationSuccessMsg(`IT Priority updated to ${newPriority}`);
    } catch (err: any) {
      setOperationErrorMsg(err.message || 'Failed to update IT Priority');
      setSelectedItPriority(ticket.itPriority || ticket.requestedPriority);
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleInitiateStatusChange = (newStatus: string) => {
    setOperationErrorMsg('');
    setOperationSuccessMsg('');
    if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(newStatus)) {
      setTargetStatus(newStatus);
      setResolutionSummaryInput(ticket?.resolutionSummary || '');
      setStatusModalError('');
      setShowStatusModal(true);
    } else {
      executeStatusChange(newStatus);
    }
  };

  const executeStatusChange = async (statusToSet: string, summary?: string) => {
    setIsTransitioningStatus(true);
    setStatusModalError('');
    try {
      const updated = await updateTicketStatus(ticket.id, statusToSet, summary);
      setTicket((prev: any) => ({
        ...prev,
        ...updated,
        currentStatus: updated.currentStatus || statusToSet,
        resolutionSummary: summary !== undefined ? summary : prev.resolutionSummary,
      }));
      setOperationSuccessMsg(`Status successfully updated to ${STATUS_LABELS[statusToSet] || statusToSet}`);
      setShowStatusModal(false);
      setTargetStatus('');
      setSelectedTargetStatus('');
      setResolutionSummaryInput('');
    } catch (err: any) {
      if (showStatusModal) {
        setStatusModalError(err.message || 'Failed to update status');
      } else {
        setOperationErrorMsg(err.message || 'Failed to update status');
      }
    } finally {
      setIsTransitioningStatus(false);
    }
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setTargetStatus('');
    setSelectedTargetStatus('');
    setStatusModalError('');
  };

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
      alert('Removal reason is required.');
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

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || newNote.length > 4000) return;
    setIsPostingNote(true);
    setNoteError('');
    try {
      const created = await postInternalNote(ticket.id, newNote.trim());
      setInternalNotes((prev) => [...prev, created]);
      setNewNote('');
    } catch (err: any) {
      setNoteError(err.message || 'Failed to post internal note');
    } finally {
      setIsPostingNote(false);
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
    return (
      <div className="text-center py-5">
        <span className="spinner-border" style={{ color: '#0B7A46' }} role="status"></span>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.toLowerCase().includes('not found') || error.includes('404');
    const isAccessDenied =
      !isNotFound &&
      (error.toLowerCase().includes('access denied') ||
        error.toLowerCase().includes('forbidden') ||
        error.toLowerCase().includes('permission'));

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
            <h2 className="mt-3 text-danger fw-bold">{isNotFound ? 'Ticket Not Found' : 'Access Denied'}</h2>
            <p className="lead text-muted mt-3 mb-4">{errorDetail}</p>
            <Link
              to={isStaffOrAdmin ? '/staff/queue' : '/'}
              className="btn btn-outline-danger px-4 py-2 fw-bold"
            >
              <i className="bi bi-arrow-left me-2"></i>{' '}
              {isStaffOrAdmin ? 'Return to Ticket Queue' : 'Return to My Tickets'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const activeAttachments = ticket.attachments?.filter((a: any) => !a.isRemoved) || [];
  const sortedAttachments = [...(ticket.attachments || [])].sort((a: any, b: any) => {
    if (a.isRemoved !== b.isRemoved) {
      return a.isRemoved ? 1 : -1;
    }
    return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
  });

  const availableTransitions = ALLOWED_STATUS_TRANSITIONS[ticket.currentStatus] || [];

  return (
    <>
      <div className="container py-4" style={{ maxWidth: '960px' }}>
        {/* Header & Breadcrumb */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link
                  to={isStaffOrAdmin ? '/staff/queue' : '/'}
                  className="text-decoration-none"
                  style={{ color: '#0B7A46' }}
                >
                  {isStaffOrAdmin ? 'My Queue' : 'My Tickets'}
                </Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page" style={{ color: '#1E293B' }}>
                {isStaffOrAdmin ? 'Ticket Detail' : ticket.ticketNumber}
              </li>
            </ol>
          </nav>
          <Link
            to={isStaffOrAdmin ? '/staff/queue' : '/'}
            className="btn btn-sm btn-outline-secondary d-flex align-items-center"
            style={{ borderColor: '#006B3C', color: '#006B3C' }}
          >
            <i className="bi bi-arrow-left me-2"></i> {isStaffOrAdmin ? 'Back to Queue' : 'Back'}
          </Link>
        </div>

        {/* Global Operation Messages */}
        {operationSuccessMsg && (
          <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i>
            {operationSuccessMsg}
            <button type="button" className="btn-close" onClick={() => setOperationSuccessMsg('')}></button>
          </div>
        )}
        {operationErrorMsg && (
          <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {operationErrorMsg}
            <button type="button" className="btn-close" onClick={() => setOperationErrorMsg('')}></button>
          </div>
        )}

        {/* Requester Notification for Staff/Admin */}
        {ticket.requesterResolvedAt && isStaffOrAdmin && (
          <div className="alert alert-info d-flex align-items-center mb-4 py-3 px-3 shadow-sm border-info-subtle" role="alert">
            <i className="bi bi-info-circle-fill fs-4 me-3 text-info"></i>
            <div>
              <strong>Requester Notification:</strong> Requester indicated that the problem appears resolved on{' '}
              {new Date(ticket.requesterResolvedAt).toLocaleString()}. Note: formal ticket status change requires IT Staff action.
            </div>
          </div>
        )}

        {/* Ticket Details Card */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0 fw-bold" style={{ color: '#1E293B' }}>{ticket.ticketNumber}</h5>
              <span className="text-muted small">|</span>
              <span className="text-muted small">Ticket Details</span>
            </div>
            <div className="text-muted small">
              Created: {new Date(ticket.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className="card-body p-4">
            {/* Meta Row 1: Requester, Category, Related System */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-md-4">
                <label className="form-label text-muted small fw-bold mb-1">Requester</label>
                <div
                  className="form-control"
                  style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}
                >
                  {ticket.requester?.name || 'Unknown'}
                </div>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label text-muted small fw-bold mb-1">Category</label>
                <div
                  className="form-control"
                  style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}
                >
                  {ticket.category?.name || 'Uncategorized'}
                </div>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label text-muted small fw-bold mb-1">Related System</label>
                <div
                  className="form-control"
                  style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}
                >
                  {ticket.relatedSystem?.name || 'None'}
                </div>
              </div>
            </div>

            {/* Meta Row 2: Status, Requested Priority, IT Priority, Last Updated */}
            <div className="row g-4 mb-4">
              <div className="col-6 col-md-3">
                <label className="form-label text-muted small fw-bold mb-1">Status</label>
                <div className="d-block mt-2">{getStatusBadge(ticket.currentStatus)}</div>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label text-muted small fw-bold mb-1">Requested Priority</label>
                <div className="d-block mt-2">{getPriorityBadge(ticket.requestedPriority)}</div>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label text-muted small fw-bold mb-1">IT Priority</label>
                {isStaff ? (
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <select
                      className="form-select form-select-sm"
                      value={selectedItPriority}
                      onChange={(e) => handleUpdateItPriority(e.target.value)}
                      disabled={isUpdatingPriority || ticket.currentStatus === 'CLOSED' || ticket.currentStatus === 'CANCELLED'}
                      style={{ maxWidth: '140px' }}
                      aria-label="IT Priority"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                    {isUpdatingPriority && <span className="spinner-border spinner-border-sm text-secondary"></span>}
                  </div>
                ) : (
                  <div className="d-block mt-2">
                    {getPriorityBadge(ticket.itPriority || ticket.requestedPriority)}
                  </div>
                )}
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label text-muted small fw-bold mb-1">Last Updated</label>
                <div
                  className="form-control"
                  style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}
                >
                  {new Date(ticket.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Ownership & Status Operations Section for Staff / Admin */}
            {isStaffOrAdmin && (
              <div className="row g-4 mb-4 pt-3 border-top">
                {/* Assigned Owner */}
                <div className="col-12 col-md-6">
                  <label className="form-label text-muted small fw-bold mb-2">Assigned Owner</label>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {ticket.owner ? (
                      <span className="badge bg-light text-dark border py-2 px-3 fs-6">
                        <i className="bi bi-person-check-fill me-2 text-success"></i>
                        {ticket.owner.name} ({ticket.owner.email})
                      </span>
                    ) : (
                      <span className="badge bg-secondary py-2 px-3 fs-6">Unassigned</span>
                    )}

                    {/* Claim Ticket: only if unassigned */}
                    {isStaff && !ticket.owner && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success d-flex align-items-center"
                        style={{ borderColor: '#006B3C', color: '#006B3C' }}
                        onClick={handleClaim}
                        disabled={isClaiming}
                      >
                        {isClaiming ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Claiming...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-hand-index-thumb me-1"></i> Claim Ticket
                          </>
                        )}
                      </button>
                    )}

                    {/* Reassign Owner: only if already assigned */}
                    {isStaff && ticket.owner && staffUsers.length > 0 && (
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <select
                          className="form-select form-select-sm"
                          style={{ minWidth: '160px', maxWidth: '220px' }}
                          value={selectedOwnerId}
                          onChange={(e) => setSelectedOwnerId(e.target.value)}
                          disabled={isAssigning}
                          aria-label="Reassign Owner"
                        >
                          <option value="">-- Reassign Staff --</option>
                          {staffUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={handleAssignOwner}
                          disabled={isAssigning || !selectedOwnerId}
                        >
                          {isAssigning ? <span className="spinner-border spinner-border-sm"></span> : 'Reassign'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Change Status Dropdown next to Assigned Owner */}
                {isStaff && (
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted small fw-bold mb-2">Change Status</label>
                    {ticket.currentStatus === 'CANCELLED' ? (
                      <div className="text-muted small py-2">
                        <span className="badge bg-danger me-2">Cancelled</span>
                        Ticket is cancelled (terminal state).
                      </div>
                    ) : availableTransitions.length === 0 ? (
                      <div className="text-muted small py-2">No further transitions permitted.</div>
                    ) : (
                      <div className="d-flex align-items-center gap-2">
                        <select
                          className="form-select form-select-sm"
                          style={{ minWidth: '160px', maxWidth: '220px' }}
                          value={selectedTargetStatus}
                          onChange={(e) => setSelectedTargetStatus(e.target.value)}
                          disabled={isTransitioningStatus}
                          aria-label="Change Status"
                        >
                          <option value="">-- Select Status --</option>
                          {availableTransitions.map((st) => (
                            <option key={st} value={st}>
                              {STATUS_LABELS[st] || st}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          style={{ borderColor: '#006B3C', color: '#006B3C' }}
                          onClick={() => selectedTargetStatus && handleInitiateStatusChange(selectedTargetStatus)}
                          disabled={isTransitioningStatus || !selectedTargetStatus}
                        >
                          {isTransitioningStatus ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            'Update Status'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <hr style={{ borderColor: '#E2E8F0' }} />

            {/* Summary & Description */}
            <div className="mb-4 mt-4">
              <label className="form-label text-muted small fw-bold mb-1">Summary</label>
              <div
                className="form-control"
                style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}
              >
                {ticket.summary}
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label text-muted small fw-bold mb-1">Description</label>
              <div
                className="form-control"
                style={{
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  color: '#334155',
                  minHeight: '120px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {ticket.description}
              </div>
            </div>

            {/* Resolution Summary Card (when resolved or closed or summary present) */}
            {ticket.resolutionSummary && (
              <div className="card shadow-sm border-0 mb-3 border-start border-success border-4">
                <div className="card-header bg-white py-2">
                  <h6 className="mb-0 fw-bold text-success">
                    <i className="bi bi-check-circle-fill me-2"></i>Resolution Summary
                  </h6>
                </div>
                <div className="card-body p-3">
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>
                    {ticket.resolutionSummary}
                  </p>
                </div>
              </div>
            )}

            {/* Requester Problem Resolved Section (for requester view only) */}
            {ticket.requesterResolvedAt && !isStaffOrAdmin ? (
              <div className="alert alert-success d-flex align-items-center mt-3 py-2 px-3 small" role="alert">
                <i className="bi bi-check-circle-fill fs-5 me-2" style={{ color: '#006B3C' }}></i>
                <span>
                  <strong>Problem marked as resolved:</strong> You indicated this issue appears resolved on{' '}
                  {new Date(ticket.requesterResolvedAt).toLocaleString()}. Note: formal ticket status is determined by IT Staff.
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
                      <h6 className="mb-0 fw-bold" style={{ color: '#1E293B', fontSize: '0.9rem' }}>
                        Is your issue resolved?
                      </h6>
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

        {/* Tabs Section: Attachments, Public Comments, Internal Notes */}
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
              <i className="bi bi-chat-left-text me-1"></i> Public Comments{' '}
              <span className="badge bg-secondary ms-1">{comments.length}</span>
            </button>
          </li>
          {isStaffOrAdmin && (
            <li className="nav-item">
              <button
                className={`nav-link fw-bold ${activeTab === 'notes' ? 'active' : 'text-muted'}`}
                style={{
                  color: activeTab === 'notes' ? '#0B7A46' : undefined,
                  borderBottomColor: activeTab === 'notes' ? '#F5F7F6' : undefined,
                }}
                onClick={() => setActiveTab('notes')}
              >
                <i className="bi bi-lock-fill me-1 text-warning"></i> Internal Notes{' '}
                <span className="badge bg-warning text-dark ms-1">{internalNotes.length}</span>
              </button>
            </li>
          )}
        </ul>

        {/* Tab Content Card */}
        <div className="card shadow-sm border-0 mb-5">
          <div className="card-body p-4">
            {/* TAB 1: Attachments */}
            {activeTab === 'attachments' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h6 className="mb-0" style={{ color: '#1E293B' }}>
                    Attached Files <span className="badge bg-secondary ms-2">{activeAttachments.length} / 5</span>
                  </h6>
                  {isOwnerRequester && (
                    <div>
                      <input
                        type="file"
                        id="detailUpload"
                        className="d-none"
                        onChange={handleFileUpload}
                        disabled={isUploading || activeAttachments.length >= 5}
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                      />
                      <label
                        htmlFor="detailUpload"
                        className={`btn btn-sm btn-outline-secondary d-flex align-items-center ${
                          isUploading || activeAttachments.length >= 5 ? 'disabled' : ''
                        }`}
                        style={{
                          borderColor: '#006B3C',
                          color: '#006B3C',
                          cursor: activeAttachments.length >= 5 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isUploading ? (
                          <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                          <i className="bi bi-plus-circle me-2"></i>
                        )}
                        Add Attachment
                      </label>
                    </div>
                  )}
                </div>

                {uploadError && <div className="alert alert-danger py-2 small">{uploadError}</div>}

                {!ticket.attachments || ticket.attachments.length === 0 ? (
                  <div
                    className="text-center py-4 rounded"
                    style={{ backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1' }}
                  >
                    <i className="bi bi-file-earmark-x fs-3 text-muted mb-2 d-block"></i>
                    <p className="text-muted small mb-0">No attachments found for this ticket.</p>
                  </div>
                ) : (
                  <div className="list-group">
                    {sortedAttachments.map((file: any) => (
                      <div
                        key={file.id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 border-0 rounded shadow-sm mb-2"
                        style={{ backgroundColor: file.isRemoved ? '#F1F5F9' : '#F8FAFC' }}
                      >
                        <div
                          className="d-flex align-items-center text-truncate"
                          style={{ maxWidth: '75%', opacity: file.isRemoved ? 0.6 : 1 }}
                        >
                          <i
                            className={`bi ${file.isRemoved ? 'bi-file-earmark-x' : 'bi-file-earmark-text'} fs-4 me-3`}
                            style={{ color: file.isRemoved ? '#94A3B8' : '#006B3C' }}
                          ></i>
                          <div className="text-truncate">
                            <h6
                              className="mb-0 text-truncate"
                              style={{
                                color: '#1E293B',
                                fontSize: '0.95rem',
                                textDecoration: file.isRemoved ? 'line-through' : 'none',
                              }}
                            >
                              {file.originalFilename}
                            </h6>
                            <small className="text-muted">
                              {(file.fileSize / 1024 / 1024).toFixed(2)} MB • Uploaded{' '}
                              {new Date(file.uploadedAt).toLocaleString('en-US')}
                              {file.isRemoved && <span className="badge bg-danger ms-2">Removed</span>}
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
                              {isOwnerRequester && (
                                <button
                                  className="btn btn-sm btn-light"
                                  title="Remove"
                                  onClick={() => openRemoveModal(file.id)}
                                >
                                  <i className="bi bi-trash text-danger"></i>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Public Comments */}
            {activeTab === 'comments' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 fw-bold" style={{ color: '#1E293B' }}>
                    <i className="bi bi-chat-left-text me-2" style={{ color: '#006B3C' }}></i>
                    Public Comments
                  </h6>
                  <small className="text-muted">Comments are visible to Requester and IT Staff</small>
                </div>

                {commentError && (
                  <div className="alert alert-danger py-2 small mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {commentError}
                  </div>
                )}

                {loadingComments ? (
                  <div className="text-center py-4">
                    <span className="spinner-border spinner-border-sm text-success me-2"></span>
                    <span className="text-muted small">Loading comments...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div
                    className="text-center py-4 rounded mb-4"
                    style={{ backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1' }}
                  >
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
                                {cmt.author?.role === 'IT_STAFF'
                                  ? 'IT Staff'
                                  : cmt.author?.role === 'ADMINISTRATOR'
                                  ? 'Admin'
                                  : 'Requester'}
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
                      className="btn btn-sm"
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

            {/* TAB 3: Internal Notes (Staff & Admin Only) */}
            {activeTab === 'notes' && isStaffOrAdmin && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="mb-0 fw-bold" style={{ color: '#1E293B' }}>
                      <i className="bi bi-lock-fill me-2 text-warning"></i>
                      Internal Notes — IT Staff and Administrator Only
                    </h6>
                    <small className="text-muted">
                      These notes are confidential and completely hidden from the ticket requester.
                    </small>
                  </div>
                </div>

                {noteError && (
                  <div className="alert alert-danger py-2 small mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {noteError}
                  </div>
                )}

                {loadingNotes ? (
                  <div className="text-center py-4">
                    <span className="spinner-border spinner-border-sm text-warning me-2"></span>
                    <span className="text-muted small">Loading internal notes...</span>
                  </div>
                ) : internalNotes.length === 0 ? (
                  <div
                    className="text-center py-4 rounded mb-4"
                    style={{ backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1' }}
                  >
                    <i className="bi bi-journal-text fs-3 text-muted mb-2 d-block"></i>
                    <p className="text-muted small mb-0">
                      No internal notes yet. Internal communication will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="mb-4">
                    {internalNotes.map((note) => (
                      <div
                        key={note.id}
                        className="card mb-3 border-warning bg-warning-subtle text-dark shadow-sm"
                      >
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-shield-lock-fill text-warning me-2"></i>
                              <span className="fw-bold me-2" style={{ fontSize: '0.9rem' }}>
                                {note.author?.name || 'Staff Member'}
                              </span>
                              <span
                                className={`badge ${
                                  note.author?.role === 'ADMINISTRATOR' ? 'bg-primary' : 'bg-success'
                                }`}
                                style={{ fontSize: '0.75rem' }}
                              >
                                {note.author?.role === 'ADMINISTRATOR' ? 'Admin' : 'IT Staff'}
                              </span>
                            </div>
                            <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                              {new Date(note.createdAt).toLocaleString()}
                            </small>
                          </div>
                          <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                            {note.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Compose Internal Note Form */}
                <form onSubmit={handlePostNote} className="mt-4 pt-3 border-top">
                  <label htmlFor="newNoteContent" className="form-label fw-bold small text-muted">
                    Add an Internal Note
                  </label>
                  <textarea
                    id="newNoteContent"
                    className="form-control mb-2 border-warning"
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a private note for IT Staff and Administrators..."
                    disabled={isPostingNote}
                    maxLength={4000}
                  ></textarea>
                  <div className="d-flex justify-content-between align-items-center">
                    <small className={`small ${newNote.length > 3900 ? 'text-danger fw-bold' : 'text-muted'}`}>
                      {newNote.length} / 4000 characters
                    </small>
                    <button
                      type="submit"
                      className="btn btn-sm btn-warning text-dark fw-bold"
                      disabled={isPostingNote || newNote.trim().length === 0 || newNote.length > 4000}
                    >
                      {isPostingNote ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Posting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-lock-fill me-1"></i> Post Internal Note
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

      {/* Confirmation Modal for Terminal / State Transitions */}
      {showStatusModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">
                  {targetStatus === 'RESOLVED' ? (
                    <span className="text-warning">
                      <i className="bi bi-check-circle-fill me-2"></i>Resolve Ticket
                    </span>
                  ) : targetStatus === 'CANCELLED' ? (
                    <span className="text-danger">
                      <i className="bi bi-x-circle-fill me-2"></i>Cancel Ticket
                    </span>
                  ) : (
                    <span className="text-secondary">
                      <i className="bi bi-archive-fill me-2"></i>Close Ticket
                    </span>
                  )}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseStatusModal}
                  disabled={isTransitioningStatus}
                ></button>
              </div>
              <div className="modal-body">
                {statusModalError && (
                  <div className="alert alert-danger py-2 small mb-3">{statusModalError}</div>
                )}
                {targetStatus === 'RESOLVED' && (
                  <div>
                    <p className="text-muted small mb-2">
                      Resolving this ticket indicates that IT Staff has addressed the reported issue. Please provide a mandatory <strong>Resolution Summary</strong> explaining the resolution to the requester.
                    </p>
                    <div className="mb-3">
                      <label htmlFor="resolutionSummaryInput" className="form-label fw-bold small">
                        Resolution Summary <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="resolutionSummaryInput"
                        className="form-control"
                        rows={3}
                        value={resolutionSummaryInput}
                        onChange={(e) => setResolutionSummaryInput(e.target.value)}
                        placeholder="Describe how the issue was resolved..."
                        maxLength={4000}
                        autoFocus
                        required
                      ></textarea>
                      <small className="text-muted">{resolutionSummaryInput.length} / 4000 characters</small>
                    </div>
                  </div>
                )}
                {targetStatus === 'CLOSED' && (
                  <p className="text-muted mb-0">
                    Are you sure you want to close this ticket? Closing a ticket is a terminal action and no further modifications will be allowed.
                  </p>
                )}
                {targetStatus === 'CANCELLED' && (
                  <p className="text-muted mb-0">
                    Are you sure you want to cancel this ticket? Cancelling a ticket is a terminal action.
                  </p>
                )}
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleCloseStatusModal}
                  disabled={isTransitioningStatus}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${
                    targetStatus === 'CANCELLED'
                      ? 'btn-danger'
                      : targetStatus === 'RESOLVED'
                      ? 'btn-warning text-dark fw-bold'
                      : 'btn-secondary'
                  }`}
                  onClick={() =>
                    executeStatusChange(
                      targetStatus,
                      targetStatus === 'RESOLVED' ? resolutionSummaryInput.trim() : undefined
                    )
                  }
                  disabled={
                    isTransitioningStatus ||
                    (targetStatus === 'RESOLVED' && resolutionSummaryInput.trim().length === 0)
                  }
                >
                  {isTransitioningStatus ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Updating...
                    </>
                  ) : (
                    `Confirm ${targetStatus.replace(/_/g, ' ')}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal for Removal Reason */}
      {showRemoveModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header" style={{ borderBottomColor: '#E2E8F0' }}>
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i> Remove Attachment
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRemoveModal(false)}
                ></button>
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
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setShowRemoveModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger d-flex align-items-center"
                  onClick={confirmRemove}
                  disabled={removingId !== null || removeReason.trim() === ''}
                >
                  {removingId !== null ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : (
                    <i className="bi bi-trash me-2"></i>
                  )}
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
