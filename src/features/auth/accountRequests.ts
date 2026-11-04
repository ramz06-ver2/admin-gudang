import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import type { AccountRequest, UserRole } from "../../shared/types";
import { requirePermission } from "../../shared/lib/authGuard";
import { normalizeRoleKey } from "../../app/providers/accessControlProvider";

/** Kebijakan password minimum (selaras dengan pengaturan Supabase Auth). */
export const MIN_PASSWORD_LENGTH = 8;

const REQUESTS_STORAGE_KEY = "account-registration-requests";

/**
 * Cache lokal daftar permintaan akun (hanya untuk badge/UX cepat).
 * TIDAK PERNAH menyimpan password. Sumber kebenaran: tabel account_requests
 * di server + Supabase Auth.
 */
export const readLocalRequests = (): AccountRequest[] => {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const writeLocalRequests = (requests: AccountRequest[]) => {
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // ignore storage error
  }
};

export const resetAccountRequests = () => {
  try {
    localStorage.removeItem(REQUESTS_STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const getPendingRequestsCount = (): number => {
  return readLocalRequests().filter((r) => r.status === "pending").length;
};

const sanitizeAssignableRole = (role?: UserRole | string | null): UserRole => {
  const key = normalizeRoleKey(role);
  if (!key || key === "user" || key === "superuser") {
    return "admin";
  }
  return key;
};

const mapRow = (row: any): AccountRequest => ({
  id: String(row.id),
  name: row.name || "Calon Pengguna",
  email: String(row.email || ""),
  role: sanitizeAssignableRole(row.role ?? "admin"),
  status: row.status || "pending",
  createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  decidedAt: row.decided_at || row.decidedAt || null,
});

const patchLocalRequest = (
  requestId: string,
  patch: Partial<AccountRequest>,
  fallback: AccountRequest,
): AccountRequest => {
  const list = readLocalRequests();
  const idx = list.findIndex((r) => String(r.id) === String(requestId));
  if (idx >= 0) {
    const updated = { ...list[idx], ...patch };
    list[idx] = updated;
    writeLocalRequests(list);
    return updated;
  }
  return { ...fallback, ...patch };
};

/**
 * Daftar permintaan akun. RLS membatasi baca hanya untuk Super User;
 * jika server menolak/tabel belum ada, jatuh ke cache lokal.
 */
export const getAccountRequests = async (): Promise<AccountRequest[]> => {
  try {
    const res = await supabaseClient.from(TABLES.accountRequests).select("*");
    if (!res.error && Array.isArray(res.data)) {
      const fromServer = res.data.map(mapRow).filter((r) => r.email);
      writeLocalRequests(fromServer);
      return fromServer;
    }
  } catch {
    // fallback ke cache lokal
  }
  return readLocalRequests();
};

/**
 * Pendaftaran akun: membuat user di Supabase Auth (password di-hash oleh
 * server, tidak pernah disimpan/dikirim ke tabel kita) lalu mencatat permintaan
 * persetujuan TANPA password. Akun baru tidak punya role sampai Super User
 * menyetujui (role ditulis server-side ke app_metadata).
 */
export const registerAccountRequest = async (input: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}): Promise<AccountRequest> => {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const requestedRole = sanitizeAssignableRole(input.role ?? "admin");

  if (!name || !email || !password) {
    throw new Error("Nama, email, dan password wajib diisi");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password minimal ${MIN_PASSWORD_LENGTH} karakter`);
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) {
    throw new Error(error.message || "Gagal membuat akun");
  }
  // Supabase mengembalikan user dengan identities kosong jika email sudah terdaftar.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error("Email ini sudah terdaftar");
  }

  // Pastikan tidak ada sesi aktif sebelum akun disetujui.
  try {
    await supabaseClient.auth.signOut();
  } catch {
    // ignore
  }

  const newRequest: AccountRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    email,
    role: requestedRole,
    status: "pending",
    createdAt: new Date().toISOString(),
    decidedAt: null,
  };

  const { error: insertError } = await supabaseClient
    .from(TABLES.accountRequests)
    .insert([
      {
        id: newRequest.id,
        name: newRequest.name,
        email: newRequest.email,
        role: newRequest.role,
        status: "pending",
        created_at: newRequest.createdAt,
      },
    ]);
  if (insertError) {
    throw new Error("Akun dibuat, tetapi permintaan persetujuan gagal dikirim. Hubungi Super User.");
  }

  writeLocalRequests([
    newRequest,
    ...readLocalRequests().filter((r) => r.email.toLowerCase() !== email),
  ]);

  return newRequest;
};

const placeholder = (id: string, status: AccountRequest["status"]): AccountRequest => ({
  id,
  name: "Pengguna",
  email: "",
  role: "admin",
  status,
  createdAt: new Date().toISOString(),
  decidedAt: null,
});

/**
 * Menyetujui akun + menetapkan role (hanya Super User).
 * Otorisasi ditegakkan DI SERVER: RPC `approve_account` memeriksa JWT
 * (app_metadata.role = 'superuser') lalu menulis role ke app_metadata user.
 */
export const approveAccountRequest = async (
  requestId: string,
  assignedRole?: UserRole,
): Promise<AccountRequest> => {
  requirePermission("approve_accounts", "Setujui pendaftaran akun");

  const existing = readLocalRequests().find((r) => String(r.id) === String(requestId));
  const targetRole = sanitizeAssignableRole(assignedRole ?? existing?.role ?? "admin");

  const { error } = await supabaseClient.rpc("approve_account", {
    p_request_id: String(requestId),
    p_role: targetRole,
  });
  if (error) throw new Error(error.message || "Gagal menyetujui akun");

  return patchLocalRequest(
    requestId,
    { status: "approved", role: targetRole, decidedAt: new Date().toISOString() },
    placeholder(requestId, "approved"),
  );
};

/** Menolak akun (hanya Super User) — role dicabut di server. */
export const rejectAccountRequest = async (
  requestId: string,
): Promise<AccountRequest> => {
  requirePermission("approve_accounts", "Tolak pendaftaran akun");

  const { error } = await supabaseClient.rpc("reject_account", {
    p_request_id: String(requestId),
  });
  if (error) throw new Error(error.message || "Gagal menolak akun");

  return patchLocalRequest(
    requestId,
    { status: "rejected", decidedAt: new Date().toISOString() },
    placeholder(requestId, "rejected"),
  );
};

/** Mengubah role akun yang sudah disetujui (hanya Super User). */
export const updateAccountRole = async (
  requestId: string,
  newRole: UserRole,
): Promise<AccountRequest> => {
  requirePermission("manage_roles", "Ubah role akun");

  const targetRole = sanitizeAssignableRole(newRole);
  const existing = readLocalRequests().find((r) => String(r.id) === String(requestId));
  if (!existing) {
    throw new Error("Data akun tidak ditemukan");
  }

  const { error } = await supabaseClient.rpc("set_account_role", {
    p_request_id: String(requestId),
    p_role: targetRole,
  });
  if (error) throw new Error(error.message || "Gagal mengubah role akun");

  return patchLocalRequest(requestId, { role: targetRole }, existing);
};
