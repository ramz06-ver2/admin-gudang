import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import type { AccountRequest, UserRole } from "../../shared/types";
import { requirePermission } from "../../shared/lib/authGuard";
import {
  canApproveAccounts,
  canManageRoles,
  normalizeRoleKey,
} from "../../app/providers/accessControlProvider";

const REQUESTS_STORAGE_KEY = "account-registration-requests";

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

export const getAccountRequests = async (): Promise<AccountRequest[]> => {
  const local = readLocalRequests();
  try {
    const res = await supabaseClient
      .from(TABLES.accountRequests)
      .select("*");
    if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
      const mergedMap = new Map<string, AccountRequest>();
      local.forEach((item) => mergedMap.set(item.email.toLowerCase(), item));
      res.data.forEach((row: any) => {
        const emailKey = String(row.email || "").toLowerCase();
        if (!emailKey) return;
        const existing = mergedMap.get(emailKey);
        mergedMap.set(emailKey, {
          id: String(row.id ?? existing?.id ?? Date.now()),
          name: row.name || existing?.name || "Calon Pengguna",
          email: row.email,
          password: row.password ?? existing?.password,
          role: sanitizeAssignableRole(row.role ?? existing?.role ?? "admin"),
          status: row.status || existing?.status || "pending",
          createdAt:
            row.created_at ||
            row.createdAt ||
            existing?.createdAt ||
            new Date().toISOString(),
          decidedAt:
            row.decided_at || row.decidedAt || existing?.decidedAt || null,
        });
      });
      const merged = Array.from(mergedMap.values());
      writeLocalRequests(merged);
      return merged;
    }
  } catch {
    // fallback ke localStorage jika tabel belum tersedia
  }
  return local;
};

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

  const existingList = readLocalRequests();
  const duplicate = existingList.find(
    (r) => r.email.toLowerCase() === email && r.status !== "rejected",
  );
  if (duplicate) {
    throw new Error(
      duplicate.status === "pending"
        ? "Email ini sudah terdaftar dan masih menunggu persetujuan Super User"
        : "Email ini sudah terdaftar dan aktif di sistem",
    );
  }

  const newRequest: AccountRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    email,
    password,
    role: requestedRole,
    status: "pending",
    createdAt: new Date().toISOString(),
    decidedAt: null,
  };

  const updated = [
    newRequest,
    ...existingList.filter((r) => r.email.toLowerCase() !== email),
  ];
  writeLocalRequests(updated);

  try {
    await supabaseClient.from(TABLES.accountRequests).insert([
      {
        id: newRequest.id,
        name: newRequest.name,
        email: newRequest.email,
        password: newRequest.password,
        role: newRequest.role,
        status: "pending",
        created_at: newRequest.createdAt,
      },
    ]);
  } catch {
    // fallback ke localStorage
  }

  return newRequest;
};

/**
 * Point 1: Menyetujui permintaan akun baru (hanya Super User).
 * Mendukung pemilihan role saat disetujui (misal: 'admin', 'supervisor', atau role tambahan).
 */
export const approveAccountRequest = async (
  requestId: string,
  assignedRole?: UserRole,
  actorRole: UserRole = "superuser",
): Promise<AccountRequest> => {
  // 🔒 Verifikasi: user harus login terlebih dahulu
  requirePermission("approve_accounts", "Setujui pendaftaran akun");

  if (!canApproveAccounts(actorRole)) {
    throw new Error("Hanya Super User yang dapat menyetujui pendaftaran akun");
  }

  const list = readLocalRequests();
  const idx = list.findIndex((r) => String(r.id) === String(requestId));
  const decidedAt = new Date().toISOString();

  let updatedItem: AccountRequest;
  if (idx >= 0) {
    const targetRole = sanitizeAssignableRole(assignedRole ?? list[idx].role ?? "admin");
    updatedItem = {
      ...list[idx],
      status: "approved",
      role: targetRole,
      decidedAt,
    };
    list[idx] = updatedItem;
    writeLocalRequests(list);
  } else {
    const targetRole = sanitizeAssignableRole(assignedRole ?? "admin");
    updatedItem = {
      id: requestId,
      name: "Pengguna Baru",
      email: "",
      role: targetRole,
      status: "approved",
      createdAt: decidedAt,
      decidedAt,
    };
  }

  try {
    await supabaseClient
      .from(TABLES.accountRequests)
      .update({
        status: "approved",
        role: updatedItem.role,
        decided_at: decidedAt,
      })
      .eq("id", requestId);
  } catch {
    // fallback ke localStorage
  }

  return updatedItem;
};

/**
 * Point 1: Menolak permintaan akun baru (hanya Super User).
 */
export const rejectAccountRequest = async (
  requestId: string,
  actorRole: UserRole = "superuser",
): Promise<AccountRequest> => {
  // 🔒 Verifikasi: user harus login terlebih dahulu
  requirePermission("approve_accounts", "Tolak pendaftaran akun");

  if (!canApproveAccounts(actorRole)) {
    throw new Error("Hanya Super User yang dapat menolak pendaftaran akun");
  }

  const list = readLocalRequests();
  const idx = list.findIndex((r) => String(r.id) === String(requestId));
  const decidedAt = new Date().toISOString();

  let updatedItem: AccountRequest;
  if (idx >= 0) {
    updatedItem = {
      ...list[idx],
      status: "rejected",
      decidedAt,
    };
    list[idx] = updatedItem;
    writeLocalRequests(list);
  } else {
    updatedItem = {
      id: requestId,
      name: "Calon Pengguna",
      email: "",
      role: "admin",
      status: "rejected",
      createdAt: decidedAt,
      decidedAt,
    };
  }

  try {
    await supabaseClient
      .from(TABLES.accountRequests)
      .update({ status: "rejected", decided_at: decidedAt })
      .eq("id", requestId);
  } catch {
    // fallback ke localStorage
  }

  return updatedItem;
};

/**
 * Point 2: Mengubah role akun pengguna (hanya Super User).
 */
export const updateAccountRole = async (
  requestId: string,
  newRole: UserRole,
  actorRole: UserRole = "superuser",
): Promise<AccountRequest> => {
  // 🔒 Verifikasi: user harus login terlebih dahulu
  requirePermission("manage_roles", "Ubah role akun");

  if (!canManageRoles(actorRole)) {
    throw new Error("Hanya Super User yang dapat mengubah role akun");
  }

  const targetRole = sanitizeAssignableRole(newRole);
  const list = readLocalRequests();
  const idx = list.findIndex((r) => String(r.id) === String(requestId));
  if (idx < 0) {
    throw new Error("Data akun tidak ditemukan");
  }

  const updatedItem: AccountRequest = {
    ...list[idx],
    role: targetRole,
  };
  list[idx] = updatedItem;
  writeLocalRequests(list);

  try {
    await supabaseClient
      .from(TABLES.accountRequests)
      .update({ role: targetRole })
      .eq("id", requestId);
  } catch {
    // fallback ke localStorage
  }

  return updatedItem;
};

export const findAccountRequestByEmail = (
  email: string,
): AccountRequest | undefined => {
  const normalized = email.trim().toLowerCase();
  return readLocalRequests().find((r) => r.email.toLowerCase() === normalized);
};