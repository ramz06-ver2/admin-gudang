/**
 * @file useAuthGuard.ts
 * @description React hook untuk memverifikasi autentikasi sebelum operasi mutasi.
 *
 * Hook ini menyediakan:
 * 1. Status auth real-time (reactive via event listener)
 * 2. Fungsi guard untuk membungkus mutation callbacks
 * 3. Integrasi dengan Ant Design message untuk feedback UX
 *
 * @example
 * function MyComponent() {
 *   const { isAuthenticated, canEdit, guardMutation } = useAuthGuard();
 *
 *   const handleSave = guardMutation(async (data) => {
 *     await supabaseClient.from('barang').insert(data);
 *   }, { action: 'Simpan barang', permission: 'edit_data' });
 *
 *   return (
 *     <Button onClick={() => handleSave(data)} disabled={!canEdit}>
 *       Simpan
 *     </Button>
 *   );
 * }
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "antd";
import {
  getVerifiedUser,
  AuthenticationError,
  AuthorizationError,
  SessionExpiredError,
  type AuthStatus,
} from "../lib/authGuard";
import { AUTH_CHANGED_EVENT, type StoredAuthUser } from "../../app/providers/authProvider";
import { canEditData } from "../../app/providers/accessControlProvider";
import type { PermissionKey } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GuardMutationOptions {
  /** Deskripsi aksi untuk audit log dan pesan error */
  action?: string;
  /** Permission yang diperlukan (default: cukup login saja) */
  permission?: PermissionKey;
  /** Pesan error kustom jika auth gagal */
  errorMessage?: string;
  /** Redirect ke login jika belum auth (default: true) */
  redirectOnFail?: boolean;
  /** Callback tambahan ketika auth gagal */
  onAuthFailure?: (error: Error) => void;
}

interface UseAuthGuardReturn {
  /** Apakah user sudah login dengan role terautentikasi */
  isAuthenticated: boolean;
  /** Data user saat ini (null jika belum login) */
  user: StoredAuthUser | null;
  /** Apakah user punya izin edit data */
  canEdit: boolean;
  /** Apakah user adalah Super User */
  isSuperUser: boolean;
  /** Status auth lengkap */
  authStatus: AuthStatus;
  /**
   * Membungkus fungsi mutation dengan verifikasi auth.
   * Jika auth gagal, menampilkan pesan error dan tidak menjalankan mutation.
   */
  guardMutation: <TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options?: GuardMutationOptions,
  ) => (...args: TArgs) => Promise<TReturn | undefined>;
  /**
   * Mengecek auth secara manual dan mengembalikan true/false.
   * Menampilkan pesan error jika gagal.
   */
  checkAuth: (options?: GuardMutationOptions) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useAuthGuard = (): UseAuthGuardReturn => {
  const { message: antdMessage } = App.useApp();
  const navigate = useNavigate();

  // State yang reactive terhadap perubahan auth
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => {
    const user = getVerifiedUser();
    return {
      isAuthenticated: !!user,
      user,
      canEdit: user ? canEditData(user.role) : false,
      isSuperUser: user?.role === "superuser",
    };
  });

  // Ref untuk menghindari stale closure di dalam callbacks
  const authStatusRef = useRef(authStatus);
  authStatusRef.current = authStatus;

  // Listen ke perubahan auth (login/logout)
  useEffect(() => {
    const handleAuthChange = () => {
      const user = getVerifiedUser();
      const newStatus: AuthStatus = {
        isAuthenticated: !!user,
        user,
        canEdit: user ? canEditData(user.role) : false,
        isSuperUser: user?.role === "superuser",
      };
      setAuthStatus(newStatus);
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  /**
   * Handle error auth dengan UX yang baik
   */
  const handleAuthError = useCallback(
    (error: Error, options: GuardMutationOptions = {}) => {
      const { redirectOnFail = true, onAuthFailure } = options;

      if (error instanceof AuthenticationError || error instanceof SessionExpiredError) {
        antdMessage.error(
          options.errorMessage ??
            error.message ??
            "Anda harus login terlebih dahulu",
        );

        if (redirectOnFail) {
          // Delay sedikit agar user bisa membaca pesan error
          setTimeout(() => navigate("/login", { replace: true }), 1500);
        }
      } else if (error instanceof AuthorizationError) {
        antdMessage.warning(
          options.errorMessage ??
            error.message ??
            "Anda tidak memiliki izin untuk aksi ini",
        );
      }

      onAuthFailure?.(error);
    },
    [antdMessage, navigate],
  );

  /**
   * Manual auth check dengan feedback UI
   */
  const checkAuth = useCallback(
    (options: GuardMutationOptions = {}): boolean => {
      const user = getVerifiedUser();

      if (!user) {
        handleAuthError(new AuthenticationError(), options);
        return false;
      }

      if (options.permission) {
        const permissionCheckers: Record<string, (role: string) => boolean> = {
          edit_data: canEditData,
        };

        const checker = permissionCheckers[options.permission];
        if (checker && !checker(user.role)) {
          handleAuthError(
            new AuthorizationError(options.permission),
            options,
          );
          return false;
        }
      }

      return true;
    },
    [handleAuthError],
  );

  /**
   * Guard wrapper untuk mutation functions
   */
  const guardMutation = useCallback(
    <TArgs extends unknown[], TReturn>(
      fn: (...args: TArgs) => Promise<TReturn>,
      options: GuardMutationOptions = {},
    ) => {
      return async (...args: TArgs): Promise<TReturn | undefined> => {
        // Verifikasi auth sebelum menjalankan mutation
        if (!checkAuth(options)) {
          return undefined;
        }

        try {
          return await fn(...args);
        } catch (error) {
          // Tangkap error auth yang mungkin terjadi selama operasi
          if (
            error instanceof AuthenticationError ||
            error instanceof AuthorizationError ||
            error instanceof SessionExpiredError
          ) {
            handleAuthError(error, options);
            return undefined;
          }
          // Re-throw error non-auth agar bisa di-handle oleh caller
          throw error;
        }
      };
    },
    [checkAuth, handleAuthError],
  );

  return {
    isAuthenticated: authStatus.isAuthenticated,
    user: authStatus.user,
    canEdit: authStatus.canEdit,
    isSuperUser: authStatus.isSuperUser,
    authStatus,
    guardMutation,
    checkAuth,
  };
};

export default useAuthGuard;

