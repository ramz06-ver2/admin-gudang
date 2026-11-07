import { QueryClient, type DefaultOptions } from "@tanstack/react-query";

/**
 * Konfigurasi default TanStack Query berstandar enterprise untuk aplikasi gudang:
 * - `staleTime: 60_000` (1 menit): mencegah refetch berulang setiap komponen mount.
 * - `cacheTime: 5 * 60_000` (5 menit): menyimpan data di memori saat berpindah halaman.
 * - `refetchOnWindowFocus: false`: mencegah badai request (network amplifier) saat tablet/browser lock-unlock atau pindah tab.
 * - `refetchOnReconnect: true`: sinkronisasi ulang otomatis saat koneksi kembali aktif.
 * - `retry: 1`: batasi retry maksimal 1x agar tidak membebani jaringan jika server/Supabase sedang gangguan.
 */
export const DEFAULT_QUERY_OPTIONS: DefaultOptions = {
  queries: {
    staleTime: 60_000,
    cacheTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
  },
  mutations: {
    retry: 0,
  },
};

export const createAppQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: DEFAULT_QUERY_OPTIONS,
  });

export const appQueryClient = createAppQueryClient();

