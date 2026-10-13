import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "antd";
import dayjs from "dayjs";
import { useProductSearch } from "./useProductSearch";
import { useEntryFlow } from "./useEntryFlow";
import type { Product, StockExit, StockExitItem } from "../types";

export interface PendingLine {
  itemId: number;
  itemName: string;
  unit: string;
  quantity: number;
}

interface UseQuickEntryParams {
  onFinish?: (exit: StockExit) => void;
}

export const useQuickEntry = ({ onFinish }: UseQuickEntryParams = {}) => {
  const { message } = App.useApp();
  const flow = useEntryFlow();

  const [keyword, setKeyword] = useState("");
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [activeItem, setActiveItem] = useState<Product | null>(null);
  const [activeQty, setActiveQty] = useState(1);
  const [pendingLines, setPendingLines] = useState<PendingLine[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const { products: searchResults } = useProductSearch(keyword, 8);
  const phase = activeItem ? "quantity" : "search";

  // ==========================================
  // Auto-focus
  // ==========================================
  useEffect(() => {
    if (!flow.isReady) return;
    if (phase === "search") {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setTimeout(() => qtyRef.current?.focus(), 100);
    }
  }, [phase, flow.isReady]);

  useEffect(() => setHighlightedIdx(0), [keyword]);

  // ==========================================
  // Ctrl+Enter → selesai
  // ==========================================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter" && pendingLines.length > 0) {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLines.length]);

  // ==========================================
  // Handlers
  // ==========================================
  const commitItem = useCallback(() => {
    if (searchResults.length === 0) return;
    const chosen = searchResults[highlightedIdx] ?? searchResults[0];
    setActiveItem(chosen);
    setActiveQty(1);
    setKeyword("");
  }, [searchResults, highlightedIdx]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIdx((i) => Math.min(i + 1, searchResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        commitItem();
      }
    },
    [searchResults.length, commitItem],
  );

  const confirmQuantity = useCallback(() => {
    if (!activeItem) return;
    setPendingLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === activeItem.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          quantity: copy[idx].quantity + activeQty,
        };
        return copy;
      }
      return [
        ...prev,
        {
          itemId: activeItem.id,
          itemName: activeItem.name,
          unit: activeItem.unit,
          quantity: activeQty,
        },
      ];
    });
    setActiveItem(null);
    setActiveQty(1);
  }, [activeItem, activeQty]);

  const handleQtyKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmQuantity();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setActiveItem(null);
        setActiveQty(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveQty((q) => q + 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveQty((q) => Math.max(1, q - 1));
      }
    },
    [confirmQuantity],
  );

  const removeLine = useCallback((itemId: number) => {
    setPendingLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }, []);

  const resetEntry = useCallback(() => {
    setPendingLines([]);
    setActiveItem(null);
    setActiveQty(1);
    setKeyword("");
  }, []);

  const handleFinish = useCallback(() => {
    if (pendingLines.length === 0) return;
    if (!flow.team || !flow.person || !flow.workplace) return;

    const now = dayjs();
    const exit: StockExit = {
      id: Date.now(),
      timestamp: now.toISOString(),
      date: now.format("YYYY-MM-DD"),
      time: now.format("HH:mm"),
      team: flow.team.name,
      person: flow.person.name,
      workplace: flow.workplace.name,
      items: pendingLines.map<StockExitItem>((l) => ({
        itemId: l.itemId,
        itemName: l.itemName,
        unit: l.unit,
        quantity: l.quantity,
      })),
    };

    message.success(
      `Tersimpan: ${pendingLines.length} jenis barang di ${flow.workplace.name}`,
    );

    onFinish?.(exit);
    resetEntry();
    flow.resetSession();
  }, [pendingLines, flow, message, onFinish, resetEntry]);

  const handleCancel = useCallback(() => {
    resetEntry();
    flow.resetSession();
  }, [resetEntry, flow]);

  const totalPendingItems = pendingLines.reduce((s, l) => s + l.quantity, 0);

  return {
    // flow (wizard)
    flow,
    // search
    keyword,
    setKeyword,
    highlightedIdx,
    searchResults,
    searchRef,
    handleSearchKeyDown,
    commitItem,
    // quantity
    activeItem,
    activeQty,
    setActiveQty,
    qtyRef,
    handleQtyKeyDown,
    confirmQuantity,
    // pending
    pendingLines,
    totalPendingItems,
    removeLine,
    // phase
    phase,
    // actions
    handleFinish,
    handleCancel,
  };
};
