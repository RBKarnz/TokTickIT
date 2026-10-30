import { StatusHistoryItem } from '../api.js';

export const TICKET_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_REQUESTER: 'Waiting for Requester',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled',
};

const ROLE_LABELS: Record<string, string> = {
  IT_STAFF: 'IT Staff',
  ADMINISTRATOR: 'Admin',
  REQUESTER: 'Requester',
};

const label = (status: string) => TICKET_STATUS_LABELS[status] || status;

interface Props {
  items: StatusHistoryItem[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}

// Read-only timeline (ui-spec §7.2). Entries are shown in the order the API returns them.
export default function StatusHistoryTimeline({ items, loading, error, onRetry }: Props) {
  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-header bg-white border-bottom py-3">
        <h6 className="mb-0 fw-bold" style={{ color: '#1E293B' }}>
          <i className="bi bi-clock-history me-2" style={{ color: '#006B3C' }}></i>
          Status History
        </h6>
      </div>
      <div className="card-body p-4">
        {loading ? (
          <div className="text-center py-3" role="status">
            <span className="spinner-border spinner-border-sm me-2" style={{ color: '#0B7A46' }}></span>
            <span className="text-muted small">Loading status history...</span>
          </div>
        ) : error ? (
          <div className="alert alert-danger d-flex justify-content-between align-items-center flex-wrap gap-2 mb-0" role="alert">
            <span>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted small mb-0">No status changes have been recorded for this ticket yet.</p>
        ) : (
          <ol className="list-unstyled mb-0" aria-label="Status history">
            {items.map((item) => (
              <li
                key={item.id}
                data-testid="history-item"
                className="ps-3 pb-3 mb-0"
                style={{ borderLeft: '3px solid #0B7A46' }}
              >
                <div className="fw-bold text-break" style={{ color: '#1E293B' }}>
                  {item.fromStatus ? `${label(item.fromStatus)} → ${label(item.toStatus)}` : `Created as ${label(item.toStatus)}`}
                </div>
                <div className="text-muted small text-break">
                  {item.changedBy
                    ? `${item.changedBy.name} (${ROLE_LABELS[item.changedBy.role] || item.changedBy.role})`
                    : 'System Backfill'}
                  {' · '}
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}
                  </time>
                </div>
                {item.reason && (
                  <div className="small text-break mt-1" style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>
                    Reason: {item.reason}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
