import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabaseClient: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
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
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock("@ant-design/plots", () => ({
  Line: () => null,
}));

type AnyModule = Record<string, unknown>;

describe("Smoke: App module", () => {
  it("App.tsx bisa di-import", async () => {
    const mod = (await import("@/app/App")) as AnyModule;
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("authProvider bisa di-import", async () => {
    const mod = (await import("@/app/providers/authProvider")) as AnyModule;
    expect(mod.authProvider).toBeDefined();
  });

  it("semua halaman bisa di-import", async () => {
    const dashboard = (await import("@/features/dashboard/pages/DashboardPage")) as AnyModule;
    const login = (await import("@/features/auth/pages/LoginPage")) as AnyModule;
    const stockEntry = (await import("@/features/products/pages/ProductCreatePage")) as AnyModule;

    expect(dashboard.default).toBeDefined();
    expect(login.LoginPage).toBeDefined();
    expect(stockEntry.ProductCreatePage).toBeDefined();
  });
});