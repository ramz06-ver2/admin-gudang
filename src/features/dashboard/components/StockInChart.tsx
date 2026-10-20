import { Card, Empty, Skeleton } from "antd";
import { Line } from "@ant-design/plots";
import { useStockInChart } from "../../hooks/useStockInChart";
import { formatDate } from "../../utility/format";

export const StockInChart = () => {
  const { items, isLoading } = useStockInChart(30);

  if (isLoading) {
    return (
      <Card
        title="📈 Barang Masuk 30 Hari Terakhir"
        variant="borderless"
        style={{ borderRadius: 12 }}
      >
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card
        title="📈 Barang Masuk 30 Hari Terakhir"
        variant="borderless"
        style={{ borderRadius: 12, height: "100%" }}
      >
        <Empty description="Belum ada transaksi 30 hari terakhir" />
      </Card>
    );
  }

  const data = items.map((i) => ({
    date: formatDate(i.date),
    total: i.total,
  }));

  return (
    <Card
      title="📈 Barang Masuk 30 Hari Terakhir"
      variant="borderless"
      style={{ borderRadius: 12, height: "100%" }}
    >
      <Line
        data={data}
        xField="date"
        yField="total"
        height={280}
        smooth
        point={{ size: 4, shape: "circle" }}
        color="#1677ff"
        tooltip={{ showMarkers: false }}
        xAxis={{ label: { autoRotate: false, autoHide: true } }}
        yAxis={{
          label: {
            formatter: (v: string) => Number(v).toLocaleString("id-ID"),
          },
        }}
      />
    </Card>
  );
};