import { describe, it, expect, beforeEach } from "vitest";
import {
  requireAuth,
  requirePermission,
  getAuthStatus,
  clearAuditLogs,
  getAuditLogs,
  AuthenticationError,
  AuthorizationError,
} from "../../../src/shared/lib/authGuard";
import { STORAGE_KEY } from "../../../src/app/providers/authProvider";

const login = (role: string) =>
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: "u1", email: `${role}@x.com`, name: role, role }),
  );

describe("authGuard", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuditLogs();
  });

  it("menolak user yang belum login", () => {
    expect(() => requireAuth("test")).toThrow(AuthenticationError);
    expect(getAuditLogs()[0]).toMatchObject({ result: "denied" });
  });

  it("menolak role publik 'user'", () => {
    login("user");
    expect(() => requireAuth()).toThrow(AuthenticationError);
  });

  it("menolak data session yang korup", () => {
    localStorage.setItem(STORAGE_KEY, "{bukan-json");
    expect(() => requireAuth()).toThrow(AuthenticationError);
  });

  it("mengizinkan admin untuk edit_data", () => {
    login("admin");
    expect(requirePermission("edit_data").role).toBe("admin");
  });

  it("menolak admin untuk approve_accounts (403)", () => {
    login("admin");
    expect(() => requirePermission("approve_accounts")).toThrow(AuthorizationError);
  });

  it("mengizinkan superuser untuk approve_accounts & manage_roles", () => {
    login("superuser");
    expect(() => requirePermission("approve_accounts")).not.toThrow();
    expect(() => requirePermission("manage_roles")).not.toThrow();
  });

  it("getAuthStatus mencerminkan state", () => {
    expect(getAuthStatus().isAuthenticated).toBe(false);
    login("supervisor");
    expect(getAuthStatus()).toMatchObject({ isAuthenticated: true, canEdit: true });
  });
});

