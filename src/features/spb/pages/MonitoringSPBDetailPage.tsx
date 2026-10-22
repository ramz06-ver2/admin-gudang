import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Typography, Card, Row, Col, Table, Button,
  Spin, Empty, Space, Result,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMonitoringSPBDetail } from "../useMonitoringSPBDetail";
import type { SPBItemDetail } from "../../../shared/types";
import { formatDate } from "../../../shared/lib/format";

const { Title, Text } = Typography;

export const MonitoringSPBDetailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spbNo = searchParams.get("spb");
  const poNo = searchParams.get("po");

  const { items, isLoading, error } = useMonitoringSPBDetail(spbNo, poNo);

  const statuses = useMemo(() => {
    if (items.length === 0) {
      return { belumDiPo: false, sudahDiPo: false };
    }
    const somePo = items.some((it) => it.no_po && it.tanggal_po);

    return {
      belumDiPo: !somePo,
      sudahDiPo: somePo,
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
      title: "Tgl Datang",
      dataIndex: "tanggal_datang",
      key: "tanggal_datang",
      render: (v: string | null) => (v ? formatDate(v) : "-"),
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 32 }}>
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