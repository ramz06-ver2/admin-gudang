import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography, Card, Space, Tag, Row, Col, Divider,
  Spin, Segmented, Empty, Alert,
} from "antd";
import {
  useMonitoringSPB,
  type SPBDocumentGroup,
} from "../useMonitoringSPB";
import { formatFullDate, formatDate } from "../../../shared/lib/format";
import {
  CheckCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

type FilterType =
  | "Semua"
  | "Sudah di PO"
  | "Belum di PO"
  | "Datang"
  | "SPB Selesai";

// Status yang dianggap "sudah datang"
const DELIVERED = ["DATANG SESUAI", "DATANG KURANG", "DATANG LEBIH"];
// Status yang dianggap "selesai tanpa masalah"
const COMPLETED = ["DATANG SESUAI", "DATANG LEBIH"];

export const MonitoringSPBPage = () => {
  const { data, isLoading, error } = useMonitoringSPB();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("Semua");

  // ✅ "Baru ditambahkan" = 4 dokumen dengan tanggal terbaru
  const recentItems = useMemo(() => {
    const time = (d: string) =>
      d && d !== "-" ? new Date(d).getTime() || 0 : 0;
    return [...data]
      .sort((a, b) => time(b.date) - time(a.date))
      .slice(0, 4);
  }, [data]);

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((item) => {
      switch (filter) {
        case "Sudah di PO":
          return item.poNo !== null;
        case "Belum di PO":
          return item.poNo === null;
        case "Datang":
          // ✅ ikutkan DATANG KURANG (sebagian datang)
          return DELIVERED.includes(item.status);
        case "SPB Selesai":
          // ✅ hanya yang benar-benar selesai (tidak kurang)
          return COMPLETED.includes(item.status);
        default:
          return true;
      }
    });

    // Yang selesai diletakkan paling bawah, sisanya urut sortNumber
    return filtered.sort((a, b) => {
      const aDone = COMPLETED.includes(a.status);
      const bDone = COMPLETED.includes(b.status);
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return a.sortNumber - b.sortNumber;
    });
  }, [data, filter]);

  // ✅ Navigasi ke detail
  const handleCardClick = (item: SPBDocumentGroup) => {
    const params = new URLSearchParams();
    if (item.spbNo) params.set("spb", item.spbNo);
    if (item.poNo) params.set("po", item.poNo);
    navigate(`/monitoring-spb/detail?${params.toString()}`);
  };

  const renderCardContent = (item: SPBDocumentGroup) => {
    const hasSPB = item.spbNo !== null;
    const hasPO = item.poNo !== null;

    const isDone = COMPLETED.includes(item.status);
    const statusColor = isDone
      ? "success"
      : item.status === "BELUM DATANG"
      ? "error"
      : "processing";
    const statusIcon = isDone ? <CheckCircleOutlined /> : <SyncOutlined spin />;

    return (
      <Card
        hoverable
        onClick={() => handleCardClick(item)}
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
              <Text type="secondary" style={{ fontSize: 11 }}>No. SPB</Text>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{item.spbNo}</div>
            </div>
          )}

          {hasSPB && hasPO && <Divider style={{ margin: "8px 0" }} />}

          {hasPO && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>No. PO</Text>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{item.poNo}</div>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <Tag icon={statusIcon} color={statusColor} style={{ margin: 0 }}>
              Status: {item.status}
            </Tag>
            <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
              Total: {item.itemsCount} Barang
            </div>
          </div>

          {/* ✅ Hint visual bahwa card bisa diklik */}
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
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <Space align="center">
          <div
            style={{
              width: 42, height: 42, borderRadius: 10,
              background: "#1677ff15", color: "#1677ff",
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 20,
            }}
          >
            <FileTextOutlined />
          </div>
          <div>
            <Title level={3} style={{ margin: 0 }}>Monitoring SPB</Title>
            <Text type="secondary">
              {data.length} Dokumen Terdaftar · Diperbarui{" "}
              {formatFullDate(new Date())}
            </Text>
          </div>
        </Space>
      </div>

      {/* Baru ditambahkan */}
      {recentItems.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <Text strong style={{ fontSize: 16, display: "block", marginBottom: 12 }}>
            Baru ditambahkan
          </Text>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
            {recentItems.map((item) => (
              <div key={item.id} style={{ minWidth: 200, flexShrink: 0 }}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => handleCardClick(item)}
                  style={{
                    borderRadius: 10,
                    background: "#fafafa",
                    cursor: "pointer",
                  }}
                >
                  <Space direction="vertical" size={0}>
                    <Text strong>
                      {item.spbNo && item.poNo
                        ? `SPB: ${item.spbNo} · PO: ${item.poNo}`
                        : item.spbNo
                        ? `SPB: ${item.spbNo}`
                        : `PO: ${item.poNo}`}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.date !== "-" ? formatDate(item.date) : "-"}
                    </Text>
                  </Space>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <Segmented<FilterType>
          size="large"
          options={["Semua", "Sudah di PO", "Belum di PO", "Datang", "SPB Selesai"]}
          value={filter}
          onChange={setFilter}
          style={{ padding: 4, fontWeight: 500 }}
        />
      </div>

      <Row gutter={[16, 16]}>
        {filteredAndSortedData.map((item) => (
          <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
            {renderCardContent(item)}
          </Col>
        ))}
      </Row>

      {filteredAndSortedData.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, width: "100%" }}>
          <Empty description="Tidak ada data SPB/PO untuk kategori ini." />
        </div>
      )}
    </div>
  );
};

export default MonitoringSPBPage;