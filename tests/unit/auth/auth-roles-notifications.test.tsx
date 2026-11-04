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

import { fakeDb, fakeAuth, fakeSupabaseClient } from "../../utils/fakeSupabase";
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
  approveAccountRequest,
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

  it("Supervisor (role dari app_metadata Supabase) dapat login dan memiliki role 'supervisor'", async () => {
    fakeAuth.addUser("supervisor@perusahaan.com", "Passw0rd!123", { role: "supervisor" });

    const loginRes = await authProvider.login({
      email: "supervisor@perusahaan.com",
      password: "Passw0rd!123",
    });
    expect(loginRes.success).toBe(true);

    const identity = (await authProvider.getIdentity?.()) as any;
    expect(identity.role).toBe("supervisor");
    expect(canManageBarang(identity.role)).toBe(true);
    expect(canApproveAccounts(identity.role)).toBe(false);
  });

  it("Akun hardcode lama tidak lagi bisa login", async () => {
    for (const [email, password] of [
      ["superuser@admin.com", "super123"],
      ["supervisor@admin.com", "superv123"],
      ["admin@admin.com", "admin123"],
    ]) {
      const res = await authProvider.login({ email, password });
      expect(res.success).toBe(false);
    }
    expect(((await authProvider.getIdentity?.()) as any).role).toBe("user");
  });

  it("Pesan gagal login generik (tidak membocorkan apakah email terdaftar)", async () => {
    fakeAuth.addUser("ada@perusahaan.com", "Passw0rd!123", { role: "admin" });
    const wrongPass = await authProvider.login({ email: "ada@perusahaan.com", password: "salah-salah" });
    const unknown = await authProvider.login({ email: "tidakada@perusahaan.com", password: "salah-salah" });
    expect(wrongPass.error?.message).toBe(unknown.error?.message);
  });

  it("Role di user_metadata (bisa diubah user sendiri) TIDAK dipercaya", async () => {
    fakeAuth.addUser("nakal@perusahaan.com", "Passw0rd!123");
    fakeAuth.users["nakal@perusahaan.com"].user_metadata.role = "superuser";

    const res = await authProvider.login({ email: "nakal@perusahaan.com", password: "Passw0rd!123" });
    expect(res.success).toBe(false);
    expect(((await authProvider.getIdentity?.()) as any).role).toBe("user");
  });

  it("check() hanya authenticated bila ada sesi Supabase dengan role valid", async () => {
    expect((await authProvider.check?.())?.authenticated).toBe(false);

    fakeAuth.addUser("admin@perusahaan.com", "Passw0rd!123", { role: "admin" });
    await authProvider.login({ email: "admin@perusahaan.com", password: "Passw0rd!123" });
    expect((await authProvider.check?.())?.authenticated).toBe(true);

    // Cache localStorage dipalsukan tanpa sesi -> tetap ditolak & cache dibersihkan
    await fakeSupabaseClient.auth.signOut();
    setStoredUser({ id: "x", email: "palsu@x.com", name: "Palsu", role: "superuser" });
    expect((await authProvider.check?.())?.authenticated).toBe(false);
    expect(localStorage.getItem("mock-auth-user")).toBeNull();
  });

  it("Pendaftaran menolak password pendek dan tidak pernah menyimpan password di tabel/cache", async () => {
    await expect(
      registerAccountRequest({ name: "Cici", email: "cici@proyek.com", password: "pendek" }),
    ).rejects.toThrow(/minimal 8/i);

    await registerAccountRequest({
      name: "Cici",
      email: "cici@proyek.com",
      password: "password123",
    });
    expect(fakeDb.tables.account_requests).toHaveLength(1);
    expect(fakeDb.tables.account_requests[0]).not.toHaveProperty("password");
    expect(localStorage.getItem("account-registration-requests")).not.toContain("password123");
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

    fakeAuth.addUser("super@perusahaan.com", "Passw0rd!123", { role: "superuser" });
    const superLogin = await authProvider.login({
      email: "super@perusahaan.com",
      password: "Passw0rd!123",
    });
    expect(superLogin.success).toBe(true);
    const superIdentity = (await authProvider.getIdentity?.()) as any;
    expect(superIdentity.role).toBe("superuser");

    render(<NotificationsPage />, { wrapper: Wrapper });

    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("budi@proyek.com")).toBeInTheDocument();
    expect(screen.getByText("Menunggu Persetujuan")).toBeInTheDocument();

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

    fakeAuth.addUser("super@perusahaan.com", "Passw0rd!123", { role: "superuser" });
    await authProvider.login({
      email: "super@perusahaan.com",
      password: "Passw0rd!123",
    });

    render(<NotificationsPage />, { wrapper: Wrapper });

    expect(await screen.findByText("Andi Pratama")).toBeInTheDocument();

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
    expect(loginRejected.error?.message).toMatch(/menunggu persetujuan|belum diberi role/i);

    const list = await getAccountRequests();
    expect(list.find((r) => r.email === "andi@proyek.com")?.status).toBe("rejected");
  });

  it("Admin tidak bisa menyetujui akun: ditolak di klien DAN di server (RPC)", async () => {
    await registerAccountRequest({
      name: "Dedi",
      email: "dedi@proyek.com",
      password: "password123",
    });
    const reqId = fakeDb.tables.account_requests[0].id as string;

    fakeAuth.addUser("admin@perusahaan.com", "Passw0rd!123", { role: "admin" });
    await authProvider.login({ email: "admin@perusahaan.com", password: "Passw0rd!123" });

    await expect(approveAccountRequest(reqId, "admin")).rejects.toThrow();

    // Meski guard klien dilewati, server tetap menolak karena JWT bukan superuser
    const direct = await fakeSupabaseClient.rpc("approve_account", {
      p_request_id: reqId,
      p_role: "superuser",
    });
    expect(direct.error?.message).toBe("forbidden");
    expect(fakeAuth.users["dedi@proyek.com"].app_metadata.role).toBeUndefined();
  });

  it("Persetujuan tidak bisa mengangkat role menjadi superuser", async () => {
    await registerAccountRequest({
      name: "Eko",
      email: "eko@proyek.com",
      password: "password123",
    });
    const reqId = fakeDb.tables.account_requests[0].id as string;

    fakeAuth.addUser("super@perusahaan.com", "Passw0rd!123", { role: "superuser" });
    await authProvider.login({ email: "super@perusahaan.com", password: "Passw0rd!123" });

    await approveAccountRequest(reqId, "superuser");
    expect(fakeAuth.users["eko@proyek.com"].app_metadata.role).toBe("admin");
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