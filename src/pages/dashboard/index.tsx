import { useState } from "react";
import { Col, Row, Typography } from "antd";
import { SetupWizard } from "../../components/entry/SetupWizard";
import { QuickEntryPanel } from "../../components/dashboard/QuickPanel";
import { StockTable } from "../../components/dashboard/StockTable";
import { StockExitList } from "../../components/dashboard/StockExitList";
import { useQuickEntry } from "../../hooks/useQuickEntry";
import { mockProducts } from "../../mocks/products";
import { mockStockExits } from "../../mocks/stockExitList";
import { formatFullDate } from "../../utility/format";
import type { Product, StockExit } from "../../types";

const { Title, Text } = Typography;

export const DashboardPage = () => {
  // Data lokal — realtime update
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [exits, setExits] = useState<StockExit[]>(mockStockExits);

  // Quick entry — semua logic di hook
  const entry = useQuickEntry({
    onFinish: (exit) => {
      // 1. Update stok (kurangi)
      setProducts((prev) =>
        prev.map((p) => {
          const line = exit.items.find((i) => i.itemId === p.id);
          if (!line) return p;
          return { ...p, stock: Math.max(0, p.stock - line.quantity) };
        }),
      );
      // 2. Tambah log barang keluar
      setExits((prev) => [exit, ...prev]);
    },
  });

  return (
    <>
      {/* Wizard modal */}
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

      {/* Quick Entry */}
      <QuickEntryPanel entry={entry} />

      {/* Bottom: Stok (kiri besar) + Barang Keluar (kanan kecil) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <StockTable products={products} />
        </Col>
        <Col xs={24} lg={8}>
          <StockExitList exits={exits} />
        </Col>
      </Row>
    </>
  );
};

export default DashboardPage;
