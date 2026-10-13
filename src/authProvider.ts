import type {
  AuthProvider,
  AuthActionResponse,
  CheckResponse,
} from "@refinedev/core";
import { supabaseClient } from "./utility/supabaseClient";
import { USE_MOCK } from "./utility/config";

const MOCK_USER = {
  email: "admin@admin.com",
  password: "admin123",
  name: "Administrator",
};

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
      if (email === MOCK_USER.email && password === MOCK_USER.password) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ email, name: MOCK_USER.name }),
        );
        return { success: true, redirectTo: "/dashboard" };
      }
      return {
        success: false,
        error: {
          name: "LoginError",
          message: "Email atau password salah",
        },
      };
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: { name: "LoginError", message: error.message },
      };
    }
    if (!data?.user) {
      return {
        success: false,
        error: { name: "LoginError", message: "User tidak ditemukan" },
      };
    }
    return { success: true, redirectTo: "/dashboard" };
  },

  logout: async (): Promise<AuthActionResponse> => {
    if (USE_MOCK) {
      localStorage.removeItem(STORAGE_KEY);
      return { success: true, redirectTo: "/login" };
    }
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      return {
        success: false,
        error: { name: "LogoutError", message: error.message },
      };
    }
    return { success: true, redirectTo: "/login" };
  },

  // ⬇️ INI YANG DIPERBAIKI: return type CheckResponse, bukan AuthActionResponse
  check: async (): Promise<CheckResponse> => {
    if (USE_MOCK) {
      const user = getMockUser();
      return user
        ? { authenticated: true }
        : { authenticated: false, redirectTo: "/login", logout: true };
    }
    const { data } = await supabaseClient.auth.getSession();
    return data.session
      ? { authenticated: true }
      : { authenticated: false, redirectTo: "/login", logout: true };
  },

  getIdentity: async () => {
    if (USE_MOCK) {
      const user = getMockUser();
      if (!user) return null;
      return {
        id: "mock-1",
        name: user.name,
        email: user.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.name,
        )}&background=1677ff&color=fff`,
      };
    }
    const { data } = await supabaseClient.auth.getUser();
    if (!data.user) return null;
    return {
      id: data.user.id,
      name: data.user.email?.split("@")[0] ?? "User",
      email: data.user.email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        data.user.email ?? "U",
      )}&background=1677ff&color=fff`,
    };
  },

  getPermissions: async () => ["admin"],

  onError: async (error) => {
    if (error?.statusCode === 401) {
      return { logout: true, redirectTo: "/login", error };
    }
    return { error };
  },
};