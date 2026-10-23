import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Typography, Card, Row, Col, Table, Button,
  Spin, Empty, Space, Result, Tag, Grid
} from "antd";
import { ArrowLeftOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useMonitoringSPBDetail } from "../useMonitoringSPBDetail";
import type { SPBItemDetail } from "../../../shared/types";
import { formatDate } from "../../../shared/lib/format";

const { Title, Text } = Typography;

export const MonitoringSPBDetailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spbNo = searchParams.get("spb");
  const poNo = searchParams.get("po");

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { items, isLoading, error } = useMonitoringSPBDetail(spbNo, poNo);

  const statuses = useMemo(() => {
    if (items.length === 0) return { belumDiPo: false, sudahDiPo: false };
    const somePo = items.some((it) => it.no_po && it.no_po !== "-");
    return { belumDiPo: !somePo, sudahDiPo: somePo };
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

  // Helper warna Tag
  const getStatusColor = (status: string | null | undefined) => {
    if (status === "Belum PO") return "orange";
    if (status === "Sudah PO") return "blue";
    if (status === "Datang Sesuai") return "green";
    if (status === "Datang Kurang") return "volcano";
    if (status === "Datang Lebih") return "purple";
    return "default";
  };

  const mobileColumns = [
    { title: "No", key: "no", width: 40, align: "center" as const, render: (_: any, __: SPBItemDetail, i: number) => i + 1 },
    { title: "Nama Barang", dataIndex: "nama_barang", key: "nama_barang", ellipsis: true, render: (v: string) => <Text strong>{v}</Text> },
    {
      title: "Jumlah", key: "jumlah", width: 80, align: "right" as const,
      render: (_: any, r: SPBItemDetail) => <Text>{r.jumlah_permintaan ?? 0} <Text type="secondary" style={{ fontSize: 12 }}>{r.satuan ?? ""}</Text></Text>,
    },
    {
      title: "Status", key: "status", width: 90, align: "center" as const,
      render: (_: any, r: SPBItemDetail) => {
        return <Tag color={getStatusColor(r.status)} style={{ margin: 0, padding: "0 4px", fontSize: 11, whiteSpace: "normal", textAlign: "center" }}>{r.status || "Belum PO"}</Tag>;
      },
    },
    {
      title: "Aksi", key: "detail", width: 85, align: "center" as const,
      render: (_: any, r: SPBItemDetail) => (
        <Button
          type="primary"
          size="small"
          icon={<InfoCircleOutlined />}
          style={{ fontSize: 12, padding: "0 8px" }}
          onClick={() => navigate(`/monitoring-spb/item/${r.id}`)}
        >
          Detail
        </Button>
      ),
    },
  ];

  const desktopColumns = [
    { title: "No", key: "no", width: 56, align: "center" as const, render: (_: any, __: SPBItemDetail, i: number) => i + 1 },
    { title: "Nama Barang", dataIndex: "nama_barang", key: "nama_barang", render: (v: string) => <Text strong>{v}</Text> },
    { title: "No SPB", dataIndex: "no_spb", key: "no_spb", width: 130, render: (v: string | null) => v || "-" },
    { title: "No PO", dataIndex: "no_po", key: "no_po", width: 130, render: (v: string | null) => v || "-" },
    { title: "Tanggal PO", dataIndex: "tanggal_po", key: "tanggal_po", width: 130, render: (v: string | null) => (v ? formatDate(v) : "-") },
    { title: "Tanggal Datang", dataIndex: "tanggal_datang", key: "tanggal_datang", width: 140, render: (v: string | null) => (v ? formatDate(v) : "-") },
    {
      title: "Jumlah Datang", dataIndex: "qty_datang", key: "jumlah_datang", width: 140, align: "right" as const,
      render: (v: number | null, r: SPBItemDetail) => `${v ?? 0} ${r.satuan ?? ""}`.trim(),
    },
    {
      title: "Status", key: "status", width: 130,
      render: (_: any, r: SPBItemDetail) => {
        return <Tag color={getStatusColor(r.status)}>{r.status || "Belum PO"}</Tag>;
      },
    },
    {
      title: "Detail", key: "detail", width: 100, align: "center" as const,
      render: (_: any, r: SPBItemDetail) => (
        <Button
          type="primary"
          size="small"
          icon={<InfoCircleOutlined />}
          onClick={() => navigate(`/monitoring-spb/item/${r.id}`)}
        >
          Detail
        </Button>
      ),
    },
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 32 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Button type="text" size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate("/monitoring-spb")} />
        <div>
          <Title level={3} style={{ margin: 0 }}>Detail SPB / PO</Title>
          <Text type="secondary">{spbNo ? `SPB: ${spbNo}` : ""}{spbNo && poNo ? " · " : ""}{poNo ? `PO: ${poNo}` : ""}</Text>
        </div>
      </Space>

      {isLoading && <div style={{ textAlign: "center", padding: 50 }}><Spin size="large" /></div>}
      {!isLoading && error && <Result status="error" title="Gagal memuat detail" subTitle={error.message} />}
      {!isLoading && !error && items.length === 0 && <Empty description="Dokumen tidak ditemukan atau sudah dihapus" />}

      {!isLoading && !error && items.length > 0 && (
        <>
          <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={12}><StatusCard title="Belum di PO" active={statuses.belumDiPo} /></Col>
            <Col xs={12} md={12}><StatusCard title="Sudah di PO" active={statuses.sudahDiPo} /></Col>
          </Row>

          <Card
            title={`Daftar Barang (${items.length})`}
            variant="borderless"
            style={{
              borderRadius: isMobile ? 0 : 12,
              ...(isMobile && { width: "100vw", position: "relative", left: "50%", transform: "translateX(-50%)" }),
            }}
            styles={{ body: { padding: 0 } }}
          >
            <Table<SPBItemDetail>
              dataSource={items}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20, size: "small" }}
              scroll={isMobile ? undefined : { x: "max-content" }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default MonitoringSPBDetailPage;