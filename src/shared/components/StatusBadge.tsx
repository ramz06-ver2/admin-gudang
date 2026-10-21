import { Tag } from "antd";
import type { StockStatus } from "../types";
import { COLORS, STOCK_STATUS_LABELS } from "../lib/constants";

interface Props {
  status?: StockStatus;
}

export const StatusBadge = ({ status }: Props) => {
  if (!status) return null;

  return (
    <Tag color={COLORS.status[status]}>
      {STOCK_STATUS_LABELS[status]}
    </Tag>
  );
};