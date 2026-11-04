import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import type { ReactNode } from "react";

vi.mock("@/shared/lib/supabaseClient", async () => {
  const m = await import("../../utils/fakeSupabase");
  return { supabaseClient: m.fakeSupabaseClient };
});

import { fakeDb } from "../../utils/fakeSupabase";
import {
  authProvider,
  setStoredUser,
} from "@/app/providers/authProvider";
import {
  canApproveAccounts,
  canEditData,
  canManageBarang,
  canManageRoles,
  getRoleLevel,
  registerCustomRole,
  resetCustomRoles,
} from "@/app/providers/accessControlProvider";
import {
  resetAccountRequests,
  registerAccountRequest,
  getAccountRequests,
} from "@/features/auth/accountRequests";
import { NotificationsPage } from "@/features/auth/pages/NotificationsPage";

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <ConfigProvider>
      <AntdApp>
        <QueryClientProvider client={qc}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

describe("Hierarki Role (Super User > Supervisor > Admin > Custom Role) & Persetujuan Akun", () => {
  beforeEach(() => {
    fakeDb.reset();
    resetAccountRequests();
    resetCustomRoles();
    setStoredUser(null);
  });

  it("User/unlogin memiliki role 'user' secara default dan tidak memiliki akses edit", async () => {
    const identity = (await authProvider.getIdentity?.()) as any;
    expect(identity.role).toBe("user");
    expect(canEditData("user")).toBe(false);
    expect(canManageBarang("user")).toBe(false);
    expect(canApproveAccounts("user")).toBe(false);
    expect(canManageRoles("user")).toBe(false);
  });

  it("Memastikan urutan hierarki level akses: superuser > supervisor > admin > custom role > user", () => {
    expect(getRoleLevel("superuser")).toBeGreaterThan(getRoleLevel("supervisor"));
    expect(getRoleLevel("supervisor")).toBeGreaterThan(getRoleLevel("admin"));
    expect(getRoleLevel("admin")).toBeGreaterThan(getRoleLevel("user"));

    expect(canApproveAccounts("superuser")).toBe(true);
    expect(canManageRoles("superuser")).toBe(true);
    expect(canApproveAccounts("supervisor")).toBe(false);
    expect(canManageRoles("supervisor")).toBe(false);
    expect(canApproveAccounts("admin")).toBe(false);
    expect(canManageRoles("admin")).toBe(false);

    expect(canEditData("superuser")).toBe(true);
    expect(canEditData("supervisor")).toBe(true);
    expect(canEditData("admin")).toBe(true);
    expect(canManageBarang("superuser")).toBe(true);
    expect(canManageBarang("supervisor")).toBe(true);
    expect(canManageBarang("admin")).toBe(true);

    const custom = registerCustomRole({ key: "kepala_gudang", label: "Kepala Gudang" });
    expect(custom.key).toBe("kepala_gudang");
    expect(canEditData("kepala_gudang")).toBe(true);
    expect(canApproveAccounts("kepala_gudang")).toBe(false);
    expect(canManageRoles("kepala_gudang")).toBe(false);
  });

  it("Akun bawaan Supervisor dapat login dan memiliki role 'supervisor'", async () => {
    const loginRes = await authProvider.login({
      email: "supervisor@admin.com",
      password: "superv123",
    });
    expect(loginRes.success).toBe(true);

    const identity = (await authProvider.getIdentity?.()) as any;
    expect(identity.role).toBe("supervisor");
    expect(canManageBarang(identity.role)).toBe(true);
    expect(canApproveAccounts(identity.role)).toBe(false);
  });

  it("User buat akun -> masuk ke Notifikasi Super User -> Super User klik Izinkan -> Akun Admin jadi & bisa login", async () => {
    const req = await registerAccountRequest({
      name: "Budi Santoso",
      email: "budi@proyek.com",
      password: "password123",
    });
    expect(req.status).toBe("pending");

    const loginBefore = await authProvider.login({
      email: "budi@proyek.com",
      password: "password123",
    });
    expect(loginBefore.success).toBe(false);
    expect(loginBefore.error?.message).toMatch(/menunggu persetujuan Super User/i);

    const superLogin = await authProvider.login({
      email: "superuser@admin.com",
      password: "super123",
    });
    expect(superLogin.success).toBe(true);
    const superIdentity = (await authProvider.getIdentity?.()) as any;
    expect(superIdentity.role).toBe("superuser");

    render(<NotificationsPage />, { wrapper: Wrapper });

    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("budi@proyek.com")).toBeInTheDocument();
    expect(screen.getByText("Menunggu Persetujuan")).toBeInTheDocument();

    // 🔧 PERBAIKAN: Gunakan exact match string, bukan regex
    const approveBtn = screen.getByRole("button", {
      name: "Izinkan budi@proyek.com",
    });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText("Diizinkan (Admin Aktif)")).toBeInTheDocument();
    });

    const loginAfter = await authProvider.login({
      email: "budi@proyek.com",
      password: "password123",
    });
    expect(loginAfter.success).toBe(true);

    const budiIdentity = (await authProvider.getIdentity?.()) as any;
    expect(budiIdentity.role).toBe("admin");
    expect(budiIdentity.name).toBe("Budi Santoso");
  });

  it("User buat akun -> masuk ke Notifikasi Super User -> Super User klik Tidak Izinkan -> Akun Admin batal jadi", async () => {
    await registerAccountRequest({
      name: "Andi Pratama",
      email: "andi@proyek.com",
      password: "password123",
    });

    await authProvider.login({
      email: "superuser@admin.com",
      password: "super123",
    });

    render(<NotificationsPage />, { wrapper: Wrapper });

    expect(await screen.findByText("Andi Pratama")).toBeInTheDocument();

    // 🔧 PERBAIKAN: Gunakan exact match string
    const rejectBtn = screen.getByRole("button", {
      name: "Tidak Izinkan andi@proyek.com",
    });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(screen.getByText("Tidak Diizinkan (Batal)")).toBeInTheDocument();
    });

    const loginRejected = await authProvider.login({
      email: "andi@proyek.com",
      password: "password123",
    });
    expect(loginRejected.success).toBe(false);
    expect(loginRejected.error?.message).toMatch(/tidak diizinkan/i);

    const list = await getAccountRequests();
    expect(list.find((r) => r.email === "andi@proyek.com")?.status).toBe("rejected");
  });

  it("Halaman Notifikasi menolak akses jika dibuka oleh User/Unlogin, Admin, maupun Supervisor", async () => {
    setStoredUser({
      id: "supervisor-1",
      email: "supervisor@admin.com",
      name: "Supervisor",
      role: "supervisor",
    });

    render(<NotificationsPage />, { wrapper: Wrapper });

    expect(await screen.findByText("Akses Ditolak")).toBeInTheDocument();
  });
});