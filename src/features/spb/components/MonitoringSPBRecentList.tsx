// src/features/spb/components/MonitoringSPBRecentList.tsx
import { Card, Grid, Space, Typography } from "antd";
import type { SPBDocumentGroup } from "../../../shared/types";
import { formatDate } from "../../../shared/lib/format";

const { Text } = Typography;

export interface MonitoringSPBRecentListProps {
  items: SPBDocumentGroup[];
  onCardClick: (item: SPBDocumentGroup) => void;
}

export const MonitoringSPBRecentList = ({
  items,
  onCardClick,
}: MonitoringSPBRecentListProps) => {
  const screens = Grid.useBreakpoint();

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <Text
        strong
        style={{ fontSize: 16, display: "block", marginBottom: 12 }}
      >
        Baru ditambahkan
      </Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: screens.md ? "repeat(5, 1fr)" : "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        {items.map((item) => {
          const hasSPB = item.spbNo && item.spbNo !== "NO_SPB";
          const hasPO =
            item.poNo && item.poNo !== "NO_PO" && item.poNo !== "-";

          return (
            <Card
              key={item.id}
              size="small"
              hoverable
              onClick={() => onCardClick(item)}
              style={{
                borderRadius: 10,
                background: "#fafafa",
                cursor: "pointer",
              }}
              styles={{ body: { padding: 12 } }}
            >
              <Space direction="vertical" size={0}>
                <Text strong style={{ fontSize: 13, display: "block" }} ellipsis>
                  {hasSPB && hasPO
                    ? `SPB: ${item.spbNo} · PO: ${item.poNo}`
                    : hasSPB
                      ? `SPB: ${item.spbNo}`
                      : hasPO
                        ? `PO: ${item.poNo}`
                        : `SJ: ${item.suratJalanNo}`}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {item.date !== "-" ? formatDate(item.date) : "-"}
                </Text>
              </Space>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

