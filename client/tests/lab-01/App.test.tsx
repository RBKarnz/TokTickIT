import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — write these yourself.
  it("shows Online and the seeded categories on success", async () => {
    const mockResponse = {
      online: true,
      categories: [
        { id: "1", name: "Account and Access" },
        { id: "2", name: "Hardware" },
        { id: "3", name: "Software" },
        { id: "4", name: "Network" }
      ]
    };
    
    const spy = vi.spyOn(api, "checkSystem").mockResolvedValue(mockResponse as any);

    render(<App />);
    
    const button = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Online:/i)).toBeInTheDocument();
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Hardware")).toBeInTheDocument();
      expect(screen.getByText("Software")).toBeInTheDocument();
      expect(screen.getByText("Network")).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    const spy = vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("API is currently down"));

    render(<App />);
    
    const button = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Offline:/i)).toBeInTheDocument();
      expect(screen.getByText(/API is currently down/i)).toBeInTheDocument();
    });

    spy.mockRestore();
  });
});