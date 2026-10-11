import { Row, Col, Typography, Tag } from "antd";
import {
  AppstoreOutlined,
  InboxOutlined,
  ArrowDownOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { StatCard } from "../../components/dashboard/StatCard";
import { StockInChart } from "../../components/dashboard/StockInChart";
import { LowStockTable } from "../../components/dashboard/LowStockTable";
import { GlobalSearch } from "../../components/common/GlobalSearch";
import { useDashboardStats } from "../../hooks/useDashboardStats";
import { formatFullDate } from "../../utility/format";
import { COLORS } from "../../utility/constants";

export const DashboardPage = () => {
  const { stats, isLoading } = useDashboardStats();

  return (
    <>
      <GlobalSearch />

      <div style={{ padding: 4 }}>
        {/* Header halaman */}
        <div style={{ marginBottom: 20 }}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Dashboard
          </Typography.Title>
          <Typography.Text type="secondary">
            {formatFullDate(new Date())} · Tekan <Tag>Space</Tag> untuk cari
            produk & input barang masuk
          </Typography.Text>
        </div>

        {/* Baris 1: 4 stat card */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Total Produk"
              value={stats.totalProducts}
              icon={<AppstoreOutlined />}
              color={COLORS.primary}
              loading={isLoading}
              suffix="item"
            />
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Total Stok"
              value={stats.totalStock}
              icon={<InboxOutlined />}
              color={COLORS.success}
              loading={isLoading}
            />
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Masuk Hari Ini"
              value={stats.todayInbound}
              icon={<ArrowDownOutlined />}
              color={COLORS.warning}
              loading={isLoading}
            />
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="Stok Menipis"
              value={stats.lowStockCount}
              icon={<WarningOutlined />}
              color={COLORS.danger}
              loading={isLoading}
              suffix="item"
            />
          </Col>

          {/* Baris 2: grafik + tabel */}
          <Col xs={24} lg={16}>
            <StockInChart />
          </Col>

          <Col xs={24} lg={8}>
            <LowStockTable />
          </Col>
        </Row>
      </div>
    </>
  );
};

export default DashboardPage;