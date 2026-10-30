import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.js';
import { fetchStaffDashboard, StaffDashboard, StaffTicketSummary } from '../api.js';
import { getPriorityBadge, getStatusBadge } from '../utils.js';

const STATUS_ORDER = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const PRIORITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const ROLE_LABELS: Record<string, string> = { REQUESTER: 'Requesters', IT_STAFF: 'IT Staff', ADMINISTRATOR: 'Administrators' };

interface MetricCardProps {
  label: string;
  count: number;
  icon: string;
  drillDown: string;
}

function MetricCard({ label, count, icon, drillDown }: MetricCardProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="card shadow-sm border-0 h-100 text-start w-100"
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(drillDown)}
    >
      <div className="card-body d-flex align-items-center gap-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-circle"
          style={{ width: '48px', height: '48px', backgroundColor: '#EAF6EF', color: '#0B7A46', flexShrink: 0 }}
        >
          <i className={`bi ${icon} fs-5`}></i>
        </div>
        <div>
          <div className="h3 mb-0" style={{ color: '#1E293B' }}>{count}</div>
          <div className="text-muted small">{label}</div>
        </div>
      </div>
    </button>
  );
}

function TicketListCard({ title, tickets, emptyMessage, showPriority }: { title: string; tickets: StaffTicketSummary[]; emptyMessage: string; showPriority?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="card shadow-sm border-0 h-100">
      <div className="card-header bg-white border-0 pt-3">
        <h2 className="h6 mb-0" style={{ color: '#1E293B' }}>{title}</h2>
      </div>
      <div className="card-body pt-0">
        {tickets.length === 0 ? (
          <p className="text-muted small mb-0">{emptyMessage}</p>
        ) : (
          <ul className="list-group list-group-flush">
            {tickets.map((t) => (
              <li
                key={t.id}
                role="button"
                className="list-group-item px-0 d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/tickets/${t.id}`)}
              >
                <div className="text-truncate me-2">
                  <div className="small fw-semibold text-truncate">{t.ticketNumber}</div>
                  <div className="small text-muted text-truncate">{t.summary}</div>
                </div>
                <div className="d-flex align-items-center gap-1">
                  {showPriority && getPriorityBadge(t.itPriority)}
                  {getStatusBadge(t.status)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BreakdownCard({ title, counts, order, onClick, labelFor }: {
  title: string;
  counts: Record<string, number>;
  order: string[];
  onClick: (key: string) => void;
  labelFor?: (key: string) => string;
}) {
  return (
    <div className="card shadow-sm border-0 h-100">
      <div className="card-header bg-white border-0 pt-3">
        <h2 className="h6 mb-0" style={{ color: '#1E293B' }}>{title}</h2>
      </div>
      <div className="card-body pt-0 d-flex flex-wrap gap-2">
        {order.map((key) => (
          <button
            key={key}
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => onClick(key)}
          >
            <span>{labelFor ? labelFor(key) : key}</span>
            <span className="badge bg-secondary">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container py-4" style={{ maxWidth: '1200px' }} data-testid="dashboard-loading">
      <div className="placeholder-glow mb-4">
        <span className="placeholder col-4 h3 d-block"></span>
      </div>
      <div className="row g-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div className="col-6 col-md-3" key={i}>
            <div className="card border-0 shadow-sm placeholder-glow">
              <div className="card-body">
                <span className="placeholder col-6 d-block mb-2" style={{ height: '2rem' }}></span>
                <span className="placeholder col-8"></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<StaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchStaffDashboard());
    } catch (err: any) {
      setError(err?.message || 'Failed to load the dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="container py-4" style={{ maxWidth: '1200px' }}>
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isAdmin = user?.role === 'ADMINISTRATOR';

  return (
    <div className="container py-4" style={{ maxWidth: '1200px' }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1" style={{ color: '#1E293B' }}>Welcome back, {user?.name}</h1>
          <p className="text-muted mb-0">Operational overview of the Ticket queue.</p>
        </div>
        <button type="button" className="btn btn-zen-primary shadow-sm d-flex align-items-center justify-content-center" onClick={() => navigate('/staff/queue')}>
          <i className="bi bi-inbox me-2"></i> Open Ticket Queue
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <MetricCard label="Unassigned" count={data.unassigned.count} icon="bi-person-x-fill" drillDown={data.unassigned.drillDown} />
        </div>
        <div className="col-6 col-md-3">
          <MetricCard label="My Tickets" count={data.myOwnedOpen.count} icon="bi-person-check-fill" drillDown={data.myOwnedOpen.drillDown} />
        </div>
        <div className="col-6 col-md-3">
          <MetricCard label="My Open Actions" count={data.myOpenActions.count} icon="bi-list-task" drillDown={data.myOpenActions.drillDown} />
        </div>
        <div className="col-6 col-md-3">
          <MetricCard label="Pending Follow-ups" count={data.pendingFollowUps.count} icon="bi-flag-fill" drillDown={data.pendingFollowUps.drillDown} />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <BreakdownCard
            title="Tickets by Status"
            counts={data.byStatus}
            order={STATUS_ORDER}
            labelFor={(s) => s.replace(/_/g, ' ')}
            onClick={(status) => navigate(`/staff/queue?status=${status}`)}
          />
        </div>
        <div className="col-12 col-md-6">
          <BreakdownCard
            title="Open by IT Priority"
            counts={data.byItPriority}
            order={PRIORITY_ORDER}
            onClick={(priority) => navigate(`/staff/queue?itPriority=${priority}&statusGroup=open`)}
          />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <TicketListCard title="Urgent" tickets={data.urgent} emptyMessage="No urgent Tickets right now." showPriority />
        </div>
        <div className="col-12 col-md-6">
          <TicketListCard title="Recently Updated" tickets={data.recentlyUpdated} emptyMessage="No recent activity." showPriority />
        </div>
      </div>

      {isAdmin && data.users && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white border-0 pt-3">
            <h2 className="h6 mb-0" style={{ color: '#1E293B' }}>User Account Breakdown</h2>
          </div>
          <div className="card-body pt-0">
            <div className="row g-3">
              {Object.entries(data.users).map(([role, bucket]) => (
                <div className="col-12 col-md-4" key={role}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100 text-start d-flex justify-content-between align-items-center"
                    onClick={() => navigate(bucket.drillDown)}
                  >
                    <span>{ROLE_LABELS[role] ?? role}</span>
                    <span>
                      <span className="badge bg-success me-1">{bucket.active} active</span>
                      <span className="badge bg-secondary">{bucket.inactive} inactive</span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
