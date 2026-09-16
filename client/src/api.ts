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
