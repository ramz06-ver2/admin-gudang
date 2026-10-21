import { useState } from "react";
import { Table, Typography, Tag, Space, Card, Input } from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatNumber } from "../../../shared/lib/format";
import { SendOutlined, UserOutlined, SearchOutlined } from "@ant-design/icons";
import type { Product, StockExit, StockExitItem } from "../../../shared/types";

const { Text } = Typography;

interface OutboundRow extends StockExitItem { transactionId: number; time: string; person: string; destination: string | null; }

type InventoryTableProps = 
  | { type: "stock"; dataSource: Product[]; loading?: boolean }
  | { type: "outbound"; dataSource: StockExit[]; loading?: boolean };

export const InventoryTable = (props: InventoryTableProps) => {
  const { type, loading } = props;
  const [searchText, setSearchText] = useState("");

  const stockColumns: ColumnsType<Product> = [
    { dataIndex: "name", title: "Nama Item", render: (v: string) => <Text strong style={{ fontSize: 14 }}>{v}</Text> },
    { dataIndex: "size", title: "Ukuran", width: 200, render: (v: string | null) => v ? <Text type="secondary">{v}</Text> : "-" },
    { dataIndex: "stock", title: "Stok Tersedia", width: 160, align: "right", defaultSortOrder: "descend", sorter: (a, b) => a.stock - b.stock, render: (v, r) => <Tag color={v > 0 ? "blue" : "red"} style={{ fontSize: 13 }}>{formatNumber(v)} {r.unit}</Tag> },
  ];

  const outboundColumns: ColumnsType<OutboundRow> = [
    { title: "Waktu", dataIndex: "time", width: 100, render: (v: string) => <Text strong style={{ color: "#1677ff" }}>{v}</Text> },
    { title: "Nama Item", dataIndex: "itemName", render: (v: string, r) => <Space direction="vertical" size={0}><Text strong>{v}</Text>{r.size && <Text type="secondary" style={{ fontSize: 12 }}>{r.size}</Text>}</Space> },
    { title: "Jumlah", dataIndex: "quantity", width: 140, align: "right", render: (v, r) => <Text strong style={{ color: "#ff4d4f", fontSize: 14 }}>{formatNumber(v)} <Text type="secondary" style={{ fontSize: 12 }}>{r.unit}</Text></Text> },
    { title: "Lokasi", dataIndex: "destination", width: 200, render: (v) => v ? <Tag icon={<SendOutlined />} color="cyan">{v}</Tag> : <Text type="secondary">-</Text> },
    { title: "PIC", dataIndex: "person", width: 180, render: (v: string) => <Text style={{ fontSize: 13, color: "#595959" }}><UserOutlined /> {v}</Text> },
  ];

  const lowerSearch = searchText.trim().toLowerCase();

  const stockData = type === "stock" ? props.dataSource.filter((item) => !lowerSearch || item.name.toLowerCase().includes(lowerSearch) || (item.size && item.size.toLowerCase().includes(lowerSearch))) : [];
  const outboundData = type === "outbound" ? props.dataSource.flatMap((exit) => exit.items.map((item) => ({ ...item, transactionId: exit.id, time: exit.time, person: exit.person, destination: exit.destination }))).filter((item) => !lowerSearch || item.itemName.toLowerCase().includes(lowerSearch) || item.person.toLowerCase().includes(lowerSearch)) : [];

  return (
    <Card variant="borderless" style={{ borderRadius: 12, border: "1px solid #f0f0f0", overflow: "hidden" }} styles={{ body: { padding: 0 } }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
        <Input placeholder="Cari..." prefix={<SearchOutlined />} allowClear size="large" value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ maxWidth: 400 }} />
      </div>
      {type === "stock" ? <Table<Product> dataSource={stockData} rowKey="id" loading={loading} pagination={{ pageSize: 20, size: "small" }} scroll={{ x: 750 }} columns={stockColumns} rowClassName={(_, i) => (i % 2 === 0 ? "table-row-light" : "table-row-dark")} /> : <Table<OutboundRow> dataSource={outboundData} rowKey={(r) => `${r.transactionId}-${r.itemId}`} loading={loading} pagination={{ pageSize: 20, size: "small" }} scroll={{ x: 750 }} columns={outboundColumns} rowClassName={(_, i) => (i % 2 === 0 ? "table-row-light" : "table-row-dark")} />}
    </Card>
  );
};