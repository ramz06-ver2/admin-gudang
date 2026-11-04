import { describe, it, expect, beforeEach } from "vitest";
import {
  filterVisibleSpbRows,
  isRestrictedSpbStatus,
  toSafeExternalUrl,
  canViewRestrictedSpb,
} from "@/features/spb/accessRules";
import { STORAGE_KEY } from "@/app/providers/authProvider";

describe("accessRules - SPB 'belum di proses'", () => {
  beforeEach(() => localStorage.clear());

  it("mengenali status terbatas (trim + case-insensitive)", () => {
    expect(isRestrictedSpbStatus("belum di proses")).toBe(true);
    expect(isRestrictedSpbStatus("  Belum Di Proses ")).toBe(true);
    expect(isRestrictedSpbStatus("sudah di proses")).toBe(false);
    expect(isRestrictedSpbStatus(null)).toBe(false);
  });

  it("user belum login tidak menerima baris 'belum di proses'", () => {
    const rows = [
      { id: 1, status: "belum di proses" },
      { id: 2, status: "sudah di proses" },
      { id: 3, status: null },
    ];
    expect(filterVisibleSpbRows(rows, false).map((r) => r.id)).toEqual([2, 3]);
  });

  it("user login menerima semua baris", () => {
    const rows = [{ id: 1, status: "belum di proses" }, { id: 2, status: "x" }];
    expect(filterVisibleSpbRows(rows, true)).toHaveLength(2);
  });

  it("canViewRestrictedSpb mengikuti status login", () => {
    expect(canViewRestrictedSpb()).toBe(false);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: "1", email: "a@a.com", name: "A", role: "admin" }),
    );
    expect(canViewRestrictedSpb()).toBe(true);
  });
});

describe("toSafeExternalUrl", () => {
  it("menerima https (mis. Google Drive)", () => {
    expect(toSafeExternalUrl("https://drive.google.com/file/d/abc/view")).toBe(
      "https://drive.google.com/file/d/abc/view",
    );
  });

  it("menolak skema berbahaya & nilai kosong", () => {
    expect(toSafeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(toSafeExternalUrl("data:text/html,<script>")).toBeNull();
    expect(toSafeExternalUrl("http://insecure.example.com")).toBeNull();
    expect(toSafeExternalUrl("bukan url")).toBeNull();
    expect(toSafeExternalUrl("")).toBeNull();
    expect(toSafeExternalUrl(null)).toBeNull();
  });
});

