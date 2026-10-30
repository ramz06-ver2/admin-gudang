import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Typography, Card, Table, Button, Spin, Space, Grid, Tag } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../../shared/lib/supabaseClient";
import { TABLES } from "../../../shared/lib/constants";
import type { SPBItemDetail } from "../../../shared/types";
import { formatDate } from "../../../shared/lib/format";
import type { ReactNode } from "react";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface DetailRow {
  key: string;
  field: string;
  value: ReactNode;
}

const useSPBItem = (id: string | undefined, type: string) => {
  return useQuery<SPBItemDetail | null, Error>({
    queryKey: ["spb-item", id, type],
    queryFn: async () => {
      if (!id) return null;

      // SKENARIO 1: Ambil dari tabel PO
      if (type === "po") {
        const { data, error } = await supabaseClient
          .from("po")
          .select(`*`)
          .eq("id", id)
          .single();
        if (error) throw error;
        
        // ... (logika mapping PO sama seperti sebelumnya)
        return {
          ...data,
          no_spb: "-",
          nama_barang: data.nama_barang_po || "-",
          // ... field lainnya
        } as SPBItemDetail;
      }

      // SKENARIO 3: Ambil dari tabel Surat Jalan
      if (type === "sj") {
        const { data, error } = await supabaseClient
          .from("surat_jalan")
          .select(`*, spb:spb!id_spb (no_spb), po:po!id_po (no_po)`)
          .eq("id", id)
          .single();
        if (error) throw error;

        const spbRel = Array.isArray(data.spb) ? data.spb[0] : data.spb;
        const poRel = Array.isArray(data.po) ? data.po[0] : data.po;
        const tgl = data.material_datang_tgl || null;

        return {
          ...data,
          no_spb: spbRel?.no_spb || "-",
          no_po: poRel?.no_po || "-",
          nama_barang: data.nama_barang || "-",
          jumlah_permintaan: null,
          satuan: data.material_datang_satuan || data.satuan || null,
          tanggal_datang: tgl,
          qty_datang: data.material_datang_qty ?? null,
          status: tgl ? "Datang" : "Belum Datang",
        } as SPBItemDetail;
      }

      // SKENARIO 2: Ambil dari tabel SPB
      const { data, error } = await supabaseClient
        .from(TABLES.spb)
        .select(`*, po (no_po, tanggal_po, nama_supplier)`)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      const dataPo = Array.isArray(data.po) ? data.po[0] : data.po;
      const req = data.qty_permintaan || 0;
      const arr = data.material_datang_qty || 0;
      const tglDatang = data.material_datang_tgl || null;

      let status = "Belum PO";
      if (tglDatang) {
        if (req === arr) status = "Datang Sesuai";
        else if (req < arr) status = "Datang Lebih";
        else if (req > arr) status = "Datang Kurang";
        else status = "Datang";
      } else if (dataPo?.no_po) {
        status = "Sudah PO";
      }

      return {
        ...data,
        no_spb: data.no_spb || "-",
        tanggal_spb: data.tgl_spb || null,
        no_po: dataPo?.no_po || "-",
        tanggal_po: dataPo?.tanggal_po || null,
        supplier: dataPo?.nama_supplier || "-",
        nama_barang: data.nama_barang_spb || "-",
        ukuran: data.ukuran || "-",
        jumlah_permintaan: req,
        satuan: data.satuan || "-",
        tanggal_datang: tglDatang,
        qty_datang: arr,
        status,
      } as SPBItemDetail;
    },
    enabled: !!id,
    retry: false, // Mencegah loading berputar jika error
  });
};

export const MonitoringSPBItemDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "spb";

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { data: item, isLoading, error } = useSPBItem(id, type);

  const rows: DetailRow[] = item
    ? [
        { key: "1", field: "No SPB", value: item.no_spb || "-" },
        { key: "2", field: "Nama Barang", value: <Text strong>{item.nama_barang}</Text> },
        { key: "3", field: "No PO", value: item.no_po || "-" },
        { key: "4", field: "Status", value: <Tag color="blue">{item.status || "-"}</Tag> },
        ...(type === "sj"
          ? [{ key: "5", field: "No Surat Jalan", value: String((item as SPBItemDetail & { no_surat_jalan?: string | number | null }).no_surat_jalan ?? "-") }]
          : []),
      ]
    : [];

  const columns = [
    { title: "Rincian Informasi", dataIndex: "field", key: "field", width: "40%", render: (v: string) => <Text type="secondary">{v}</Text> },
    { title: "Detail", dataIndex: "value", key: "value", render: (v: ReactNode) => v },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 32 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Button type="text" size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <div>
          <Title level={3} style={{ margin: 0 }}>Rincian Barang</Title>
        </div>
      </Space>

      {isLoading && (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      )}
      {!isLoading && error && (
        <div style={{ textAlign: "center", padding: 50, color: "#ff4d4f" }}>
          Gagal memuat: {error.message}
        </div>
      )}
      {!isLoading && !item && !error && (
        <div style={{ textAlign: "center", padding: 50 }}>Data tidak ditemukan.</div>
      )}

      {!isLoading && item && (
        <Card variant="borderless" style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
          <Table<DetailRow> dataSource={rows} columns={columns} pagination={false} size="middle" />
        </Card>
      )}
    </div>
  );
};

export default MonitoringSPBItemDetailPage;