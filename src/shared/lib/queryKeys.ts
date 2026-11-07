import type { QueryClient } from "@tanstack/react-query";

/**
 * Durasi `staleTime` terstandarisasi untuk setiap domain query.
 */
export const STALE_TIMES = {
  PRODUCTS: 2 * 60_000, // 2 menit
  PRODUCT_SEARCH: 30_000, // 30 detik
  LOW_STOCK: 60_000, // 1 menit
  STOCK_IN_CHART: 5 * 60_000, // 5 menit (grafik historis 30 hari)
  DASHBOARD_STATS: 30_000, // 30 detik (dipasangkan dengan refetchInterval: 60_000)
  STOCK_EXITS: 15_000, // 15 detik (dipasangkan dengan refetchInterval: 30_000)
  PERSONS: 5 * 60_000, // 5 menit (data master pekerja jarang berubah)
  MONITORING_SPB: 5 * 60_000, // 5 menit (ribuan baris dokumen SPB/PO/SJ)
  MONITORING_SPB_DETAIL: 2 * 60_000, // 2 menit
  SPB_ITEM: 2 * 60_000, // 2 menit
  SPB_ANALYTICS: 5 * 60_000, // 5 menit (sinkron dengan SPB_STATUS_CACHE_TTL_MS)
} as const;

/**
 * Registri terpusat seluruh Query Keys aplikasi agar konsisten antara hook dan invalidasi.
 */
export const QUERY_KEYS = {
  productsAll: ["products"] as const,
  products: (category?: string) => ["products", category ?? "all"] as const,

  productSearchAll: ["product-search"] as const,
  productSearch: (keyword: string, limit: number) =>
    ["product-search", keyword, limit] as const,

  lowStockAll: ["low-stock"] as const,
  lowStock: (limit: number) => ["low-stock", limit] as const,

  dashboardStats: ["dashboard-stats"] as const,

  stockInChartAll: ["stock-in-chart"] as const,
  stockInChart: (days: number) => ["stock-in-chart", days] as const,

  stockExitsAll: ["stock-exits"] as const,
  stockExits: (
    onlyToday: boolean,
    breakdown: boolean | undefined,
    limit: number,
  ) => ["stock-exits", onlyToday, breakdown, limit] as const,

  persons: ["persons"] as const,

  monitoringSpbAll: ["monitoring-spb"] as const,
  monitoringSpb: (canViewRestricted: boolean) =>
    ["monitoring-spb", canViewRestricted] as const,

  monitoringSpbDetailAll: ["monitoring-spb-detail"] as const,
  monitoringSpbDetail: (
    spbNo: string | null,
    poNo: string | null,
    sjNo: string | null,
    judulSpb: string | null,
    canViewRestricted: boolean,
  ) =>
    [
      "monitoring-spb-detail",
      spbNo,
      poNo,
      sjNo,
      judulSpb,
      canViewRestricted,
    ] as const,

  spbItemAll: ["spb-item"] as const,
  spbItem: (id: string | undefined, type: string) =>
    ["spb-item", id, type] as const,

  spbItemDetailAll: ["spb-item-detail"] as const,
  spbItemDetail: (itemId: string | null) =>
    ["spb-item-detail", itemId] as const,

  spbAnalyticsAll: ["spb-analytics"] as const,
  spbAnalytics: (canViewRestricted: boolean) =>
    ["spb-analytics", canViewRestricted] as const,
} as const;

export type MutationDomainEvent =
  | "stock-out"
  | "stock-in"
  | "product-create"
  | "product-update"
  | "product-delete"
  | "spb-update";

/**
 * Peta invalidasi lintas fitur yang terpusat (atomic cross-feature cache invalidation).
 */
export const MUTATION_INVALIDATION_MAP: Record<
  MutationDomainEvent,
  readonly (readonly unknown[])[]
> = {
  "stock-out": [
    QUERY_KEYS.productsAll,
    QUERY_KEYS.productSearchAll,
    QUERY_KEYS.lowStockAll,
    QUERY_KEYS.stockExitsAll,
    QUERY_KEYS.dashboardStats,
  ],
  "stock-in": [
    QUERY_KEYS.productsAll,
    QUERY_KEYS.productSearchAll,
    QUERY_KEYS.lowStockAll,
    QUERY_KEYS.stockInChartAll,
    QUERY_KEYS.dashboardStats,
  ],
  "product-create": [
    QUERY_KEYS.productsAll,
    QUERY_KEYS.productSearchAll,
    QUERY_KEYS.lowStockAll,
    QUERY_KEYS.dashboardStats,
  ],
  "product-update": [
    QUERY_KEYS.productsAll,
    QUERY_KEYS.productSearchAll,
    QUERY_KEYS.lowStockAll,
    QUERY_KEYS.dashboardStats,
  ],
  "product-delete": [
    QUERY_KEYS.productsAll,
    QUERY_KEYS.productSearchAll,
    QUERY_KEYS.lowStockAll,
    QUERY_KEYS.dashboardStats,
  ],
  "spb-update": [
    QUERY_KEYS.monitoringSpbAll,
    QUERY_KEYS.monitoringSpbDetailAll,
    QUERY_KEYS.spbItemAll,
    QUERY_KEYS.spbItemDetailAll,
    QUERY_KEYS.spbAnalyticsAll,
  ],
};

/**
 * Meng-invalidate seluruh query lintas fitur yang terdampak oleh suatu mutasi secara terpusat.
 */
export const invalidateOnMutation = async (
  queryClient: QueryClient,
  event: MutationDomainEvent,
  onBeforeInvalidate?: () => void,
): Promise<void> => {
  onBeforeInvalidate?.();
  const targetKeys = MUTATION_INVALIDATION_MAP[event] ?? [];
  await Promise.all(
    targetKeys.map((key) =>
      queryClient.invalidateQueries({ queryKey: [...key] }),
    ),
  );
};

