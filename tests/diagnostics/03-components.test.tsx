import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { App as AntdApp, ConfigProvider } from "antd";
import type { ComponentType, ReactNode } from "react";

// ============================================
// Tipe longgar untuk dynamic import
// ============================================
type AnyModule = Record<string, unknown>;
type AnyComponent = ComponentType<Record<string, unknown>>;

// ============================================
// Mock supabase
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
  Line: () => <div data-testid="mock-line-chart" />,
}));

// ============================================
// Wrapper dengan semua provider yang dibutuhkan
// ============================================
function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

function safeRender(ui: ReactNode) {
  return render(<Wrapper>{ui}</Wrapper>);
}

// ============================================
// Helper: ambil komponen dari module
// ============================================
async function loadComponent(
  modulePath: string,
  exportName: string,
): Promise<AnyComponent> {
  const mod = (await import(/* @vite-ignore */ modulePath)) as AnyModule;
  return mod[exportName] as AnyComponent;
}

// ============================================
// Tests
// ============================================
describe("DIAGNOSTIC 03 — Component Renders", () => {
  // ----------------------------------------
  // Components murni (tanpa provider khusus)
  // ----------------------------------------
  describe("Pure components", () => {
    it("renders StatCard", async () => {
      const StatCard = await loadComponent(
        "@/components/dashboard/StatCard",
        "StatCard",
      );
      safeRender(<StatCard title="Test" value={100} />);
      expect(screen.getByText("Test")).toBeInTheDocument();
    });

    it("renders StatusBadge (safe)", async () => {
      const StatusBadge = await loadComponent(
        "@/components/common/StatusBadge",
        "StatusBadge",
      );
      safeRender(<StatusBadge status="safe" />);
      expect(screen.getByText(/aman/i)).toBeInTheDocument();
    });

    it("renders StatusBadge (low)", async () => {
      const StatusBadge = await loadComponent(
        "@/components/common/StatusBadge",
        "StatusBadge",
      );
      safeRender(<StatusBadge status="low" />);
      expect(screen.getByText(/menipis/i)).toBeInTheDocument();
    });

    it("renders StatusBadge (out)", async () => {
      const StatusBadge = await loadComponent(
        "@/components/common/StatusBadge",
        "StatusBadge",
      );
      safeRender(<StatusBadge status="out" />);
      expect(screen.getByText(/habis/i)).toBeInTheDocument();
    });
  });

  // ----------------------------------------
  // Components dengan data hooks (query)
  // ----------------------------------------
  describe("Data components (mock mode)", () => {
    it("renders LowStockTable", async () => {
      const LowStockTable = await loadComponent(
        "@/components/dashboard/LowStockTable",
        "LowStockTable",
      );

      expect(() => safeRender(<LowStockTable />)).not.toThrow();
    });

    it("renders StockInChart", async () => {
      const StockInChart = await loadComponent(
        "@/components/dashboard/StockInChart",
        "StockInChart",
      );

      expect(() => safeRender(<StockInChart />)).not.toThrow();
    });

    it("renders GlobalSearch", async () => {
      const GlobalSearch = await loadComponent(
        "@/components/common/GlobalSearch",
        "GlobalSearch",
      );

      expect(() => safeRender(<GlobalSearch />)).not.toThrow();
    });
  });

  // ----------------------------------------
  // Pages — butuh Refine context
  // ----------------------------------------
  describe("Pages (butuh Refine context)", () => {
    it("LoginPage module bisa di-load", async () => {
      const mod = (await import("@/pages/login")) as AnyModule;
      expect(mod.LoginPage).toBeDefined();
    });

    it("DashboardPage module bisa di-load", async () => {
      const mod = (await import("@/pages/dashboard")) as AnyModule;
      expect(mod.DashboardPage).toBeDefined();
    });

    it("StockEntryCreatePage module bisa di-load", async () => {
      const mod = (await import("@/pages/stock-entries/create")) as AnyModule;
      expect(mod.StockEntryCreatePage).toBeDefined();
    });

    // Note: Render penuh untuk pages tidak dilakukan di sini karena
    // butuh full Refine provider. Cek di file 04-app-render.test.tsx.
  });
});