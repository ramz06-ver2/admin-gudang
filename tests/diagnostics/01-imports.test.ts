import { describe, it, expect, vi } from "vitest";

// Tipe longgar untuk dynamic import
type AnyModule = Record<string, unknown>;

// ============================================
// Mock SEBELUM import
// ============================================
vi.mock("@/utility/supabaseClient", () => ({
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
    it("import @/utility/config", async () => {
      const mod = (await import("@/utility/config")) as AnyModule;
      expect(mod.USE_MOCK).toBeDefined();
    });

    it("import @/utility/constants", async () => {
      const mod = (await import("@/utility/constants")) as AnyModule;
      expect(mod.COLORS).toBeDefined();
      expect(mod.TABLES).toBeDefined();
    });

    it("import @/utility/format", async () => {
      const mod = (await import("@/utility/format")) as AnyModule;
      expect(mod.formatRupiah).toBeDefined();
    });

    it("import @/types (types only, no runtime export)", async () => {
      const mod = (await import("@/types")) as AnyModule;
      expect(mod).toBeDefined();
    });

    it("import @/authProvider", async () => {
      const mod = (await import("@/authProvider")) as AnyModule;
      expect(mod.authProvider).toBeDefined();
    });

    it("import @/App", async () => {
      const mod = (await import("@/App")) as AnyModule;
      expect(mod.default).toBeDefined();
    });
  });

  // ============================================
  // Pages
  // ============================================
  describe("Pages", () => {
    it("import @/pages/login", async () => {
      const mod = (await import("@/pages/login")) as AnyModule;
      expect(mod.LoginPage).toBeDefined();
    });

    it("import @/pages/dashboard", async () => {
      const mod = (await import("@/pages/dashboard")) as AnyModule;
      expect(mod.DashboardPage).toBeDefined();
    });

    it("import @/pages/stock-entries/create", async () => {
      const mod = (await import("@/pages/stock-entries/create")) as AnyModule;
      expect(mod.StockEntryCreatePage).toBeDefined();
    });
  });

  // ============================================
  // Hooks
  // ============================================
  describe("Hooks", () => {
    it("import @/hooks/useDashboardStats", async () => {
      const mod = (await import("@/hooks/useDashboardStats")) as AnyModule;
      expect(mod.useDashboardStats).toBeDefined();
    });

    it("import @/hooks/useLowStock", async () => {
      const mod = (await import("@/hooks/useLowStock")) as AnyModule;
      expect(mod.useLowStock).toBeDefined();
    });

    it("import @/hooks/useStockInChart", async () => {
      const mod = (await import("@/hooks/useStockInChart")) as AnyModule;
      expect(mod.useStockInChart).toBeDefined();
    });

    it("import @/hooks/useKeyboardShortcut", async () => {
      const mod = (await import("@/hooks/useKeyboardShortcut")) as AnyModule;
      expect(mod.useKeyboardShortcut).toBeDefined();
    });

    it("import @/hooks/useProductSearch", async () => {
      const mod = (await import("@/hooks/useProductSearch")) as AnyModule;
      expect(mod.useProductSearch).toBeDefined();
    });

    it("import @/hooks/useStockEntryMutations", async () => {
      const mod = (await import("@/hooks/useStockEntryMutations")) as AnyModule;
      expect(mod.useCreateStockEntry).toBeDefined();
    });
  });

  // ============================================
  // Components
  // ============================================
  describe("Components", () => {
    it("import @/components/common/GlobalSearch", async () => {
      const mod = (await import("@/components/common/GlobalSearch")) as AnyModule;
      expect(mod.GlobalSearch).toBeDefined();
    });

    it("import @/components/common/StatusBadge", async () => {
      const mod = (await import("@/components/common/StatusBadge")) as AnyModule;
      expect(mod.StatusBadge).toBeDefined();
    });

    it("import @/components/dashboard/StatCard", async () => {
      const mod = (await import("@/components/dashboard/StatCard")) as AnyModule;
      expect(mod.StatCard).toBeDefined();
    });

    it("import @/components/dashboard/StockInChart", async () => {
      const mod = (await import("@/components/dashboard/StockInChart")) as AnyModule;
      expect(mod.StockInChart).toBeDefined();
    });

    it("import @/components/dashboard/LowStockTable", async () => {
      const mod = (await import("@/components/dashboard/LowStockTable")) as AnyModule;
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