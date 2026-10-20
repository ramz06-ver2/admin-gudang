import { Card, Empty, Space, Tag, Typography, Skeleton } from "antd";
import { UserOutlined, SendOutlined } from "@ant-design/icons";
import { formatNumber } from "../../utility/format";
import type { StockExit } from "../../types";

const { Text } = Typography;

interface Props {
  exits: StockExit[];
  loading?: boolean;
}

export const StockExitList = ({ exits, loading }: Props) => {
  if (loading) {
    return (
      <Card
        title="📤 Barang Keluar Hari Ini"
        variant="borderless"
        style={{ borderRadius: 12 }}
      >
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  return (
    <Card
      title="📤 Barang Keluar Hari Ini"
      variant="borderless"
      style={{ borderRadius: 12, height: "100%" }}
      styles={{
        body: {
          padding: exits.length ? 12 : 24,
          maxHeight: 600,
          overflowY: "auto",
        },
      }}
    >
      {exits.length === 0 ? (
        <Empty
          description="Belum ada barang keluar hari ini"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {exits.map((exit) => (
            <Card
              key={exit.id}
              size="small"
              style={{
                borderRadius: 8,
                background: "#fafafa",
                border: "1px solid #f0f0f0",
              }}
              styles={{ body: { padding: 10 } }}
            >
              {/* Header: jam + nama pekerja */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <Text strong style={{ fontSize: 14, color: "#1677ff" }}>
                  {exit.time}
                </Text>
                <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                  <UserOutlined /> {exit.person}
                </Tag>
              </div>

              {/* Tujuan */}
              {exit.destination && (
                <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                  <SendOutlined /> {exit.destination}
                </div>
              )}

              {/* Items */}
              <div style={{ borderTop: "1px dashed #e0e0e0", paddingTop: 6 }}>
                {exit.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      padding: "2px 0",
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12 }} ellipsis>
                      • {item.itemName}
                      {item.size && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {" "}
                          ({item.size})
                        </Text>
                      )}
                    </Text>
                    <Text
                      strong
                      style={{ fontSize: 12, color: "#ff4d4f", flexShrink: 0 }}
                    >
                      {formatNumber(item.quantity)} {item.unit}
                    </Text>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </Space>
      )}
    </Card>
  );
};
