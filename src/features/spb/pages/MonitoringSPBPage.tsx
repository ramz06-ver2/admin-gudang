// src/features/spb/pages/MonitoringSPBPage.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Col, Empty, Row, Spin, Grid } from "antd"; // 🔧 Tambahkan Grid
import { useGetIdentity } from "@refinedev/core";
import { canEditData } from "../../../app/providers/accessControlProvider";
import { getVerifiedUser } from "../../../shared/lib/authGuard";
import type { SPBDocumentGroup, UserRole } from "../../../shared/types";
import { canViewRestrictedSpb } from "../accessRules";
import { EditDocumentTitleModal } from "../components/EditDocumentTitleModal";
import { MonitoringSPBCard } from "../components/MonitoringSPBCard";
import { MonitoringSPBHeader } from "../components/MonitoringSPBHeader";
import { MonitoringSPBRecentList } from "../components/MonitoringSPBRecentList";
import { MonitoringSPBToolbar } from "../components/MonitoringSPBToolbar";
import { useEditDocumentTitle } from "../hooks/useEditDocumentTitle";
import { useMonitoringSPBFilter } from "../hooks/useMonitoringSPBFilter";
import { useMonitoringSPB } from "../useMonitoringSPB";
import {
  filterAndSortSpbDocuments,
  getRecentSpbDocuments,
} from "../utils/filterAndSortSpb";

export default function MonitoringSPBPage() {
  const { data, isLoading, error, refetch } = useMonitoringSPB();
  const navigate = useNavigate();
  
  // 🔧 PERBAIKAN: Deteksi layar mobile/desktop
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { data: identity } = useGetIdentity<{ role: UserRole }>();
  const userRole = identity?.role ?? getVerifiedUser()?.role ?? "user";
  const allowEdit = canEditData(userRole);
  const canViewRestricted = canViewRestrictedSpb();

  const {
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    searchMode,
    setSearchMode,
    sortBy,
    setSortBy,
  } = useMonitoringSPBFilter(canViewRestricted);

  const {
    editingTitle,
    titleInput,
    setTitleInput,
    savingTitle,
    localTitles,
    openEditModal,
    closeEditModal,
    handleSaveTitle,
  } = useEditDocumentTitle(allowEdit, () => refetch?.());

  const recentItems = useMemo(() => getRecentSpbDocuments(data, 10), [data]);

  const filteredAndSortedData = useMemo(
    () =>
      filterAndSortSpbDocuments({
        data,
        filter,
        searchTerm,
        searchMode,
        sortBy,
        localTitles,
      }),
    [data, filter, searchTerm, searchMode, sortBy, localTitles],
  );

  const handleCardClick = (item: SPBDocumentGroup) => {
    const params = new URLSearchParams();
    if (item.spbNo) {
      params.set("spb", String(item.spbNo));
      if (item.spbTitle) params.set("judul", String(item.spbTitle));
    } else if (item.poNo && item.poNo !== "NO_PO" && item.poNo !== "-") {
      params.set("po", String(item.poNo));
    } else if (item.suratJalanNo) {
      params.set("sj", String(item.suratJalanNo));
    }
    navigate(`/monitoring-spb/detail?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="Gagal memuat data SPB"
        description={(error as Error)?.message ?? "Coba muat ulang halaman"}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        paddingBottom: 32,
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <MonitoringSPBHeader totalDocuments={data.length} />

        <MonitoringSPBRecentList
          items={recentItems}
          onCardClick={handleCardClick}
        />

        <MonitoringSPBToolbar
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          filter={filter}
          onFilterChange={setFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          canViewRestricted={canViewRestricted}
        />

        <Row gutter={[16, 16]}>
          {filteredAndSortedData.map((item) => (
            <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
              <MonitoringSPBCard
                item={item}
                allowEdit={allowEdit}
                localTitles={localTitles}
                onCardClick={handleCardClick}
                onEditTitle={openEditModal}
                isMobile={isMobile} // 🔧 PERBAIKAN: Kirim prop isMobile
              />
            </Col>
          ))}
        </Row>

        {filteredAndSortedData.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, width: "100%" }}>
            <Empty description="Tidak ada data yang cocok dengan pencarian/filter." />
          </div>
        )}
      </div>

      {allowEdit && (
        <EditDocumentTitleModal
          editingTitle={editingTitle}
          titleInput={titleInput}
          onTitleInputChange={setTitleInput}
          savingTitle={savingTitle}
          onCancel={closeEditModal}
          onSave={handleSaveTitle}
        />
      )}
    </div>
  );
}