// src/features/spb/components/ItemDetailRowsBuilder.tsx
import { Button, Space, Tag, Tooltip, Typography } from "antd";
import { FileOutlined } from "@ant-design/icons";
import type { SPBItemDetail } from "../../../shared/types";
import { formatDate } from "../../../shared/lib/format";
import { toSafeExternalUrl } from "../accessRules";
import type { DetailRow } from "../types";
import { getItemDetailStatusColor } from "../utils/statusHelpers";

const { Text } = Typography;

/**
 * Membangun 20 baris rincian untuk halaman Rincian Barang (Item Detail).
 */
export const buildItemDetailRows = (
  item: SPBItemDetail,
  type: string,
): DetailRow[] => {
  const safeSpbUrl = toSafeExternalUrl((item as any).spbSourceFile);
  const safePoUrl = toSafeExternalUrl((item as any).poSourceFile);

  return [
    {
      key: "1",
      field: "No SPB",
      value: (
        <Space>
          <Text>{item.no_spb || "-"}</Text>
          {/* Tombol File di samping No SPB */}
          {safeSpbUrl ? (
            <a href={safeSpbUrl} target="_blank" rel="noopener noreferrer">
              <Button size="small" type="primary" ghost icon={<FileOutlined />}>
                File
              </Button>
            </a>
          ) : (
            <Tooltip title="File belum di-upload">
              <Button size="small" type="default" icon={<FileOutlined />} disabled>
                File
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      key: "2",
      field: "Tanggal SPB",
      value: item.tanggal_spb ? formatDate(item.tanggal_spb) : "-",
    },
    {
      key: "3",
      field: "Nama Barang",
      value: <Text strong>{item.nama_barang || "-"}</Text>,
    },
    { key: "4", field: "Ukuran", value: item.ukuran || "-" },
    {
      key: "5",
      field: "Jumlah Permintaan",
      value: item.jumlah_permintaan ?? "-",
    },
    { key: "6", field: "Satuan", value: item.satuan || "-" },
    {
      key: "7",
      field: "No PO",
      value: (
        <Space>
          <Text>{item.no_po || "-"}</Text>
          {/* Tombol File di samping No PO */}
          {safePoUrl ? (
            <a href={safePoUrl} target="_blank" rel="noopener noreferrer">
              <Button size="small" type="primary" ghost icon={<FileOutlined />}>
                File
              </Button>
            </a>
          ) : (
            <Tooltip title="File belum di-upload">
              <Button size="small" type="default" icon={<FileOutlined />} disabled>
                File
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      key: "8",
      field: "Tanggal PO",
      value: item.tanggal_po ? formatDate(item.tanggal_po) : "-",
    },
    { key: "9", field: "Supplier", value: item.supplier || "-" },
    { key: "10", field: "Merk", value: item.merk || "-" },
    {
      key: "11",
      field: "Spesifikasi Teknis",
      value: item.spesifikasi_teknis || "-",
    },
    {
      key: "12",
      field: "Lokasi Pemasangan",
      value: item.lokasi_pemasangan || "-",
    },
    type === "sj"
      ? {
          key: "13",
          field: "No Surat Jalan",
          value: String(item.no_surat_jalan ?? "-"),
        }
      : {
          key: "13",
          field: "Rencana Pemasangan",
          value: item.rencana_pemasangan || "-",
        },
    {
      key: "14",
      field: "Tanggal Datang",
      value: item.tanggal_datang ? formatDate(item.tanggal_datang) : "-",
    },
    { key: "15", field: "Qty Datang", value: item.qty_datang ?? 0 },
    {
      key: "16",
      field: "Satuan (Datang)",
      value: item.satuan_datang || "-",
    },
    { key: "17", field: "Lama Proses", value: item.lama_proses || "-" },
    {
      key: "18",
      field: "Kurang/Lebih",
      value: item.kurang_lebih ?? "-",
    },
    { key: "19", field: "Keterangan", value: item.keterangan || "-" },
    {
      key: "20",
      field: "Status",
      value: (
        <Tag color={getItemDetailStatusColor(item.status)}>
          {item.status || "-"}
        </Tag>
      ),
    },
  ];
};