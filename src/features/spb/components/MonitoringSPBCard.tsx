// src/features/spb/components/MonitoringSPBCard.tsx
import type { MouseEvent } from "react";
import { Button, Card, Divider, Space, Tag, Typography } from "antd";
import { ArrowRightOutlined, EditOutlined } from "@ant-design/icons";
import type { SPBDocumentGroup } from "../../../shared/types";
import { formatDate } from "../../../shared/lib/format";
import { getCardStatusColor } from "../utils/statusHelpers";
import { buildLocalTitleKey } from "../utils/titleOverrides";
import { SourceFileLink } from "./SourceFileLink";

const { Text } = Typography;

export interface MonitoringSPBCardProps {
  item: SPBDocumentGroup;
  allowEdit: boolean;
  localTitles: Record<string, string>;
  onCardClick: (item: SPBDocumentGroup) => void;
  onEditTitle: (
    e: MouseEvent,
    type: "spb" | "po",
    docNo: string,
    currentTitle?: string | null,
  ) => void;
  isMobile?: boolean; // 🔧 TAMBAHKAN PROP INI
}

export const MonitoringSPBCard = ({
  item,
  allowEdit,
  localTitles,
  onCardClick,
  onEditTitle,
  isMobile = false, // 🔧 DEFAULT VALUE
}: MonitoringSPBCardProps) => {
  const hasSPB = item.spbNo !== null && item.spbNo !== "NO_SPB";
  const hasPO =
    item.poNo !== null && item.poNo !== "NO_PO" && item.poNo !== "-";
  const hasSJ = !hasSPB && !hasPO && item.suratJalanNo;

  const spbKey =
    hasSPB && item.spbNo
      ? buildLocalTitleKey("spb", item.spbNo, item.spbTitle)
      : null;
  const poKey =
    hasPO && item.poNo
      ? buildLocalTitleKey("po", item.poNo, item.poTitle)
      : null;

  const resolvedSpbTitle =
    spbKey && localTitles[spbKey] !== undefined
      ? localTitles[spbKey]
      : item.spbTitle;
  const resolvedPoTitle =
    poKey && localTitles[poKey] !== undefined
      ? localTitles[poKey]
      : item.poTitle;

  return (
    <Card
      hoverable
      onClick={() => onCardClick(item)}
      style={{
        borderRadius: 12,
        height: "100%",
        border: "1px solid #f0f0f0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      styles={{ body: { padding: 16 } }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={2}>
        {hasSPB && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text type="secondary" style={{ fontSize: 11 }}>
                No. SPB
              </Text>
              {allowEdit && (
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ fontSize: 12 }} />}
                  aria-label={`Edit judul SPB ${item.spbNo}`}
                  data-testid={`edit-spb-title-${item.spbNo}`}
                  title="Edit judul SPB"
                  style={{
                    padding: "0 4px",
                    height: 20,
                    minWidth: 20,
                    color: "#8c8c8c",
                  }}
                  onClick={(e) =>
                    onEditTitle(e, "spb", String(item.spbNo), resolvedSpbTitle)
                  }
                />
              )}
            </div>
            <div
              style={{ 
                fontWeight: 600, 
                fontSize: 16, 
                wordBreak: "break-word",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center"
              }}
            >
              {item.spbNo}
              {resolvedSpbTitle && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#595959",
                    marginLeft: 6,
                  }}
                >
                  - {resolvedSpbTitle}
                </span>
              )}
              {/* 🔧 PERBAIKAN: Sembunyikan logo file di mobile */}
              {!isMobile && (
                <SourceFileLink
                  url={item.spbSourceFile}
                  label={`Buka file asli SPB ${item.spbNo}`}
                  testId={`source-file-spb-${item.spbNo}`}
                />
              )}
            </div>
          </div>
        )}

        {hasSPB && hasPO && <Divider style={{ margin: "8px 0" }} />}

        {hasPO && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text type="secondary" style={{ fontSize: 11 }}>
                No. PO
              </Text>
              {allowEdit && (
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ fontSize: 12 }} />}
                  aria-label={`Edit judul PO ${item.poNo}`}
                  data-testid={`edit-po-title-${item.poNo}`}
                  title="Edit judul PO"
                  style={{
                    padding: "0 4px",
                    height: 20,
                    minWidth: 20,
                    color: "#8c8c8c",
                  }}
                  onClick={(e) =>
                    onEditTitle(e, "po", String(item.poNo), resolvedPoTitle)
                  }
                />
              )}
            </div>
            <div
              style={{ 
                fontWeight: 600, 
                fontSize: 16, 
                wordBreak: "break-word",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center"
              }}
            >
              {item.poNo}
              {resolvedPoTitle && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#595959",
                    marginLeft: 6,
                  }}
                >
                  - {resolvedPoTitle}
                </span>
              )}
              {/* 🔧 PERBAIKAN: Sembunyikan logo file di mobile */}
              {!isMobile && (
                <SourceFileLink
                  url={item.poSourceFile}
                  label={`Buka file asli PO ${item.poNo}`}
                  testId={`source-file-po-${item.poNo}`}
                />
              )}
            </div>
          </div>
        )}

        {hasSJ && (
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              No. Surat Jalan
            </Text>
            <div
              style={{ fontWeight: 600, fontSize: 16, wordBreak: "break-word" }}
            >
              {item.suratJalanNo}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "#8c8c8c",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div>Total: {item.itemsCount} Barang</div>
            <div style={{ marginTop: 4 }}>
              Tanggal: {item.date !== "-" ? formatDate(item.date) : "-"}
            </div>
          </div>
          <Tag
            color={getCardStatusColor(item.status)}
            style={{ margin: 0, fontWeight: 600 }}
          >
            {item.status || "Belum PO"}
          </Tag>
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px dashed #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#1677ff",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <span>Lihat detail</span>
          <ArrowRightOutlined />
        </div>
      </Space>
    </Card>
  );
};