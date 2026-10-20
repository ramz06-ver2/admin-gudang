import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Typography, Card, Row, Col, Tag, Table, Button,
  Spin, Empty, Space, Result,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMonitoringSPBDetail } from "../../hooks/useMonitoringSPBDetail";
import type { SPBItemDetail } from "../../hooks/useMonitoringSPBDetail";
import { formatDate } from "../../utility/format";

const { Title, Text } = Typography;

const DELIVERED = ["DATANG SESUAI", "DATANG KURANG", "DATANG LEBIH"];

export const MonitoringSPBDetailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spbNo = searchParams.get("spb");
  const poNo = searchParams.get("po");

  const { items, isLoading, error } = useMonitoringSPBDetail(spbNo, poNo);

  const statuses = useMemo(() => {
    if (items.length === 0) {
      return {
        belumDiPo: false,
        sudahDiPo: false,
        datangSebagian: false,
        selesai: false,
      };
    }
    const somePo = items.some((it) => it.no_po && it.tanggal_po);
    const someDelivered = items.some((it) => DELIVERED.includes(it.status));
    const allDelivered = items.every((it) => DELIVERED.includes(it.status));

    return {
      belumDiPo: !somePo,
      sudahDiPo: somePo,
      datangSebagian: someDelivered && !allDelivered,
      selesai: allDelivered,
    };
  }, [items]);

  const StatusCard = ({ title, active }: { title: string; active: boolean }) => (
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

  const columns = [
    { title: "Nama Barang", dataIndex: "nama_barang", key: "nama_barang" },
    {
      title: "Qty",
      dataIndex: "jumlah_permintaan",
      key: "jumlah_permintaan",
      align: "right" as const,
    },
    { title: "Satuan", dataIndex: "satuan", key: "satuan" },
    { title: "No PO", dataIndex: "no_po", key: "no_po" },
    {
      title: "Tgl PO",
      dataIndex: "tanggal_po",
      key: "tanggal_po",
      render: (v: string | null) => (v ? formatDate(v) : "-"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color: "green" | "red" | "orange" | "default" = "default";
        if (["DATANG SESUAI", "DATANG LEBIH"].includes(status)) color = "green";
        else if (status === "DATANG KURANG") color = "orange";
        else if (status === "BELUM DATANG") color = "red";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Tgl Datang",
      dataIndex: "tanggal_datang",
      key: "tanggal_datang",
      render: (v: string | null) => (v ? formatDate(v) : "-"),
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 32 }}>
      {/* Header */}
      <Space align="center" style={{ marginBottom: 16 }}>
        <Button
          type="text"
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/monitoring-spb")}
        />
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Detail SPB / PO
          </Title>
          <Text type="secondary">
            {spbNo ? `SPB: ${spbNo}` : ""}
            {spbNo && poNo ? " · " : ""}
            {poNo ? `PO: ${poNo}` : ""}
          </Text>
        </div>
      </Space>

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
          {/* Status Cards */}
          <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={6}><StatusCard title="Belum di PO" active={statuses.belumDiPo} /></Col>
            <Col xs={12} md={6}><StatusCard title="Sudah di PO" active={statuses.sudahDiPo} /></Col>
            <Col xs={12} md={6}><StatusCard title="Datang Sebagian" active={statuses.datangSebagian} /></Col>
            <Col xs={12} md={6}><StatusCard title="SPB Selesai" active={statuses.selesai} /></Col>
          </Row>

          <Card
            title={`Daftar Barang (${items.length})`}
            variant="borderless"
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 0 } }}
          >
            <Table<SPBItemDetail>
              dataSource={items}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              scroll={{ x: "max-content" }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default MonitoringSPBDetailPage;