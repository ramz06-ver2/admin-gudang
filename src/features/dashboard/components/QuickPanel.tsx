import { Card, Input, Space, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";

interface Props {
  onTriggerStart: () => void;
}

export const QuickEntryPanel = ({ onTriggerStart }: Props) => {
  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: 12,
        marginBottom: 16,
      }}
      styles={{ body: { padding: 16 } }}
    >
      <Input
        size="large"
        prefix={<SearchOutlined style={{ fontSize: 18, color: "#1677ff" }} />}
        placeholder="🔍 Klik di sini atau tekan Ctrl+K / Tab / M untuk memulai sesi pengeluaran barang..."
        readOnly
        onClick={onTriggerStart}
        style={{
          fontSize: 15,
          height: 48,
          cursor: "pointer",
          background: "#fafafa",
          borderRadius: 10,
        }}
      />

      <div style={{ marginTop: 8 }}>
        <Space size="small" wrap>
          <Tag color="blue">Klik / Ctrl+K / Tab / M</Tag>
        </Space>
      </div>
    </Card>
  );
};