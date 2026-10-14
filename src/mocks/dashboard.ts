import type { DashboardStats } from "../types";
import { mockProducts } from "./products";
import { getMockTodayInbound } from "./stockEntries";
import { mockStockExits } from "./stockExitList";

export const getMockDashboardStats = (): DashboardStats => {
  const totalProducts = mockProducts.length;
  const totalStock = mockProducts.reduce((sum, p) => sum + p.stock, 0);
  const todayInbound = getMockTodayInbound();

  // Hitung barang keluar hari ini dari mockStockExits
  const today = new Date().toISOString().split("T")[0];
  const todayOutbound = mockStockExits
    .filter((e) => e.date === today)
    .reduce((sum, e) => sum + e.items.reduce((s, i) => s + i.quantity, 0), 0);

  return { totalProducts, totalStock, todayInbound, todayOutbound };
};
