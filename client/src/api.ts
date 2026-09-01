const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories?: Category[];
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.

export async function checkSystem(): Promise<SystemStatus> {
  // TODO(Issue 2 & 4): implement the two fetch calls described above.

  // สั่ง API ไปเช็คสถานะหลังบ้าน (Issue 2)
  const healthRes = await fetch(`${API_URL}/api/health`);
  // ถ้าหลังบ้านปิดอยู่หรือส่ง Status อื่นที่ไม่ใช่ 200(ok) ให้ดักจับและแจ้ง Error
    if (!healthRes.ok) {
      throw new Error("Backend is unavailable (health check failed)");
    }
  
  // ดึงข้อมูล Category จาก API ใหม่ (Issue 4)
  const catRes = await fetch(`${API_URL}/api/categories`);
  if (!catRes.ok) {
    throw new Error("Failed to fetch categories.");
  }

  // แปลงข้อมูลและส่งกลับไปให้ App.tsx
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

// Lab 2: Create ticket
export async function createTicket(ticketData: any, requesterId: number) {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requester-Id': requesterId.toString()
    },
    body: JSON.stringify(ticketData)
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || "Failed to create ticket.");
  }
  
  return await res.json();
}

// Lab 2: Fetch my tickets with pagination and filters
export async function fetchMyTickets(requesterId: number, params: any = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.categoryId) query.append('categoryId', params.categoryId);
  if (params.status) query.append('status', params.status);
  if (params.sort) query.append('sort', params.sort);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.page) query.append('page', params.page.toString());
  
  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    headers: {
      'X-Requester-Id': requesterId.toString()
    }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch tickets.");
  }

  return await res.json();
}
