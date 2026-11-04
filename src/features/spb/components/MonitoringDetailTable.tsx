// src/features/spb/components/MonitoringDetailTable.tsx
import { Button, Card, Space, Table, Tag, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { formatDate } from "../../../shared/lib/format";
import type { MonitoringDetailItem } from "../types";
import { getDetailStatusColor } from "../utils/statusHelpers";

const { Text } = Typography;

export interface MonitoringDetailTableProps {
  items: MonitoringDetailItem[];
  isMobile: boolean;
  onViewItemDetail: (item: MonitoringDetailItem) => void;
}

const renderNamaBarang = (r: MonitoringDetailItem) => {
  const nameWithSize = r.ukuran
    ? `${r.nama_barang} - ${r.ukuran}`
    : r.nama_barang;
  return (
    <Space direction="vertical" size={1} style={{ width: "100%" }}>
      <Text strong style={{ fontSize: 13, wordBreak: "break-word" }}>
        {nameWithSize}
      </Text>
      {r.spesifikasi_teknis && r.spesifikasi_teknis !== "-" && (
        <Text style={{ fontSize: 11, color: "#8c8c8c", lineHeight: 1.2 }}>
          • {r.spesifikasi_teknis}
        </Text>
      )}
    </Space>
  );
};

export const MonitoringDetailTable = ({
  items,
  isMobile,
  onViewItemDetail,
}: MonitoringDetailTableProps) => {
  const mobileColumns = [
    {
      title: "No",
      key: "no",
      width: 36,
      align: "center" as const,
      render: (_: any, __: MonitoringDetailItem, i: number) => i + 1,
    },
    {
      title: "Nama Barang",
      key: "nama_barang",
      ellipsis: true,
      render: (_: any, r: MonitoringDetailItem) => renderNamaBarang(r),
    },
    {
      title: "Jumlah",
      key: "jumlah",
      width: 72,
      align: "right" as const,
      render: (_: any, r: MonitoringDetailItem) => (
        <Text style={{ fontSize: 12 }}>
          {r.jumlah_permintaan ?? "-"}{" "}
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.jumlah_permintaan != null ? (r.satuan ?? "") : ""}
          </Text>
        </Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 84,
      align: "center" as const,
      render: (_: any, r: MonitoringDetailItem) => (
        <Tag
          color={getDetailStatusColor(r.status)}
          style={{
            margin: 0,
            padding: "0 4px",
            fontSize: 11,
            whiteSpace: "normal",
            textAlign: "center",
          }}
        >
          {r.status || "Belum PO"}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "detail",
      width: 76,
      align: "center" as const,
      render: (_: any, r: MonitoringDetailItem) => (
        <Button
          type="primary"
          size="small"
          icon={<InfoCircleOutlined />}
          style={{ fontSize: 11, padding: "0 6px" }}
          onClick={() => onViewItemDetail(r)}
        >
          Detail
        </Button>
      ),
    },
  ];

  const desktopColumns = [
    {
      title: "No",
      key: "no",
      width: 44,
      align: "center" as const,
      render: (_: any, __: MonitoringDetailItem, i: number) => i + 1,
    },
    {
      title: "Nama Barang",
      key: "nama_barang",
      render: (_: any, r: MonitoringDetailItem) => renderNamaBarang(r),
    },
    {
      title: "Jumlah",
      key: "jumlah",
      width: 90,
      align: "right" as const,
      render: (_: any, r: MonitoringDetailItem) => (
        <Text style={{ fontSize: 13 }}>
          {r.jumlah_permintaan ?? "-"}{" "}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.jumlah_permintaan != null ? (r.satuan ?? "") : ""}
          </Text>
        </Text>
      ),
    },
    {
      title: "No PO",
      dataIndex: "no_po",
      key: "no_po",
      width: 95,
      render: (v: string | null) => v || "-",
    },
    {
      title: "Tanggal Datang",
      dataIndex: "tanggal_datang",
      key: "tanggal_datang",
      width: 110,
      render: (v: string | null) => (v ? formatDate(v) : "-"),
    },
    {
      title: "Jumlah Datang",
      dataIndex: "qty_datang",
      key: "jumlah_datang",
      width: 105,
      align: "right" as const,
      render: (v: number | null, r: MonitoringDetailItem) =>
        `${v ?? 0} ${r.satuan ?? ""}`.trim(),
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      align: "center" as const,
      render: (_: any, r: MonitoringDetailItem) => (
        <Tag color={getDetailStatusColor(r.status)} style={{ margin: 0 }}>
          {r.status || "Belum PO"}
        </Tag>
      ),
    },
    {
      title: "Detail",
      key: "detail",
      width: 84,
      align: "center" as const,
      render: (_: any, r: MonitoringDetailItem) => (
        <Button
          type="primary"
          size="small"
          icon={<InfoCircleOutlined />}
          onClick={() => onViewItemDetail(r)}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <Card
      title={`Daftar Barang (${items.length})`}
      variant="borderless"
      style={{
        borderRadius: isMobile ? 0 : 12,
        ...(isMobile && {
          width: "100vw",
          position: "relative",
          left: "50%",
          transform: "translateX(-50%)",
        }),
      }}
      styles={{ body: { padding: 0 } }}
    >
      <Table<MonitoringDetailItem>
        dataSource={items}
        columns={isMobile ? mobileColumns : desktopColumns}
        rowKey="key"
        size="small"
        tableLayout="fixed"
        pagination={{ pageSize: 20, size: "small" }}
        scroll={undefined}
      />
    </Card>
  );
};

