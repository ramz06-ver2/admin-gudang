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

describe("Alur Role (User/Unlogin, Admin, Super User) & Persetujuan Akun di Notifikasi", () => {
  beforeEach(() => {
    fakeDb.reset();
    resetAccountRequests();
    setStoredUser(null);
  });

  it("User/unlogin memiliki role 'user' secara default", async () => {
    const identity = (await authProvider.getIdentity?.()) as any;
    expect(identity.role).toBe("user");
  });

  it("User buat akun -> masuk ke Notifikasi Super User -> Super User klik Izinkan -> Akun Admin jadi & bisa login", async () => {
    // 1. User / unlogin membuat akun baru
    const req = await registerAccountRequest({
      name: "Budi Santoso",
      email: "budi@proyek.com",
      password: "password123",
    });
    expect(req.status).toBe("pending");

    // 2. Sebelum diizinkan Super User, Budi belum bisa login sebagai Admin
    const loginBefore = await authProvider.login({
      email: "budi@proyek.com",
      password: "password123",
    });
    expect(loginBefore.success).toBe(false);
    expect(loginBefore.error?.message).toMatch(/menunggu persetujuan Super User/i);

    // 3. Super User login dan membuka halaman Notifikasi
    const superLogin = await authProvider.login({
      email: "superuser@admin.com",
      password: "super123",
    });
    expect(superLogin.success).toBe(true);
    const superIdentity = (await authProvider.getIdentity?.()) as any;
    expect(superIdentity.role).toBe("superuser");

    render(<NotificationsPage />, { wrapper: Wrapper });

    // Pastikan permintaan akun Budi muncul di halaman Notifikasi Super User
    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("budi@proyek.com")).toBeInTheDocument();
    expect(screen.getByText("Menunggu Persetujuan")).toBeInTheDocument();

    // 4. Super User klik tombol "Izinkan"
    // ✅ PERBAIKAN: gunakan exact match agar tidak ikut cocok dengan
    // tombol "Tidak Izinkan budi@proyek.com" (yang juga mengandung substring
    // "Izinkan budi@proyek.com").
    const approveBtn = screen.getByRole("button", {
      name: "Izinkan budi@proyek.com",
    });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText("Diizinkan (Admin Aktif)")).toBeInTheDocument();
    });

    // 5. Kini Budi login dan akunnya telah aktif menjadi Admin
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
    // 1. User / unlogin mendaftar akun
    await registerAccountRequest({
      name: "Andi Pratama",
      email: "andi@proyek.com",
      password: "password123",
    });

    // 2. Super User login dan membuka halaman Notifikasi
    await authProvider.login({
      email: "superuser@admin.com",
      password: "super123",
    });

    render(<NotificationsPage />, { wrapper: Wrapper });

    expect(await screen.findByText("Andi Pratama")).toBeInTheDocument();

    // 3. Super User klik tombol "Tidak Izinkan"
    // ✅ PERBAIKAN: exact match agar tidak ambigu dengan tombol lain.
    const rejectBtn = screen.getByRole("button", {
      name: "Tidak Izinkan andi@proyek.com",
    });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(screen.getByText("Tidak Diizinkan (Batal)")).toBeInTheDocument();
    });

    // 4. Andi mencoba login -> ditolak karena pembuatan akun Admin dibatalkan
    const loginRejected = await authProvider.login({
      email: "andi@proyek.com",
      password: "password123",
    });
    expect(loginRejected.success).toBe(false);
    expect(loginRejected.error?.message).toMatch(/tidak diizinkan/i);

    const list = await getAccountRequests();
    expect(list.find((r) => r.email === "andi@proyek.com")?.status).toBe("rejected");
  });

  it("Halaman Notifikasi menolak akses jika dibuka oleh User/Unlogin atau Admin biasa", async () => {
    setStoredUser({
      id: "admin-1",
      email: "admin@admin.com",
      name: "Administrator",
      role: "admin",
    });

    render(<NotificationsPage />, { wrapper: Wrapper });

    expect(await screen.findByText("Akses Ditolak")).toBeInTheDocument();
  });
});