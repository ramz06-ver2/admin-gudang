import { Card, Table, Typography, Tag } from "antd";
import { formatNumber } from "../../utility/format";
import type { Product } from "../../types";

const { Text } = Typography;

interface Props {
  products: Product[];
  loading?: boolean;
}

export const StockTable = ({ products, loading }: Props) => (
  <Card
    title="📦 Stok Persediaan Barang"
    variant="borderless"
    style={{ borderRadius: 12, border: "1px solid #f0f0f0", overflow: "hidden" }}
    styles={{ body: { padding: 0 } }}
  >
    <Table<Product>
      dataSource={products}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 8, size: "small", showSizeChanger: false }}
      size="middle"
      scroll={{ x: 500 }}
      rowClassName={(_, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
      columns={[
        { 
          dataIndex: "name", 
          title: "Nama Barang", 
          ellipsis: true,
          render: (v: string) => <Text strong>{v}</Text>
        },
        {
          dataIndex: "size",
          title: "Ukuran",
          width: 180,
          render: (v: string | null) => v ? <Text type="secondary">{v}</Text> : "-",
        },
        {
          dataIndex: "stock",
          title: "Stok",
          width: 120,
          align: "right",
          defaultSortOrder: "descend",
          sorter: (a, b) => a.stock - b.stock,
          render: (v: number, r: Product) => (
            <Tag color={v > 0 ? "blue" : "red"} style={{ fontSize: 13, padding: "2px 8px", margin: 0 }}>
              {formatNumber(v)} {r.unit}
            </Tag>
          ),
        },
      ]}
    />
  </Card>
);