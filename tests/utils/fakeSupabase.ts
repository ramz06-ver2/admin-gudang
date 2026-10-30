// tests/utils/fakeSupabase.ts
//
// Supabase palsu berbasis memori. Berbeda dari mock `then` biasa, builder ini
// BENAR-BENAR menerapkan filter .eq / .is / .in, sehingga test ikut memverifikasi
// bahwa query hook memilih baris yang tepat (bukan sekadar mengembalikan semua data).
//
// Pemakaian di file test:
//
//   vi.mock("@/shared/lib/supabaseClient", async () => {
//     const m = await import("../../utils/fakeSupabase");
//     return { supabaseClient: m.fakeSupabaseClient };
//   });
//   import { fakeDb } from "../../utils/fakeSupabase";
//   beforeEach(() => fakeDb.reset());

export type Row = Record<string, any>;

export interface QueryCall {
  table: string;
  method: "select" | "eq" | "is" | "in" | "single";
  args: unknown[];
}

type Filter = (row: Row) => boolean;

const sameValue = (a: unknown, b: unknown) => String(a) === String(b);

export const fakeDb = {
  tables: { spb: [], po: [], surat_jalan: [] } as Record<string, Row[]>,
  calls: [] as QueryCall[],
  /** isi untuk membuat query ke tabel tertentu gagal: errors.po = { message: "boom" } */
  errors: {} as Record<string, { message: string } | undefined>,

  reset() {
    this.tables = { spb: [], po: [], surat_jalan: [] };
    this.calls = [];
    this.errors = {};
  },

  /** Jumlah query .select() yang dikirim ke sebuah tabel. */
  queriesTo(table: string) {
    return this.calls.filter((c) => c.table === table && c.method === "select").length;
  },
};

export const fakeSupabaseClient = {
  from(table: string) {
    const filters: Filter[] = [];
    const log = (method: QueryCall["method"], args: unknown[]) =>
      fakeDb.calls.push({ table, method, args });

    const run = () => {
      const err = fakeDb.errors[table];
      if (err) return { data: null, error: err };
      const rows = fakeDb.tables[table] ?? [];
      return { data: rows.filter((r) => filters.every((f) => f(r))), error: null };
    };

    const builder: any = {
      select(...args: unknown[]) {
        log("select", args);
        return builder;
      },
      eq(col: string, val: unknown) {
        log("eq", [col, val]);
        filters.push((r) => r[col] != null && sameValue(r[col], val));
        return builder;
      },
      is(col: string, val: unknown) {
        log("is", [col, val]);
        filters.push((r) => (r[col] ?? null) === val);
        return builder;
      },
      in(col: string, vals: unknown[]) {
        log("in", [col, vals]);
        const set = new Set(vals.map(String));
        filters.push((r) => r[col] != null && set.has(String(r[col])));
        return builder;
      },
      single() {
        log("single", []);
        const { data, error } = run();
        return Promise.resolve({ data: data?.[0] ?? null, error });
      },
      // supaya `await builder` berfungsi seperti query Supabase asli
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(run()).then(resolve, reject);
      },
    };
    return builder;
  },
};