// src/features/spb/components/MonitoringSPBHeader.tsx
import { Space, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { formatFullDate } from "../../../shared/lib/format";

const { Title, Text } = Typography;

export interface MonitoringSPBHeaderProps {
  totalDocuments: number;
}

export const MonitoringSPBHeader = ({
  totalDocuments,
}: MonitoringSPBHeaderProps) => (
  <div style={{ marginBottom: 24 }}>
    <Space align="center">
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: "#1677ff15",
          color: "#1677ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
        }}
      >
        <FileTextOutlined />
      </div>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          Monitoring SPB
        </Title>
        <Text type="secondary">
          {totalDocuments} Dokumen Terdaftar · Diperbarui{" "}
          {formatFullDate(new Date())}
        </Text>
      </div>
    </Space>
  </div>
);

