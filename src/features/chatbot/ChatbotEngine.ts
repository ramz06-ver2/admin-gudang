import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import { USE_MOCK } from "../../shared/lib/config";
import { mockProducts } from "../../mocks/products";
import { mapProduct } from "../../shared/lib/mappers";
import { formatNumber } from "../../shared/lib/format";
import {
  cleanSpbTitle,
  isKeteranganBarang,
  resolveSpbItemStatus,
} from "../spb/suratJalanRules";
import {
  canApproveAccounts,
  canEditData,
  getAllRoleDefinitions,
  getRoleDefinition,
} from "../../app/providers/accessControlProvider";
import type { Product, UserRole } from "../../shared/types";

export interface ChatbotReply {
  text: string;
  suggestions: string[];
  actionLinks?: { label: string; path: string }[];
}

export const DEFAULT_CHAT_SUGGESTIONS: string[] = [
  "Ringkasan stok gudang",
  "Barang stok menipis",
  "Status monitoring SPB",
  "Info hak akses role",
];

const fetchProductsSnapshot = async (): Promise<Product[]> => {
  try {
    const res = await supabaseClient.from(TABLES.products).select("*");
    if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
      return res.data.map(mapProduct);
    }
  } catch {
    // fallback ke mock
  }
  if (USE_MOCK || mockProducts.length > 0) {
    return mockProducts;
  }
  return [];
};

const fetchSpbRowsSnapshot = async (): Promise<any[]> => {
  try {
    const res = await supabaseClient.from(TABLES.spb).select("*");
    if (!res.error && Array.isArray(res.data)) {
      return res.data;
    }
  } catch {
    // ignore
  }
  return [];
};

const fetchPoRowsSnapshot = async (): Promise<any[]> => {
  try {
    const res = await supabaseClient.from(TABLES.po).select("*");
    if (!res.error && Array.isArray(res.data)) {
      return res.data;
    }
  } catch {
    // ignore
  }
  return [];
};

const fetchSjRowsSnapshot = async (): Promise<any[]> => {
  try {
    const res = await supabaseClient.from(TABLES.suratJalan).select("*");
    if (!res.error && Array.isArray(res.data)) {
      return res.data;
    }
  } catch {
    // ignore
  }
  return [];
};

export const generateChatbotResponse = async (
  rawInput: string,
  currentRole: UserRole = "user",
): Promise<ChatbotReply> => {
  const query = rawInput.trim().toLowerCase();
  const roleDef = getRoleDefinition(currentRole);

  if (!query) {
    return {
      text: "Silakan ketik pertanyaan Anda mengenai stok barang, status SPB/PO/Surat Jalan, atau hak akses sistem.",
      suggestions: DEFAULT_CHAT_SUGGESTIONS,
    };
  }

  // 1. Pertanyaan seputar Role / Hak Akses / Login
  if (
    query.includes("hak akses") ||
    query.includes("role") ||
    query.includes("login") ||
    query.includes("superuser") ||
    query.includes("super user") ||
    query.includes("supervisor") ||
    query.includes("admin")
  ) {
    const rolesList = getAllRoleDefinitions()
      .filter((r) => r.isAuthenticated)
      .map((r) => r.label)
      .join(" > ");

    const canEdit = canEditData(currentRole);
    const isSuper = canApproveAccounts(currentRole);

    return {
      text: [
        `Status Anda saat ini: **${roleDef.label}**`,
        `• Urutan hierarki login: **${rolesList}**`,
        `• Persetujuan akun baru & kelola role (Point 1 & 2): **Hanya Super User** (${isSuper ? "Anda memiliki akses" : "Khusus Super User"})`,
        `• Mengedit data barang & judul SPB/PO: **Super User, Supervisor, Admin, & role login lainnya** (${canEdit ? "Anda dapat mengedit" : "Silakan login terlebih dahulu"})`,
      ].join("\n"),
      suggestions: DEFAULT_CHAT_SUGGESTIONS,
      actionLinks: isSuper
        ? [
            { label: "Buka Notifikasi Super User", path: "/notifications" },
            { label: "Buka Inventory", path: "/inventory" },
          ]
        : [{ label: "Buka Halaman Login", path: "/login" }],
    };
  }

  // 2. Pertanyaan seputar SPB / PO / Surat Jalan
  if (
    query.includes("spb") ||
    query.includes("po") ||
    query.includes("surat jalan") ||
    query.includes("monitoring")
  ) {
    const [spbRows, poRows, sjRows] = await Promise.all([
      fetchSpbRowsSnapshot(),
      fetchPoRowsSnapshot(),
      fetchSjRowsSnapshot(),
    ]);

    const realItems = spbRows.filter((r) => !isKeteranganBarang(r));
    if (realItems.length === 0 && poRows.length === 0 && sjRows.length === 0) {
      return {
        text: "Saat ini belum ada data SPB, PO, atau Surat Jalan yang tercatat di database. Anda dapat memantau dokumen melalui halaman Monitoring SPB.",
        suggestions: DEFAULT_CHAT_SUGGESTIONS,
        actionLinks: [{ label: "Buka Monitoring SPB", path: "/monitoring-spb" }],
      };
    }

    // Cek apakah pengguna menanyakan nomor SPB spesifik (misal: "spb 10" atau "spb 12")
    const numberMatch = query.match(/(?:spb|po|sj|nomor|no)\s*[-:#]?\s*([0-9a-zA-Z/-]+)/i);
    if (numberMatch && numberMatch[1] && !["status", "monitoring", "belum", "sudah", "semua"].includes(numberMatch[1].toLowerCase())) {
      const targetNo = numberMatch[1].toLowerCase();
      const matchedSpb = realItems.filter(
        (r) =>
          String(r.no_spb ?? "").toLowerCase().includes(targetNo) ||
          String(r.no_po ?? "").toLowerCase().includes(targetNo) ||
          cleanSpbTitle(r.judul_spb).toLowerCase().includes(targetNo),
      );

      if (matchedSpb.length > 0) {
        const sample = matchedSpb[0];
        const titleText = cleanSpbTitle(sample.judul_spb) || "Tanpa Judul";
        const itemPreview = matchedSpb
          .slice(0, 5)
          .map(
            (item) =>
              `• ${item.nama_barang || "-"} (${item.jumlah_permintaan ?? 0} ${item.satuan || "unit"}) — Status: ${resolveSpbItemStatus(item)}`,
          )
          .join("\n");

        return {
          text: [
            `Ditemukan **${matchedSpb.length} item barang** untuk dokumen **SPB ${sample.no_spb || "-"}** (${titleText}):`,
            itemPreview,
          ].join("\n"),
          suggestions: ["Status monitoring SPB", "Ringkasan stok gudang"],
          actionLinks: [
            {
              label: `Lihat Detail SPB ${sample.no_spb || ""}`,
              path: `/monitoring-spb/detail?spb=${encodeURIComponent(String(sample.no_spb || ""))}`,
            },
          ],
        };
      }
    }

    // Ringkasan status seluruh item SPB
    const statusCounts: Record<string, number> = {
      "Belum Diproses": 0,
      "Belum PO": 0,
      "Sudah PO": 0,
      "Datang Sesuai": 0,
      "Datang Kurang": 0,
      "Datang Lebih": 0,
    };

    realItems.forEach((row) => {
      const st = resolveSpbItemStatus(row);
      statusCounts[st] = (statusCounts[st] ?? 0) + 1;
    });

    const uniqueSpb = new Set(
      realItems.map((r) => `${r.no_spb ?? ""}__${cleanSpbTitle(r.judul_spb)}`),
    ).size;

    return {
      text: [
        `Ringkasan **Monitoring SPB & PO** saat ini:`,
        `• Total Kartu SPB: **${uniqueSpb} kartu** (${realItems.length} item barang)`,
        `• Belum Diproses: **${statusCounts["Belum Diproses"] || 0} item**`,
        `• Belum PO: **${statusCounts["Belum PO"] || 0} item**`,
        `• Sudah PO: **${statusCounts["Sudah PO"] || 0} item**`,
        `• Datang (Sesuai/Kurang/Lebih): **${(statusCounts["Datang Sesuai"] || 0) + (statusCounts["Datang Kurang"] || 0) + (statusCounts["Datang Lebih"] || 0)} item**`,
        `• Total Data PO: **${poRows.length} baris** | Surat Jalan: **${sjRows.length} baris**`,
      ].join("\n"),
      suggestions: ["Ringkasan stok gudang", "Barang stok menipis"],
      actionLinks: [{ label: "Buka Monitoring SPB", path: "/monitoring-spb" }],
    };
  }

  // 3. Pertanyaan seputar Stok Menipis / Habis
  if (
    query.includes("menipis") ||
    query.includes("habis") ||
    query.includes("low stock") ||
    query.includes("kurang")
  ) {
    const products = await fetchProductsSnapshot();
    const lowOrOut = products.filter(
      (p) => p.stock <= 0 || p.stock <= (p.minStock || 5) || p.status === "low" || p.status === "out",
    );

    if (lowOrOut.length === 0) {
      return {
        text: `Seluruh **${products.length} item barang** di gudang saat ini memiliki stok dalam batas aman.`,
        suggestions: DEFAULT_CHAT_SUGGESTIONS,
        actionLinks: [{ label: "Buka Inventory", path: "/inventory" }],
      };
    }

    const listText = lowOrOut
      .slice(0, 6)
      .map(
        (p) =>
          `• **${p.name}** (${p.code}) — Sisa stok: **${formatNumber(p.stock)} ${p.unit}**`,
      )
      .join("\n");

    return {
      text: [
        `Terdapat **${lowOrOut.length} barang** dengan stok menipis atau habis:`,
        listText,
      ].join("\n"),
      suggestions: ["Ringkasan stok gudang", "Status monitoring SPB"],
      actionLinks: [{ label: "Kelola Stok di Inventory", path: "/inventory" }],
    };
  }

  // 4. Pertanyaan seputar Ringkasan Stok / Gudang / Inventory
  if (
    query.includes("ringkasan") ||
    query.includes("total") ||
    query.includes("dashboard") ||
    query.includes("inventory") ||
    query.includes("gudang")
  ) {
    const products = await fetchProductsSnapshot();
    const totalItems = products.length;
    const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
    const materialCount = products.filter((p) => p.category === "Material").length;
    const toolsCount = products.filter((p) => p.category === "Alat Bantu").length;

    return {
      text: [
        `Ringkasan **Inventaris Gudang** saat ini:`,
        `• Total Jenis Barang: **${formatNumber(totalItems)} item**`,
        `• Total Akumulasi Stok: **${formatNumber(totalUnits)} unit**`,
        `• Kategori Material: **${formatNumber(materialCount)} item**`,
        `• Kategori Alat Bantu: **${formatNumber(toolsCount)} item**`,
      ].join("\n"),
      suggestions: ["Barang stok menipis", "Status monitoring SPB", "Info hak akses role"],
      actionLinks: [
        { label: "Buka Dashboard", path: "/dashboard" },
        { label: "Buka Inventory", path: "/inventory" },
      ],
    };
  }

  // 5. Pencarian spesifik nama/kode barang (misal: "stok kabel", "cari semen", atau nama barang langsung)
  const products = await fetchProductsSnapshot();
  const cleanKeyword = query
    .replace(/^(cek|cari|berapa|info|lihat|stok|barang)\s+/gi, "")
    .replace(/^stok\s+/gi, "")
    .trim();

  if (cleanKeyword) {
    const matchedProducts = products.filter(
      (p) =>
        p.name.toLowerCase().includes(cleanKeyword) ||
        p.code.toLowerCase().includes(cleanKeyword) ||
        (p.size && p.size.toLowerCase().includes(cleanKeyword)) ||
        (p.category && p.category.toLowerCase().includes(cleanKeyword)),
    );

    if (matchedProducts.length > 0) {
      const topMatches = matchedProducts
        .slice(0, 6)
        .map(
          (p) =>
            `• **${p.name}** ${p.size ? `(${p.size})` : ""} [${p.code}] — Stok: **${formatNumber(p.stock)} ${p.unit}** (${p.category})`,
        )
        .join("\n");

      return {
        text: [
          `Ditemukan **${matchedProducts.length} barang** yang cocok dengan pencarian **"${cleanKeyword}"**:`,
          topMatches,
        ].join("\n"),
        suggestions: DEFAULT_CHAT_SUGGESTIONS,
        actionLinks: [{ label: "Lihat di Inventory", path: "/inventory" }],
      };
    }
  }

  // 6. Fallback umum yang ramah dan mudah dipahami
  return {
    text: [
      `Saya adalah **Asisten Chatbot Gudang**. Berikut hal yang dapat saya bantu:`,
      `• **Cek Stok Barang**: ketik nama atau kode barang (contoh: *"cek stok kabel"*)`,
      `• **Cek Stok Menipis/Habis**: ketik *"barang stok menipis"*`,
      `• **Cek Monitoring SPB & PO**: ketik *"status monitoring SPB"* atau nomor SPB (contoh: *"SPB 10"*)`,
      `• **Info Hak Akses & Role**: ketik *"info hak akses role"*`,
    ].join("\n"),
    suggestions: DEFAULT_CHAT_SUGGESTIONS,
    actionLinks: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Inventory", path: "/inventory" },
      { label: "Monitoring SPB", path: "/monitoring-spb" },
    ],
  };
};