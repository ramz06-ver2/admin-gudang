import type { AccessControlProvider } from "@refinedev/core";
import type { UserRole } from "../../shared/types";
import { getStoredUser } from "./authProvider";

export const canManageBarang = (role?: UserRole | string | null): boolean =>
  role === "admin" || role === "superuser";

export const canAccessNotifications = (role?: UserRole | string | null): boolean =>
  role === "superuser";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const user = getStoredUser();
    const role: UserRole = user?.role ?? "user";

    if (resource === "notifications" || resource === "notifikasi") {
      return {
        can: canAccessNotifications(role),
        reason: "Hanya Super User yang memiliki akses ke halaman Notifikasi",
      };
    }

    if (
      resource === "barang" &&
      (action === "create" || action === "edit" || action === "delete")
    ) {
      return {
        can: canManageBarang(role),
        reason: "Hanya Admin dan Super User yang dapat mengelola data barang",
      };
    }

    if (resource === "barang_masuk" || resource === "pengeluaran") {
      return {
        can: canManageBarang(role),
        reason: "Silakan masuk sebagai Admin atau Super User",
      };
    }

    return { can: true };
  },
};
