import dayjs from "dayjs";
import type { StockExit } from "../types";

export const mockStockExits: StockExit[] = [
  {
    id: 1,
    nomorTransaksi: "OUT-001",
    timestamp: dayjs().hour(9).minute(15).toISOString(),
    date: dayjs().format("YYYY-MM-DD"),
    time: "09:15",
    person: "Budi Santoso",
    destination: "Gudang A",
    isBreakdown: true,
    items: [
      { itemId: 1, itemName: "Beras Premium 5kg", size: "5 kg", unit: "sak", quantity: 50 },
      { itemId: 2, itemName: "Gula Pasir 1kg", size: "1 kg", unit: "pcs", quantity: 20 },
      { itemId: 3, itemName: "Aqua 600ml", size: "600 ml", unit: "dus", quantity: 95 },
    ],
  },
  {
    id: 2,
    nomorTransaksi: "OUT-002",
    timestamp: dayjs().hour(10).minute(42).toISOString(),
    date: dayjs().format("YYYY-MM-DD"),
    time: "10:42",
    person: "Ani Wijaya",
    destination: "Gudang B",
    isBreakdown: false,
    items: [
      { itemId: 3, itemName: "Aqua 600ml", size: "600 ml", unit: "dus", quantity: 30 },
      { itemId: 5, itemName: "Kopi Kapal Api 165g", size: "165 g", unit: "pcs", quantity: 10 },
    ],
  },
  {
    id: 3,
    nomorTransaksi: "OUT-003",
    timestamp: dayjs().hour(14).minute(20).toISOString(),
    date: dayjs().format("YYYY-MM-DD"),
    time: "14:20",
    person: "Citra Dewi",
    destination: "Gudang A",
    isBreakdown: true,
    items: [
      { itemId: 4, itemName: "Pulpen Standard", size: null, unit: "lusin", quantity: 10 },
    ],
  },
];