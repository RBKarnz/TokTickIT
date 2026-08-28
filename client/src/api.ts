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
