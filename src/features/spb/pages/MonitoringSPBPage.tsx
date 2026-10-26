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
  Input,
} from "antd";
import { useMonitoringSPB } from "../useMonitoringSPB";
import type { SPBDocumentGroup } from "../../../shared/types";
import { formatFullDate, formatDate } from "../../../shared/lib/format";
import {
  FileTextOutlined,
  ArrowRightOutlined,
  SearchOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

// ✅ Tambahan Filter Baru
type FilterType =
  "Semua" | "Belum di PO" | "Sudah di PO" | "Datang" | "Selesai";

const getNumberFromStr = (spb: string | null, po: string | null) => {
  const str = spb || po;
  if (!str) return 999999;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
};

export default function MonitoringSPBPage() {
  const { data, isLoading, error } = useMonitoringSPB();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [filter, setFilter] = useState<FilterType>("Semua");
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ 1. Pisahkan Data Terbaru (SPB di atas, PO di bawah)
  const { recentSPB, recentPO } = useMemo(() => {
    const sortedByLatestDate = [...data].sort((a, b) => {
      const dateA = a.date !== "-" ? new Date(a.date).getTime() : 0;
      const dateB = b.date !== "-" ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    // Ambil maksimal 5 untuk masing-masing agar rapi
    const spbItems = sortedByLatestDate
      .filter((item) => item.spbNo !== null)
      .slice(0, 5);
    const poItems = sortedByLatestDate
      .filter((item) => item.spbNo === null)
      .slice(0, 5);

    return { recentSPB: spbItems, recentPO: poItems };
  }, [data]);

  // ✅ 2. Filter & Pencarian
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((item) => {
      // Cek Pencarian (No SPB atau No PO)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (item.spbNo && item.spbNo.toLowerCase().includes(searchLower)) ||
        (item.poNo && item.poNo.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      // Cek Status
      switch (filter) {
        case "Belum di PO":
          return !item.poNo || item.poNo === "-";
        case "Sudah di PO":
          return (
            !!item.poNo &&
            item.poNo !== "-" &&
            item.status !== "Datang" &&
            item.status !== "Selesai"
          );
        case "Datang":
          // Datang mencakup yang statusnya Datang atau Selesai
          return item.status === "Datang" || item.status === "Selesai";
        case "Selesai":
          return item.status === "Selesai";
        default:
          return true;
      }
    });

    // Sorting
    const getStatusWeight = (status?: string) => {
      if (status === "Sudah PO" || status === "Belum PO") return 1;
      if (status === "Datang") return 2;
      if (status === "Selesai") return 3;
      return 4;
    };

    return filtered.sort((a, b) => {
      const weightA = getStatusWeight(a.status);
      const weightB = getStatusWeight(b.status);
      if (weightA !== weightB) return weightA - weightB;

      const numA = getNumberFromStr(a.spbNo, a.poNo);
      const numB = getNumberFromStr(b.spbNo, b.poNo);
      if (numA !== numB) return numA - numB;

      return (a.spbNo || a.poNo || "").localeCompare(b.spbNo || b.poNo || "");
    });
  }, [data, filter, searchTerm]);

  const handleCardClick = (item: SPBDocumentGroup) => {
    const params = new URLSearchParams();
    if (item.spbNo) {
      params.set("spb", String(item.spbNo));
    } else if (item.poNo && item.poNo !== "NO_PO" && item.poNo !== "-") {
      params.set("po", String(item.poNo));
    }
    navigate(`/monitoring-spb/detail?${params.toString()}`);
  };

  const getStatusColor = (status?: string) => {
    if (status === "Belum PO") return "orange";
    if (status === "Sudah PO") return "blue";
    if (status === "Datang") return "green";
    if (status === "Selesai") return "cyan";
    return "default";
  };

  const renderCardContent = (item: SPBDocumentGroup) => {
    const hasSPB = item.spbNo !== null && item.spbNo !== "NO_SPB";
    const hasPO =
      item.poNo !== null && item.poNo !== "NO_PO" && item.poNo !== "-";

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
              <div style={{ fontWeight: 600, fontSize: 16 }}>{item.spbNo}</div>
            </div>
          )}

          {hasSPB && hasPO && <Divider style={{ margin: "8px 0" }} />}

          {hasPO && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                No. PO
              </Text>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  wordBreak: "break-word",
                }}
              >
                {item.poNo}
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
              color={getStatusColor(item.status)}
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

  const renderSmallCard = (item: SPBDocumentGroup) => {
    const hasSPB = item.spbNo && item.spbNo !== "NO_SPB";
    const hasPO = item.poNo && item.poNo !== "NO_PO" && item.poNo !== "-";

    return (
      <Card
        key={item.id}
        size="small"
        hoverable
        onClick={() => handleCardClick(item)}
        style={{ borderRadius: 10, background: "#fafafa", cursor: "pointer" }}
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
    // ✅ PERBAIKAN: overflowX hidden untuk mencegah scroll horizontal bocor di mobile
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        paddingBottom: 32,
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
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

        {/* Section SPB Terbaru */}
        {recentSPB.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text
              strong
              style={{ fontSize: 16, display: "block", marginBottom: 12 }}
            >
              Baru ditambahkan (SPB)
            </Text>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: screens.md
                  ? "repeat(5, 1fr)"
                  : "repeat(2, 1fr)",
                gap: 12,
              }}
            >
              {recentSPB.map(renderSmallCard)}
            </div>
          </div>
        )}

        {/* Section PO Terbaru */}
        {recentPO.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <Text
              strong
              style={{ fontSize: 16, display: "block", marginBottom: 12 }}
            >
              Baru ditambahkan (PO)
            </Text>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: screens.md
                  ? "repeat(5, 1fr)"
                  : "repeat(2, 1fr)",
                gap: 12,
              }}
            >
              {recentPO.map(renderSmallCard)}
            </div>
          </div>
        )}

        {/* ✅ Toolbar: Search & Filter */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <Input
            placeholder="Cari No. SPB atau No. PO..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            style={{ maxWidth: 300, width: "100%" }}
          />
          <Segmented<FilterType>
            size="middle"
            options={[
              "Semua",
              "Belum di PO",
              "Sudah di PO",
              "Datang",
              "Selesai",
            ]}
            value={filter}
            onChange={setFilter}
            style={{ padding: 4, fontWeight: 500, overflowX: "auto" }}
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
            <Empty description="Tidak ada data SPB/PO yang cocok dengan pencarian/filter." />
          </div>
        )}
      </div>
    </div>
  );
}
