import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchStaffQueue,
  fetchStaffUsers,
  fetchCategories,
  Category,
  StaffQueueTicket,
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sort, setSort] = useState('updated_desc');
  const [selectedOwner, setSelectedOwner] = useState(''); // "" = all, "unassigned", or user id
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Data state
  const [tickets, setTickets] = useState<StaffQueueTicket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load categories and staff users on mount
  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchStaffUsers().then((d) => setStaffUsers(d.users || [])).catch(console.error);
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
      const ownership = selectedOwner === 'unassigned' ? 'unassigned' : undefined;
      const ownerId = selectedOwner && selectedOwner !== 'unassigned' ? parseInt(selectedOwner, 10) : undefined;

      const data = await fetchStaffQueue({
        search: debouncedSearch,
        categoryId: selectedCategory || undefined,
        status: selectedStatus || undefined,
        sort: sort,
        ownership,
        ownerId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
      });

      setTickets(data?.items || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || 'Failed to load ticket queue');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedStatus, sort, selectedOwner, startDate, endDate, page]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSort('updated_desc');
    setSelectedOwner('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch || selectedCategory || selectedStatus || selectedOwner || startDate || endDate || sort !== 'updated_desc'
  );

  // Normalize status string for getStatusBadge
  const normalizeStatus = (statusStr: string) => statusStr?.toUpperCase().replace(/ /g, '_');

  return (
    <div className="container py-4" style={{ maxWidth: '1200px' }}>
      {/* Page Header (identical structure and color to MyTicketsPage) */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1" style={{ color: '#1E293B' }}>IT Staff Ticket Queue</h1>
          <p className="text-muted mb-0">Operational triage & resolution queue</p>
        </div>
      </div>

      {/* Filter Card (identical layout to MyTicketsPage) */}
      <div className="card shadow-sm mb-4" style={{ border: '1px solid #E2E8F0' }}>
        <div className="card-body bg-light">
          <div className="row g-3">
            {/* Search */}
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search summary or ticket no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Categories Filter */}
            <div className="col-6 col-md-2">
              <select
                aria-label="Category"
                className="form-select"
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Statuses Filter */}
            <div className="col-6 col-md-2">
              <select
                aria-label="Status"
                className="form-select"
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REOPENED">Reopened</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Owner Filter (Merged All Owners + Unassigned) */}
            <div className="col-6 col-md-2">
              <select
                aria-label="Owner"
                className="form-select"
                value={selectedOwner}
                onChange={(e) => { setSelectedOwner(e.target.value); setPage(1); }}
              >
                <option value="">All Owners</option>
                <option value="unassigned">Unassigned</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id.toString()}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown (identical to Photo 3) */}
            <div className="col-6 col-md-2">
              <select
                aria-label="Sort"
                className="form-select"
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
              >
                <option value="updated_desc">Recently Updated</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Highest Priority</option>
                <option value="priority_asc">Lowest Priority</option>
              </select>
            </div>

            {/* Date Range Filter (identical to MyTicketsPage) */}
            <div className="col-12 d-flex flex-wrap align-items-center gap-2 mt-2 pt-2 border-top">
              <label className="text-muted small mb-0 text-nowrap">
                <i className="bi bi-calendar-event me-1"></i> Updated Between:
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: 'auto' }}
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              />
              <span className="text-muted small">to</span>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: 'auto' }}
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              />
              {(startDate || endDate) && (
                <button
                  className="btn btn-sm btn-link text-decoration-none ms-2"
                  onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                >
                  Clear Dates
                </button>
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none ms-auto"
                  style={{ color: '#0B7A46' }}
                  onClick={handleResetFilters}
                  aria-label="Reset Filters"
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>Reset Filters
                </button>
              )}
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
          <p className="text-muted">{hasActiveFilters ? "No tickets match your active filter criteria. Try adjusting your filters." : "There are currently no tickets requiring triage."}</p>
          {hasActiveFilters && (
            <button className="btn btn-zen-primary btn-sm px-3 mt-2" onClick={handleResetFilters}>
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View (Clean headers matching MyTicketsPage, NO redundant Action column) */}
          <div className="d-none d-md-block bg-white rounded shadow-sm border" style={{ borderColor: '#E2E8F0', overflow: 'hidden' }}>
            <table className="table table-hover mb-0 align-middle">
              <thead style={{ backgroundColor: '#F8FAFC' }}>
                <tr>
                  <th className="py-3 px-4 text-muted" style={{ fontWeight: 500 }}>Ticket No.</th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>Summary</th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>Category</th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>Priority</th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>Status</th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>Owner</th>
                  <th className="py-3 px-4 text-muted" style={{ fontWeight: 500 }}>Last Updated</th>
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
                    <td>
                      {ticket.summary.length > 40 ? ticket.summary.substring(0, 40) + '...' : ticket.summary}
                    </td>
                    <td className="text-muted small">{ticket.category}</td>
                    <td>{getPriorityBadge(ticket.itPriority || ticket.requestedPriority)}</td>
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
                    <td className="px-4 text-muted small">
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Identical card layout to MyTicketsPage, clicking card opens ticket) */}
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
                      Priority: {getPriorityBadge(ticket.itPriority || ticket.requestedPriority)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-muted small mt-3 pt-3 border-top">
                    <span>
                      <i className="bi bi-person me-1"></i>
                      {ticket.owner ? ticket.owner.name : 'Unassigned'}
                    </span>
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination (Exact Zen Green numbered pagination from MyTicketsPage) */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <nav aria-label="Ticket queue navigation">
                <ul className="pagination">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
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

                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
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
