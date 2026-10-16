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
          JSON.stringify({ email, name: MOCK_USER.name, role: "admin" }),
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
      return { success: true, redirectTo: "/dashboard" };
    }
    await supabaseClient.auth.signOut();
    return { success: true, redirectTo: "/dashboard" };
  },

  // ✅ Selalu izinkan akses agar User (Public) bisa melihat stok tanpa harus login
  check: async (): Promise<CheckResponse> => {
    return { authenticated: true };
  },

  getIdentity: async () => {
    if (USE_MOCK) {
      const user = getMockUser();
      if (user) {
        return {
          id: "admin-1",
          name: user.name,
          email: user.email,
          role: "admin",
        };
      }
      return {
        id: "public-user",
        name: "User (Public)",
        email: "",
        role: "user",
      };
    }

    const { data } = await supabaseClient.auth.getUser();
    if (data?.user) {
      return {
        id: data.user.id,
        name: data.user.email?.split("@")[0] ?? "Admin",
        email: data.user.email,
        role: "admin",
      };
    }

    return {
      id: "public-user",
      name: "User (Public)",
      email: "",
      role: "user",
    };
  },

  getPermissions: async () => {
    if (USE_MOCK) {
      const user = getMockUser();
      return user ? ["admin"] : ["user"];
    }
    const { data } = await supabaseClient.auth.getSession();
    return data.session ? ["admin"] : ["user"];
  },

  onError: async (error) => {
    return { error };
  },
};