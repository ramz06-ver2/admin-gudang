import { Card, Empty, Skeleton, Table } from "antd";

// ✅ Path import disesuaikan dengan arsitektur baru
import { useLowStock } from "../useLowStock"; // Hook sekarang berada di dalam fitur dashboard
import { StatusBadge } from "../../../shared/components/StatusBadge"; // Komponen umum naik ke shared
import type { Product } from "../../../shared/types"; // Tipe naik ke shared

export const LowStockTable = () => {
  const { items, isLoading } = useLowStock(5);

  if (isLoading) {
    return (
      <Card
        title="⚠️ Stok Menipis"
        variant="borderless"
        style={{ borderRadius: 12 }}
      >
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  return (
    <Card
      title="⚠️ Stok Menipis"
      variant="borderless"
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
              width: 80,
              align: "right",
              render: (v: number, r: Product) => (
                <strong>
                  {v} {r.unit}
                </strong>
              ),
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