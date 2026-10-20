import { describe, it, expect } from "vitest";
import { supabaseClient } from "../../src/utility/supabaseClient";
import { TABLES } from "../../src/utility/constants";

// ============================================
// Helper: grouping logic yang sama dengan useMonitoringSPB
// (untuk cross-check hasil hook vs query langsung)
// ============================================
function groupSpbRows(rows: any[]) {
  const groups: Record<string, any> = {};

  (rows ?? []).forEach((item: any) => {
    const key = `${item.no_spb || "NO_SPB"}_${item.no_po || "NO_PO"}`;

    if (!groups[key]) {
      groups[key] = {
        id: key,
        spbNo: item.no_spb,
        poNo: item.no_po,
        status: item.status,
        itemsCount: 0,
      };
    }

    if (item.status === "BELUM DATANG") {
      groups[key].status = "BELUM DATANG";
    }

    groups[key].itemsCount += 1;
  });

  return Object.values(groups);
}

const VALID_STATUSES = [
  "BELUM DATANG",
  "DATANG SESUAI",
  "DATANG LEBIH",
  "DATANG KURANG",
];

describe("Integration: SPB Monitoring — schema & akses", () => {
  it("tabel 'spb' bisa diakses", async () => {
    const { data, error } = await supabaseClient
      .from(TABLES.spb)
      .select("*")
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  }, 15_000);

  it("kolom yang dibutuhkan hook tersedia", async () => {
    const { data, error } = await supabaseClient
      .from(TABLES.spb)
      .select(
        "no_spb, tanggal_pembuatan_spb, no_po, tanggal_po, status, tanggal_datang",
      )
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.length).toBeGreaterThan(0);

    const row = data![0];
    expect(row).toHaveProperty("no_spb");
    expect(row).toHaveProperty("no_po");
    expect(row).toHaveProperty("status");
    expect(row).toHaveProperty("tanggal_pembuatan_spb");
    expect(row).toHaveProperty("tanggal_po");
    expect(row).toHaveProperty("tanggal_datang");
  }, 15_000);
});

describe("Integration: SPB Monitoring — data & grouping", () => {
  it("total baris tabel spb ≥ 1", async () => {
    const { count, error } = await supabaseClient
      .from(TABLES.spb)
      .select("*", { count: "exact", head: true });

    expect(error).toBeNull();
    expect(count).toBeGreaterThan(0);
    console.log(`📊 Total baris spb: ${count}`);
  }, 15_000);

  it("semua nilai status termasuk dalam set yang dikenal", async () => {
    const { data, error } = await supabaseClient
      .from(TABLES.spb)
      .select("status")
      .limit(1000);

    expect(error).toBeNull();

    const unknown = (data ?? []).filter(
      (r: any) => r.status && !VALID_STATUSES.includes(r.status),
    );
    expect(unknown).toHaveLength(0);
  }, 15_000);

  it("grouping menghasilkan grup valid (id unik, itemsCount > 0)", async () => {
    const { data, error } = await supabaseClient
      .from(TABLES.spb)
      .select(
        "no_spb, tanggal_pembuatan_spb, no_po, tanggal_po, status, tanggal_datang",
      )
      .order("no_spb", { ascending: true })
      .limit(1000);

    expect(error).toBeNull();

    const groups = groupSpbRows(data ?? []);
    expect(groups.length).toBeGreaterThan(0);

    const ids = new Set<string>();
    groups.forEach((g) => {
      expect(g.itemsCount).toBeGreaterThan(0);
      expect(ids.has(g.id)).toBe(false);
      ids.add(g.id);
    });

    console.log(`📦 Total grup SPB/PO: ${groups.length}`);
  }, 15_000);

  it("cross-check: jumlah baris mentah = total itemsCount semua grup", async () => {
    const { data, error } = await supabaseClient
      .from(TABLES.spb)
      .select("no_spb, no_po, status")
      .limit(1000);

    expect(error).toBeNull();

    const rawCount = data?.length ?? 0;
    const groups = groupSpbRows(data ?? []);
    const groupedCount = groups.reduce((sum, g) => sum + g.itemsCount, 0);

    expect(groupedCount).toBe(rawCount);
  }, 15_000);

  it("grup yang punya minimal 1 item BELUM DATANG → status BELUM DATANG", async () => {
    const { data, error } = await supabaseClient
      .from(TABLES.spb)
      .select("no_spb, no_po, status")
      .limit(1000);

    expect(error).toBeNull();

    const rows = data ?? [];
    const groups = groupSpbRows(rows);

    // Temukan grup yang punya campuran status (ada BELUM DATANG + ada non-BELUM DATANG)
    const mixedGroups = groups.filter((g) => {
      const members = rows.filter(
        (r: any) => `${r.no_spb || "NO_SPB"}_${r.no_po || "NO_PO"}` === g.id,
      );
      const hasBelumDatang = members.some((m: any) => m.status === "BELUM DATANG");
      const hasOther = members.some((m: any) => m.status !== "BELUM DATANG");
      return hasBelumDatang && hasOther;
    });

    // Jika ada grup campuran, status harus BELUM DATANG
    mixedGroups.forEach((g) => {
      expect(g.status).toBe("BELUM DATANG");
    });

    console.log(`🔀 Grup dengan status campuran: ${mixedGroups.length}`);
  }, 15_000);

  it("mendukung query grouping yang sama dengan hook (no_spb ascending)", async () => {
    const { data, error } = await supabaseClient
      .from(TABLES.spb)
      .select("no_spb, no_po, status")
      .order("no_spb", { ascending: true })
      .limit(1000);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // Verifikasi sorting ascending no_spb
    let prev = "";
    (data ?? []).forEach((row: any) => {
      if (row.no_spb && prev) {
        expect(row.no_spb.localeCompare(prev)).toBeGreaterThanOrEqual(0);
      }
      if (row.no_spb) prev = row.no_spb;
    });
  }, 15_000);
});