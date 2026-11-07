import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import { USE_MOCK } from "../../shared/lib/config";
import { requirePermission } from "../../shared/lib/authGuard";
import { invalidateOnMutation } from "../../shared/lib/queryKeys";
import type { StockEntry } from "../../shared/types";

export interface CreateStockEntryInput {
  productId: number;
  supplierId: number | null;
  quantity: number;
  unitPrice: number;
  date: string;
  note?: string | null;
}

export const useCreateStockEntry = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStockEntryInput) => {
      // 🔒 Verifikasi: user harus login dan punya izin edit_data
      requirePermission("edit_data", "Tambah barang masuk");
      // === MODE MOCK ===
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 500));
        // Simulasi sukses
        return { id: Date.now(), ...input } as unknown as StockEntry;
      }

      // === MODE SUPABASE ===
      const { data, error } = await supabaseClient
        .from(TABLES.stockEntries)
        .insert({
          product_id: input.productId,
          supplier_id: input.supplierId,
          quantity: input.quantity,
          unit_price: input.unitPrice,
          date: input.date,
          note: input.note ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as StockEntry;
    },
    onSuccess: async () => {
      await invalidateOnMutation(queryClient, "stock-in");
      message.success("Barang masuk berhasil disimpan");
    },
    onError: (error: Error) => {
      message.error(error.message || "Gagal menyimpan barang masuk");
    },
  });
};
