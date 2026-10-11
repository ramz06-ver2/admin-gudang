import { describe, it, expect } from "vitest";

// Tipe longgar untuk dynamic import
type AnyModule = Record<string, unknown>;

describe("DIAGNOSTIC 02 — Named Exports", () => {
  // ============================================
  // @refinedev/core
  // ============================================
  describe("@refinedev/core", () => {
    it("exports Refine", async () => {
      const mod = (await import("@refinedev/core")) as AnyModule;
      expect(mod.Refine).toBeDefined();
      expect(typeof mod.Refine).not.toBe("undefined");
    });

    it("exports Authenticated", async () => {
      const mod = (await import("@refinedev/core")) as AnyModule;
      expect(mod.Authenticated).toBeDefined();
    });

    it("exports useLogin", async () => {
      const mod = (await import("@refinedev/core")) as AnyModule;
      expect(mod.useLogin).toBeDefined();
    });

    it("exports useList", async () => {
      const mod = (await import("@refinedev/core")) as AnyModule;
      expect(mod.useList).toBeDefined();
    });

    it("exports useCustom", async () => {
      const mod = (await import("@refinedev/core")) as AnyModule;
      expect(mod.useCustom).toBeDefined();
    });
  });

  // ============================================
  // @refinedev/kbar
  // ============================================
  describe("@refinedev/kbar", () => {
    it("exports RefineKbarProvider", async () => {
      const mod = (await import("@refinedev/kbar")) as AnyModule;
      expect(mod.RefineKbarProvider).toBeDefined();
    });
  });

  // ============================================
  // @refinedev/react-router-v6 ← UPDATED
  // ============================================
  describe("@refinedev/react-router-v6", () => {
    it("has default export (routerProvider)", async () => {
      const mod = (await import("@refinedev/react-router-v6")) as AnyModule;
      expect(mod.default).toBeDefined();
      expect(["function", "object"]).toContain(typeof mod.default);
    });

    it("exports NavigateToResource", async () => {
      const mod = (await import("@refinedev/react-router-v6")) as AnyModule;
      expect(mod.NavigateToResource).toBeDefined();
    });

    it("exports UnsavedChangesNotifier", async () => {
      const mod = (await import("@refinedev/react-router-v6")) as AnyModule;
      expect(mod.UnsavedChangesNotifier).toBeDefined();
    });

    it("exports DocumentTitleHandler", async () => {
      const mod = (await import("@refinedev/react-router-v6")) as AnyModule;
      expect(mod.DocumentTitleHandler).toBeDefined();
    });

    it("exports CatchAllNavigate", async () => {
      const mod = (await import("@refinedev/react-router-v6")) as AnyModule;
      expect(mod.CatchAllNavigate).toBeDefined();
    });
  });

  // ============================================
  // @refinedev/supabase
  // ============================================
  describe("@refinedev/supabase", () => {
    it("exports dataProvider", async () => {
      const mod = (await import("@refinedev/supabase")) as AnyModule;
      expect(mod.dataProvider).toBeDefined();
      expect(typeof mod.dataProvider).toBe("function");
    });

    it("exports liveProvider", async () => {
      const mod = (await import("@refinedev/supabase")) as AnyModule;
      expect(mod.liveProvider).toBeDefined();
      expect(typeof mod.liveProvider).toBe("function");
    });
  });

  // ============================================
  // @refinedev/antd
  // ============================================
  describe("@refinedev/antd", () => {
    const checkExport = async (name: string) => {
      const mod = (await import("@refinedev/antd")) as AnyModule;
      return mod[name];
    };

    it("exports ThemedLayoutV2", async () => {
      const x = await checkExport("ThemedLayoutV2");
      expect(x).toBeDefined();
    });

    it("exports ThemedLayout (fallback)", async () => {
      const x = await checkExport("ThemedLayout");
      expect(x).toBeDefined();
    });

    it("exports useNotificationProvider", async () => {
      const x = await checkExport("useNotificationProvider");
      expect(x).toBeDefined();
    });

    it("exports ErrorComponent", async () => {
      const x = await checkExport("ErrorComponent");
      expect(x).toBeDefined();
    });
  });

  // ============================================
  // antd
  // ============================================
  describe("antd", () => {
    it("exports ConfigProvider", async () => {
      const mod = (await import("antd")) as AnyModule;
      expect(mod.ConfigProvider).toBeDefined();
    });

    it("exports App", async () => {
      const mod = (await import("antd")) as AnyModule;
      expect(mod.App).toBeDefined();
    });

    it("exports Table", async () => {
      const mod = (await import("antd")) as AnyModule;
      expect(mod.Table).toBeDefined();
    });

    it("exports Form", async () => {
      const mod = (await import("antd")) as AnyModule;
      expect(mod.Form).toBeDefined();
    });

    it("exports Button", async () => {
      const mod = (await import("antd")) as AnyModule;
      expect(mod.Button).toBeDefined();
    });

    it("exports Input", async () => {
      const mod = (await import("antd")) as AnyModule;
      expect(mod.Input).toBeDefined();
    });

    it("exports Modal", async () => {
      const mod = (await import("antd")) as AnyModule;
      expect(mod.Modal).toBeDefined();
    });
  });

  // ============================================
  // @ant-design/icons
  // ============================================
  describe("@ant-design/icons", () => {
    it("exports DashboardOutlined", async () => {
      const mod = (await import("@ant-design/icons")) as AnyModule;
      expect(mod.DashboardOutlined).toBeDefined();
    });

    it("exports PlusCircleOutlined", async () => {
      const mod = (await import("@ant-design/icons")) as AnyModule;
      expect(mod.PlusCircleOutlined).toBeDefined();
    });

    it("exports ArrowLeftOutlined", async () => {
      const mod = (await import("@ant-design/icons")) as AnyModule;
      expect(mod.ArrowLeftOutlined).toBeDefined();
    });

    it("exports SaveOutlined", async () => {
      const mod = (await import("@ant-design/icons")) as AnyModule;
      expect(mod.SaveOutlined).toBeDefined();
    });
  });

  // ============================================
  // react-router-dom (bukan react-router)
  // ============================================
  describe("react-router-dom", () => {
    it("exports BrowserRouter", async () => {
      const mod = (await import("react-router-dom")) as AnyModule;
      expect(mod.BrowserRouter).toBeDefined();
    });

    it("exports Routes", async () => {
      const mod = (await import("react-router-dom")) as AnyModule;
      expect(mod.Routes).toBeDefined();
    });

    it("exports Route", async () => {
      const mod = (await import("react-router-dom")) as AnyModule;
      expect(mod.Route).toBeDefined();
    });

    it("exports Outlet", async () => {
      const mod = (await import("react-router-dom")) as AnyModule;
      expect(mod.Outlet).toBeDefined();
    });

    it("exports useNavigate", async () => {
      const mod = (await import("react-router-dom")) as AnyModule;
      expect(mod.useNavigate).toBeDefined();
    });

    it("exports useSearchParams", async () => {
      const mod = (await import("react-router-dom")) as AnyModule;
      expect(mod.useSearchParams).toBeDefined();
    });
  });
});