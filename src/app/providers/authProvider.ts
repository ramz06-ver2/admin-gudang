import type { AuthProvider, AuthActionResponse, CheckResponse } from "@refinedev/core";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { USE_MOCK } from "../../shared/lib/config";
import type { UserRole } from "../../shared/types";
import {
  findAccountRequestByEmail,
  registerAccountRequest,
} from "../../features/auth/accountRequests";
import {
  getRoleDefinition,
  isAuthenticatedRole,
  normalizeRoleKey,
} from "./accessControlProvider";

export const STORAGE_KEY = "mock-auth-user";
export const AUTH_CHANGED_EVENT = "auth-user-changed";

export interface StoredAuthUser {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
}

export const getStoredUser = (): StoredAuthUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: StoredAuthUser | null) => {
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    }
  } catch {
    // ignore
  }
};

const resolveRoleFromSupabaseUser = (user: any, fallbackEmail: string): UserRole => {
  const metaRole = user?.user_metadata?.role as string | undefined;
  if (metaRole && normalizeRoleKey(metaRole) !== "user") {
    return normalizeRoleKey(metaRole);
  }
  const lower = fallbackEmail.toLowerCase();
  if (lower.startsWith("superuser@")) return "superuser";
  if (lower.startsWith("supervisor@")) return "supervisor";
  return "admin";
};

export const authProvider: AuthProvider = {
  login: async ({ email, password }): Promise<AuthActionResponse> => {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const accountReq = findAccountRequestByEmail(normalizedEmail);
    if (accountReq) {
      if (accountReq.status === "pending") {
        return {
          success: false,
          error: {
            name: "LoginError",
            message: "Akun Anda masih menunggu persetujuan Super User",
          },
        };
      }
      if (accountReq.status === "rejected") {
        return {
          success: false,
          error: {
            name: "LoginError",
            message: "Pendaftaran akun Anda tidak diizinkan oleh Super User",
          },
        };
      }
      if (accountReq.status === "approved") {
        if (!accountReq.password || accountReq.password === password) {
          const assignedRole: UserRole =
            accountReq.role && normalizeRoleKey(accountReq.role) !== "user"
              ? normalizeRoleKey(accountReq.role)
              : "admin";
          setStoredUser({
            id: accountReq.id,
            email: accountReq.email,
            name: accountReq.name,
            role: assignedRole,
          });
          return { success: true, redirectTo: "/dashboard" };
        }
        return {
          success: false,
          error: { name: "LoginError", message: "Email/password salah" },
        };
      }
    }

    if (normalizedEmail === "superuser@admin.com" && password === "super123") {
      setStoredUser({
        id: "superuser-1",
        email: normalizedEmail,
        name: "Super User",
        role: "superuser",
      });
      return { success: true, redirectTo: "/dashboard" };
    }

    if (
      normalizedEmail === "supervisor@admin.com" &&
      (password === "superv123" || password === "supervisor123")
    ) {
      setStoredUser({
        id: "supervisor-1",
        email: normalizedEmail,
        name: "Supervisor",
        role: "supervisor",
      });
      return { success: true, redirectTo: "/dashboard" };
    }

    if (normalizedEmail === "admin@admin.com" && password === "admin123") {
      setStoredUser({
        id: "admin-1",
        email: normalizedEmail,
        name: "Administrator",
        role: "admin",
      });
      return { success: true, redirectTo: "/dashboard" };
    }

    if (USE_MOCK) {
      return {
        success: false,
        error: { name: "LoginError", message: "Email/password salah" },
      };
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data?.user) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: error?.message || "User tidak ditemukan",
        },
      };
    }

    const resolvedRole = resolveRoleFromSupabaseUser(data.user, normalizedEmail);
    const roleDef = getRoleDefinition(resolvedRole);

    setStoredUser({
      id: data.user.id,
      email: data.user.email || normalizedEmail,
      name: data.user.email?.split("@")[0] ?? roleDef.label,
      role: resolvedRole,
    });

    return { success: true, redirectTo: "/dashboard" };
  },

  register: async ({ name, email, password, role }: any): Promise<AuthActionResponse> => {
    try {
      await registerAccountRequest({
        name: name || String(email || "").split("@")[0] || "Calon Pengguna",
        email,
        password,
        role: role || "admin",
      });
      return {
        success: true,
        redirectTo: "/login",
      };
    } catch (err) {
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: (err as Error)?.message || "Gagal mendaftarkan akun",
        },
      };
    }
  },

  logout: async (): Promise<AuthActionResponse> => {
    // 🔧 PERBAIKAN: Hapus state filter & urutan SPB dari localStorage saat logout
    localStorage.removeItem("spb_filter");
    localStorage.removeItem("spb_searchTerm");
    localStorage.removeItem("spb_searchMode");
    localStorage.removeItem("spb_sortBy");

    setStoredUser(null);
    if (!USE_MOCK) {
      try {
        await supabaseClient.auth.signOut();
      } catch {
        // ignore
      }
    }
    return { success: true, redirectTo: "/dashboard" };
  },

  check: async (): Promise<CheckResponse> => {
    const stored = getStoredUser();
    if (stored && isAuthenticatedRole(stored.role)) {
      return { authenticated: true };
    }
    if (USE_MOCK) {
      return { authenticated: false, redirectTo: "/login" };
    }
    const { data } = await supabaseClient.auth.getSession();
    return {
      authenticated: !!data?.session,
      redirectTo: "/login",
    };
  },

  getIdentity: async () => {
    const stored = getStoredUser();
    if (stored) {
      const def = getRoleDefinition(stored.role);
      return {
        id: stored.id || `${def.key}-1`,
        name: stored.name,
        email: stored.email,
        role: stored.role,
      };
    }
    if (!USE_MOCK) {
      const { data } = await supabaseClient.auth.getUser();
      if (data?.user) {
        const email = data.user.email || "";
        const role = resolveRoleFromSupabaseUser(data.user, email);
        const def = getRoleDefinition(role);
        return {
          id: data.user.id,
          name: email.split("@")[0] || def.label,
          email,
          role,
        };
      }
    }
    return {
      id: "public-user",
      name: "User (Public)",
      email: "",
      role: "user" as UserRole,
    };
  },

  getPermissions: async () => {
    const stored = getStoredUser();
    if (stored) return [stored.role];
    if (!USE_MOCK) {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session) return ["admin"];
    }
    return ["user"];
  },

  onError: async (error) => ({ error }),
};