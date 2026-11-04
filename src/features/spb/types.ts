import type { ReactNode } from "react";
import type { SPBItemDetail } from "../../shared/types";

export type FilterType =
  | "Semua"
  | "Belum Diproses"
  | "Belum di PO"
  | "Sudah di PO"
  | "Datang"
  | "Selesai";

export type SearchMode = "no" | "barang";

export type SortBy = "status" | "number" | "oldest" | "newest";

export interface EditingTitleState {
  type: "spb" | "po";
  docNo: string;
  currentTitle: string;
}

export type ItemSource = "spb" | "po" | "sj";

export type MonitoringDetailItem = SPBItemDetail & {
  key: string;
  sumber: ItemSource;
  no_surat_jalan?: string | null;
  spbSourceFile?: string | null;
  poSourceFile?: string | null;
};

export interface DetailRow {
  key: string;
  field: string;
  value: ReactNode;
}

export interface UniquePoInfo {
  no: string;
  file?: string | null;
}

