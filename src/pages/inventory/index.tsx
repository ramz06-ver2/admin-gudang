import { useState, useMemo } from "react";
import { Typography, Tabs, Space } from "antd";
import { formatFullDate } from "../../utility/format";
import { InventoryTable } from "../../components/inventory/InventoryTable";
import { useProducts } from "../../hooks/useProducts";
import { useStockExits } from "../../hooks/useStockExits";

const { Title, Text } = Typography;

enum InventoryTabKey {
  MATERIAL = "material",
  TOOLS = "tools",
  OUTBOUND_BREAKDOWN = "outbound-breakdown",
  OUTBOUND_NON_BREAKDOWN = "outbound-non-breakdown",
}

export const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState<string>(InventoryTabKey.MATERIAL);

  // ✅ Filter kategori langsung di query
  const { products: materials, isLoading: isLoadingMaterials } =
    useProducts("Material");

  const { products: tools, isLoading: isLoadingTools } =
    useProducts("Alat Bantu");

  // Barang keluar — pisah breakdown vs non-breakdown
  const { exits: breakdownExits, isLoading: isLoadingBreakdown } =
    useStockExits({ breakdown: true });

  const { exits: nonBreakdownExits, isLoading: isLoadingNonBreakdown } =
    useStockExits({ breakdown: false });

  const tabItems = [
    {
      key: InventoryTabKey.MATERIAL,
      label: `Stok Persediaan Material (${materials.length})`,
      children: (
        <InventoryTable
          type="stock"
          dataSource={materials}
          loading={isLoadingMaterials}
        />
      ),
    },
    {
      key: InventoryTabKey.TOOLS,
      label: `Stok Persediaan Alat Bantu (${tools.length})`,
      children: (
        <InventoryTable
          type="stock"
          dataSource={tools}
          loading={isLoadingTools}
        />
      ),
    },
    {
      key: InventoryTabKey.OUTBOUND_BREAKDOWN,
      label: `Pengeluaran (Breakdown) (${breakdownExits.length})`,
      children: (
        <InventoryTable
          type="outbound"
          dataSource={breakdownExits}
          loading={isLoadingBreakdown}
        />
      ),
    },
    {
      key: InventoryTabKey.OUTBOUND_NON_BREAKDOWN,
      label: `Pengeluaran (Non-Breakdown) (${nonBreakdownExits.length})`,
      children: (
        <InventoryTable
          type="outbound"
          dataSource={nonBreakdownExits}
          loading={isLoadingNonBreakdown}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Title level={3} style={{ marginBottom: 4 }}>
          Manajemen Persediaan & Pengeluaran
        </Title>
        <Text type="secondary">{formatFullDate(new Date())}</Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
        items={tabItems}
        destroyInactiveTabPane={false}
      />
    </Space>
  );
};

export default InventoryPage;
