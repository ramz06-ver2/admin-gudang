import { describe, it, expect, vi } from "vitest";

// Tipe longgar untuk dynamic import
type AnyModule = Record<string, unknown>;

// ============================================
// Mock SEBELUM import
// ============================================
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

describe("DIAGNOSTIC 01 — Module Imports", () => {
  // ============================================
  // Library packages
  // ============================================
  describe("Library packages", () => {
    it("import @refinedev/core", async () => {
      const mod = (await import("@refinedev/core")) as AnyModule;
      expect(mod).toBeDefined();
    });

    it("import @refinedev/kbar", async () => {
      const mod = (await import("@refinedev/kbar")) as AnyModule;
      expect(mod).toBeDefined();
    });

    it("import @refinedev/react-router-v6", async () => {
      const mod = (await import("@refinedev/react-router-v6")) as AnyModule;
      expect(mod).toBeDefined();
    });

    it("import @refinedev/supabase", async () => {
      const mod = (await import("@refinedev/supabase")) as AnyModule;
      expect(mod).toBeDefined();
    });

    it("import @refinedev/antd", async () => {
      const mod = (await import("@refinedev/antd")) as AnyModule;
      expect(mod).toBeDefined();
    });

    it("import antd", async () => {
      const mod = (await import("antd")) as AnyModule;
      expect(mod).toBeDefined();
    });

    it("import @ant-design/icons", async () => {
      const mod = (await import("@ant-design/icons")) as AnyModule;
      expect(mod).toBeDefined();
    });

    it("import react-router-dom", async () => {
      const mod = (await import("react-router-dom")) as AnyModule;
      expect(mod).toBeDefined();
    });
  });

  // ============================================
  // Local source files
  // ============================================
  describe("Local source files", () => {
    it("import @/shared/lib/config", async () => {
      const mod = (await import("@/shared/lib/config")) as AnyModule;
      expect(mod.USE_MOCK).toBeDefined();
    });

    it("import @/shared/lib/constants", async () => {
      const mod = (await import("@/shared/lib/constants")) as AnyModule;
      expect(mod.COLORS).toBeDefined();
      expect(mod.TABLES).toBeDefined();
    });

    it("import @/shared/lib/format", async () => {
      const mod = (await import("@/shared/lib/format")) as AnyModule;
      expect(mod.formatRupiah).toBeDefined();
    });

    it("import @/shared/types (types only, no runtime export)", async () => {
      const mod = (await import("@/shared/types")) as AnyModule;
      expect(mod).toBeDefined();
    });

    it("import @/app/providers/authProvider", async () => {
      const mod = (await import("@/app/providers/authProvider")) as AnyModule;
      expect(mod.authProvider).toBeDefined();
    });

    it("import @/app/App", async () => {
      const mod = (await import("@/app/App")) as AnyModule;
      expect(mod.default).toBeDefined();
    });
  });

  // ============================================
  // Pages
  // ============================================
  describe("Pages", () => {
    it("import @/features/auth/pages/LoginPage", async () => {
      const mod = (await import("@/features/auth/pages/LoginPage")) as AnyModule;
      expect(mod.LoginPage).toBeDefined();
    });

    it("import @/features/dashboard/pages/DashboardPage", async () => {
      const mod = (await import("@/features/dashboard/pages/DashboardPage")) as AnyModule;
      expect(mod.default).toBeDefined();
    });

    it("import @/features/products/pages/ProductCreatePage", async () => {
      const mod = (await import("@/features/products/pages/ProductCreatePage")) as AnyModule;
      expect(mod.ProductCreatePage).toBeDefined();
    });
  });

  // ============================================
  // Hooks
  // ============================================
  describe("Hooks", () => {
    it("import @/features/dashboard/useDashboardStats", async () => {
      const mod = (await import("@/features/dashboard/useDashboardStats")) as AnyModule;
      expect(mod.useDashboardStats).toBeDefined();
    });

    it("import @/features/dashboard/useLowStock", async () => {
      const mod = (await import("@/features/dashboard/useLowStock")) as AnyModule;
      expect(mod.useLowStock).toBeDefined();
    });

    it("import @/features/dashboard/useStockInChart", async () => {
      const mod = (await import("@/features/dashboard/useStockInChart")) as AnyModule;
      expect(mod.useStockInChart).toBeDefined();
    });

    it("import @/shared/hooks/useKeyboardShortcut", async () => {
      const mod = (await import("@/shared/hooks/useKeyboardShortcut")) as AnyModule;
      expect(mod.useKeyboardShortcut).toBeDefined();
    });

    it("import @/features/products/useProductSearch", async () => {
      const mod = (await import("@/features/products/useProductSearch")) as AnyModule;
      expect(mod.useProductSearch).toBeDefined();
    });

    it("import @/features/stock-in/useStockEntryMutations", async () => {
      const mod = (await import("@/features/stock-in/useStockEntryMutations")) as AnyModule;
      expect(mod.useCreateStockEntry).toBeDefined();
    });
  });

  // ============================================
  // Components
  // ============================================
  describe("Components", () => {
    it("import @/shared/components/GlobalSearch", async () => {
      const mod = (await import("@/shared/components/GlobalSearch")) as AnyModule;
      expect(mod.GlobalSearch).toBeDefined();
    });

    it("import @/shared/components/StatusBadge", async () => {
      const mod = (await import("@/shared/components/StatusBadge")) as AnyModule;
      expect(mod.StatusBadge).toBeDefined();
    });

    it("import @/features/dashboard/components/StatCard", async () => {
      const mod = (await import("@/features/dashboard/components/StatCard")) as AnyModule;
      expect(mod.StatCard).toBeDefined();
    });

    it("import @/features/dashboard/components/StockInChart", async () => {
      const mod = (await import("@/features/dashboard/components/StockInChart")) as AnyModule;
      expect(mod.StockInChart).toBeDefined();
    });

    it("import @/features/dashboard/components/LowStockTable", async () => {
      const mod = (await import("@/features/dashboard/components/LowStockTable")) as AnyModule;
      expect(mod.LowStockTable).toBeDefined();
    });
  });

  // ============================================
  // Mocks
  // ============================================
  describe("Mocks", () => {
    it("import @/mocks/products", async () => {
      const mod = (await import("@/mocks/products")) as AnyModule;
      expect(mod.mockProducts).toBeDefined();
      expect(Array.isArray(mod.mockProducts)).toBe(true);
    });

    it("import @/mocks/stockEntries", async () => {
      const mod = (await import("@/mocks/stockEntries")) as AnyModule;
      expect(mod.mockStockEntries).toBeDefined();
    });

    it("import @/mocks/dashboard", async () => {
      const mod = (await import("@/mocks/dashboard")) as AnyModule;
      expect(mod.getMockDashboardStats).toBeDefined();
    });
  });
});