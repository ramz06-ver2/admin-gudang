import type { AuthProvider, AuthActionResponse, CheckResponse } from "@refinedev/core";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import type { UserRole } from "../../shared/types";
import { registerAccountRequest } from "../../features/auth/accountRequests";
import {
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
    if (!user) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  } catch {}
};

// Mengambil role dari tabel public.profiles
const fetchRoleFromProfile = async (userId: string): Promise<UserRole | null> => {
  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (error || !data || !data.role) return null;
    const roleKey = normalizeRoleKey(data.role);
    return isAuthenticatedRole(roleKey) ? roleKey : null;
  } catch {
    return null;
  }
};

// Mengambil nama tampilan dari user_metadata (atau fallback ke prefix email)
const resolveDisplayName = (user: any, fallback = "User"): string => {
  const metaName =
    typeof user?.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "";
  if (metaName) return metaName;
  if (typeof user?.email === "string" && user.email.includes("@")) {
    return user.email.split("@")[0];
  }
  return fallback;
};

// Mengubah username menjadi format email dummy
const formatUsernameToEmail = (input: string) => {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@admin.com`;
};

const loginError = (message: string): AuthActionResponse => ({
  success: false,
  error: { name: "LoginError", message },
});

export const authProvider: AuthProvider = {
  // Terima 'email' atau 'username' agar kompatibel dengan test & UI
  login: async ({ email, username, password }): Promise<AuthActionResponse> => {
    const loginInput = username || email;

    if (!loginInput || !password) return loginError("Username dan password wajib diisi");

    const loginEmail = formatUsernameToEmail(loginInput);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error || !data?.user) return loginError("Username atau password salah");

    const role = await fetchRoleFromProfile(data.user.id);

    if (!role) {
      await supabaseClient.auth.signOut();
      setStoredUser(null);
      return loginError("Akun Anda masih menunggu persetujuan Super User atau belum diberi role.");
    }

    setStoredUser({
      id: data.user.id,
      email: data.user.email || loginEmail,
      name: resolveDisplayName(data.user, loginInput),
      role,
    });

    return { success: true, redirectTo: "/dashboard" };
  },

  register: async ({ name, email, password, role }: any): Promise<AuthActionResponse> => {
    try {
      await registerAccountRequest({ name, email, password, role });
      return { success: true, redirectTo: "/login" };
    } catch (err) {
      return {
        success: false,
        error: { name: "RegisterError", message: (err as Error)?.message || "Gagal mendaftar" },
      };
    }
  },

  logout: async (): Promise<AuthActionResponse> => {
    setStoredUser(null);
    try { await supabaseClient.auth.signOut(); } catch {}
    return { success: true, redirectTo: "/dashboard" };
  },

  check: async (): Promise<CheckResponse> => {
    const { data } = await supabaseClient.auth.getSession();
    const user = data?.session?.user;

    if (!user) {
      if (getStoredUser()) setStoredUser(null);
      return { authenticated: false, redirectTo: "/login" };
    }

    const role = await fetchRoleFromProfile(user.id);
    if (!role) {
      if (getStoredUser()) setStoredUser(null);
      return { authenticated: false, redirectTo: "/login" };
    }

    setStoredUser({
      id: user.id,
      email: user.email || "",
      name: resolveDisplayName(user, "User"),
      role,
    });
    return { authenticated: true };
  },

  getIdentity: async () => {
    const { data } = await supabaseClient.auth.getSession();
    const user = data?.session?.user;

    if (user) {
      const role = await fetchRoleFromProfile(user.id);
      if (role) {
        return {
          id: user.id,
          name: resolveDisplayName(user, "User"),
          email: user.email,
          role,
        };
      }
    }
    return { id: "public", name: "Public User", email: "", role: "user" as UserRole };
  },

  getPermissions: async () => {
    const { data } = await supabaseClient.auth.getSession();
    const user = data?.session?.user;
    if (user) {
      const role = await fetchRoleFromProfile(user.id);
      return [role ?? "user"];
    }
    return ["user"];
  },

  onError: async (error) => ({ error }),
};