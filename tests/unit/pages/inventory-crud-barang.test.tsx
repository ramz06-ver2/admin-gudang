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
import { InventoryTable } from "@/features/products/components/InventoryTable";
import { setStoredUser } from "@/app/providers/authProvider";
import type { Product } from "@/shared/types";

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

const initialProducts: Product[] = [
  {
    id: 1,
    code: "BRG-001",
    name: "Semen Gresik",
    size: "50kg",
    specification: "PCC",
    category: "Material",
    categoryId: null,
    unit: "sak",
    stock: 25,
    minStock: 5,
    costPrice: 0,
    createdAt: "2026-10-01T00:00:00Z",
  },
];

describe("CRUD Barang untuk Admin dan Super User (serta pembatasan User/Unlogin)", () => {
  beforeEach(() => {
    fakeDb.reset();
    fakeDb.tables.barang = [
      {
        id: 1,
        kode: "BRG-001",
        nama: "Semen Gresik",
        ukuran: "50kg",
        spesifikasi: "PCC",
        kategori: "Material",
        satuan: "sak",
        stok: 25,
        created_at: "2026-10-01T00:00:00Z",
      },
    ];
    setStoredUser(null);
  });

  it("User/Unlogin hanya bisa melihat daftar barang tanpa tombol Tambah, Edit, atau Hapus", () => {
    render(
      <InventoryTable type="stock" dataSource={initialProducts} role="user" />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText("Semen Gresik")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tambah Barang/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit Semen Gresik/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hapus Semen Gresik/i })).not.toBeInTheDocument();
  });

  it("Admin dapat melakukan Create, Update, dan Delete pada bagian Barang", async () => {
    render(
      <InventoryTable type="stock" dataSource={initialProducts} role="admin" />,
      { wrapper: Wrapper },
    );

    // 1. CREATE (Tambah Barang)
    fireEvent.click(screen.getByRole("button", { name: /Tambah Barang/i }));

    const nameInput = await screen.findByLabelText("Nama Barang");
    const sizeInput = screen.getByLabelText("Ukuran Barang");
    const stockInput = screen.getByLabelText("Stok Barang");

    fireEvent.change(nameInput, { target: { value: "Cat Tembok Dulux" } });
    fireEvent.change(sizeInput, { target: { value: "5 Liter" } });
    fireEvent.change(stockInput, { target: { value: "12" } });

    fireEvent.click(screen.getByRole("button", { name: /Simpan Barang/i }));

    await waitFor(() => {
      expect(screen.getByText("Cat Tembok Dulux")).toBeInTheDocument();
    });

    // 2. UPDATE (Edit Barang)
    fireEvent.click(screen.getByRole("button", { name: /Edit Semen Gresik/i }));

    const editNameInput = await screen.findByLabelText("Nama Barang");
    fireEvent.change(editNameInput, { target: { value: "Semen Tiga Roda" } });
    fireEvent.click(screen.getByRole("button", { name: /Simpan Barang/i }));

    await waitFor(() => {
      expect(screen.getByText("Semen Tiga Roda")).toBeInTheDocument();
    });

    // 3. DELETE (Hapus Barang)
    fireEvent.click(screen.getByRole("button", { name: /Hapus Semen Tiga Roda/i }));
    const confirmDeleteBtn = await screen.findByRole("button", { name: /Ya, Hapus/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(screen.queryByText("Semen Tiga Roda")).not.toBeInTheDocument();
    });
  });

  it("Super User juga dapat melakukan Create, Update, dan Delete pada bagian Barang", async () => {
    render(
      <InventoryTable type="stock" dataSource={initialProducts} role="superuser" />,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole("button", { name: /Tambah Barang/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit Semen Gresik/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hapus Semen Gresik/i })).toBeInTheDocument();
  });
});
