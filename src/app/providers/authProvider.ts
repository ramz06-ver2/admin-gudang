import type { AuthProvider, AuthActionResponse, CheckResponse } from "@refinedev/core";

// ✅ Path import disesuaikan dengan arsitektur baru (naik 2 tingkat ke shared/lib)
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { USE_MOCK } from "../../shared/lib/config";

const STORAGE_KEY = "mock-auth-user";

const getMockUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const authProvider: AuthProvider = {
  login: async ({ email, password }): Promise<AuthActionResponse> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      if (email === "admin@admin.com" && password === "admin123") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, name: "Administrator", role: "admin" }));
        return { success: true, redirectTo: "/dashboard" };
      }
      return { success: false, error: { name: "LoginError", message: "Email/password salah" } };
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error || !data?.user) {
      return { success: false, error: { name: "LoginError", message: error?.message || "User tidak ditemukan" } };
    }
    return { success: true, redirectTo: "/dashboard" };
  },

  logout: async (): Promise<AuthActionResponse> => {
    if (USE_MOCK) {
      localStorage.removeItem(STORAGE_KEY);
      return { success: true, redirectTo: "/dashboard" };
    }
    await supabaseClient.auth.signOut();
    return { success: true, redirectTo: "/dashboard" };
  },

  // ✅ PERBAIKAN: Tidak lagi di-hardcode true. Wajib cek session untuk rute admin.
  check: async (): Promise<CheckResponse> => {
    if (USE_MOCK) {
      return { authenticated: !!getMockUser(), redirectTo: "/login" };
    }
    const { data } = await supabaseClient.auth.getSession();
    return { 
      authenticated: !!data.session, 
      redirectTo: "/login" 
    };
  },

  getIdentity: async () => {
    if (USE_MOCK) {
      const user = getMockUser();
      return user 
        ? { id: "admin-1", name: user.name, email: user.email, role: "admin" }
        : { id: "public-user", name: "User (Public)", email: "", role: "user" };
    }
    const { data } = await supabaseClient.auth.getUser();
    if (data?.user) {
      return { id: data.user.id, name: data.user.email?.split("@")[0] ?? "Admin", email: data.user.email, role: "admin" };
    }
    return { id: "public-user", name: "User (Public)", email: "", role: "user" };
  },

  getPermissions: async () => {
    if (USE_MOCK) return getMockUser() ? ["admin"] : ["user"];
    const { data } = await supabaseClient.auth.getSession();
    return data.session ? ["admin"] : ["user"];
  },

  onError: async (error) => ({ error }),
};