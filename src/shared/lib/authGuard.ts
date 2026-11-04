/**
 * @file authGuard.ts
 * @description Lapisan keamanan terpusat untuk memverifikasi autentikasi
 * sebelum operasi mutasi (POST/PUT/DELETE) ke server.
 *
 * PRINSIP KEAMANAN:
 * 1. Defense-in-depth: Verifikasi di UI + API layer + Supabase RLS
 * 2. Fail-closed: Jika status auth tidak jelas, tolak akses
 * 3. Least privilege: Hanya user dengan role terautentikasi yang bisa mutasi
 * 4. Audit trail: Log setiap percobaan akses yang ditolak
 *
 * @example
 * // Di dalam fungsi API / mutation:
 * import { requireAuth, requirePermission } from '@/shared/lib/authGuard';
 *
 * const createBarang = async (input: BarangInput) => {
 *   requireAuth();              // Memastikan user sudah login
 *   requirePermission('edit_data'); // Memastikan punya izin edit
 *   // ... lanjut operasi
 * };
 */

import { supabaseClient } from "./supabaseClient";
import { USE_MOCK } from "./config";
import { getStoredUser, type StoredAuthUser } from "../../app/providers/authProvider";
import {
  isAuthenticatedRole,
  canEditData,
  canApproveAccounts,
  canManageRoles,
} from "../../app/providers/accessControlProvider";
import type { PermissionKey } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Custom Error Classes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Error ketika user belum login / sesi tidak valid.
 * HTTP-equivalent: 401 Unauthorized
 */
export class AuthenticationError extends Error {
  public readonly code = "AUTH_REQUIRED";
  public readonly statusCode = 401;

  constructor(message = "Anda harus login terlebih dahulu untuk melakukan aksi ini") {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Error ketika user login tapi tidak punya izin yang diperlukan.
 * HTTP-equivalent: 403 Forbidden
 */
export class AuthorizationError extends Error {
  public readonly code = "PERMISSION_DENIED";
  public readonly statusCode = 403;
  public readonly requiredPermission: string;

  constructor(permission: string, message?: string) {
    super(
      message ??
        `Anda tidak memiliki izin "${permission}" untuk melakukan aksi ini`,
    );
    this.name = "AuthorizationError";
    this.requiredPermission = permission;
  }
}

/**
 * Error ketika sesi auth sudah kedaluwarsa.
 */
export class SessionExpiredError extends Error {
  public readonly code = "SESSION_EXPIRED";
  public readonly statusCode = 401;

  constructor(message = "Sesi Anda telah berakhir. Silakan login kembali.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logger
// ─────────────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  result: "allowed" | "denied";
  reason?: string;
  metadata?: Record<string, unknown>;
}

const MAX_AUDIT_LOG_SIZE = 500;
const AUDIT_LOG_KEY = "security-audit-log";

/**
 * Mencatat aktivitas keamanan ke localStorage untuk audit trail.
 * Pada production, ini sebaiknya dikirim ke server logging.
 */
const logAudit = (entry: Omit<AuditLogEntry, "timestamp">): void => {
  try {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Console warning untuk akses yang ditolak (dev mode)
    if (entry.result === "denied") {
      console.warn(
        `🔒 [Security] Akses ditolak: ${entry.action}`,
        {
          user: entry.userEmail ?? "anonymous",
          role: entry.userRole ?? "none",
          reason: entry.reason,
        },
      );
    }

    // Simpan ke localStorage sebagai audit trail sederhana
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    logs.unshift(fullEntry);

    // Batas ukuran agar tidak membebani storage
    if (logs.length > MAX_AUDIT_LOG_SIZE) {
      logs.length = MAX_AUDIT_LOG_SIZE;
    }

    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch {
    // Jangan sampai audit logging mengganggu operasi utama
  }
};

/**
 * Membaca log audit. Berguna untuk dashboard admin / debugging.
 */
export const getAuditLogs = (): AuditLogEntry[] => {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Membersihkan log audit.
 */
export const clearAuditLogs = (): void => {
  try {
    localStorage.removeItem(AUDIT_LOG_KEY);
  } catch {
    // ignore
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Core Auth Verification Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mendapatkan user yang sudah terverifikasi dari stored session.
 * Melakukan validasi menyeluruh terhadap data user.
 *
 * @returns StoredAuthUser jika valid, null jika tidak
 */
export const getVerifiedUser = (): StoredAuthUser | null => {
  const user = getStoredUser();

  if (!user) return null;

  // Validasi integritas data user
  if (!user.email || typeof user.email !== "string") return null;
  if (!user.role || typeof user.role !== "string") return null;
  if (!isAuthenticatedRole(user.role)) return null;

  return user;
};

/**
 * Memverifikasi sesi Supabase masih valid (untuk mode non-mock).
 * Ini memastikan token JWT belum kedaluwarsa.
 *
 * @returns true jika sesi masih valid
 */
export const verifySupabaseSession = async (): Promise<boolean> => {
  if (USE_MOCK) return true;

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) return false;
    return !!data?.session;
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Guard Functions (Synchronous — untuk penggunaan di awal setiap mutation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GUARD UTAMA: Memastikan user sudah login sebelum operasi mutasi.
 *
 * Melempar `AuthenticationError` jika user belum login.
 *
 * @param actionDescription - Deskripsi aksi untuk audit log (opsional)
 * @returns User yang sudah terverifikasi
 *
 * @throws {AuthenticationError} Jika user belum login
 *
 * @example
 * const handleSave = async (data: any) => {
 *   const user = requireAuth('Simpan data barang');
 *   console.log(`${user.name} sedang menyimpan data...`);
 *   await supabaseClient.from('barang').insert(data);
 * };
 */
export const requireAuth = (actionDescription?: string): StoredAuthUser => {
  const user = getVerifiedUser();
  const action = actionDescription ?? "operasi mutasi";

  if (!user) {
    logAudit({
      action,
      userId: null,
      userEmail: null,
      userRole: null,
      result: "denied",
      reason: "User belum login atau sesi tidak valid",
    });

    throw new AuthenticationError();
  }

  logAudit({
    action,
    userId: user.id ?? null,
    userEmail: user.email,
    userRole: user.role,
    result: "allowed",
  });

  return user;
};

/**
 * GUARD ASYNC: Versi async dari requireAuth yang juga memvalidasi sesi Supabase.
 * Gunakan ini untuk operasi kritikal yang membutuhkan validasi ekstra.
 *
 * @param actionDescription - Deskripsi aksi untuk audit log
 * @returns User yang sudah terverifikasi
 *
 * @throws {AuthenticationError} Jika user belum login
 * @throws {SessionExpiredError} Jika sesi Supabase sudah kedaluwarsa
 *
 * @example
 * const handleDelete = async (id: number) => {
 *   const user = await requireAuthStrict('Hapus barang');
 *   await supabaseClient.from('barang').delete().eq('id', id);
 * };
 */
export const requireAuthStrict = async (
  actionDescription?: string,
): Promise<StoredAuthUser> => {
  // Step 1: Verifikasi user di local state
  const user = requireAuth(actionDescription);

  // Step 2: Verifikasi sesi Supabase masih valid (non-mock only)
  if (!USE_MOCK) {
    const isSessionValid = await verifySupabaseSession();
    if (!isSessionValid) {
      logAudit({
        action: actionDescription ?? "operasi mutasi (strict)",
        userId: user.id ?? null,
        userEmail: user.email,
        userRole: user.role,
        result: "denied",
        reason: "Sesi Supabase sudah kedaluwarsa",
      });

      throw new SessionExpiredError();
    }
  }

  return user;
};

/**
 * GUARD PERMISSION: Memastikan user memiliki permission tertentu.
 *
 * @param permission - Permission yang dibutuhkan
 * @param actionDescription - Deskripsi aksi untuk audit log
 * @returns User yang sudah terverifikasi
 *
 * @throws {AuthenticationError} Jika user belum login
 * @throws {AuthorizationError} Jika user tidak punya permission
 *
 * @example
 * const handleEdit = async (id: number, data: any) => {
 *   requirePermission('edit_data', 'Edit data barang');
 *   await supabaseClient.from('barang').update(data).eq('id', id);
 * };
 */
export const requirePermission = (
  permission: PermissionKey,
  actionDescription?: string,
): StoredAuthUser => {
  const user = requireAuth(actionDescription);
  const action = actionDescription ?? `operasi dengan izin ${permission}`;

  const permissionCheckers: Record<PermissionKey, (role: string) => boolean> = {
    edit_data: canEditData,
    approve_accounts: canApproveAccounts,
    manage_roles: canManageRoles,
  };

  const checker = permissionCheckers[permission];
  if (!checker || !checker(user.role)) {
    logAudit({
      action,
      userId: user.id ?? null,
      userEmail: user.email,
      userRole: user.role,
      result: "denied",
      reason: `Tidak memiliki izin: ${permission}`,
    });

    throw new AuthorizationError(permission);
  }

  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Guarded Supabase Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper type untuk operasi Supabase yang membutuhkan auth.
 */
type SupabaseOperation<T> = () => Promise<T>;

/**
 * Menjalankan operasi Supabase dengan verifikasi auth di depan.
 * Wrapper yang menggabungkan auth check + operasi dalam satu panggilan.
 *
 * @param operation - Fungsi async yang menjalankan operasi Supabase
 * @param options - Konfigurasi guard
 * @returns Hasil dari operasi
 *
 * @example
 * const result = await guardedMutation(
 *   () => supabaseClient.from('barang').insert(data).select().single(),
 *   { action: 'Tambah barang', permission: 'edit_data' }
 * );
 */
export const guardedMutation = async <T>(
  operation: SupabaseOperation<T>,
  options: {
    action?: string;
    permission?: PermissionKey;
    strict?: boolean;
  } = {},
): Promise<T> => {
  const { action, permission, strict = false } = options;

  // Step 1: Auth check
  if (strict) {
    await requireAuthStrict(action);
  } else if (permission) {
    requirePermission(permission, action);
  } else {
    requireAuth(action);
  }

  // Step 2: Execute operation
  return operation();
};

// ─────────────────────────────────────────────────────────────────────────────
// React Hook: useAuthGuard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Status autentikasi user saat ini.
 */
export interface AuthStatus {
  /** Apakah user sudah login */
  isAuthenticated: boolean;
  /** Data user yang sudah terverifikasi */
  user: StoredAuthUser | null;
  /** Apakah user punya izin edit */
  canEdit: boolean;
  /** Apakah user adalah Super User */
  isSuperUser: boolean;
}

/**
 * Mendapatkan status auth saat ini secara sinkron.
 * Gunakan di level komponen untuk conditional rendering.
 *
 * @example
 * const status = getAuthStatus();
 * if (!status.canEdit) {
 *   return <Alert message="Anda tidak memiliki izin edit" />;
 * }
 */
export const getAuthStatus = (): AuthStatus => {
  const user = getVerifiedUser();
  return {
    isAuthenticated: !!user,
    user,
    canEdit: user ? canEditData(user.role) : false,
    isSuperUser: user?.role === "superuser",
  };
};

