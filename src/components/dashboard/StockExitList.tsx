import { Card, Empty, Space, Tag, Typography } from "antd";
import {
  EnvironmentOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { formatNumber } from "../../utility/format";
import type { StockExit } from "../../types";

const { Text } = Typography;

interface Props {
  exits: StockExit[];
}

export const StockExitList = ({ exits }: Props) => (
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
        description="Belum ada barang keluar"
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
                <EnvironmentOutlined /> {exit.workplace}
              </Tag>
            </div>

            <div
              style={{ fontSize: 12, color: "#666", marginBottom: 6 }}
            >
              <TeamOutlined /> {exit.team} · <UserOutlined /> {exit.person}
            </div>

            <div
              style={{ borderTop: "1px dashed #e0e0e0", paddingTop: 6 }}
            >
              {exit.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    padding: "2px 0",
                  }}
                >
                  <Text style={{ fontSize: 12 }}>• {item.itemName}</Text>
                  <Text
                    strong
                    style={{ fontSize: 12, color: "#ff4d4f" }}
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