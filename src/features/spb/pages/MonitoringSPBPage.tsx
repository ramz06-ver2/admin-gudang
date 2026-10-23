import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Card,
  Space,
  Row,
  Col,
  Divider,
  Spin,
  Segmented,
  Empty,
  Alert,
  Tag,
  Grid,
} from "antd";
import { useMonitoringSPB } from "../useMonitoringSPB";
import type { SPBDocumentGroup } from "../../../shared/types";
import { formatFullDate, formatDate } from "../../../shared/lib/format";
import { FileTextOutlined, ArrowRightOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

// Filter murni hanya berdasarkan ketersediaan PO
type FilterType = "Semua" | "Sudah di PO" | "Belum di PO";

// Helper untuk mengambil angka dari string (contoh: "SPB-37" -> 37)
const getNumberFromStr = (str: string | null) => {
  if (!str) return 999999;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
};

export default function MonitoringSPBPage() {
  const { data, isLoading, error } = useMonitoringSPB();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [filter, setFilter] = useState<FilterType>("Semua");

  // ✅ 1. Card Kecil "Baru ditambahkan"
  // Urutkan berdasarkan tanggal terbaru, lalu ambil 10 teratas
  const recentItems = useMemo(() => {
    const sortedByLatestDate = [...data].sort((a, b) => {
      const dateA = a.date !== "-" ? new Date(a.date).getTime() : 0;
      const dateB = b.date !== "-" ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
    return sortedByLatestDate.slice(0, 10);
  }, [data]);

  // ✅ 2. Card Besar Utama
  const filteredAndSortedData = useMemo(() => {
    // Filter dulu
    const filtered = data.filter((item) => {
      switch (filter) {
        case "Sudah di PO":
          return (
            item.poNo !== null &&
            item.poNo !== "NO_PO" &&
            item.poNo !== "-"
          );
        case "Belum di PO":
          return (
            item.poNo === null ||
            item.poNo === "NO_PO" ||
            item.poNo === "-"
          );
        default:
          return true;
      }
    });

    // Lalu urutkan
    return filtered.sort((a, b) => {
      // A. Prioritas 1: Status "Datang" selalu di bawah
      const isADatang = a.status === "Datang";
      const isBDatang = b.status === "Datang";
      
      if (isADatang && !isBDatang) return 1;
      if (!isADatang && isBDatang) return -1;

      // B. Prioritas 2: Urutkan berdasarkan No SPB terkecil ke terbesar
      const numA = getNumberFromStr(a.spbNo);
      const numB = getNumberFromStr(b.spbNo);
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      // Fallback jika No SPB sama atau kosong
      return (a.spbNo || "").localeCompare(b.spbNo || "");
    });
  }, [data, filter]);

  const handleCardClick = (item: SPBDocumentGroup) => {
    const params = new URLSearchParams();

    if (item.spbNo) {
      params.set("spb", String(item.spbNo));
    } else if (
      item.poNo &&
      item.poNo !== "NO_PO" &&
      item.poNo !== "-"
    ) {
      params.set("po", String(item.poNo).split(",")[0].trim());
    }

    navigate(`/monitoring-spb/detail?${params.toString()}`);
  };

  const getStatusColor = (status?: string) => {
    if (status === "Belum PO") return "orange";
    if (status === "Sudah PO") return "blue";
    if (status === "Datang") return "green";
    return "default";
  };

  const renderCardContent = (item: SPBDocumentGroup) => {
    const hasSPB = item.spbNo !== null && item.spbNo !== "NO_SPB";
    const hasPO =
      item.poNo !== null &&
      item.poNo !== "NO_PO" &&
      item.poNo !== "-";

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
              <Text type="secondary" style={{ fontSize: 11 }}>
                No. SPB
              </Text>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {item.spbNo}
              </div>
            </div>
          )}

          {hasSPB && hasPO && <Divider style={{ margin: "8px 0" }} />}

          {hasPO && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                No. PO
              </Text>
              <div style={{ fontWeight: 600, fontSize: 16, wordBreak: "break-word" }}>
                {item.poNo}
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: "#8c8c8c", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div>Total: {item.itemsCount} Barang</div>
              <div style={{ marginTop: 4 }}>
                Tanggal: {item.date !== "-" ? formatDate(item.date) : "-"}
              </div>
            </div>
            
            <Tag color={getStatusColor(item.status)} style={{ margin: 0, fontWeight: 600 }}>
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
        description={
          (error as Error)?.message ?? "Coba muat ulang halaman"
        }
      />
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 32 }}>
      {/* Header */}
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
              {data.length} Dokumen Terdaftar · Diperbarui{" "}
              {formatFullDate(new Date())}
            </Text>
          </div>
        </Space>
      </div>

      {/* Section Baru Ditambahkan (10 Card: 5 Atas, 5 Bawah) */}
      {recentItems.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <Text
            strong
            style={{ fontSize: 16, display: "block", marginBottom: 12 }}
          >
            Baru ditambahkan
          </Text>
          {/* Menggunakan CSS Grid agar presisi 5 kolom di desktop */}
          <div style={{
            display: "grid",
            gridTemplateColumns: screens.md ? "repeat(5, 1fr)" : "repeat(2, 1fr)",
            gap: 12,
          }}>
            {recentItems.map((item) => {
              const hasSPB = item.spbNo && item.spbNo !== "NO_SPB";
              const hasPO =
                item.poNo &&
                item.poNo !== "NO_PO" &&
                item.poNo !== "-";

              return (
                <Card
                  key={item.id}
                  size="small"
                  hoverable
                  onClick={() => handleCardClick(item)}
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
                          : `PO: ${item.poNo}`}
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
      )}

      {/* Filter Segmented */}
      <div style={{ marginBottom: 20 }}>
        <Segmented<FilterType>
          size="large"
          options={["Semua", "Sudah di PO", "Belum di PO"]}
          value={filter}
          onChange={setFilter}
          style={{ padding: 4, fontWeight: 500 }}
        />
      </div>

      {/* Grid Kartu Utama */}
      <Row gutter={[16, 16]}>
        {filteredAndSortedData.map((item) => (
          <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
            {renderCardContent(item)}
          </Col>
        ))}
      </Row>

      {/* State Kosong */}
      {filteredAndSortedData.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, width: "100%" }}>
          <Empty description="Tidak ada data SPB/PO untuk kategori ini." />
        </div>
      )}
    </div>
  );
}