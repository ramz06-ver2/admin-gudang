import { useState, useMemo } from "react";
import { Typography, Card, Space, Tag, Row, Col, Divider, Spin, Segmented, Empty } from "antd"; // ✅ Tambahan Empty di sini
import { useMonitoringSPB, type SPBDocumentGroup } from "../../hooks/useMonitoringSPB";
import { formatFullDate, formatDate } from "../../utility/format";
import { CheckCircleOutlined, SyncOutlined, FileTextOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

type FilterType = "Semua" | "Sudah di PO" | "Belum di PO" | "Datang" | "SPB Selesai";

export const MonitoringSPBPage = () => {
  const { data, isLoading } = useMonitoringSPB();
  const [filter, setFilter] = useState<FilterType>("Semua");

  const recentItems = useMemo(() => {
    // Diambil dari 4 data teratas
    return [...data].slice(0, 4);
  }, [data]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter((item) => {
      switch (filter) {
        case "Sudah di PO":
          return item.poNo !== null;
        case "Belum di PO":
          return item.poNo === null;
        case "Datang":
        case "SPB Selesai":
          return item.status === "DATANG SESUAI" || item.status === "DATANG LEBIH";
        default:
          return true;
      }
    });

    // Urutkan berdasarkan no SPB terkecil, namun yang selesai dilempar ke paling bawah
    return filtered.sort((a, b) => {
      const aIsDone = a.status.includes("DATANG SESUAI") || a.status.includes("DATANG LEBIH");
      const bIsDone = b.status.includes("DATANG SESUAI") || b.status.includes("DATANG LEBIH");
      
      if (aIsDone && !bIsDone) return 1;
      if (!aIsDone && bIsDone) return -1;
      
      return a.sortNumber - b.sortNumber;
    });
  }, [data, filter]);

  const renderCardContent = (item: SPBDocumentGroup) => {
    const hasSPB = item.spbNo !== null;
    const hasPO = item.poNo !== null;
    
    const isDone = item.status.includes("DATANG SESUAI") || item.status.includes("DATANG LEBIH");
    const statusColor = isDone ? "success" : (item.status === "BELUM DATANG" ? "error" : "processing");
    const statusIcon = isDone ? <CheckCircleOutlined /> : <SyncOutlined spin />;

    return (
      <Card
        hoverable
        style={{ borderRadius: 12, height: "100%", border: "1px solid #f0f0f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
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
        </Space>
      </Card>
    );
  };

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: 50 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 32 }}>
      
      <div style={{ marginBottom: 24 }}>
        <Space align="center">
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "#1677ff15", color: "#1677ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            <FileTextOutlined />
          </div>
          <div>
            <Title level={3} style={{ margin: 0 }}>Monitoring SPB</Title>
            <Text type="secondary">
              {data.length} Dokumen Terdaftar - Diperbarui {formatFullDate(new Date())}
            </Text>
          </div>
        </Space>
      </div>

      {/* Baru ditambahkan */}
      <div style={{ marginBottom: 32 }}>
        <Text strong style={{ fontSize: 16, display: "block", marginBottom: 12 }}>Baru ditambahkan</Text>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
          {recentItems.map((item) => (
            <div key={item.id} style={{ minWidth: 200, flexShrink: 0 }}>
              <Card size="small" style={{ borderRadius: 10, background: "#fafafa" }}>
                <Space direction="vertical" size={0}>
                  <Text strong>{item.spbNo ? `SPB: ${item.spbNo}` : `PO: ${item.poNo}`}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(item.date)}</Text>
                </Space>
              </Card>
            </div>
          ))}
        </div>
      </div>

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