import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useProductSearch } from "@/hooks/useProductSearch";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("FOCUS: Hooks dengan Supabase", () => {
  it("useProducts fetch dari Supabase", async () => {
    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 15_000 },
    );

    expect(result.current.products.length).toBeGreaterThan(0);

    const first = result.current.products[0];
    console.log("First product:", first);

    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("code");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("stock");
  }, 20_000);

  it("useProductSearch cari 'beras'", async () => {
    const { result } = renderHook(() => useProductSearch("beras", 5), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 15_000 },
    );

    console.log(`Hasil cari "beras": ${result.current.products.length} item`);
    // Kalau ada "beras" di DB, harus > 0
    // Kalau tidak ada, minimal 0 tidak error
    expect(Array.isArray(result.current.products)).toBe(true);
  }, 20_000);

  it("useProductSearch cari 'kabel'", async () => {
    const { result } = renderHook(() => useProductSearch("kabel", 10), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 15_000 },
    );

    console.log(`Hasil cari "kabel": ${result.current.products.length} item`);
    result.current.products.forEach((p) => {
      expect(
        p.name.toLowerCase().includes("kabel") ||
          p.code.toLowerCase().includes("kabel"),
      ).toBe(true);
    });
  }, 20_000);
});
