import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  fetchStaffQueue,
  fetchStaffUsers,
  StaffQueueTicket,
  QueueQueryParams,
} from '../api.js';
import { getPriorityBadge, getStatusBadge } from '../utils.js';

interface StaffUser {
  id: number;
  name: string;
  email: string;
}

export default function StaffTicketQueuePage() {
  const navigate = useNavigate();

  // Filters & Search & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRequestedPriority, setSelectedRequestedPriority] = useState('');
  const [selectedItPriority, setSelectedItPriority] = useState('');
  const [selectedOwnership, setSelectedOwnership] = useState<'assigned' | 'unassigned' | ''>('');
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data state
  const [tickets, setTickets] = useState<StaffQueueTicket[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch active IT Staff once for Owner dropdown
  useEffect(() => {
    fetchStaffUsers()
      .then((data) => setStaffUsers(data.users || []))
      .catch(() => setStaffUsers([]));
  }, []);

  // Debounce search (500ms matching MyTicketsPage)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch queue
  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: QueueQueryParams = {
        search: debouncedSearch,
        status: selectedStatus || undefined,
        requestedPriority: selectedRequestedPriority || undefined,
        itPriority: selectedItPriority || undefined,
        ownership: selectedOwnership || undefined,
        ownerId: selectedOwnerId !== '' ? selectedOwnerId : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      };

      const data = await fetchStaffQueue(params);
      setTickets(data?.items || []);
      setTotalItems(data?.pagination?.totalItems ?? 0);
      setTotalPages(data?.pagination?.totalPages ?? 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load ticket queue');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedStatus, selectedRequestedPriority, selectedItPriority, selectedOwnership, selectedOwnerId, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Sort handler
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedStatus('');
    setSelectedRequestedPriority('');
    setSelectedItPriority('');
    setSelectedOwnership('');
    setSelectedOwnerId('');
    setSortBy('updatedAt');
    setSortOrder('desc');
    setPage(1);
    setPageSize(20);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch || selectedStatus || selectedRequestedPriority || selectedItPriority || selectedOwnership || selectedOwnerId !== ''
  );

  // Normalize status string (e.g. "In Progress" -> "IN_PROGRESS") for getStatusBadge
  const normalizeStatus = (statusStr: string) => statusStr?.toUpperCase().replace(/ /g, '_');

  // Pagination display indices
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);

  return (
    <div className="container py-4" style={{ maxWidth: '1200px' }}>
      {/* Page Header (identical structure and color to MyTicketsPage) */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1" style={{ color: '#1E293B' }}>IT Staff Ticket Queue</h1>
          <p className="text-muted mb-0">Operational triage & resolution queue</p>
        </div>
      </div>

      {/* Filter Card (identical border, bg-light, and Zen Green input styling) */}
      <div className="card shadow-sm mb-4" style={{ border: '1px solid #E2E8F0' }}>
        <div className="card-body bg-light">
          <div className="row g-3">
            {/* Search */}
            <div className="col-12 col-md-4">
              <label htmlFor="queue-search" className="visually-hidden">Search</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  id="queue-search"
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Ticket number or summary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary border-start-0 bg-white"
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                  >
                    <i className="bi bi-x text-muted"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-status" className="visually-hidden">Status</label>
              <select
                id="filter-status"
                aria-label="Status"
                className="form-select"
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="New">New</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Requester">Waiting for Requester</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Reopened">Reopened</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Requested Priority Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-req-priority" className="visually-hidden">Requested Priority</label>
              <select
                id="filter-req-priority"
                aria-label="Requested Priority"
                className="form-select"
                value={selectedRequestedPriority}
                onChange={(e) => { setSelectedRequestedPriority(e.target.value); setPage(1); }}
              >
                <option value="">All Req. Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* IT Priority Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-it-priority" className="visually-hidden">IT Priority</label>
              <select
                id="filter-it-priority"
                aria-label="IT Priority"
                className="form-select"
                value={selectedItPriority}
                onChange={(e) => { setSelectedItPriority(e.target.value); setPage(1); }}
              >
                <option value="">All IT Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Ownership Filter */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-ownership" className="visually-hidden">Ownership</label>
              <select
                id="filter-ownership"
                aria-label="Ownership"
                className="form-select"
                value={selectedOwnership}
                onChange={(e) => {
                  setSelectedOwnership(e.target.value as any);
                  if (e.target.value === 'unassigned') setSelectedOwnerId('');
                  setPage(1);
                }}
              >
                <option value="">All Ownership</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            {/* Owner Filter */}
            <div className="col-6 col-md-3">
              <label htmlFor="filter-owner" className="visually-hidden">Owner</label>
              <select
                id="filter-owner"
                aria-label="Owner"
                className="form-select"
                value={selectedOwnerId}
                onChange={(e) => {
                  setSelectedOwnerId(e.target.value ? parseInt(e.target.value, 10) : '');
                  setPage(1);
                }}
                disabled={selectedOwnership === 'unassigned'}
              >
                <option value="">All Owners</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Per Page Selector */}
            <div className="col-6 col-md-2 d-flex align-items-center gap-2">
              <label htmlFor="page-size-select" className="text-muted small mb-0 text-nowrap">
                Per page:
              </label>
              <select
                id="page-size-select"
                aria-label="Per page:"
                className="form-select form-select-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                style={{ width: '80px' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            <div className="col-12 col-md-3 ms-auto d-flex justify-content-end align-items-center">
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none"
                style={{ color: hasActiveFilters ? '#0B7A46' : '#94A3B8' }}
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
                aria-label="Reset Filters"
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <div>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={loadQueue}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border mb-3" style={{ color: '#006B3C' }} role="status"></div>
          <p className="text-muted">Loading ticket queue...</p>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty State */
        <div className="text-center py-5 bg-white rounded shadow-sm border" style={{ borderColor: '#E2E8F0' }}>
          <i className="bi bi-inbox text-muted mb-3 d-block" style={{ fontSize: '3rem' }}></i>
          <h4 style={{ color: '#1E293B' }}>{hasActiveFilters ? "No matching tickets found" : "No tickets in the queue"}</h4>
          <p className="text-muted">{hasActiveFilters ? "No tickets match your active filter criteria." : "There are currently no tickets requiring triage."}</p>
          {hasActiveFilters && (
            <button className="btn btn-zen-primary btn-sm px-3 mt-2" onClick={handleResetFilters}>
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View (Identical Zen Green table design to MyTicketsPage) */}
          <div className="d-none d-md-block bg-white rounded shadow-sm border" style={{ borderColor: '#E2E8F0', overflow: 'hidden' }}>
            <table className="table table-hover mb-0 align-middle">
              <thead style={{ backgroundColor: '#F8FAFC' }}>
                <tr>
                  <th className="py-3 px-4 text-muted" style={{ fontWeight: 500 }}>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fw-medium text-muted d-flex align-items-center"
                      onClick={() => handleSort('ticketNumber')}
                      aria-label="Sort by Ticket Number"
                    >
                      Ticket #
                      {sortBy === 'ticketNumber' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} style={{ color: '#0B7A46' }}></i>
                      )}
                    </button>
                  </th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fw-medium text-muted d-flex align-items-center"
                      onClick={() => handleSort('createdAt')}
                      aria-label="Sort by Created Date"
                    >
                      Created
                      {sortBy === 'createdAt' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} style={{ color: '#0B7A46' }}></i>
                      )}
                    </button>
                  </th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>Summary</th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fw-medium text-muted d-flex align-items-center"
                      onClick={() => handleSort('category')}
                      aria-label="Sort by Category"
                    >
                      Category
                      {sortBy === 'category' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} style={{ color: '#0B7A46' }}></i>
                      )}
                    </button>
                  </th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fw-medium text-muted d-flex align-items-center"
                      onClick={() => handleSort('requestedPriority')}
                      aria-label="Sort by Requested Priority"
                    >
                      Req. Priority
                      {sortBy === 'requestedPriority' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} style={{ color: '#0B7A46' }}></i>
                      )}
                    </button>
                  </th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fw-medium text-muted d-flex align-items-center"
                      onClick={() => handleSort('itPriority')}
                      aria-label="Sort by IT Priority"
                    >
                      IT Priority
                      {sortBy === 'itPriority' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} style={{ color: '#0B7A46' }}></i>
                      )}
                    </button>
                  </th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fw-medium text-muted d-flex align-items-center"
                      onClick={() => handleSort('status')}
                      aria-label="Sort by Status"
                    >
                      Status
                      {sortBy === 'status' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} style={{ color: '#0B7A46' }}></i>
                      )}
                    </button>
                  </th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fw-medium text-muted d-flex align-items-center"
                      onClick={() => handleSort('owner')}
                      aria-label="Sort by Owner"
                    >
                      Owner
                      {sortBy === 'owner' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} style={{ color: '#0B7A46' }}></i>
                      )}
                    </button>
                  </th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none fw-medium text-muted d-flex align-items-center"
                      onClick={() => handleSort('updatedAt')}
                      aria-label="Sort by Updated Date"
                    >
                      Updated
                      {sortBy === 'updatedAt' && (
                        <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'} ms-1`} style={{ color: '#0B7A46' }}></i>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-muted text-end" style={{ fontWeight: 500 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <td className="px-4 fw-medium" style={{ color: '#0B7A46' }}>
                      {ticket.ticketNumber}
                    </td>
                    <td className="text-muted small">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {ticket.summary.length > 35 ? ticket.summary.substring(0, 35) + '...' : ticket.summary}
                    </td>
                    <td className="text-muted small">{ticket.category}</td>
                    <td>{getPriorityBadge(ticket.requestedPriority)}</td>
                    <td>{getPriorityBadge(ticket.itPriority)}</td>
                    <td>{getStatusBadge(normalizeStatus(ticket.status))}</td>
                    <td className="text-muted small">
                      {ticket.owner ? (
                        <span className="d-flex align-items-center">
                          <i className="bi bi-person-fill text-muted me-1"></i>
                          {ticket.owner.name}
                        </span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="text-muted small">
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 text-end">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="btn btn-sm btn-link p-0 text-decoration-none fw-medium"
                        style={{ color: '#0B7A46' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Identical card layout to MyTicketsPage) */}
          <div className="d-block d-md-none">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="card shadow-sm border-0 mb-3"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold" style={{ color: '#0B7A46' }}>
                      {ticket.ticketNumber}
                    </span>
                    {getStatusBadge(normalizeStatus(ticket.status))}
                  </div>
                  <p className="card-text mb-2 text-dark">{ticket.summary}</p>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <span className="badge bg-light text-dark border">{ticket.category}</span>
                    <span className="small text-muted d-flex align-items-center">
                      IT: {getPriorityBadge(ticket.itPriority)}
                    </span>
                    <span className="small text-muted d-flex align-items-center">
                      Req: {getPriorityBadge(ticket.requestedPriority)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-muted small mt-3 pt-3 border-top">
                    <span>
                      <i className="bi bi-person me-1"></i>
                      {ticket.owner ? ticket.owner.name : 'Unassigned'}
                    </span>
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-3 pt-2 border-top text-end">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="btn btn-sm btn-outline-success w-100 d-flex align-items-center justify-content-center"
                      style={{ color: '#0B7A46', borderColor: '#0B7A46', minHeight: '44px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open Detail
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Record Count Feedback */}
          <div className="d-flex justify-content-between align-items-center mt-3 text-muted small px-1">
            <span>
              Showing <strong className="text-dark">{startItem}</strong>–<strong className="text-dark">{endItem}</strong> of{' '}
              <strong className="text-dark">{totalItems}</strong> tickets
            </span>
          </div>

          {/* Pagination (Exact Zen Green numbered pagination with jump input from MyTicketsPage) */}
          {totalPages >= 1 && (
            <div className="d-flex justify-content-center mt-4">
              <nav aria-label="Ticket queue navigation">
                <ul className="pagination">
                  <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </button>
                  </li>

                  {(() => {
                    const items: (number | string)[] = [];
                    if (totalPages <= 10) {
                      for (let i = 1; i <= totalPages; i++) items.push(i);
                    } else if (page <= 4) {
                      items.push(1, 2, 3, 4, 5, 6, '...right', totalPages - 1, totalPages);
                    } else if (page >= totalPages - 3) {
                      items.push(1, 2, '...left', totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      items.push(1, 2, '...left', page - 1, page, page + 1, '...right', totalPages - 1, totalPages);
                    }

                    return items.map((item, index) => {
                      if (typeof item === 'string') {
                        return (
                          <li key={`ellipsis-${index}`} className="page-item">
                            <input
                              type="text"
                              className="page-link text-center px-1"
                              style={{ width: '50px', height: '100%', color: '#6c757d', outline: 'none', boxShadow: 'none' }}
                              placeholder="..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = parseInt((e.target as HTMLInputElement).value, 10);
                                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                                    setPage(val);
                                  }
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                              title="Type page number and press Enter"
                            />
                          </li>
                        );
                      }

                      return (
                        <li key={item} className={`page-item ${page === item ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setPage(item as number)}
                            style={page === item ? { backgroundColor: '#0B7A46', borderColor: '#0B7A46' } : {}}
                          >
                            {item}
                          </button>
                        </li>
                      );
                    });
                  })()}

                  <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}
