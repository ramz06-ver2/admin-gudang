import { Card, Empty, Skeleton, Table } from "antd";
import { useLowStock } from "../../hooks/useLowStock";
import { StatusBadge } from "../common/StatusBadge";
import type { Product } from "../../types";

export const LowStockTable = () => {
  const { items, isLoading } = useLowStock(5);

  if (isLoading) {
    return (
      <Card title="⚠️ Stok Menipis" style={{ borderRadius: 12 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  return (
    <Card
      title="⚠️ Stok Menipis"
      style={{ borderRadius: 12, height: "100%" }}
      styles={{ body: { padding: items.length ? 0 : 24 } }}
    >
      {items.length === 0 ? (
        <Empty description="Semua stok aman 👍" />
      ) : (
        <Table<Product>
          dataSource={items}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            { dataIndex: "code", title: "Kode", width: 90 },
            { dataIndex: "name", title: "Nama", ellipsis: true },
            {
              dataIndex: "stock",
              title: "Stok",
              width: 70,
              align: "right",
              render: (v: number) => <strong>{v}</strong>,
            },
            {
              dataIndex: "minStock",
              title: "Min",
              width: 60,
              align: "right",
            },
            {
              dataIndex: "status",
              title: "Status",
              width: 90,
              render: (s) => <StatusBadge status={s} />,
            },
          ]}
        />
      )}
    </Card>
  );
};