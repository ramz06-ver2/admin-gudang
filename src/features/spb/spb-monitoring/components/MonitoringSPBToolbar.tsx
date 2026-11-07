// src/features/spb/components/MonitoringSPBToolbar.tsx
import { Input, Segmented, Select, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { RESTRICTED_FILTER_LABEL } from "../accessRules";
import type { FilterType, SearchMode, SortBy } from "../types";

export interface MonitoringSPBToolbarProps {
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  sortBy: SortBy;
  onSortByChange: (sortBy: SortBy) => void;
  canViewRestricted: boolean;
}

export const MonitoringSPBToolbar = ({
  searchMode,
  onSearchModeChange,
  searchTerm,
  onSearchTermChange,
  filter,
  onFilterChange,
  sortBy,
  onSortByChange,
  canViewRestricted,
}: MonitoringSPBToolbarProps) => {
  const filterOptions: FilterType[] = [
    "Semua",
    ...(canViewRestricted ? [RESTRICTED_FILTER_LABEL as FilterType] : []),
    "Belum di PO",
    "Sudah di PO",
    "Datang",
    "Selesai",
  ];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 20,
        alignItems: "center",
      }}
    >
      <Space.Compact style={{ width: "100%", maxWidth: 400 }}>
        <Select<SearchMode>
          value={searchMode}
          onChange={onSearchModeChange}
          style={{ width: 130 }}
          aria-label="Mode Pencarian"
        >
          <Select.Option value="no">No / Judul</Select.Option>
          <Select.Option value="barang">Nama Barang</Select.Option>
        </Select>
        <Input
          placeholder={
            searchMode === "no"
              ? "Cari No SPB/PO/SJ..."
              : "Cari Nama Barang..."
          }
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          allowClear
        />
      </Space.Compact>

      <Segmented<FilterType>
        size="middle"
        options={filterOptions}
        value={filter}
        onChange={onFilterChange}
        style={{ padding: 4, fontWeight: 500, overflowX: "auto" }}
      />

      <Select<SortBy>
        value={sortBy}
        onChange={onSortByChange}
        style={{ width: 150 }}
        aria-label="Urutan Data"
        options={[
          { value: "status", label: "Urut: Status" },
          { value: "number", label: "Urut: Nomor" },
          { value: "oldest", label: "Urut: Paling Lama" },
          { value: "newest", label: "Urut: Paling Baru" },
        ]}
      />
    </div>
  );
};

