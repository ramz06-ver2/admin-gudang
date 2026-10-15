import { Table, Typography, Tag, Space, Card } from "antd";
import { formatNumber } from "../../utility/format";
import { SendOutlined, UserOutlined } from "@ant-design/icons";
import type { Product, StockExit } from "../../types";

const { Text } = Typography;

type TableType = "stock" | "outbound";

interface BaseProps {
  type: TableType;
  loading?: boolean;
}

interface StockProps extends BaseProps {
  type: "stock";
  dataSource: Product[];
}

interface OutboundProps extends BaseProps {
  type: "outbound";
  dataSource: StockExit[];
}

type InventoryTableProps = StockProps | OutboundProps;

export const InventoryTable = (props: InventoryTableProps) => {
  const { type, loading } = props;

  // ==========================================
  // Stock table columns
  // ==========================================
  const stockColumns = [
    { dataIndex: "code", title: "Kode", width: 130 },
    { dataIndex: "name", title: "Nama Item", ellipsis: true },
    {
      dataIndex: "size",
      title: "Ukuran",
      width: 150,
      render: (v: string | null) => v ?? "-",
    },
    {
      dataIndex: "stock",
      title: "Stok Tersedia",
      width: 150,
      align: "right" as const,
      sorter: (a: Product, b: Product) => a.stock - b.stock,
      render: (v: number, r: Product) => (
        <Text strong style={{ fontSize: 14 }}>
          {formatNumber(v)}{" "}
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {r.unit}
          </Text>
        </Text>
      ),
    },
  ];

  // ==========================================
  // Outbound table columns (per-item, flat)
  // ==========================================
  const outboundColumns = [
    {
      title: "Waktu",
      dataIndex: "time",
      width: 100,
      render: (v: string) => (
        <Text strong style={{ color: "#1677ff" }}>
          {v}
        </Text>
      ),
    },
    {
      title: "Nama Item",
      dataIndex: "itemName",
      ellipsis: true,
      render: (v: string, r: any) => (
        <>
          <Text>{v}</Text>
          {r.size && (
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
              ({r.size})
            </Text>
          )}
        </>
      ),
    },
    {
      title: "Jumlah Keluar",
      dataIndex: "quantity",
      width: 140,
      align: "right" as const,
      render: (v: number, r: any) => (
        <Text strong style={{ color: "#ff4d4f" }}>
          {formatNumber(v)}{" "}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.unit}
          </Text>
        </Text>
      ),
    },
    {
      title: "Tujuan",
      dataIndex: "destination",
      width: 200,
      render: (v: string | null) =>
        v ? (
          <Tag icon={<SendOutlined />} color="blue">
            {v}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Pengambil (PIC)",
      dataIndex: "person",
      width: 180,
      render: (v: string) => (
        <Text style={{ fontSize: 13 }}>
          <UserOutlined /> {v}
        </Text>
      ),
    },
  ];

  // ==========================================
  // Prepare data
  // ==========================================
  let tableData: any[] = [];
  if (type === "stock") {
    tableData = (props as StockProps).dataSource;
  } else if (type === "outbound") {
    // Flatten: 1 row per item
    tableData = (props as OutboundProps).dataSource.flatMap((exit) =>
      exit.items.map((item) => ({
        ...item,
        transactionId: exit.id,
        time: exit.time,
        person: exit.person,
        destination: exit.destination,
      })),
    );
  }

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
      styles={{ body: { padding: 0 } }}
    >
      <Table
        dataSource={tableData}
        rowKey={(record: any) =>
          type === "stock"
            ? record.id
            : `${record.transactionId}-${record.itemId}`
        }
        loading={loading}
        pagination={{ pageSize: 15, size: "small", showSizeChanger: true }}
        size="middle"
        scroll={{ x: 900 }}
        columns={type === "stock" ? stockColumns : outboundColumns}
      />
    </Card>
  );
};
