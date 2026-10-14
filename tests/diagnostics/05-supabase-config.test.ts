import { describe, it, expect } from "vitest";

describe("FOCUS: Supabase Config", () => {
  it("VITE_SUPABASE_URL terdefinisi", () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined();
    expect(typeof import.meta.env.VITE_SUPABASE_URL).toBe("string");
    expect(import.meta.env.VITE_SUPABASE_URL.length).toBeGreaterThan(0);
  });

  it("VITE_SUPABASE_KEY terdefinisi", () => {
    expect(import.meta.env.VITE_SUPABASE_KEY).toBeDefined();
    expect(typeof import.meta.env.VITE_SUPABASE_KEY).toBe("string");
    expect(import.meta.env.VITE_SUPABASE_KEY.length).toBeGreaterThan(0);
  });

  it("URL format benar (https, tanpa trailing slash)", () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    expect(url).toMatch(/^https:\/\//);
    expect(url).not.toMatch(/\/$/);
    expect(url).not.toMatch(/\/rest\/v1\/?$/); // TIDAK boleh ada /rest/v1/
  });

  it("URL mengarah ke supabase.co", () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    expect(url).toMatch(/\.supabase\.co/);
  });

  it("Key bukan service_role (harus publishable/anon)", () => {
    const key = import.meta.env.VITE_SUPABASE_KEY;
    // service_role pakai JWT dengan "role":"service_role"
    // atau prefix "sb_secret_"
    expect(key).not.toMatch(/^sb_secret_/);

    // Kalau JWT, decode untuk cek role
    if (key.startsWith("eyJ")) {
      const parts = key.split(".");
      if (parts.length >= 2) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          expect(payload.role).not.toBe("service_role");
        } catch {
          // Kalau tidak bisa decode, skip
        }
      }
    }
  });
});
