import { useNavigate, useParams } from "react-router-dom";
import { Typography, Card, Table, Button, Spin, Space, Grid } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../../shared/lib/supabaseClient";
import { TABLES } from "../../../shared/lib/constants";
import type { SPBItemDetail } from "../../../shared/types";
import { formatDate } from "../../../shared/lib/format";
import type { ReactNode } from "react";

const { Title, Text } = Typography;

interface DetailRow {
  key: string;
  field: string;
  value: ReactNode;
}

// Hook internal untuk fetch 1 item
const useSPBItem = (id: string | undefined) => {
  return useQuery<SPBItemDetail | null, Error>({
    queryKey: ["spb-item", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabaseClient
        .from(TABLES.spb)
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // ✅ Mapping dari kolom database ke frontend
      return {
        ...data,
        no_spb: data.no_spb || "-",
        tanggal_spb: data.tgl_spb || null,
        nama_barang: data.nama_barang_spb || "-",
        
        // ✅ Tiga field krusial sudah di-mapping di sini
        tanggal_datang: data.material_datang_tgl || null,
        qty_datang: data.material_datang_qty ?? null,
        satuan_datang: data.material_datang_satuan || "-",
      } as SPBItemDetail;
    },
    enabled: !!id,
    retry: false,
  });
};

export const MonitoringSPBItemDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { data: item, isLoading } = useSPBItem(id);

  // ✅ 20 Baris Data (Baris 14, 15, 16 sudah diisi dari database)
  const rows: DetailRow[] = [
    { key: "1", field: "No SPB", value: item?.no_spb || "-" },
    { key: "2", field: "Tanggal SPB", value: item?.tanggal_spb ? formatDate(item.tanggal_spb) : "-" },
    { key: "3", field: "Nama Barang", value: <Text strong>{item?.nama_barang || "-"}</Text> },
    { key: "4", field: "Ukuran", value: "-" }, // Menunggu instruksi
    { key: "5", field: "Jumlah Permintaan", value: "-" }, // Menunggu instruksi
    { key: "6", field: "Satuan", value: "-" }, // Menunggu instruksi
    { key: "7", field: "No PO", value: "-" }, // Menunggu instruksi
    { key: "8", field: "Tanggal PO", value: "-" }, // Menunggu instruksi
    { key: "9", field: "Supplier", value: "-" }, // Menunggu instruksi
    { key: "10", field: "Merk", value: "-" }, // Menunggu instruksi
    { key: "11", field: "Spesifikasi Teknis", value: "-" }, // Menunggu instruksi
    { key: "12", field: "Lokasi Pemasangan", value: "-" }, // Menunggu instruksi
    { key: "13", field: "Rencana Pemasangan", value: "-" }, // Menunggu instruksi
    
    // ✅ Tiga baris di bawah ini sudah berfungsi
    { key: "14", field: "Tanggal Datang", value: item?.tanggal_datang ? formatDate(item.tanggal_datang) : "-" },
    { key: "15", field: "Qty Datang", value: item?.qty_datang ?? "-" },
    { key: "16", field: "Satuan (Datang)", value: item?.satuan_datang || "-" },
    
    { key: "17", field: "Lama Proses", value: "-" }, // Menunggu instruksi
    { key: "18", field: "Kurang/Lebih", value: "-" }, // Menunggu instruksi
    { key: "19", field: "Keterangan", value: "-" }, // Menunggu instruksi
    { key: "20", field: "Status", value: "-" }, // Menunggu instruksi
  ];

  const columns = [
    { 
      title: "Rincian Informasi", 
      dataIndex: "field", 
      key: "field", 
      width: "40%", 
      render: (v: string) => <Text type="secondary">{v}</Text> 
    },
    { 
      title: "Detail", 
      dataIndex: "value", 
      key: "value", 
      render: (v: ReactNode) => v 
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 32 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Button type="text" size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <div>
          <Title level={3} style={{ margin: 0 }}>Rincian Barang</Title>
          <Text type="secondary">Informasi detail untuk satu barang SPB</Text>
        </div>
      </Space>

      {isLoading && <div style={{ textAlign: "center", padding: 50 }}><Spin size="large" /></div>}

      {!isLoading && (
        <Card
          variant="borderless"
          style={{
            borderRadius: isMobile ? 0 : 12,
            // ✅ Full-bleed 100vw di mobile
            ...(isMobile && { width: "100vw", position: "relative", left: "50%", transform: "translateX(-50%)" }),
          }}
          styles={{ body: { padding: 0 } }}
        >
          <Table<DetailRow>
            dataSource={rows}
            columns={columns}
            pagination={false}
            size="middle"
            rowClassName={(_, i) => (i % 2 === 0 ? "table-row-light" : "table-row-dark")}
          />
        </Card>
      )}
    </div>
  );
};

export default MonitoringSPBItemDetailPage;