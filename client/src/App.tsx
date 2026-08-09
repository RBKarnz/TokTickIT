import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCheck() {
    // TODO(Issue 4): set loading, call checkSystem(), then either
    //   - success: store categories and show Online + the list, or
    //   - error: show Offline + a useful message.
    setState("loading");
    setErrorMessage("");
    try {
      // ไปหา Backend (ทำงานร่วมกับ Issue 2)
      const data = await checkSystem();
      setCategories(data.categories || []);
      setState("success");
    } catch (error: any) {
      // ถ้าไม่มี error.message ส่งมา ก็จะ fallback ไปใช้ข้อความด้านหลังทันที
      setErrorMessage(error?.message || "Unable to connect to the backend.");
      // ถ้า Backend ปิดอยู่ หรือเชื่อมต่อไม่ได้
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {/* แสดงผล Online พร้อมกับ List ของ Categories */}
      {state === "success" && (
        <div className="alert alert-success mt-4">
          <strong>Online:</strong> The TokTickIT backend is running successfully.
          <ul className="mt-3 mb-0">
            {categories.map((category) => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ul>
        </div>
      )}

      {/* แสดงผล Offline */}
      {state === "error" && (
        <div className="alert alert-danger mt-4">
          <strong>Offline:</strong> {errorMessage}
        </div>
      )}

      {/* TODO(Issue 4): render loading / success (Online + categories) / error (Offline) states. */}
    </div>
  );
}
