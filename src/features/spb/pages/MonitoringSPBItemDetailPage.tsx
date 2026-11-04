// src/features/spb/pages/MonitoringSPBItemDetailPage.tsx
import type { ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Card, Grid, Space, Spin, Table, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { buildItemDetailRows } from "../components/ItemDetailRowsBuilder";
import { useSPBItem } from "../hooks/useSPBItem";
import type { DetailRow } from "../types";

const { Title, Text } = Typography;

export const MonitoringSPBItemDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "spb";

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { data: item, isLoading, error } = useSPBItem(id, type);

  const rows: DetailRow[] = item ? buildItemDetailRows(item, type) : [];

  const columns = [
    {
      title: "Rincian Informasi",
      dataIndex: "field",
      key: "field",
      width: isMobile ? "45%" : "35%",
      render: (v: string) => <Text type="secondary">{v}</Text>,
    },
    {
      title: "Detail",
      dataIndex: "value",
      key: "value",
      render: (v: ReactNode) => v,
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 32 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Button
          type="text"
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        />
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Rincian Barang
          </Title>
          <Text type="secondary">Informasi detail untuk satu barang</Text>
        </div>
      </Space>

      {isLoading && (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      )}
      {!isLoading && error && (
        <div style={{ textAlign: "center", padding: 50, color: "#ff4d4f" }}>
          Gagal memuat: {error.message}
        </div>
      )}
      {!isLoading && !item && !error && (
        <div style={{ textAlign: "center", padding: 50 }}>
          Data tidak ditemukan.
        </div>
      )}

      {!isLoading && item && (
        <Card
          variant="borderless"
          style={{ borderRadius: 12 }}
          styles={{ body: { padding: 0 } }}
        >
          <Table<DetailRow>
            dataSource={rows}
            columns={columns}
            pagination={false}
            size="middle"
          />
        </Card>
      )}
    </div>
  );
};

export default MonitoringSPBItemDetailPage;
