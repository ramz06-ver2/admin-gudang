// src/features/products/components/InventoryTable.tsx
import { useEffect, useState } from "react";
import { Table, Typography, Tag, Space, Card, Input, Grid } from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatNumber } from "../../../shared/lib/format";
import { SendOutlined, UserOutlined, SearchOutlined } from "@ant-design/icons";
import type { Product, StockExit, StockExitItem } from "../../../shared/types";

const { Text } = Typography;

interface OutboundRow extends StockExitItem {
  transactionId: number;
  time: string;
  person: string;
  destination: string | null;
}

type InventoryTableProps =
  | { type: "stock"; dataSource: Product[]; loading?: boolean }
  | { type: "outbound"; dataSource: StockExit[]; loading?: boolean };

export const InventoryTable = (props: InventoryTableProps) => {
  const { type, loading } = props;
  const [searchText, setSearchText] = useState("");

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // Tinggi viewport dipantau manual supaya scroll.y responsif
  const [vh, setVh] = useState<number>(
    typeof window !== "undefined" ? window.innerHeight : 900,
  );
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Mobile: kurangi 220 (header+tabs+search+pagination compact)
  // PC    : kurangi 380
  // Min 280 agar di layar pendek tabel tetap tampil
  const scrollY = Math.max(280, vh - (isMobile ? 220 : 380));

  const stockColumns: ColumnsType<Product> = [
    {
      dataIndex: "name",
      title: "Nama Item",
      ellipsis: true,
      render: (v: string) => (
        <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
          {v}
        </Text>
      ),
    },
    {
      dataIndex: "size",
      title: "Ukuran",
      width: isMobile ? 110 : 200,
      ellipsis: true,
      render: (v: string | null) =>
        v ? <Text type="secondary">{v}</Text> : "-",
    },
    {
      dataIndex: "stock",
      title: "Stok",
      width: isMobile ? 96 : 160,
      align: "right",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.stock - b.stock,
      render: (v, r) => (
        <Tag
          color={v > 0 ? "blue" : "red"}
          style={{ fontSize: isMobile ? 11 : 13, margin: 0 }}
        >
          {formatNumber(v)} {r.unit}
        </Tag>
      ),
    },
  ];

  const outboundColumns: ColumnsType<OutboundRow> = [
    {
      title: "Waktu",
      dataIndex: "time",
      width: isMobile ? 70 : 100,
      render: (v: string) => (
        <Text strong style={{ color: "#1677ff", fontSize: isMobile ? 12 : 14 }}>
          {v}
        </Text>
      ),
    },
    {
      title: "Nama Item",
      dataIndex: "itemName",
      ellipsis: true,
      render: (v: string, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
            {v}
          </Text>
          {r.size && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.size}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Jumlah",
      dataIndex: "quantity",
      width: isMobile ? 84 : 140,
      align: "right",
      render: (v, r) => (
        <Text
          strong
          style={{ color: "#ff4d4f", fontSize: isMobile ? 13 : 14 }}
        >
          {formatNumber(v)}{" "}
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.unit}
          </Text>
        </Text>
      ),
    },
    {
      title: "Lokasi",
      dataIndex: "destination",
      width: isMobile ? 120 : 200,
      ellipsis: true,
      render: (v) =>
        v ? (
          <Tag
            icon={<SendOutlined />}
            color="cyan"
            style={{ fontSize: isMobile ? 11 : 12, margin: 0 }}
          >
            {v}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "PIC",
      dataIndex: "person",
      width: isMobile ? 110 : 180,
      ellipsis: true,
      render: (v: string) => (
        <Text style={{ fontSize: isMobile ? 12 : 13, color: "#595959" }}>
          <UserOutlined /> {v}
        </Text>
      ),
    },
  ];

  const lowerSearch = searchText.trim().toLowerCase();

  const stockData =
    type === "stock"
      ? props.dataSource.filter(
          (item) =>
            !lowerSearch ||
            item.name.toLowerCase().includes(lowerSearch) ||
            (item.size && item.size.toLowerCase().includes(lowerSearch)),
        )
      : [];

  const outboundData =
    type === "outbound"
      ? props.dataSource
          .flatMap((exit) =>
            exit.items.map((item) => ({
              ...item,
              transactionId: exit.id,
              time: exit.time,
              person: exit.person,
              destination: exit.destination,
            })),
          )
          .filter(
            (item) =>
              !lowerSearch ||
              item.itemName.toLowerCase().includes(lowerSearch) ||
              item.person.toLowerCase().includes(lowerSearch),
          )
      : [];

  // ✅ Mobile: x = max-content (kolom bisa menyempit & muat layar).
  // PC    : x = 750 (kolom lega).
  const scrollConfig = isMobile
    ? { x: "max-content" as const, y: scrollY }
    : { x: 750, y: scrollY };

  const paginationConfig = {
    pageSize: 20,
    size: "small" as const,
    showSizeChanger: !isMobile,
    showTotal: (total: number) => `Total ${total} item`,
    simple: isMobile,
  };

  // ✅ Card style: full-bleed 100vw di mobile (edge-to-edge), border-radius 0
  const cardStyle = isMobile
    ? {
        width: "100vw",
        position: "relative" as const,
        left: "50%",
        transform: "translateX(-50%)",
        borderRadius: 0,
        border: "none",
      }
    : {
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      };

  return (
    <Card
      variant="borderless"
      style={cardStyle}
      styles={{ body: { padding: 0 } }}
    >
      <div
        style={{
          padding: isMobile ? "10px 12px" : "16px 20px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Input
          placeholder="Cari..."
          prefix={<SearchOutlined />}
          allowClear
          size={isMobile ? "middle" : "large"}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: isMobile ? "100%" : 400 }}
        />
      </div>

      {type === "stock" ? (
        <Table<Product>
          dataSource={stockData}
          rowKey="id"
          loading={loading}
          size={isMobile ? "small" : "middle"}
          pagination={paginationConfig}
          scroll={scrollConfig}
          sticky
          columns={stockColumns}
          rowClassName={(_, i) =>
            i % 2 === 0 ? "table-row-light" : "table-row-dark"
          }
        />
      ) : (
        <Table<OutboundRow>
          dataSource={outboundData}
          rowKey={(r) => `${r.transactionId}-${r.itemId}`}
          loading={loading}
          size={isMobile ? "small" : "middle"}
          pagination={paginationConfig}
          scroll={scrollConfig}
          sticky
          columns={outboundColumns}
          rowClassName={(_, i) =>
            i % 2 === 0 ? "table-row-light" : "table-row-dark"
          }
        />
      )}
    </Card>
  );
};