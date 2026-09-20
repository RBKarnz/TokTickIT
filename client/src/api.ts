const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories?: Category[];
}

export * from './authApi.js';

// ---------------------------------------------------------------------------
// Issue 2 + Issue 4: Health and Categories
// ---------------------------------------------------------------------------

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Backend is unavailable (health check failed)");
  }
  
  const catRes = await fetch(`${API_URL}/api/categories`);
  if (!catRes.ok) {
    throw new Error("Failed to fetch categories.");
  }

  const categories = await catRes.json();
  return { online: true, categories: categories };
}

// Lab 2: Fetch active requesters
export async function fetchRequesters() {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error("Failed to fetch requesters.");
  }
  return await res.json();
}

// Lab 2: Fetch active categories directly
export async function fetchCategories() {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Failed to fetch categories.");
  }
  return await res.json();
}

// Lab 2: Fetch active systems
export async function fetchSystems() {
  const res = await fetch(`${API_URL}/api/systems`);
  if (!res.ok) {
    throw new Error("Failed to fetch systems.");
  }
  return await res.json();
}

// ---------------------------------------------------------------------------
// Lab 2 & 3: Ticket Endpoints (Using Session Auth)
// ---------------------------------------------------------------------------

// Create ticket
export async function createTicket(ticketData: any, _requesterId?: number) {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(ticketData),
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || "Failed to create ticket.");
  }
  
  return await res.json();
}

// Fetch my tickets with pagination and filters
export async function fetchMyTickets(paramsOrId?: any, maybeParams?: any) {
  const params = typeof paramsOrId === 'object' && paramsOrId !== null ? paramsOrId : (maybeParams || {});
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.categoryId) query.append('categoryId', params.categoryId);
  if (params.status) query.append('status', params.status);
  if (params.sort) query.append('sort', params.sort);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.pageSize) query.append('limit', params.pageSize.toString());
  
  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error("Failed to fetch tickets.");
  }

  return await res.json();
}

// Fetch specific ticket detail
export async function fetchTicketDetail(ticketId: number, _requesterId?: number) {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || "Failed to fetch ticket detail.");
  }

  return await res.json();
}

export async function uploadAttachment(ticketId: number, file: File, _requesterId?: number) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Upload failed');
  }
  return await res.json();
}

export async function downloadAttachment(attachmentId: number, originalFilename: string, _requesterId?: number) {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Download failed');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = originalFilename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function removeAttachment(attachmentId: number, reason: string, _requesterId?: number) {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: { 
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to remove attachment');
  }
  return await res.json();
}

export interface PublicComment {
  id: number;
  ticketId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
}

export async function fetchPublicComments(ticketId: number): Promise<PublicComment[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/public-comments`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to fetch comments');
  }
  const data = await res.json();
  return data.comments || [];
}

export async function postPublicComment(ticketId: number, content: string): Promise<PublicComment> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/public-comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to post comment');
  }
  const data = await res.json();
  return data.comment;
}

export async function markProblemResolved(ticketId: number): Promise<{ ticketId: number; requesterResolvedAt: string }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/problem-appears-resolved`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to mark problem as resolved');
  }
  return await res.json();
}

// ---------------------------------------------------------------------------
// Lab 3: IT Staff Queue Endpoints
// ---------------------------------------------------------------------------

export interface StaffQueueTicket {
  id: number;
  ticketNumber: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  category: string;
  requestedPriority: string;
  itPriority: string;
  status: string;
  owner: { id: number; name: string } | null;
}

export interface QueueQueryParams {
  search?: string;
  categoryId?: number | string;
  status?: string;
  requestedPriority?: string;
  itPriority?: string;
  ownership?: 'assigned' | 'unassigned' | '';
  ownerId?: number | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sort?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface StaffQueueResponse {
  items: StaffQueueTicket[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function fetchStaffQueue(params: QueueQueryParams = {}): Promise<StaffQueueResponse> {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) query.set('search', params.search.trim());
  if (params.categoryId) query.set('categoryId', String(params.categoryId));
  if (params.status) query.set('status', params.status);
  if (params.requestedPriority) query.set('requestedPriority', params.requestedPriority);
  if (params.itPriority) query.set('itPriority', params.itPriority);
  if (params.ownership) query.set('ownership', params.ownership);
  if (params.ownerId !== undefined && params.ownerId !== '') query.set('ownerId', String(params.ownerId));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params.sort) query.set('sort', params.sort);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const res = await fetch(`${API_URL}/api/staff/tickets?${query.toString()}`, { credentials: 'include' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch ticket queue (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchStaffUsers(): Promise<{ users: { id: number; name: string; email: string }[] }> {
  const res = await fetch(`${API_URL}/api/staff/users`, { credentials: 'include' });
  if (!res.ok) return { users: [] };
  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3: IT Staff Ticket Detail & Operations Endpoints
// ---------------------------------------------------------------------------

export async function fetchStaffTicketDetail(ticketId: number) {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || `Failed to fetch ticket detail (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function claimTicket(ticketId: number) {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/claim`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to claim ticket');
  }
  return await res.json();
}

export async function assignTicketOwner(ticketId: number, ownerId: number) {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/owner`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ ownerId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to assign owner');
  }
  return await res.json();
}

export async function updateTicketItPriority(ticketId: number, itPriority: string) {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/it-priority`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ itPriority }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to update IT Priority');
  }
  return await res.json();
}

export async function updateTicketStatus(ticketId: number, status: string, resolutionSummary?: string) {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ status, resolutionSummary }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to update ticket status');
  }
  return await res.json();
}

export interface InternalNote {
  id: number;
  ticketId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
}

export async function fetchInternalNotes(ticketId: number): Promise<InternalNote[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/internal-notes`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to fetch internal notes');
  }
  const data = await res.json();
  return data.notes || [];
}

export async function postInternalNote(ticketId: number, content: string): Promise<InternalNote> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/internal-notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to post internal note');
  }
  const data = await res.json();
  return data.note;
}

// ---------------------------------------------------------------------------
// Lab 3: Administrator User Management API
// ---------------------------------------------------------------------------

export interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  isActive: boolean;
  mustChangePassword?: boolean;
}

export async function fetchAdminUsers(params?: { search?: string; role?: string }): Promise<{ items: AdminUserItem[] }> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.role) query.append('role', params.role);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`${API_URL}/api/admin/users${qs}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to fetch users');
  }
  return await res.json();
}

export async function createAdminUser(data: {
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  initialPassword: string;
  confirmInitialPassword: string;
}): Promise<{ user: AdminUserItem }> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to create user');
  }
  return await res.json();
}

export async function updateAdminUser(userId: number, data: {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}): Promise<{ user: AdminUserItem }> {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to update user');
  }
  return await res.json();
}

export async function setUserInitialPassword(userId: number, data: {
  initialPassword: string;
  confirmInitialPassword: string;
}): Promise<{ message: string; user: AdminUserItem }> {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/set-initial-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to set initial password');
  }
  return await res.json();
}

