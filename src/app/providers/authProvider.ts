import type { AuthProvider, AuthActionResponse, CheckResponse } from "@refinedev/core";
import type { User } from "@supabase/supabase-js";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import type { UserRole } from "../../shared/types";
import { registerAccountRequest } from "../../features/auth/accountRequests";
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

/**
 * Cache identitas untuk render UI yang sinkron. BUKAN sumber kebenaran:
 * sumber kebenaran adalah sesi Supabase (JWT) dan RLS di database.
 * Cache dibersihkan otomatis saat sesi berakhir (lihat initAuthSync).
 */
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

/**
 * Role HANYA dibaca dari `app_metadata` — field ini hanya bisa diubah server
 * (service role / RPC superuser), tidak bisa diubah user dari browser.
 * `user_metadata` sengaja TIDAK dipakai karena dapat dimodifikasi user sendiri.
 *
 * @returns role terautentikasi, atau null jika belum disetujui / tidak valid.
 */
export const resolveRoleFromSupabaseUser = (
  user: Pick<User, "app_metadata"> | null | undefined,
): UserRole | null => {
  const raw = user?.app_metadata?.role;
  if (typeof raw !== "string") return null;
  const key = normalizeRoleKey(raw);
  return isAuthenticatedRole(key) ? key : null;
};

const toStoredUser = (user: User, role: UserRole): StoredAuthUser => {
  const email = user.email ?? "";
  const metaName = user.user_metadata?.name;
  return {
    id: user.id,
    email,
    name:
      typeof metaName === "string" && metaName.trim()
        ? metaName.trim()
        : email.split("@")[0] || getRoleDefinition(role).label,
    role,
  };
};

const sameStoredUser = (a: StoredAuthUser | null, b: StoredAuthUser) =>
  !!a && a.id === b.id && a.email === b.email && a.name === b.name && a.role === b.role;

/**
 * Menjaga cache identitas selalu sejalan dengan sesi Supabase: dibersihkan saat
 * logout / token kedaluwarsa, dan diperbarui saat sesi/role berubah.
 */
let authSyncInitialized = false;
export const initAuthSync = () => {
  if (authSyncInitialized || typeof window === "undefined") return;
  authSyncInitialized = true;
  try {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      const role = resolveRoleFromSupabaseUser(session?.user);
      if (!session?.user || !role) {
        if (getStoredUser()) setStoredUser(null);
        return;
      }
      const next = toStoredUser(session.user, role);
      if (!sameStoredUser(getStoredUser(), next)) setStoredUser(next);
    });
  } catch {
    // klien auth tidak tersedia (mis. lingkungan test tanpa auth) -> lewati
  }
};

initAuthSync();

const loginError = (message: string): AuthActionResponse => ({
  success: false,
  error: { name: "LoginError", message },
});

export const authProvider: AuthProvider = {
  login: async ({ email, password }): Promise<AuthActionResponse> => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return loginError("Email dan password wajib diisi");
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    // Pesan generik: tidak membocorkan apakah email terdaftar atau tidak.
    if (error || !data?.user) {
      return loginError("Email atau password salah");
    }

    const role = resolveRoleFromSupabaseUser(data.user);
    if (!role) {
      // Akun ada tapi belum disetujui / belum diberi role -> jangan biarkan sesi aktif.
      await supabaseClient.auth.signOut();
      setStoredUser(null);
      return loginError(
        "Akun Anda masih menunggu persetujuan Super User atau belum diberi role. Hubungi Super User.",
      );
    }

    setStoredUser(toStoredUser(data.user, role));
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
      return { success: true, redirectTo: "/login" };
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
    try {
      await supabaseClient.auth.signOut();
    } catch {
      // sesi lokal sudah dibersihkan
    }
    return { success: true, redirectTo: "/dashboard" };
  },

  check: async (): Promise<CheckResponse> => {
    const { data } = await supabaseClient.auth.getSession();
    const user = data?.session?.user;
    const role = resolveRoleFromSupabaseUser(user);

    if (!user || !role) {
      if (getStoredUser()) setStoredUser(null);
      return { authenticated: false, redirectTo: "/login" };
    }

    const next = toStoredUser(user, role);
    if (!sameStoredUser(getStoredUser(), next)) setStoredUser(next);
    return { authenticated: true };
  },

  getIdentity: async () => {
    const { data } = await supabaseClient.auth.getSession();
    const user = data?.session?.user;
    const role = resolveRoleFromSupabaseUser(user);

    if (user && role) {
      const stored = toStoredUser(user, role);
      return { id: stored.id, name: stored.name, email: stored.email, role };
    }

    return {
      id: "public-user",
      name: "User (Public)",
      email: "",
      role: "user" as UserRole,
    };
  },

  getPermissions: async () => {
    const { data } = await supabaseClient.auth.getSession();
    const role = resolveRoleFromSupabaseUser(data?.session?.user);
    return [role ?? "user"];
  },

  onError: async (error) => {
    // Sesi tidak valid / kedaluwarsa (401) -> paksa logout & kembali ke login.
    const status = (error as any)?.status ?? (error as any)?.statusCode;
    if (status === 401) {
      return { logout: true, redirectTo: "/login", error };
    }
    return { error };
  },
};
