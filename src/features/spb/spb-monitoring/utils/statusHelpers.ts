// src/features/spb/utils/statusHelpers.ts
import dayjs from "dayjs";

export const getSortNumber = (val: unknown): number => {
  if (val === null || val === undefined || val === "") return 999999;
  const s = String(val);
  const match = s.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
};

export const getNumberFromStr = (
  spb: string | null,
  po: string | null,
): number => {
  const str = spb || po;
  if (!str) return 999999;
  const match = String(str).match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
};

export const toStrOrNull = (val: unknown): string | null => {
  if (val === null || val === undefined || val === "") return null;
  const s = String(val).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
    return null;
  }
  return s;
};

/**
 * Warna Tag status untuk Card utama Monitoring SPB.
 */
export const getCardStatusColor = (status?: string | null): string => {
  if (status === "Belum Diproses") return "purple";
  if (status === "Belum PO") return "orange";
  if (status === "Sudah PO") return "blue";
  if (status === "Datang") return "green";
  if (status === "Selesai") return "cyan";
  return "default";
};

/**
 * Warna Tag status untuk halaman Detail SPB / PO.
 */
export const getDetailStatusColor = (status?: string | null): string => {
  if (status === "Belum PO") return "orange";
  if (status === "Sudah PO") return "blue";
  if (status === "Datang Sesuai" || status === "Datang") return "green";
  if (status === "Datang Kurang") return "volcano";
  if (status === "Datang Lebih") return "purple";
  return "default";
};

/**
 * Warna Tag status untuk halaman Rincian Barang (Item Detail).
 */
export const getItemDetailStatusColor = (status?: string | null): string => {
  if (status === "Belum Diproses") return "purple";
  if (status === "Belum PO" || status === "Belum Datang") return "orange";
  if (status === "Sudah PO") return "blue";
  if (
    status === "Datang Sesuai" ||
    status === "Datang" ||
    status === "Selesai"
  ) {
    return "green";
  }
  if (status === "Datang Kurang") return "volcano";
  if (status === "Datang Lebih") return "purple";
  return "blue";
};

/**
 * Menghitung selisih hari (lama proses) antara tanggal mulai dan tanggal datang.
 */
export const calcLamaProses = (
  tglMulai: string | null | undefined,
  tglDatang: string | null | undefined,
  fallback?: string | number | null,
): string => {
  if (fallback && fallback !== "-") return String(fallback);
  if (tglMulai && tglDatang) {
    const start = dayjs(tglMulai);
    const end = dayjs(tglDatang);
    if (start.isValid() && end.isValid()) {
      const diff = end.diff(start, "day");
      return `${diff >= 0 ? diff : 0} Hari`;
    }
  }
  return "-";
};

