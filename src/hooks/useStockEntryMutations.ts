import { useMutation } from "@tanstack/react-query";
import { App } from "antd";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import type { StockEntry } from "../types";

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

  return useMutation({
    mutationFn: async (input: CreateStockEntryInput) => {
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
    onSuccess: () => {
      message.success("Barang masuk berhasil disimpan");
    },
    onError: (error: Error) => {
      message.error(error.message || "Gagal menyimpan barang masuk");
    },
  });
};