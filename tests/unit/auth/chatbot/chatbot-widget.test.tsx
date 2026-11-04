import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import type { ReactNode } from "react";

vi.mock("@/shared/lib/supabaseClient", async () => {
  const m = await import("../../../utils/fakeSupabase");
  return { supabaseClient: m.fakeSupabaseClient };
});

import { fakeDb } from "../../../utils/fakeSupabase";
import { ChatbotWidget } from "@/features/chatbot/ChatbotWidget";
import { setStoredUser } from "@/app/providers/authProvider";

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <AntdApp>
        <MemoryRouter>{children}</MemoryRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

describe("ChatbotWidget Full-Screen PC & Asisten Gudang", () => {
  beforeEach(() => {
    fakeDb.reset();
    setStoredUser(null);
  });

  it("Membuka jendela Chatbot ukuran satu layar penuh (100vw x 100vh) dan menutupnya lewat tombol silang di sebelah kiri atas", async () => {
    render(<ChatbotWidget />, { wrapper: Wrapper });

    // 1. Awalnya tampil tombol pemicu mengambang
    const openBtn = screen.getByTestId("chatbot-open-button");
    expect(openBtn).toBeInTheDocument();

    // 2. Klik tombol buka -> tampil satu layar penuh (100vw x 100vh)
    fireEvent.click(openBtn);

    const dialog = await screen.findByTestId("chatbot-fullscreen-window");
    expect(dialog).toBeInTheDocument();
    
    // 🔧 PERBAIKAN: Gunakan pengecekan style property langsung (lebih stabil di JSDOM)
    expect(dialog.style.position).toBe("fixed");
    expect(dialog.style.top).toBe("0px");
    expect(dialog.style.left).toBe("0px");
    expect(dialog.style.width).toBe("100vw");
    expect(dialog.style.height).toBe("100vh");

    // 3. Tombol silang (X) di sebelah kiri atas menutup kembali jendela Chatbot
    const closeBtn = screen.getByTestId("chatbot-close-button");
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("chatbot-fullscreen-window")).not.toBeInTheDocument();
    });
  });

  it("Menjawab pertanyaan seputar stok barang, status monitoring SPB, dan hak akses role", async () => {
    fakeDb.tables.barang = [
      {
        id: 1,
        kode: "BRG-101",
        nama: "Kabel NYY 4x16mm",
        ukuran: "4x16mm",
        kategori: "Material",
        satuan: "meter",
        stok: 120,
      },
    ];
    fakeDb.tables.spb = [
      {
        id: 1,
        no_spb: "10",
        judul_spb: "Panel Utama",
        nama_barang: "MCCB 100A",
        jumlah_permintaan: 2,
        satuan: "pcs",
        no_po: "PO-01",
        tanggal_po: "2026-10-01",
        status: "Sudah PO",
      },
    ];

    setStoredUser({
      id: "supervisor-1",
      email: "supervisor@admin.com",
      name: "Supervisor Gudang",
      role: "supervisor",
    });

    render(<ChatbotWidget defaultOpen />, { wrapper: Wrapper });

    const input = screen.getByLabelText("Input Pesan Chatbot");
    const sendBtn = screen.getByLabelText("Kirim Pesan Chatbot");

    // 1. Tanya stok kabel
    fireEvent.change(input, { target: { value: "cek stok kabel" } });
    fireEvent.click(sendBtn);

    expect(await screen.findByText(/Kabel NYY 4x16mm/i)).toBeInTheDocument();

    // 2. Tanya status SPB 10
    fireEvent.change(input, { target: { value: "status SPB 10" } });
    fireEvent.click(sendBtn);

    expect(await screen.findByText(/MCCB 100A/i)).toBeInTheDocument();

    // 3. Tanya info hak akses role
    fireEvent.change(input, { target: { value: "info hak akses role" } });
    fireEvent.click(sendBtn);

    expect(await screen.findByText(/Urutan hierarki login/i)).toBeInTheDocument();
  });
});