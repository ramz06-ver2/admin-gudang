export const COLORS = {
  primary: "#1677ff",
  success: "#52c41a",
  warning: "#faad14",
  danger: "#ff4d4f",
  status: {
    safe: "#52c41a",
    low: "#faad14",
    out: "#ff4d4f",
  } as const,
};

export const TABLES = {
  categories: "kategori",
  suppliers: "supplier",
  products: "barang",
  stockEntries: "barang_masuk",
  stockExits: "barang_keluar",
  vProductsFull: "v_barang_lengkap",
  vLowStock: "v_stok_menipis",
  workers: "pekerja",
  spb: "spb", // ✅ Daftarkan tabel spb
} as const;

export const SHORTCUTS = {
  GLOBAL_SEARCH: " ",
  SUBMIT_FORM: "Enter+Ctrl",
  CANCEL: "Escape",
} as const;

export const STOCK_STATUS_LABELS = {
  safe: "Aman",
  low: "Menipis",
  out: "Habis",
} as const;