import { Card, Table, Typography } from "antd";
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
    style={{ borderRadius: 12 }}
    styles={{ body: { padding: 0 } }}
  >
    <Table<Product>
      dataSource={products}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10, size: "small" }}
      size="small"
      columns={[
        { dataIndex: "code", title: "Kode", width: 110 },
        { dataIndex: "name", title: "Nama", ellipsis: true },
        {
          dataIndex: "size",
          title: "Ukuran",
          width: 120,
          render: (v: string | null) => v ?? "-",
        },
        {
          dataIndex: "stock",
          title: "Stok",
          width: 130,
          align: "right",
          sorter: (a, b) => a.stock - b.stock,
          render: (v: number, r: Product) => (
            <Text strong style={{ fontSize: 15 }}>
              {formatNumber(v)}{" "}
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                {r.unit}
              </Text>
            </Text>
          ),
        },
      ]}
    />
  </Card>
);
