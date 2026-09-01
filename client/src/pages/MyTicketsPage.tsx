import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequester } from '../RequesterContext.js';
import { fetchMyTickets, fetchCategories, Category } from '../api.js';

interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  categoryId: number;
  category: { name: string };
  requestedPriority: string;
  currentStatus: string;
  updatedAt: string;
}

export default function MyTicketsPage() {
  const { activeRequester } = useRequester();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sort, setSort] = useState('updated_desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset page on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadTickets = useCallback(async () => {
    if (!activeRequester) return;
    setLoading(true);
    try {
      const data = await fetchMyTickets(activeRequester.id, {
        search: debouncedSearch,
        categoryId: selectedCategory,
        status: selectedStatus,
        sort: sort,
        startDate: startDate,
        endDate: endDate,
        page: page
      });
      setTickets(data.data);
      setTotalPages(data.pagination.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [activeRequester, debouncedSearch, selectedCategory, selectedStatus, sort, startDate, endDate, page]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    async function loadCats() {
      try {
        setCategories(await fetchCategories());
      } catch (e) {
        console.error(e);
      }
    }
    loadCats();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW': return <span className="badge" style={{ backgroundColor: '#EAF6EF', color: '#0B7A46' }}>NEW</span>;
      case 'IN_PROGRESS': return <span className="badge bg-primary">IN PROGRESS</span>;
      case 'RESOLVED': return <span className="badge bg-secondary">RESOLVED</span>;
      default: return <span className="badge bg-dark">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'HIGH' || priority === 'CRITICAL') {
      return <span className="badge bg-danger">{priority}</span>;
    }
    return <span>{priority}</span>;
  };

  return (
    <div className="container py-4" style={{ maxWidth: '1200px' }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1" style={{ color: '#1E293B' }}>My Tickets</h1>
          <p className="text-muted mb-0">Manage and track your support requests</p>
        </div>
        <a href="/tickets/create" className="btn btn-zen-primary shadow-sm d-flex align-items-center justify-content-center">
          <i className="bi bi-plus-circle me-2"></i> Create Ticket
        </a>
      </div>

      <div className="card shadow-sm mb-4" style={{ border: '1px solid #E2E8F0' }}>
        <div className="card-body bg-light">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                <input 
                  type="text" 
                  className="form-control border-start-0 ps-0" 
                  placeholder="Search summary or ticket no..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <select className="form-select" value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select" value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}>
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <select className="form-select" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
                <option value="updated_desc">Recently Updated</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Highest Priority</option>
                <option value="priority_asc">Lowest Priority</option>
              </select>
            </div>
            {/* Date Range Filter */}
            <div className="col-12 d-flex flex-wrap align-items-center gap-2 mt-2 pt-2 border-top">
              <label className="text-muted small mb-0 text-nowrap"><i className="bi bi-calendar-event me-1"></i> Updated Between:</label>
              <input type="date" className="form-control form-control-sm" style={{ width: 'auto' }} value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
              <span className="text-muted small">to</span>
              <input type="date" className="form-control form-control-sm" style={{ width: 'auto' }} value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
              {(startDate || endDate) && (
                <button className="btn btn-sm btn-link text-decoration-none ms-2" onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}>
                  Clear Dates
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border mb-3" style={{ color: '#006B3C' }} role="status"></div>
          <p className="text-muted">Loading your tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-5 bg-white rounded shadow-sm border" style={{ borderColor: '#E2E8F0' }}>
          <i className="bi bi-inbox text-muted mb-3 d-block" style={{ fontSize: '3rem' }}></i>
          <h4 style={{ color: '#1E293B' }}>No tickets found</h4>
          <p className="text-muted">{(searchTerm || selectedCategory || selectedStatus) ? "Try adjusting your filters." : "You haven't created any tickets yet."}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="d-none d-md-block bg-white rounded shadow-sm border" style={{ borderColor: '#E2E8F0', overflow: 'hidden' }}>
            <table className="table table-hover mb-0 align-middle">
              <thead style={{ backgroundColor: '#F8FAFC' }}>
                <tr>
                  <th className="py-3 px-4 text-muted" style={{ fontWeight: 500 }}>Ticket No.</th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>Summary</th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>Category</th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>Priority</th>
                  <th className="py-3 text-muted" style={{ fontWeight: 500 }}>Status</th>
                  <th className="py-3 px-4 text-muted" style={{ fontWeight: 500 }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tickets/${ticket.id}`)}>
                    <td className="px-4 fw-medium" style={{ color: '#0B7A46' }}>{ticket.ticketNumber}</td>
                    <td>{ticket.summary.length > 40 ? ticket.summary.substring(0, 40) + '...' : ticket.summary}</td>
                    <td className="text-muted small">{ticket.category?.name}</td>
                    <td>{getPriorityBadge(ticket.requestedPriority)}</td>
                    <td>{getStatusBadge(ticket.currentStatus)}</td>
                    <td className="px-4 text-muted small">{new Date(ticket.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="d-block d-md-none">
            {tickets.map(ticket => (
              <div key={ticket.id} className="card shadow-sm border-0 mb-3" onClick={() => navigate(`/tickets/${ticket.id}`)} style={{ cursor: 'pointer' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold" style={{ color: '#0B7A46' }}>{ticket.ticketNumber}</span>
                    {getStatusBadge(ticket.currentStatus)}
                  </div>
                  <p className="card-text mb-2 text-dark">{ticket.summary}</p>
                  <div className="d-flex justify-content-between text-muted small mt-3 pt-3 border-top">
                    <span><i className="bi bi-tag me-1"></i>{ticket.category?.name}</span>
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <nav>
                <ul className="pagination">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
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
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const val = parseInt((e.target as HTMLInputElement).value);
                                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                                    setPage(val);
                                  }
                                  (e.target as HTMLInputElement).value = ''; // clear after jump
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
                            onClick={() => setPage(item)} 
                            style={page === item ? { backgroundColor: '#0B7A46', borderColor: '#0B7A46' } : {}}
                          >
                            {item}
                          </button>
                        </li>
                      );
                    });
                  })()}

                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
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
