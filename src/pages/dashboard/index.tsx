import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useEntryFlow } from "../../hooks/useEntryFlow";
import { useProducts } from "../../hooks/useProducts";
import { useStockExits } from "../../hooks/useStockExits";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
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
  const navigate = useNavigate();
  const { products, isLoading: isLoadingProducts } = useProducts();

  const materialProducts = products.filter((p) => p.category === "Material");

  const { exits, isLoading: isLoadingExits } = useStockExits({
    onlyToday: true,
  });

  const flow = useEntryFlow();

  // Shortcut Ctrl + K
  useKeyboardShortcut({
    key: "k",
    ctrlKey: true,
    enabled: !flow.wizardOpen,
    handler: () => flow.openWizard(),
  });

  // Shortcut Tab
  useKeyboardShortcut({
    key: "Tab",
    ignoreInputs: true,
    enabled: !flow.wizardOpen,
    handler: () => flow.openWizard(),
  });

  // ✅ Shortcut M (Tambahan)
  useKeyboardShortcut({
    key: "m",
    ignoreInputs: true,
    enabled: !flow.wizardOpen,
    handler: () => flow.openWizard(),
  });

  useEffect(() => {
    if (flow.isReady && flow.person && flow.workplace) {
      const personName = encodeURIComponent(flow.person.name);
      const workplaceName = encodeURIComponent(flow.workplace.name);
      flow.resetSession();
      navigate(`/entry?person=${personName}&workplace=${workplaceName}`);
    }
  }, [flow, navigate]);

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
        open={flow.wizardOpen}
        step={
          flow.step === "done"
            ? "person"
            : (flow.step as "person" | "workplace")
        }
        title={flow.currentWizardData?.title ?? ""}
        placeholder={flow.currentWizardData?.placeholder ?? ""}
        options={flow.currentWizardData?.options ?? []}
        onSelect={flow.selectWizardValue}
        onBack={flow.step !== "person" ? flow.backWizard : undefined}
        onClose={() => flow.closeWizard()}
      />

      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Dashboard
        </Title>
        <Text type="secondary">{formatFullDate(new Date())}</Text>
      </div>

      <QuickEntryPanel onTriggerStart={() => flow.openWizard()} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Barang"
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
          <StockTable products={materialProducts} loading={isLoadingProducts} />
        </Col>
        <Col xs={24} lg={8}>
          <StockExitList exits={exits} loading={isLoadingExits} />
        </Col>
      </Row>
    </>
  );
};

export default DashboardPage;