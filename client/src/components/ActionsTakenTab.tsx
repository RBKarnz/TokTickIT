import React, { useState, useEffect, useRef } from 'react';
import {
  ActionTaken,
  ActionStatus,
  ActionInput,
  AssigneeUser,
  ApiError,
  fetchActions,
  fetchAssignees,
  createAction,
  updateAction,
} from '../api.js';

interface ActionsTakenTabProps {
  ticketId: number;
  canWrite: boolean;
  currentUserId: number;
  ticketStatus: string;
  onCountChange: (count: number) => void;
}

const ACTION_STATUS_MATRIX: Record<ActionStatus, ActionStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function formatBangkokDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' });
  } catch {
    return isoString;
  }
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function ActionsTakenTab({
  ticketId,
  canWrite,
  currentUserId,
  ticketStatus,
  onCountChange,
}: ActionsTakenTabProps) {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [assignees, setAssignees] = useState<AssigneeUser[]>([]);

  // Form mode: 'none' | 'create' | 'edit'
  const [formMode, setFormMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [expectedVersion, setExpectedVersion] = useState<number>(1);

  // Form fields
  const [actionAt, setActionAt] = useState('');
  const [assignedToId, setAssignedToId] = useState<number>(0);
  const [status, setStatus] = useState<ActionStatus>('PLANNED');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');
  const [attachmentNotes, setAttachmentNotes] = useState('');

  // Submit / Error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [staleError, setStaleError] = useState('');
  const [isActionClosed, setIsActionClosed] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const items = await fetchActions(ticketId);
      setActions(items);
      onCountChange(items.length);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load actions taken');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (canWrite) {
      fetchAssignees()
        .then((users) => setAssignees(users))
        .catch((err) => console.error('Failed to load assignees:', err));
    }
  }, [ticketId, canWrite]);

  const resetFormState = () => {
    setActionAt(toDatetimeLocal(new Date()));
    const defaultAssignee = assignees.find((u) => u.id === currentUserId) || assignees[0];
    setAssignedToId(defaultAssignee ? defaultAssignee.id : currentUserId);
    setStatus('PLANNED');
    setDescription('');
    setResult('');
    setFollowUpRequired(false);
    setFollowUpNote('');
    setAttachmentNotes('');
    setFieldErrors({});
    setFormError('');
    setStaleError('');
    setIsActionClosed(false);
  };

  const handleOpenCreate = () => {
    resetFormState();
    idempotencyKeyRef.current = crypto.randomUUID();
    setFormMode('create');
    setEditingActionId(null);
  };

  const handleOpenEdit = (action: ActionTaken) => {
    setFieldErrors({});
    setFormError('');
    setStaleError('');
    setIsActionClosed(false);
    setEditingActionId(action.id);
    setExpectedVersion(action.version);

    try {
      setActionAt(toDatetimeLocal(new Date(action.actionAt)));
    } catch {
      setActionAt(toDatetimeLocal(new Date()));
    }
    setAssignedToId(action.assignedTo.id);
    setStatus(action.status);
    setDescription(action.description);
    setResult(action.result || '');
    setFollowUpRequired(action.followUpRequired);
    setFollowUpNote(action.followUpNote || '');
    setAttachmentNotes(action.attachmentNotes || '');
    setFormMode('edit');
  };

  const handleCancelForm = () => {
    setFormMode('none');
    setEditingActionId(null);
    idempotencyKeyRef.current = '';
    setFieldErrors({});
    setFormError('');
    setStaleError('');
    setIsActionClosed(false);
  };

  const handleReloadConflict = async () => {
    try {
      const items = await fetchActions(ticketId);
      setActions(items);
      onCountChange(items.length);
      setStaleError('');
      if (editingActionId) {
        const fresh = items.find((a) => a.id === editingActionId);
        if (fresh) {
          setExpectedVersion(fresh.version);
          if (fresh.status === 'COMPLETED' || fresh.status === 'CANCELLED') {
            setIsActionClosed(true);
          }
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to reload actions');
    }
  };

  const validateClient = (): boolean => {
    const errors: Record<string, string> = {};

    if (!description.trim()) {
      errors.description = 'Description is required.';
    } else if (description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters.';
    }

    if (status === 'COMPLETED') {
      if (!result.trim()) {
        errors.result = 'Result is required when the action is completed.';
      }
    }
    if (result.trim().length > 2000) {
      errors.result = 'Result cannot exceed 2000 characters.';
    }

    if (followUpRequired) {
      if (!followUpNote.trim()) {
        errors.followUpNote = 'Follow-up note is required when follow-up is required.';
      } else if (followUpNote.trim().length > 1000) {
        errors.followUpNote = 'Follow-up note cannot exceed 1000 characters.';
      }
    }

    if (attachmentNotes.trim().length > 1000) {
      errors.attachmentNotes = 'Attachment notes cannot exceed 1000 characters.';
    }

    if (actionAt) {
      const parsedDate = new Date(actionAt);
      if (isNaN(parsedDate.getTime())) {
        errors.actionAt = 'Action date and time must be a valid ISO-8601 value.';
      } else if (parsedDate.getTime() > Date.now() + 5 * 60 * 1000) {
        errors.actionAt = 'Action date and time cannot be more than 5 minutes in the future.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    if (!validateClient()) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setFormError('');
    setStaleError('');

    const input: ActionInput = {
      actionAt: actionAt ? new Date(actionAt).toISOString() : new Date().toISOString(),
      assignedToId,
      status,
      description: description.trim(),
      result: result.trim() ? result.trim() : null,
      followUpRequired,
      followUpNote: followUpRequired && followUpNote.trim() ? followUpNote.trim() : null,
      attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
    };

    try {
      if (formMode === 'create') {
        await createAction(ticketId, input, idempotencyKeyRef.current);
        idempotencyKeyRef.current = '';
        setSuccessMsg('Action taken recorded successfully.');
      } else if (formMode === 'edit' && editingActionId) {
        await updateAction(editingActionId, input, expectedVersion);
        setSuccessMsg('Action taken updated successfully.');
      }

      setFormMode('none');
      setEditingActionId(null);
      const items = await fetchActions(ticketId);
      setActions(items);
      onCountChange(items.length);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
          setFormError(err.message || 'One or more fields are invalid.');
        } else if (err.status === 409) {
          if (err.code === 'STALE_UPDATE') {
            setStaleError(
              'This action was modified by another staff member while you were editing. Please reload to review the latest state.',
            );
          } else if (err.code === 'ACTION_CLOSED') {
            setIsActionClosed(true);
            setFormError(err.message || 'This action is closed and cannot be changed.');
          } else {
            setFormError(err.message || 'Conflict occurred.');
          }
        } else {
          setFormError(err.message || 'An error occurred.');
        }
      } else {
        setFormError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (actionStatus: ActionStatus) => {
    switch (actionStatus) {
      case 'PLANNED':
        return (
          <span className="badge bg-secondary">
            <i className="bi bi-clock me-1"></i>Planned
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="badge bg-primary">
            <i className="bi bi-gear-fill me-1"></i>In Progress
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="badge bg-success" style={{ backgroundColor: '#006B3C' }}>
            <i className="bi bi-check-circle-fill me-1"></i>Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="badge bg-secondary">
            <i className="bi bi-x-circle-fill me-1"></i>Cancelled
          </span>
        );
      default:
        return <span className="badge bg-secondary">{actionStatus}</span>;
    }
  };

  const isTerminalTicket = ticketStatus === 'CLOSED' || ticketStatus === 'CANCELLED';

  return (
    <div>
      {/* Requester Info Banner */}
      {!canWrite && (
        <div className="alert alert-info py-2 small mb-3">
          Actions recorded by IT Staff. Private staff correspondence is kept in Internal Notes.
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show py-2 mb-3 d-flex align-items-center justify-content-between">
          <span>
            <i className="bi bi-check-circle-fill me-2"></i>
            {successMsg}
          </span>
          <button
            type="button"
            className="btn-close btn-sm"
            onClick={() => setSuccessMsg('')}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Add Action Button (Top) */}
      {canWrite && formMode === 'none' && !isTerminalTicket && (
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h6 className="mb-0 fw-bold" style={{ color: '#1E293B' }}>
            Actions Taken ({actions.length})
          </h6>
          <button
            className="btn btn-sm text-white fw-bold d-flex align-items-center"
            style={{ backgroundColor: '#006B3C', borderColor: '#006B3C' }}
            onClick={handleOpenCreate}
          >
            <i className="bi bi-plus-circle me-1"></i> + Add Action Taken
          </button>
        </div>
      )}

      {/* Form Mode: Create / Edit */}
      {canWrite && formMode !== 'none' && (
        <div className="card border-0 shadow-sm mb-4 p-4" style={{ backgroundColor: '#F8FAFC' }}>
          <h6 className="fw-bold mb-3" style={{ color: '#006B3C' }}>
            {formMode === 'create' ? 'Add Action Taken' : 'Edit Action Taken'}
          </h6>

          {/* Conflict Banner: 409 STALE_UPDATE */}
          {staleError && (
            <div className="alert alert-warning d-flex justify-content-between align-items-center mb-3">
              <span>{staleError}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                onClick={handleReloadConflict}
              >
                Reload
              </button>
            </div>
          )}

          {/* Lock Banner: 409 ACTION_CLOSED */}
          {isActionClosed && (
            <div className="alert alert-secondary mb-3">
              This action is completed or cancelled and cannot be modified.
            </div>
          )}

          {/* General Form Error */}
          {formError && !staleError && (
            <div className="alert alert-danger py-2 small mb-3">{formError}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <fieldset disabled={isActionClosed}>
              <div className="row g-3">
                {/* Action Date/Time */}
                <div className="col-12 col-md-6">
                  <label htmlFor="actionAt" className="form-label small fw-bold">
                    Action Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    id="actionAt"
                    className={`form-control form-control-sm ${fieldErrors.actionAt ? 'is-invalid' : ''}`}
                    value={actionAt}
                    onChange={(e) => setActionAt(e.target.value)}
                    aria-describedby={fieldErrors.actionAt ? 'actionAt-error' : undefined}
                  />
                  {fieldErrors.actionAt && (
                    <div className="invalid-feedback" id="actionAt-error">
                      {fieldErrors.actionAt}
                    </div>
                  )}
                </div>

                {/* Assigned To */}
                <div className="col-12 col-md-6">
                  <label htmlFor="assignedToId" className="form-label small fw-bold">
                    Assigned To
                  </label>
                  <select
                    id="assignedToId"
                    className={`form-select form-select-sm ${fieldErrors.assignedToId ? 'is-invalid' : ''}`}
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(parseInt(e.target.value, 10))}
                    aria-describedby={fieldErrors.assignedToId ? 'assignedToId-error' : undefined}
                  >
                    {assignees.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role === 'ADMINISTRATOR' ? 'Admin' : 'IT Staff'})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.assignedToId && (
                    <div className="invalid-feedback" id="assignedToId-error">
                      {fieldErrors.assignedToId}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="col-12 col-md-6">
                  <label htmlFor="status" className="form-label small fw-bold">
                    {formMode === 'create' ? 'Initial Status' : 'Status'}
                  </label>
                  <select
                    id="status"
                    className={`form-select form-select-sm ${fieldErrors.status ? 'is-invalid' : ''}`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ActionStatus)}
                    aria-describedby={fieldErrors.status ? 'status-error' : undefined}
                  >
                    {formMode === 'create' ? (
                      <>
                        <option value="PLANNED">Planned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </>
                    ) : (
                      [status, ...(ACTION_STATUS_MATRIX[status] || [])].map((s) => (
                        <option key={s} value={s}>
                          {s === 'PLANNED'
                            ? 'Planned'
                            : s === 'IN_PROGRESS'
                            ? 'In Progress'
                            : s === 'COMPLETED'
                            ? 'Completed'
                            : 'Cancelled'}
                        </option>
                      ))
                    )}
                  </select>
                  {fieldErrors.status && (
                    <div className="invalid-feedback" id="status-error">
                      {fieldErrors.status}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="description" className="form-label small fw-bold">
                      Description <span className="text-danger">*</span>
                    </label>
                    <small className="text-muted">{description.length}/2000</small>
                  </div>
                  <textarea
                    id="description"
                    rows={3}
                    className={`form-control form-control-sm ${fieldErrors.description ? 'is-invalid' : ''}`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter detailed action narrative..."
                    aria-describedby={fieldErrors.description ? 'description-error' : undefined}
                  />
                  {fieldErrors.description && (
                    <div className="invalid-feedback" id="description-error">
                      {fieldErrors.description}
                    </div>
                  )}
                </div>

                {/* Result */}
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="result" className="form-label small fw-bold">
                      Result {status === 'COMPLETED' && <span className="text-danger">*</span>}
                    </label>
                    <small className="text-muted">{result.length}/2000</small>
                  </div>
                  <textarea
                    id="result"
                    rows={2}
                    className={`form-control form-control-sm ${fieldErrors.result ? 'is-invalid' : ''}`}
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    placeholder="Enter action outcome (required when completed)..."
                    aria-describedby={fieldErrors.result ? 'result-error' : undefined}
                  />
                  {fieldErrors.result && (
                    <div className="invalid-feedback" id="result-error">
                      {fieldErrors.result}
                    </div>
                  )}
                </div>

                {/* Follow-up Required Checkbox */}
                <div className="col-12">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      id="followUpRequired"
                      className="form-check-input"
                      checked={followUpRequired}
                      onChange={(e) => setFollowUpRequired(e.target.checked)}
                    />
                    <label htmlFor="followUpRequired" className="form-check-label small fw-bold">
                      Follow-Up Required
                    </label>
                  </div>
                </div>

                {/* Follow-up Note (conditionally rendered) */}
                {followUpRequired && (
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                      <label htmlFor="followUpNote" className="form-label small fw-bold">
                        Follow-up Note <span className="text-danger">*</span>
                      </label>
                      <small className="text-muted">{followUpNote.length}/1000</small>
                    </div>
                    <textarea
                      id="followUpNote"
                      rows={2}
                      className={`form-control form-control-sm ${fieldErrors.followUpNote ? 'is-invalid' : ''}`}
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      placeholder="Enter follow-up instructions..."
                      aria-describedby={fieldErrors.followUpNote ? 'followUpNote-error' : undefined}
                    />
                    {fieldErrors.followUpNote && (
                      <div className="invalid-feedback" id="followUpNote-error">
                        {fieldErrors.followUpNote}
                      </div>
                    )}
                  </div>
                )}

                {/* Attachment Notes */}
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="attachmentNotes" className="form-label small fw-bold">
                      Attachment Notes
                    </label>
                    <small className="text-muted">{attachmentNotes.length}/1000</small>
                  </div>
                  <textarea
                    id="attachmentNotes"
                    rows={2}
                    className={`form-control form-control-sm ${fieldErrors.attachmentNotes ? 'is-invalid' : ''}`}
                    value={attachmentNotes}
                    onChange={(e) => setAttachmentNotes(e.target.value)}
                    placeholder="e.g., Check router_config.png for verified port settings."
                    aria-describedby={fieldErrors.attachmentNotes ? 'attachmentNotes-error' : undefined}
                  />
                  {fieldErrors.attachmentNotes && (
                    <div className="invalid-feedback" id="attachmentNotes-error">
                      {fieldErrors.attachmentNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-sm text-white fw-bold d-flex align-items-center"
                  style={{ backgroundColor: '#006B3C', borderColor: '#006B3C' }}
                  disabled={isSubmitting || isActionClosed}
                >
                  {isSubmitting && (
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                  )}
                  Save Action
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleCancelForm}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4" role="status">
          <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
          <span className="text-muted small">Loading actions taken...</span>
        </div>
      )}

      {/* Load Failure Alert with Retry */}
      {!loading && loadError && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{loadError}</span>
          <button className="btn btn-sm btn-outline-danger" onClick={loadData}>
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !loadError && actions.length === 0 && (
        <div className="text-center py-4 text-muted">
          No actions have been recorded for this ticket yet.
        </div>
      )}

      {/* Action List (Desktop Table) */}
      {!loading && !loadError && actions.length > 0 && (
        <>
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '15%' }}>Date/Time</th>
                  <th style={{ width: '22%' }}>Description</th>
                  <th style={{ width: '18%' }}>Result</th>
                  <th style={{ width: '10%' }}>Performed by</th>
                  <th style={{ width: '10%' }}>Assigned to</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '10%' }}>Follow-up</th>
                  <th style={{ width: '10%' }}>Attachment Notes</th>
                  {canWrite && <th style={{ width: '5%' }}>Edit</th>}
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => {
                  const isClosed = action.status === 'COMPLETED' || action.status === 'CANCELLED';
                  return (
                    <tr key={action.id} data-testid="action-row">
                      <td className="small text-nowrap">{formatBangkokDateTime(action.actionAt)}</td>
                      <td className="text-break small">{action.description}</td>
                      <td className="text-break small">{action.result ? action.result : '—'}</td>
                      <td className="small">{action.performedBy.name}</td>
                      <td className="small">{action.assignedTo.name}</td>
                      <td>{renderStatusBadge(action.status)}</td>
                      <td className="small">
                        {action.followUpRequired ? (
                          <div>
                            <span className="text-danger fw-bold">Yes</span>
                            {action.followUpNote && (
                              <div className="text-muted text-break mt-1">{action.followUpNote}</div>
                            )}
                          </div>
                        ) : (
                          'No'
                        )}
                      </td>
                      <td className="text-break small">
                        {action.attachmentNotes ? action.attachmentNotes : '—'}
                      </td>
                      {canWrite && (
                        <td>
                          {!isClosed && (
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => handleOpenEdit(action)}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action List (Mobile Cards) */}
          <div className="d-block d-md-none">
            {actions.map((action) => {
              const isClosed = action.status === 'COMPLETED' || action.status === 'CANCELLED';
              return (
                <div
                  key={action.id}
                  className="card shadow-sm border-0 mb-3 p-3"
                  data-testid="action-card"
                  style={{ backgroundColor: '#F8FAFC' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted">{formatBangkokDateTime(action.actionAt)}</span>
                    {renderStatusBadge(action.status)}
                  </div>
                  <div className="mb-2">
                    <div className="small fw-bold text-muted">Description:</div>
                    <div className="small text-break">{action.description}</div>
                  </div>
                  <div className="mb-2">
                    <div className="small fw-bold text-muted">Result:</div>
                    <div className="small text-break">{action.result ? action.result : '—'}</div>
                  </div>
                  <div className="row g-2 mb-2 small">
                    <div className="col-6">
                      <span className="fw-bold text-muted">Performed by: </span>
                      {action.performedBy.name}
                    </div>
                    <div className="col-6">
                      <span className="fw-bold text-muted">Assigned to: </span>
                      {action.assignedTo.name}
                    </div>
                  </div>
                  <div className="mb-2 small">
                    <span className="fw-bold text-muted">Follow-up: </span>
                    {action.followUpRequired ? (
                      <>
                        <span className="text-danger fw-bold">Yes</span>
                        {action.followUpNote && (
                          <div className="text-muted text-break mt-1">{action.followUpNote}</div>
                        )}
                      </>
                    ) : (
                      'No'
                    )}
                  </div>
                  <div className="mb-2 small">
                    <span className="fw-bold text-muted">Attachment Notes: </span>
                    <span className="text-break">{action.attachmentNotes ? action.attachmentNotes : '—'}</span>
                  </div>
                  {canWrite && !isClosed && (
                    <div className="mt-2 text-end">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleOpenEdit(action)}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
