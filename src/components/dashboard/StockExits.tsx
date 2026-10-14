import dayjs from "dayjs";
import type { StockExit } from "../../types";

export const mockStockExits: StockExit[] = [
  {
    id: 1,
    timestamp: dayjs().hour(9).minute(15).toISOString(),
    date: dayjs().format("YYYY-MM-DD"),
    time: "09:15",
    team: "Tim Alpha",
    person: "Budi Santoso",
    workplace: "Gudang A",
    items: [
      { itemId: 1, itemName: "Beras Premium 5kg", unit: "sak", quantity: 50 },
      { itemId: 2, itemName: "Gula Pasir 1kg", unit: "pcs", quantity: 20 },
    ],
  },
  {
    id: 2,
    timestamp: dayjs().hour(10).minute(42).toISOString(),
    date: dayjs().format("YYYY-MM-DD"),
    time: "10:42",
    team: "Tim Bravo",
    person: "Ani Wijaya",
    workplace: "Gudang B",
    items: [{ itemId: 3, itemName: "Aqua 600ml", unit: "dus", quantity: 30 }],
  },
];
