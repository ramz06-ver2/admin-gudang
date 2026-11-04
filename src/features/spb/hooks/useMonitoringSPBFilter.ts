// src/features/spb/hooks/useMonitoringSPBFilter.ts
import { useEffect, useState } from "react";
import { RESTRICTED_FILTER_LABEL } from "../accessRules";
import type { FilterType, SearchMode, SortBy } from "../types";

export const useMonitoringSPBFilter = (canViewRestricted: boolean) => {
  const [storedFilter, setFilter] = useState<FilterType>(() => {
    return (localStorage.getItem("spb_filter") as FilterType) || "Semua";
  });

  // Filter tersimpan "Belum Diproses" diabaikan jika user belum login
  const filter: FilterType =
    !canViewRestricted && storedFilter === RESTRICTED_FILTER_LABEL
      ? "Semua"
      : storedFilter;

  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem("spb_searchTerm") || "";
  });

  const [searchMode, setSearchMode] = useState<SearchMode>(() => {
    return (localStorage.getItem("spb_searchMode") as SearchMode) || "no";
  });

  const [sortBy, setSortBy] = useState<SortBy>(() => {
    return (localStorage.getItem("spb_sortBy") as SortBy) || "status";
  });

  useEffect(() => {
    localStorage.setItem("spb_filter", filter);
    localStorage.setItem("spb_searchTerm", searchTerm);
    localStorage.setItem("spb_searchMode", searchMode);
    localStorage.setItem("spb_sortBy", sortBy);
  }, [filter, searchTerm, searchMode, sortBy]);

  return {
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    searchMode,
    setSearchMode,
    sortBy,
    setSortBy,
  };
};

