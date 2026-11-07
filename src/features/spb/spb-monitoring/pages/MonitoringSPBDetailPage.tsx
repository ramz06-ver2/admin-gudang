// src/features/spb/pages/MonitoringSPBDetailPage.tsx
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Empty, Grid, Result, Spin } from "antd";
import {
  MonitoringDetailHeader,
  MonitoringPoStatusRow,
} from "../components/MonitoringDetailHeader";
import { MonitoringDetailTable } from "../components/MonitoringDetailTable";
import type { UniquePoInfo } from "../types";
import { useMonitoringSPBDetail } from "../useMonitoringSPBDetail";

export const MonitoringSPBDetailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spbNo = searchParams.get("spb");
  const poNo = searchParams.get("po");
  const sjNo = searchParams.get("sj");
  const judulSpb = searchParams.get("judul");

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { items, isLoading, error } = useMonitoringSPBDetail(
    spbNo,
    poNo,
    sjNo,
    judulSpb,
  );

  const spbTitle = items.length > 0 ? items[0].judul_spb : null;
  const spbSourceFile = items.length > 0 ? items[0].spbSourceFile : null;

  const uniquePos = useMemo<UniquePoInfo[]>(() => {
    const map = new Map<string, string | null | undefined>();
    items.forEach((item) => {
      if (item.no_po && item.no_po !== "-") {
        if (!map.has(item.no_po) || !map.get(item.no_po)) {
          map.set(item.no_po, item.poSourceFile);
        }
      }
    });
    return Array.from(map.entries()).map(([no, file]) => ({ no, file }));
  }, [items]);

  const showPoStatus = !!(spbNo || poNo);

  const statuses = useMemo(() => {
    if (items.length === 0) return { belumDiPo: false, sudahDiPo: false };
    const somePo = items.some((it) => it.no_po && it.no_po !== "-");
    return { belumDiPo: !somePo, sudahDiPo: somePo };
  }, [items]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 32 }}>
      <MonitoringDetailHeader
        spbNo={spbNo}
        spbTitle={spbTitle}
        spbSourceFile={spbSourceFile}
        uniquePos={uniquePos}
        sjNo={sjNo}
        onBack={() => navigate("/monitoring-spb")}
      />

      {isLoading && (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      )}
      {!isLoading && error && (
        <Result
          status="error"
          title="Gagal memuat detail"
          subTitle={error.message}
        />
      )}
      {!isLoading && !error && items.length === 0 && (
        <Empty description="Dokumen tidak ditemukan atau sudah dihapus" />
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          {showPoStatus && (
            <MonitoringPoStatusRow
              belumDiPo={statuses.belumDiPo}
              sudahDiPo={statuses.sudahDiPo}
            />
          )}

          <MonitoringDetailTable
            items={items}
            isMobile={isMobile}
            onViewItemDetail={(item) =>
              navigate(`/monitoring-spb/item/${item.id}?type=${item.sumber}`)
            }
          />
        </>
      )}
    </div>
  );
};

export default MonitoringSPBDetailPage;
