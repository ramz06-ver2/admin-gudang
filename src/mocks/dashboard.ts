import type { DashboardStats } from "../types";
import { mockProducts, mockLowStockProducts } from "./products";
import { getMockTodayInbound } from "./stockEntries";

export const getMockDashboardStats = (): DashboardStats => {
  const totalProducts = mockProducts.length;
  const totalStock = mockProducts.reduce((sum, p) => sum + p.stock, 0);
  const todayInbound = getMockTodayInbound();
  const lowStockCount = mockLowStockProducts.length;

  return { totalProducts, totalStock, todayInbound, lowStockCount };
};