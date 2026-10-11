import { Card, Skeleton, Statistic } from "antd";
import type { ReactNode } from "react";

interface StatCardProps {
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
      bordered={false}
      style={{
        height: "100%",
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} title={false} />
      ) : (
        <Statistic
          title={
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {icon && <span style={{ color }}>{icon}</span>}
              {title}
            </span>
          }
          value={value}
          prefix={prefix}
          suffix={suffix}
          valueStyle={{
            color,
            fontWeight: 600,
            fontSize: 24,
          }}
        />
      )}
    </Card>
  );
};