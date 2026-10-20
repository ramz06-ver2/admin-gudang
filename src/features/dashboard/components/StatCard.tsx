import { Card, Statistic, Typography } from "antd";
import type { ReactNode } from "react";

const { Text } = Typography;

export interface StatCardProps {
  title: string;
  value: number;
  icon?: ReactNode;
  color?: string;
  suffix?: string;
  prefix?: ReactNode;
  loading?: boolean;
}

export const StatCard = ({
  title,
  value,
  icon,
  color = "#1677ff",
  suffix,
  prefix,
  loading = false,
}: StatCardProps) => {
  return (
    <Card
      variant="borderless"
      style={{
        height: "100%",
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {icon && (
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
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {title}
          </Text>
          <Statistic
            value={loading ? 0 : value}
            prefix={prefix}
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
};