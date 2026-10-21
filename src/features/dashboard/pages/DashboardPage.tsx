import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Col, Row, Typography } from "antd";
import { AppstoreOutlined, InboxOutlined, ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { SetupWizard } from "../../stock-out/components/SetupWizard";
import { QuickEntryPanel } from "../components/QuickPanel";
import { StatCard } from "../components/StatCard";
import { StockTable } from "../components/StockTable";
import { StockExitList } from "../components/StockExitList";
import { LowStockTable } from "../components/LowStockTable";
import { StockInChart } from "../components/StockInChart";
import { useEntryFlow } from "../../stock-out/hooks/useEntryFlow";
import { useProducts } from "../../products/useProducts";
import { useStockExits } from "../../stock-out/useStockExits";
import { useDashboardStats } from "../useDashboardStats";
import { useKeyboardShortcut } from "../../../shared/hooks/useKeyboardShortcut";
import { formatFullDate } from "../../../shared/lib/format";
import { COLORS } from "../../../shared/lib/constants";

const { Title, Text } = Typography;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { products, isLoading: isLoadingProducts } = useProducts();
  const { stats, isLoading: isLoadingStats } = useDashboardStats();

  const materialProducts = products.filter((p) => p.category === "Material");
  const { exits, isLoading: isLoadingExits } = useStockExits({ onlyToday: true });
  const flow = useEntryFlow();

  // ✅ PERBAIKAN: Ganti Tab dengan Alt+M (Standard A11y)
  useKeyboardShortcut({
    key: "m", altKey: true, ignoreInputs: true, enabled: !flow.wizardOpen,
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

  return (
    <>
      <SetupWizard open={flow.wizardOpen} step={flow.step === "done" ? "person" : (flow.step as "person" | "workplace")} title={flow.currentWizardData?.title ?? ""} placeholder={flow.currentWizardData?.placeholder ?? ""} options={flow.currentWizardData?.options ?? []} onSelect={flow.selectWizardValue} onBack={flow.step !== "person" ? flow.backWizard : undefined} onClose={() => flow.closeWizard()} />

      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 4 }}>Dashboard</Title>
        <Text type="secondary">{formatFullDate(new Date())}</Text>
      </div>

      <QuickEntryPanel onTriggerStart={() => flow.openWizard()} />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}><StatCard title="Total Barang" value={stats.totalProducts} icon={<AppstoreOutlined />} color={COLORS.primary} suffix="item" loading={isLoadingStats} /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard title="Total Stok" value={stats.totalStock} icon={<InboxOutlined />} color={COLORS.success} loading={isLoadingStats} /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard title="Masuk Hari Ini" value={stats.todayInbound} icon={<ArrowDownOutlined />} color={COLORS.warning} loading={isLoadingStats} /></Col>
        <Col xs={24} sm={12} lg={6}><StatCard title="Keluar Hari Ini" value={stats.todayOutbound} icon={<ArrowUpOutlined />} color={COLORS.danger} loading={isLoadingStats} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}><StockTable products={materialProducts} loading={isLoadingProducts} /></Col>
        <Col xs={24} lg={8}><StockExitList exits={exits} loading={isLoadingExits} /></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}><StockInChart /></Col>
        <Col xs={24} lg={10}><LowStockTable /></Col>
      </Row>
    </>
  );
}