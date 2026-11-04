// src/features/spb/utils/filterAndSortSpb.ts
import type { SPBDocumentGroup } from "../../../shared/types";
import type { FilterType, SearchMode, SortBy } from "../types";
import { getNumberFromStr } from "./statusHelpers";
import { buildLocalTitleKey } from "./titleOverrides";

const getFilterStatusWeight = (status?: string): number => {
  if (status === "Belum Diproses") return 0.5;
  if (status === "Sudah PO" || status === "Belum PO") return 1;
  if (status === "Datang") return 2;
  if (status === "Selesai") return 3;
  return 4;
};

export interface FilterAndSortParams {
  data: SPBDocumentGroup[];
  filter: FilterType;
  searchTerm: string;
  searchMode: SearchMode;
  sortBy: SortBy;
  localTitles: Record<string, string>;
}

/**
 * Menyaring dan mengurutkan daftar dokumen SPB/PO/SJ pada halaman Monitoring SPB.
 */
export const filterAndSortSpbDocuments = ({
  data,
  filter,
  searchTerm,
  searchMode,
  sortBy,
  localTitles,
}: FilterAndSortParams): SPBDocumentGroup[] => {
  const searchLower = searchTerm.toLowerCase();

  const filtered = data.filter((item) => {
    let matchesSearch = false;

    const spbKey = item.spbNo
      ? buildLocalTitleKey("spb", item.spbNo, item.spbTitle)
      : null;
    const poKey = item.poNo
      ? buildLocalTitleKey("po", item.poNo, item.poTitle)
      : null;

    const spbTitle =
      (spbKey && localTitles[spbKey] !== undefined
        ? localTitles[spbKey]
        : item.spbTitle) || "";
    const poTitle =
      (poKey && localTitles[poKey] !== undefined
        ? localTitles[poKey]
        : item.poTitle) || "";

    if (searchMode === "no") {
      const matchSpb = String(item.spbNo || "")
        .toLowerCase()
        .includes(searchLower);
      const matchTitle = String(spbTitle).toLowerCase().includes(searchLower);
      const matchPo = String(item.poNo || "")
        .toLowerCase()
        .includes(searchLower);
      const matchPoTitle = String(poTitle).toLowerCase().includes(searchLower);
      const matchSj = String(item.suratJalanNo || "")
        .toLowerCase()
        .includes(searchLower);

      matchesSearch =
        !searchTerm ||
        matchSpb ||
        matchTitle ||
        matchPo ||
        matchPoTitle ||
        matchSj;
    } else {
      matchesSearch =
        !searchTerm ||
        !!item.itemNames?.some((name) =>
          String(name).toLowerCase().includes(searchLower),
        );
    }

    if (!matchesSearch) return false;

    switch (filter) {
      case "Belum Diproses":
        return item.status === "Belum Diproses";
      case "Belum di PO":
        return (!item.poNo || item.poNo === "-") && item.status === "Belum PO";
      case "Sudah di PO":
        return !!item.poNo && item.poNo !== "-" && item.status !== "Selesai";
      case "Datang":
        return item.status === "Datang" || item.status === "Selesai";
      case "Selesai":
        return item.status === "Selesai";
      default:
        return true;
    }
  });

  return filtered.sort((a, b) => {
    if (sortBy === "status") {
      const wA = getFilterStatusWeight(a.status);
      const wB = getFilterStatusWeight(b.status);
      if (wA !== wB) return wA - wB;
      return (
        getNumberFromStr(a.spbNo, a.poNo) - getNumberFromStr(b.spbNo, b.poNo)
      );
    }

    if (sortBy === "number") {
      const numA = getNumberFromStr(a.spbNo, a.poNo);
      const numB = getNumberFromStr(b.spbNo, b.poNo);
      if (numA !== numB) return numA - numB;
      return getFilterStatusWeight(a.status) - getFilterStatusWeight(b.status);
    }

    if (sortBy === "oldest") {
      const dateA = a.date !== "-" ? new Date(a.date).getTime() : 0;
      const dateB = b.date !== "-" ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    }

    const dateA = a.date !== "-" ? new Date(a.date).getTime() : 0;
    const dateB = b.date !== "-" ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
};

/**
 * Mengambil maksimal 10 dokumen terbaru berdasarkan tanggal.
 */
export const getRecentSpbDocuments = (
  data: SPBDocumentGroup[],
  limit = 10,
): SPBDocumentGroup[] => {
  return [...data]
    .sort((a, b) => {
      const dateA = a.date !== "-" ? new Date(a.date).getTime() : 0;
      const dateB = b.date !== "-" ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
};

