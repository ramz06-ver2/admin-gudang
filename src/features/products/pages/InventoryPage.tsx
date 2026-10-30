import { useState } from "react";
import { Typography, Tabs, Space } from "antd";
import { formatFullDate } from "../../../shared/lib/format";
import { InventoryTable } from "../components/InventoryTable";
import { useProducts } from "../useProducts";
import { useStockExits } from "../../stock-out/useStockExits";

const { Title, Text } = Typography;

enum InventoryTabKey {
  MATERIAL = "material",
  TOOLS = "tools",
  OUTBOUND_BREAKDOWN = "outbound-breakdown",
  OUTBOUND_NON_BREAKDOWN = "outbound-non-breakdown",
}

export const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState<string>(InventoryTabKey.MATERIAL);

  const {
    products: materials,
    isLoading: isLoadingMaterials,
    refetch: refetchMaterials,
  } = useProducts("Material");

  const {
    products: tools,
    isLoading: isLoadingTools,
    refetch: refetchTools,
  } = useProducts("Alat Bantu");

  const { exits: breakdownExits, isLoading: isLoadingBreakdown } =
    useStockExits({ breakdown: true });

  const { exits: nonBreakdownExits, isLoading: isLoadingNonBreakdown } =
    useStockExits({ breakdown: false });

  const handleRefetchAll = () => {
    refetchMaterials();
    refetchTools();
  };

  const tabItems = [
    {
      key: InventoryTabKey.MATERIAL,
      label: `Stok Persediaan Material (${materials.length})`,
      children: (
        <InventoryTable
          type="stock"
          dataSource={materials}
          loading={isLoadingMaterials}
          defaultCategory="Material"
          onRefetch={handleRefetchAll}
        />
      ),
    },
    {
      key: InventoryTabKey.TOOLS,
      label: `Stok Persediaan Alat (${tools.length})`,
      children: (
        <InventoryTable
          type="stock"
          dataSource={tools}
          loading={isLoadingTools}
          defaultCategory="Alat Bantu"
          onRefetch={handleRefetchAll}
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
      label: `Pengeluaran (Diluar Breakdown) (${nonBreakdownExits.length})`,
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
        destroyOnHidden={false}
      />
    </Space>
  );
};

export default InventoryPage;
