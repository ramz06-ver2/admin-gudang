// src/features/spb/components/MonitoringDetailHeader.tsx
import { Button, Card, Col, Row, Space, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import type { UniquePoInfo } from "../types";
import { SourceFileLink } from "./SourceFileLink";

const { Title, Text } = Typography;

export interface MonitoringDetailHeaderProps {
  spbNo: string | null;
  spbTitle: string | null | undefined;
  spbSourceFile?: string | null;
  uniquePos: UniquePoInfo[];
  sjNo: string | null;
  onBack: () => void;
}

export const MonitoringDetailHeader = ({
  spbNo,
  spbTitle,
  spbSourceFile,
  uniquePos,
  sjNo,
  onBack,
}: MonitoringDetailHeaderProps) => (
  <Space align="center" style={{ marginBottom: 16 }}>
    <Button
      type="text"
      size="large"
      icon={<ArrowLeftOutlined />}
      onClick={onBack}
    />
    <div>
      <Title level={3} style={{ margin: 0 }}>
        Detail SPB / PO
      </Title>
      <div style={{ marginTop: 4 }}>
        {/* Bagian Judul SPB */}
        {spbNo && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Text strong style={{ fontSize: 18 }}>
              SPB: {spbNo} {spbTitle ? ` - ${spbTitle}` : ""}
            </Text>
            <SourceFileLink
              url={spbSourceFile}
              label={`Buka file asli SPB ${spbNo}`}
              fontSize={18}
              stopPropagation={false}
            />
          </div>
        )}

        {/* Bagian Daftar PO (Bisa lebih dari satu) */}
        {uniquePos.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            <Text strong style={{ fontSize: 18 }}>
              PO:{" "}
            </Text>
            {uniquePos.map((po, idx) => (
              <span
                key={po.no}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <Text strong style={{ fontSize: 18 }}>
                  {po.no}
                </Text>
                <SourceFileLink
                  url={po.file}
                  label={`Buka file asli PO ${po.no}`}
                  fontSize={18}
                  stopPropagation={false}
                />
                {idx < uniquePos.length - 1 && (
                  <Text strong style={{ fontSize: 18, marginLeft: 2 }}>
                    ,
                  </Text>
                )}
              </span>
            ))}
          </div>
        )}

        {sjNo && (
          <div style={{ marginTop: 4 }}>
            <Text strong style={{ fontSize: 18 }}>
              Surat Jalan: {sjNo}
            </Text>
          </div>
        )}
      </div>
    </div>
  </Space>
);

const StatusSummaryCard = ({
  title,
  active,
}: {
  title: string;
  active: boolean;
}) => (
  <Card
    size="small"
    style={{
      backgroundColor: active ? "#f6ffed" : "#f5f5f5",
      borderColor: active ? "#b7eb8f" : "#d9d9d9",
      textAlign: "center",
    }}
  >
    <span
      style={{
        color: active ? "#52c41a" : "#8c8c8c",
        fontWeight: active ? "bold" : "normal",
      }}
    >
      {title}
    </span>
  </Card>
);

export const MonitoringPoStatusRow = ({
  belumDiPo,
  sudahDiPo,
}: {
  belumDiPo: boolean;
  sudahDiPo: boolean;
}) => (
  <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
    <Col xs={12} md={12}>
      <StatusSummaryCard title="Belum di PO" active={belumDiPo} />
    </Col>
    <Col xs={12} md={12}>
      <StatusSummaryCard title="Sudah di PO" active={sudahDiPo} />
    </Col>
  </Row>
);