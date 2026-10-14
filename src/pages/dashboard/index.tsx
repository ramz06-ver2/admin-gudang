import { useState, useEffect, useMemo } from "react";
import { Card, Col, Row, Statistic, Typography } from "antd";
import {
  AppstoreOutlined,
  InboxOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";
import { SetupWizard } from "../../components/entry/SetupWizard";
import { QuickEntryPanel } from "../../components/dashboard/QuickPanel";
import { StockTable } from "../../components/dashboard/StockTable";
import { StockExitList } from "../../components/dashboard/StockExitList";
import { useQuickEntry } from "../../hooks/useQuickEntry";
import { useProducts } from "../../hooks/useProducts";
import { mockStockExits } from "../../mocks/stockExitList";
import { formatFullDate, formatNumber } from "../../utility/format";
import { COLORS } from "../../utility/constants";
import type { Product, StockExit } from "../../types";

const { Title, Text } = Typography;

// ============================================
// Mini stat card — selalu tampil walau 0
// ============================================
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
  loading?: boolean;
}

const StatCard = ({
  title,
  value,
  icon,
  color,
  suffix,
  loading,
}: StatCardProps) => (
  <Card
    variant="borderless"
    style={{ borderRadius: 12 }}
    styles={{ body: { padding: 16 } }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}15`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {title}
        </Text>
        <Statistic
          value={loading ? 0 : value}
          suffix={suffix}
          valueStyle={{
            color,
            fontWeight: 600,
            fontSize: 22,
            lineHeight: 1.2,
          }}
          loading={loading}
        />
      </div>
    </div>
  </Card>
);

// ============================================
// Dashboard Page
// ============================================
export const DashboardPage = () => {
  const { products: fetchedProducts, isLoading } = useProducts();
  const [products, setProducts] = useState<Product[]>([]);
  const [exits, setExits] = useState<StockExit[]>(mockStockExits);

  // Sync data Supabase → local state
  useEffect(() => {
    if (fetchedProducts.length > 0) {
      setProducts(fetchedProducts);
    }
  }, [fetchedProducts]);

  const entry = useQuickEntry({
    onFinish: (exit) => {
      setProducts((prev) =>
        prev.map((p) => {
          const line = exit.items.find((i) => i.itemId === p.id);
          if (!line) return p;
          return { ...p, stock: Math.max(0, p.stock - line.quantity) };
        }),
      );
      setExits((prev) => [exit, ...prev]);
    },
  });

  // ==========================================
  // Hitung statistik (selalu angka, tidak pernah undefined)
  // ==========================================
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock ?? 0), 0);

    // Barang masuk hari ini — dihitung dari log barang masuk
    // (sementara 0 karena belum ada fitur barang masuk)
    const todayInbound = 0;

    // Barang keluar hari ini — dihitung dari `exits`
    const today = new Date().toISOString().split("T")[0];
    const todayOutbound = exits
      .filter((e) => e.date === today)
      .reduce((sum, e) => sum + e.items.reduce((s, i) => s + i.quantity, 0), 0);

    return { totalProducts, totalStock, todayInbound, todayOutbound };
  }, [products, exits]);

  return (
    <>
      {/* Wizard */}
      <SetupWizard
        open={entry.flow.wizardOpen}
        step={
          entry.flow.step === "done"
            ? "team"
            : (entry.flow.step as "team" | "person" | "workplace")
        }
        title={entry.flow.currentWizardData?.title ?? ""}
        placeholder={entry.flow.currentWizardData?.placeholder ?? ""}
        options={entry.flow.currentWizardData?.options ?? []}
        onSelect={entry.flow.selectWizardValue}
        onBack={entry.flow.step !== "team" ? entry.flow.backWizard : undefined}
        onClose={() => entry.flow.closeWizard()}
      />

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Dashboard
        </Title>
        <Text type="secondary">{formatFullDate(new Date())}</Text>
      </div>

      {/* Quick Entry — search bar */}
      <QuickEntryPanel entry={entry} />

      {/* 4 Stat Cards — SELALU TAMPIL walau 0 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Produk"
            value={stats.totalProducts}
            icon={<AppstoreOutlined />}
            color={COLORS.primary}
            suffix="item"
            loading={isLoading}
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
            loading={false}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Keluar Hari Ini"
            value={stats.todayOutbound}
            icon={<ArrowUpOutlined />}
            color={COLORS.danger}
            loading={false}
          />
        </Col>
      </Row>

      {/* Bottom: Stok (kiri besar) + Barang Keluar (kanan kecil) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <StockTable products={products} loading={isLoading} />
        </Col>
        <Col xs={24} lg={8}>
          <StockExitList exits={exits} />
        </Col>
      </Row>
    </>
  );
};

export default DashboardPage;
