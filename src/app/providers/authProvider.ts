import type { AuthProvider, AuthActionResponse, CheckResponse } from "@refinedev/core";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { USE_MOCK } from "../../shared/lib/config";
import type { UserRole } from "../../shared/types";
import {
  findAccountRequestByEmail,
  registerAccountRequest,
} from "../../features/auth/accountRequests";

export const STORAGE_KEY = "mock-auth-user";

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
  } catch {
    // ignore
  }
};

export const authProvider: AuthProvider = {
  login: async ({ email, password }): Promise<AuthActionResponse> => {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    // 1. Cek apakah akun berasal dari alur pendaftaran user -> notifikasi super user
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
          setStoredUser({
            id: accountReq.id,
            email: accountReq.email,
            name: accountReq.name,
            role: "admin",
          });
          return { success: true, redirectTo: "/dashboard" };
        }
        return {
          success: false,
          error: { name: "LoginError", message: "Email/password salah" },
        };
      }
    }

    // 2. Akun bawaan Super User & Admin
    if (normalizedEmail === "superuser@admin.com" && password === "super123") {
      setStoredUser({
        id: "superuser-1",
        email: normalizedEmail,
        name: "Super User",
        role: "superuser",
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

    const metaRole = (data.user as any)?.user_metadata?.role as UserRole | undefined;
    const resolvedRole: UserRole =
      metaRole === "superuser" || normalizedEmail.startsWith("superuser@")
        ? "superuser"
        : "admin";

    setStoredUser({
      id: data.user.id,
      email: data.user.email || normalizedEmail,
      name: data.user.email?.split("@")[0] ?? "Admin",
      role: resolvedRole,
    });

    return { success: true, redirectTo: "/dashboard" };
  },

  register: async ({ name, email, password }): Promise<AuthActionResponse> => {
    try {
      await registerAccountRequest({
        name: name || String(email || "").split("@")[0] || "Calon Admin",
        email,
        password,
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
    if (stored && (stored.role === "admin" || stored.role === "superuser")) {
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
      return {
        id: stored.id || (stored.role === "superuser" ? "superuser-1" : "admin-1"),
        name: stored.name,
        email: stored.email,
        role: stored.role,
      };
    }
    if (!USE_MOCK) {
      const { data } = await supabaseClient.auth.getUser();
      if (data?.user) {
        const email = data.user.email || "";
        const metaRole = (data.user as any)?.user_metadata?.role as UserRole | undefined;
        const role: UserRole =
          metaRole === "superuser" || email.toLowerCase().startsWith("superuser@")
            ? "superuser"
            : "admin";
        return {
          id: data.user.id,
          name: email.split("@")[0] || (role === "superuser" ? "Super User" : "Admin"),
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
