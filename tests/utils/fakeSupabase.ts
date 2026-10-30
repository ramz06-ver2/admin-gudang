// tests/utils/fakeSupabase.ts
//
// Supabase palsu berbasis memori. Berbeda dari mock `then` biasa, builder ini
// BENAR-BENAR menerapkan filter .eq / .is / .in serta operasi .insert / .update / .delete,
// sehingga test ikut memverifikasi bahwa query & mutasi bekerja secara nyata di memori.

export type Row = Record<string, any>;

export interface QueryCall {
  table: string;
  method:
    | "select"
    | "eq"
    | "is"
    | "in"
    | "single"
    | "insert"
    | "update"
    | "delete"
    | "order"
    | "limit";
  args: unknown[];
}

type Filter = (row: Row) => boolean;

const sameValue = (a: unknown, b: unknown) => String(a) === String(b);

export const fakeDb = {
  tables: {
    spb: [],
    po: [],
    surat_jalan: [],
    barang: [],
    account_requests: [],
  } as Record<string, Row[]>,
  calls: [] as QueryCall[],
  /** isi untuk membuat query ke tabel tertentu gagal: errors.po = { message: "boom" } */
  errors: {} as Record<string, { message: string } | undefined>,

  reset() {
    this.tables = {
      spb: [],
      po: [],
      surat_jalan: [],
      barang: [],
      account_requests: [],
    };
    this.calls = [];
    this.errors = {};
  },

  /** Jumlah query .select() yang dikirim ke sebuah tabel. */
  queriesTo(table: string) {
    return this.calls.filter((c) => c.table === table && c.method === "select").length;
  },
};

export const fakeSupabaseClient = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () =>
      Promise.resolve({ data: { user: null, session: null }, error: { message: "Invalid login" } }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  },

  from(table: string) {
    const filters: Filter[] = [];
    let pendingOp: "select" | "insert" | "update" | "delete" = "select";
    let insertPayload: Row[] = [];
    let updatePatch: Row = {};
    let executedResult: { data: Row[] | null; error: any } | null = null;

    const log = (method: QueryCall["method"], args: unknown[]) =>
      fakeDb.calls.push({ table, method, args });

    const ensureTable = () => {
      if (!fakeDb.tables[table]) {
        fakeDb.tables[table] = [];
      }
      return fakeDb.tables[table];
    };

    const run = () => {
      if (executedResult) return executedResult;

      const err = fakeDb.errors[table];
      if (err) {
        executedResult = { data: null, error: err };
        return executedResult;
      }

      const rows = ensureTable();

      if (pendingOp === "insert") {
        const created = insertPayload.map((item, idx) => {
          const nextId =
            item.id ??
            (rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + idx + 1);
          const row = {
            id: nextId,
            created_at: item.created_at ?? new Date().toISOString(),
            ...item,
          };
          rows.push(row);
          return row;
        });
        executedResult = { data: created, error: null };
        return executedResult;
      }

      if (pendingOp === "update") {
        const updated: Row[] = [];
        fakeDb.tables[table] = rows.map((r) => {
          if (filters.every((f) => f(r))) {
            const next = { ...r, ...updatePatch };
            updated.push(next);
            return next;
          }
          return r;
        });
        executedResult = { data: updated, error: null };
        return executedResult;
      }

      if (pendingOp === "delete") {
        const removed: Row[] = [];
        fakeDb.tables[table] = rows.filter((r) => {
          const match = filters.every((f) => f(r));
          if (match) removed.push(r);
          return !match;
        });
        executedResult = { data: removed, error: null };
        return executedResult;
      }

      executedResult = {
        data: rows.filter((r) => filters.every((f) => f(r))),
        error: null,
      };
      return executedResult;
    };

    const builder: any = {
      select(...args: unknown[]) {
        log("select", args);
        return builder;
      },
      insert(rowsInput: Row | Row[]) {
        log("insert", [rowsInput]);
        pendingOp = "insert";
        insertPayload = Array.isArray(rowsInput) ? rowsInput : [rowsInput];
        return builder;
      },
      update(patch: Row) {
        log("update", [patch]);
        pendingOp = "update";
        updatePatch = patch;
        return builder;
      },
      delete() {
        log("delete", []);
        pendingOp = "delete";
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
      order(...args: unknown[]) {
        log("order", args);
        return builder;
      },
      limit(...args: unknown[]) {
        log("limit", args);
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
