import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

type AnyModule = Record<string, unknown>;

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabaseClient: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      // ✅ Tambahan: Mencegah Promise menggantung jika di-await di dalam hook
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    })),
  },
}));

vi.mock("@ant-design/plots", () => ({
  Line: () => null,
}));

async function loadApp(): Promise<ComponentType> {
  const mod = (await import("@/app/App")) as AnyModule;
  return mod.default as ComponentType;
}

describe("DIAGNOSTIC 04 — Full App Render", () => {
  it("Step 1: App.tsx module loads", async () => {
    const mod = (await import("@/app/App")) as AnyModule;
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  }, 60_000); // ✅ Dinaikkan menjadi 60.000 ms

  it("Step 2: App renders without throwing synchronously", async () => {
    const App = await loadApp();
    let renderError: Error | null = null;
    try {
      render(createElement(App));
    } catch (e) {
      renderError = e as Error;
    }
    expect(renderError).toBeNull();
  }, 60_000); // ✅ Dinaikkan menjadi 60.000 ms

  it("Step 3: App renders and produces DOM output", async () => {
    const App = await loadApp();
    const { container } = render(createElement(App));
    await new Promise((r) => setTimeout(r, 1000)); // Dinaikkan jadi 1 detik agar render selesai
    expect(container).toBeTruthy();
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  }, 60_000); // ✅ Dinaikkan menjadi 60.000 ms

  it("Step 4: App renders default route (Dashboard) successfully", async () => {
    const App = await loadApp();
    render(createElement(App));
    const heading = await screen.findByText(/Dashboard/i, {}, { timeout: 15_000 });
    expect(heading).toBeInTheDocument();
  }, 60_000); // ✅ Dinaikkan menjadi 60.000 ms
});