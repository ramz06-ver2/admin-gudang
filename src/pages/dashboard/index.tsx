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
import { useStockExits } from "../../hooks/useStockExits";
import { formatFullDate } from "../../utility/format";
import { COLORS } from "../../utility/constants";

const { Title, Text } = Typography;

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

export const DashboardPage = () => {
  // Fetch SEMUA produk untuk statistik
  const { products, isLoading: isLoadingProducts } = useProducts();

  // HANYA material untuk tabel dashboard
  const materialProducts = products.filter((p) => p.category === "Material");

  // Barang keluar hari ini dari DB
  const { exits, isLoading: isLoadingExits } = useStockExits({
    onlyToday: true,
  });

  const entry = useQuickEntry({
    onFinish: () => {
      // Refresh data setelah entry
      // React Query auto-refetch karena invalidate via refetch di hook
    },
  });

  // Hitung statistik dari data real
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.stock ?? 0), 0);
  const todayOutbound = exits.reduce(
    (sum, e) => sum + e.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );
  const todayInbound = 0; // TODO: ambil dari tabel barang_masuk

  return (
    <>
      <SetupWizard
        open={entry.flow.wizardOpen}
        step={
          entry.flow.step === "done"
            ? "workplace"
            : (entry.flow.step as "workplace" | "person")
        }
        title={entry.flow.currentWizardData?.title ?? ""}
        placeholder={entry.flow.currentWizardData?.placeholder ?? ""}
        options={entry.flow.currentWizardData?.options ?? []}
        onSelect={entry.flow.selectWizardValue}
        onBack={
          entry.flow.step !== "workplace" ? entry.flow.backWizard : undefined
        }
        onClose={() => entry.flow.closeWizard()}
      />

      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Dashboard
        </Title>
        <Text type="secondary">{formatFullDate(new Date())}</Text>
      </div>

      <QuickEntryPanel entry={entry} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Produk"
            value={totalProducts}
            icon={<AppstoreOutlined />}
            color={COLORS.primary}
            suffix="item"
            loading={isLoadingProducts}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Stok"
            value={totalStock}
            icon={<InboxOutlined />}
            color={COLORS.success}
            loading={isLoadingProducts}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Masuk Hari Ini"
            value={todayInbound}
            icon={<ArrowDownOutlined />}
            color={COLORS.warning}
            loading={false}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Keluar Hari Ini"
            value={todayOutbound}
            icon={<ArrowUpOutlined />}
            color={COLORS.danger}
            loading={isLoadingExits}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* ✅ HANYA MATERIAL */}
          <StockTable products={materialProducts} loading={isLoadingProducts} />
        </Col>
        <Col xs={24} lg={8}>
          {/* ✅ DARI DATABASE */}
          <StockExitList exits={exits} loading={isLoadingExits} />
        </Col>
      </Row>
    </>
  );
};

export default DashboardPage;
