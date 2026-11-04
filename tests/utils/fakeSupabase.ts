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
    | "limit"
    | "range";
  args: unknown[];
}

type Filter = (row: Row) => boolean;

const sameValue = (a: unknown, b: unknown) => String(a) === String(b);

/**
 * Emulasi Supabase Auth di memori: user, sesi aktif, dan RPC persetujuan akun
 * (meniru `approve_account` / `reject_account` / `set_account_role` di migrasi SQL,
 * termasuk pemeriksaan "caller harus superuser" dari app_metadata sesi).
 */
export interface FakeAuthUser {
  id: string;
  password: string;
  app_metadata: Row;
  user_metadata: Row;
}

export const fakeAuth = {
  users: {} as Record<string, FakeAuthUser>,
  session: null as null | { user: Row },

  reset() {
    this.users = {};
    this.session = null;
  },

  /** Tambah user siap pakai. role undefined = belum disetujui (tanpa app_metadata.role). */
  addUser(email: string, password: string, opts: { role?: string; name?: string } = {}) {
    const key = email.trim().toLowerCase();
    this.users[key] = {
      id: `uid-${key}`,
      password,
      app_metadata: opts.role ? { role: opts.role } : {},
      user_metadata: opts.name ? { name: opts.name } : {},
    };
  },

  toPublicUser(email: string) {
    const u = this.users[email];
    return {
      id: u.id,
      email,
      app_metadata: { ...u.app_metadata },
      user_metadata: { ...u.user_metadata },
      identities: [{ id: u.id }],
    };
  },
};

const callerIsSuperuser = () => fakeAuth.session?.user?.app_metadata?.role === "superuser";

const findRequest = (id: string) =>
  (fakeDb.tables.account_requests ?? []).find((r) => String(r.id) === String(id));

const fakeRpc = (name: string, args: Row) => {
  const forbidden = { data: null, error: { message: "forbidden" } };
  if (["approve_account", "reject_account", "set_account_role"].includes(name)) {
    if (!callerIsSuperuser()) return Promise.resolve(forbidden);
    const req = findRequest(args.p_request_id);
    if (!req) return Promise.resolve({ data: null, error: { message: "request not found" } });
    const email = String(req.email).toLowerCase();
    const user = fakeAuth.users[email];

    if (name === "reject_account") {
      req.status = "rejected";
      if (user) delete user.app_metadata.role;
    } else {
      const role = String(args.p_role || "admin").trim().toLowerCase();
      const safeRole = ["", "user", "superuser"].includes(role) ? "admin" : role;
      req.role = safeRole;
      if (name === "approve_account") req.status = "approved";
      if (user) user.app_metadata.role = safeRole;
    }
    return Promise.resolve({ data: null, error: null });
  }
  return Promise.resolve({ data: null, error: { message: `rpc ${name} tidak dikenal` } });
};

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
    fakeAuth.reset();
  },

  /** Jumlah query .select() yang dikirim ke sebuah tabel. */
  queriesTo(table: string) {
    return this.calls.filter((c) => c.table === table && c.method === "select").length;
  },
};

export const fakeSupabaseClient = {
  auth: {
    getSession: () =>
      Promise.resolve({ data: { session: fakeAuth.session }, error: null }),
    getUser: () =>
      Promise.resolve({ data: { user: fakeAuth.session?.user ?? null }, error: null }),
    signInWithPassword: ({ email, password }: { email: string; password: string }) => {
      const key = String(email).trim().toLowerCase();
      const u = fakeAuth.users[key];
      if (!u || u.password !== password) {
        return Promise.resolve({
          data: { user: null, session: null },
          error: { message: "Invalid login credentials" },
        });
      }
      const user = fakeAuth.toPublicUser(key);
      fakeAuth.session = { user };
      return Promise.resolve({ data: { user, session: { user } }, error: null });
    },
    signUp: ({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: Row };
    }) => {
      const key = String(email).trim().toLowerCase();
      if (fakeAuth.users[key]) {
        // Perilaku Supabase: email sudah ada -> identities kosong (anti-enumerasi)
        return Promise.resolve({
          data: { user: { id: fakeAuth.users[key].id, identities: [] }, session: null },
          error: null,
        });
      }
      fakeAuth.users[key] = {
        id: `uid-${key}`,
        password,
        app_metadata: {},
        user_metadata: { ...(options?.data ?? {}) },
      };
      return Promise.resolve({
        data: { user: fakeAuth.toPublicUser(key), session: null },
        error: null,
      });
    },
    signOut: () => {
      fakeAuth.session = null;
      return Promise.resolve({ error: null });
    },
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  },

  rpc: (name: string, args: Row = {}) => fakeRpc(name, args),

  from(table: string) {
    const filters: Filter[] = [];
    let pendingOp: "select" | "insert" | "update" | "delete" = "select";
    let insertPayload: Row[] = [];
    let updatePatch: Row = {};
    let executedResult: { data: Row[] | null; error: any } | null = null;
    let rangeWindow: [number, number] | null = null;

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

      const matched = rows.filter((r) => filters.every((f) => f(r)));
      executedResult = {
        // .range(from, to) bersifat inklusif seperti PostgREST
        data: rangeWindow ? matched.slice(rangeWindow[0], rangeWindow[1] + 1) : matched,
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
      range(from: number, to: number) {
        log("range", [from, to]);
        rangeWindow = [from, to];
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
