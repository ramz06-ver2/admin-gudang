import { useState } from "react";
import { Table, Typography, Tag, Space, Card, Input } from "antd";
import { formatNumber } from "../../utility/format";
import { SendOutlined, UserOutlined, SearchOutlined } from "@ant-design/icons";
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
  const [searchText, setSearchText] = useState("");

  const stockColumns = [
    { 
      dataIndex: "name", 
      title: "Nama Item",
      render: (v: string) => <Text strong style={{ fontSize: 14 }}>{v}</Text>
    },
    {
      dataIndex: "size",
      title: "Ukuran",
      width: 200,
      render: (v: string | null) => v ? <Text type="secondary">{v}</Text> : "-",
    },
    {
      dataIndex: "stock",
      title: "Stok Tersedia",
      width: 160,
      align: "right" as const,
      defaultSortOrder: "descend" as const,
      sorter: (a: Product, b: Product) => a.stock - b.stock,
      render: (v: number, r: Product) => (
        <Tag color={v > 0 ? "blue" : "red"} style={{ fontSize: 13, padding: "2px 8px" }}>
          {formatNumber(v)} {r.unit}
        </Tag>
      ),
    },
  ];

  const outboundColumns = [
    {
      title: "Waktu",
      dataIndex: "time",
      width: 100,
      render: (v: string) => <Text strong style={{ color: "#1677ff" }}>{v}</Text>,
    },
    {
      title: "Nama Item",
      dataIndex: "itemName",
      render: (v: string, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          {r.size && <Text type="secondary" style={{ fontSize: 12 }}>{r.size}</Text>}
        </Space>
      ),
    },
    {
      title: "Jumlah Keluar",
      dataIndex: "quantity",
      width: 140,
      align: "right" as const,
      render: (v: number, r: any) => (
        <Text strong style={{ color: "#ff4d4f", fontSize: 14 }}>
          {formatNumber(v)} <Text type="secondary" style={{ fontSize: 12 }}>{r.unit}</Text>
        </Text>
      ),
    },
    {
      title: "Lokasi Pekerjaan",
      dataIndex: "destination",
      width: 200,
      render: (v: string | null) =>
        v ? <Tag icon={<SendOutlined />} color="cyan">{v}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: "Pengambil (PIC)",
      dataIndex: "person",
      width: 180,
      render: (v: string) => (
        <Text style={{ fontSize: 13, color: "#595959" }}><UserOutlined /> {v}</Text>
      ),
    },
  ];

  let tableData: any[] = [];
  if (type === "stock") {
    tableData = (props as StockProps).dataSource;
    if (searchText) {
       tableData = tableData.filter(item => 
          item.name.toLowerCase().includes(searchText.toLowerCase()) || 
          (item.size && item.size.toLowerCase().includes(searchText.toLowerCase()))
       );
    }
  } else if (type === "outbound") {
    tableData = (props as OutboundProps).dataSource.flatMap((exit) =>
      exit.items.map((item) => ({
        ...item,
        transactionId: exit.id,
        time: exit.time,
        person: exit.person,
        destination: exit.destination,
      }))
    );
    if (searchText) {
       tableData = tableData.filter(item => 
          item.itemName.toLowerCase().includes(searchText.toLowerCase()) || 
          (item.size && item.size.toLowerCase().includes(searchText.toLowerCase())) ||
          item.person.toLowerCase().includes(searchText.toLowerCase())
       );
    }
  }

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 12, border: "1px solid #f0f0f0", overflow: "hidden" }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", background: "#fff" }}>
         <Input 
            placeholder="Cari berdasarkan nama atau ukuran..." 
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            allowClear
            size="large"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ maxWidth: 400, borderRadius: 8 }}
         />
      </div>

      <Table
        dataSource={tableData}
        rowKey={(record: any) =>
          type === "stock" ? record.id : `${record.transactionId}-${record.itemId}`
        }
        loading={loading}
        pagination={{ pageSize: 20, size: "small", showSizeChanger: false }}
        size="middle"
        scroll={{ x: 750 }}
        columns={type === "stock" ? stockColumns : outboundColumns}
        rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
      />
      {/* Sedikit style tambahan untuk merapikan baris */}
      <style>{`
        .table-row-light { background-color: #ffffff; }
        .table-row-dark { background-color: #fafafa; }
        .ant-table-thead > tr > th { background: #f5f5f5 !important; font-weight: 600; }
      `}</style>
    </Card>
  );
};