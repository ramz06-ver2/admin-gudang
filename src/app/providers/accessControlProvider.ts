import type { AccessControlProvider } from "@refinedev/core";
import type { PermissionKey, RoleDefinition, UserRole } from "../../shared/types";
import { getStoredUser } from "./authProvider";

export const CUSTOM_ROLES_STORAGE_KEY = "custom-system-roles";

/**
 * Daftar role bawaan sistem berdasarkan urutan hierarki tertinggi ke terendah:
 * 1. superuser (Level 100) - Hak akses login tertinggi (Point 1, Point 2, & Edit)
 * 2. supervisor (Level 70) - Di bawah Super User (Hak akses Edit)
 * 3. admin (Level 50)      - Di bawah Supervisor (Hak akses Edit)
 * 4. user (Level 0)        - Pengunjung publik / belum login (Hanya baca)
 */
export const BUILT_IN_ROLES: Record<string, RoleDefinition> = {
  superuser: {
    key: "superuser",
    label: "Super User",
    badge: "SU",
    color: "purple",
    level: 100,
    isAuthenticated: true,
    permissions: ["approve_accounts", "manage_roles", "edit_data"],
  },
  supervisor: {
    key: "supervisor",
    label: "Supervisor",
    badge: "SV",
    color: "cyan",
    level: 70,
    isAuthenticated: true,
    permissions: ["edit_data"],
  },
  admin: {
    key: "admin",
    label: "Admin",
    badge: "AS",
    color: "blue",
    level: 50,
    isAuthenticated: true,
    permissions: ["edit_data"],
  },
  user: {
    key: "user",
    label: "User (Public)",
    badge: "US",
    color: "green",
    level: 0,
    isAuthenticated: false,
    permissions: [],
  },
};

export const normalizeRoleKey = (role?: UserRole | string | null): string => {
  const cleaned = String(role ?? "").trim().toLowerCase();
  return cleaned || "user";
};

export const getCustomRoles = (): RoleDefinition[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_ROLES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCustomRoles = (roles: RoleDefinition[]) => {
  try {
    localStorage.setItem(CUSTOM_ROLES_STORAGE_KEY, JSON.stringify(roles));
  } catch {
    // ignore storage error
  }
};

export const resetCustomRoles = () => {
  try {
    localStorage.removeItem(CUSTOM_ROLES_STORAGE_KEY);
  } catch {
    // ignore
  }
};

/**
 * Menambahkan role login baru secara dinamis (hanya dapat dilakukan oleh Super User di UI,
 * atau dipanggil saat inisialisasi). Role baru otomatis memiliki izin 'edit_data'
 * dan berada di bawah Super User.
 */
export const registerCustomRole = (input: {
  key: string;
  label?: string;
  badge?: string;
  color?: string;
  level?: number;
  permissions?: PermissionKey[];
}): RoleDefinition => {
  const key = normalizeRoleKey(input.key).replace(/\s+/g, "_");
  if (!key || key === "user" || key === "superuser") {
    throw new Error("Nama role tidak valid atau sudah digunakan sistem");
  }

  const label =
    input.label?.trim() ||
    key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const badge =
    input.badge?.trim().toUpperCase().slice(0, 2) ||
    label
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    "RL";

  // Pastikan hanya superuser yang memiliki approve_accounts & manage_roles
  const safePermissions: PermissionKey[] = (
    input.permissions ?? ["edit_data"]
  ).filter((p) => p === "edit_data");

  const definition: RoleDefinition = {
    key,
    label,
    badge,
    color: input.color || "geekblue",
    level: typeof input.level === "number" ? Math.min(90, Math.max(10, input.level)) : 40,
    isAuthenticated: true,
    permissions: safePermissions.length > 0 ? safePermissions : ["edit_data"],
  };

  const existing = getCustomRoles().filter((r) => normalizeRoleKey(r.key) !== key);
  saveCustomRoles([...existing, definition]);
  return definition;
};

export const getAllRoleDefinitions = (): RoleDefinition[] => {
  const custom = getCustomRoles();
  const builtInList = [
    BUILT_IN_ROLES.superuser,
    BUILT_IN_ROLES.supervisor,
    BUILT_IN_ROLES.admin,
    ...custom.filter(
      (c) => !BUILT_IN_ROLES[normalizeRoleKey(c.key)],
    ),
    BUILT_IN_ROLES.user,
  ];
  return builtInList.sort((a, b) => b.level - a.level);
};

export const getAssignableRoles = (): RoleDefinition[] => {
  return getAllRoleDefinitions().filter(
    (r) => r.isAuthenticated && r.key !== "superuser",
  );
};

export const getRoleDefinition = (role?: UserRole | string | null): RoleDefinition => {
  const key = normalizeRoleKey(role);
  if (BUILT_IN_ROLES[key]) {
    return BUILT_IN_ROLES[key];
  }
  const foundCustom = getCustomRoles().find((r) => normalizeRoleKey(r.key) === key);
  if (foundCustom) {
    return foundCustom;
  }
  // Fallback dinamis: jika ada role login baru yang belum terdaftar eksplisit,
  // anggap sebagai role login di bawah admin yang memiliki hak edit data.
  const fallbackLabel = key
    .split(/[_-\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    key,
    label: fallbackLabel || "Staff",
    badge: (fallbackLabel.slice(0, 2) || "ST").toUpperCase(),
    color: "geekblue",
    level: 30,
    isAuthenticated: true,
    permissions: ["edit_data"],
  };
};

export const getRoleLevel = (role?: UserRole | string | null): number =>
  getRoleDefinition(role).level;

export const isAuthenticatedRole = (role?: UserRole | string | null): boolean =>
  getRoleDefinition(role).isAuthenticated;

export const isSuperUser = (role?: UserRole | string | null): boolean =>
  normalizeRoleKey(role) === "superuser";

/**
 * Point 1: Hanya Super User yang dapat menyetujui / menolak pendaftaran akun baru
 */
export const canApproveAccounts = (role?: UserRole | string | null): boolean =>
  isSuperUser(role);

/**
 * Point 2: Hanya Super User yang dapat mengelola role & mengubah level akses akun
 */
export const canManageRoles = (role?: UserRole | string | null): boolean =>
  isSuperUser(role);

export const canAccessNotifications = (role?: UserRole | string | null): boolean =>
  isSuperUser(role);

/**
 * Mengedit data (CRUD barang, edit judul SPB/PO, barang masuk/keluar):
 * Super User, Supervisor, Admin, serta role login tambahan semuanya dapat mengedit.
 */
export const canEditData = (role?: UserRole | string | null): boolean => {
  const def = getRoleDefinition(role);
  return def.isAuthenticated && def.permissions.includes("edit_data");
};

export const canManageBarang = (role?: UserRole | string | null): boolean =>
  canEditData(role);

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const user = getStoredUser();
    const role: UserRole = user?.role ?? "user";

    if (
      resource === "notifications" ||
      resource === "notifikasi" ||
      resource === "account_requests" ||
      resource === "roles"
    ) {
      return {
        can: canAccessNotifications(role),
        reason: "Hanya Super User yang memiliki akses ke halaman Notifikasi & Manajemen Role",
      };
    }

    if (
      resource === "barang" &&
      (action === "create" || action === "edit" || action === "delete")
    ) {
      return {
        can: canEditData(role),
        reason: "Hanya pengguna yang sudah login (Super User, Supervisor, Admin) yang dapat mengelola data barang",
      };
    }

    if (resource === "barang_masuk" || resource === "pengeluaran") {
      return {
        can: canEditData(role),
        reason: "Silakan masuk terlebih dahulu untuk mengakses fitur ini",
      };
    }

    return { can: true };
  },
};