import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.js';
import { fetchRequesterDashboard, RequesterDashboard, RequesterTicketSummary } from '../api.js';
import { getStatusBadge } from '../utils.js';

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

function TicketListCard({ title, tickets, emptyMessage }: { title: string; tickets: RequesterTicketSummary[]; emptyMessage: string }) {
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
                {getStatusBadge(t.status)}
              </li>
            ))}
          </ul>
        )}
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

export default function RequesterDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<RequesterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchRequesterDashboard());
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

  return (
    <div className="container py-4" style={{ maxWidth: '1200px' }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1" style={{ color: '#1E293B' }}>Welcome back, {user?.name}</h1>
          <p className="text-muted mb-0">Here is a summary of your support requests.</p>
        </div>
        <a href="/tickets/create" className="btn btn-zen-primary shadow-sm d-flex align-items-center justify-content-center">
          <i className="bi bi-plus-circle me-2"></i> Create Ticket
        </a>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <MetricCard label="My Open Tickets" count={data.openTickets.count} icon="bi-inbox-fill" drillDown={data.openTickets.drillDown} />
        </div>
        <div className="col-6 col-md-3">
          <MetricCard label="Waiting for Me" count={data.waitingForMe.count} icon="bi-hourglass-split" drillDown={data.waitingForMe.drillDown} />
        </div>
        <div className="col-6 col-md-3">
          <MetricCard label="Resolved" count={data.resolved.count} icon="bi-check-circle-fill" drillDown={data.resolved.drillDown} />
        </div>
        <div className="col-6 col-md-3">
          <MetricCard label="Closed" count={data.closed.count} icon="bi-archive-fill" drillDown={data.closed.drillDown} />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <TicketListCard title="Recently Updated" tickets={data.recentlyUpdated} emptyMessage="No recent activity on your Tickets." />
        </div>
        <div className="col-12 col-md-6">
          <TicketListCard title="Recently Resolved" tickets={data.recentlyResolved} emptyMessage="No Tickets resolved in the last 7 days." />
        </div>
      </div>
    </div>
  );
}
