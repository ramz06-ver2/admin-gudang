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

const calcLamaProses = (
  tglMulai: string | null | undefined,
  tglDatang: string | null | undefined,
  fallback?: string | number | null,
): string => {
  if (fallback && fallback !== "-") return String(fallback);
  if (tglMulai && tglDatang) {
    const start = dayjs(tglMulai);
    const end = dayjs(tglDatang);
    if (start.isValid() && end.isValid()) {
      const diff = end.diff(start, "day");
      return `${diff >= 0 ? diff : 0} Hari`;
    }
  }
  return "-";
};

const getStatusColor = (status: string | null | undefined) => {
  if (status === "Belum PO" || status === "Belum Datang") return "orange";
  if (status === "Sudah PO") return "blue";
  if (status === "Datang Sesuai" || status === "Datang" || status === "Selesai") return "green";
  if (status === "Datang Kurang") return "volcano";
  if (status === "Datang Lebih") return "purple";
  return "blue";
};

const useSPBItem = (id: string | undefined, type: string) => {
  const enabled = !!id;
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
        if (!data) return null;

        const tglDatang = data.material_datang_tgl || null;
        const arr = data.material_datang_qty ?? 0;
        const satuanDatang = data.material_datang_satuan || data.satuan || "-";
        const status = tglDatang ? "Datang" : "Sudah PO";

        return {
          ...data,
          no_spb: "-",
          tanggal_spb: null,
          nama_barang: data.nama_barang_po || data.nama_barang || "-",
          ukuran: data.ukuran || "-",
          jumlah_permintaan: data.qty_permintaan ?? null,
          satuan: data.satuan || data.material_datang_satuan || "-",
          no_po: data.no_po || "-",
          tanggal_po: data.tanggal_po || null,
          supplier: data.nama_supplier || data.supplier || "-",
          merk: data.merk || "-",
          spesifikasi_teknis: data.spesifikasi_teknis || data.spesifikasi || "-",
          lokasi_pemasangan: data.lokasi_pemasangan || "-",
          rencana_pemasangan: data.rencana_pemasangan || "-",
          tanggal_datang: tglDatang,
          qty_datang: arr,
          satuan_datang: satuanDatang,
          lama_proses: calcLamaProses(data.tanggal_po, tglDatang, data.lama_proses),
          kurang_lebih: data.kurang_lebih ?? "-",
          keterangan: data.keterangan || "-",
          status,
        } as SPBItemDetail;
      }

      // SKENARIO 3: Ambil dari tabel Surat Jalan
      if (type === "sj") {
        const { data, error } = await supabaseClient
          .from("surat_jalan")
          .select(`*, spb:spb!id_spb (no_spb, tgl_spb), po:po!id_po (no_po, tanggal_po, nama_supplier)`)
          .eq("id", id)
          .single();
        if (error) throw error;
        if (!data) return null;

        const spbRel = Array.isArray(data.spb) ? data.spb[0] : data.spb;
        const poRel = Array.isArray(data.po) ? data.po[0] : data.po;
        const tgl = data.material_datang_tgl || null;
        const arr = data.material_datang_qty ?? data.jumlah ?? 0;

        return {
          ...data,
          no_surat_jalan: data.no_surat_jalan ?? "-",
          no_spb: spbRel?.no_spb || "-",
          tanggal_spb: spbRel?.tgl_spb || null,
          no_po: poRel?.no_po || "-",
          tanggal_po: poRel?.tanggal_po || null,
          supplier: poRel?.nama_supplier || data.supplier || "-",
          nama_barang: data.nama_barang || "-",
          ukuran: data.ukuran || "-",
          jumlah_permintaan: data.jumlah ?? null,
          satuan: data.satuan || data.material_datang_satuan || "-",
          merk: data.merk || "-",
          spesifikasi_teknis: data.spesifikasi || data.spesifikasi_teknis || "-",
          lokasi_pemasangan: data.lokasi_pemasangan || "-",
          rencana_pemasangan: data.rencana_pemasangan || "-",
          tanggal_datang: tgl,
          qty_datang: arr,
          satuan_datang: data.material_datang_satuan || data.satuan || "-",
          lama_proses: calcLamaProses( data.tanggal_surat_jalan || poRel?.tanggal_po, tgl, data.lama_proses),
          kurang_lebih: data.kurang_lebih ?? "-",
          keterangan: data.keterangan || "-",
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
      if (!data) return null;

      let dataPo = Array.isArray(data.po) ? data.po[0] : data.po;

      // Cadangan bila relasi terbalik lewat po.id_spb
      if (!dataPo && data.id) {
        try {
          const fallbackRes = await supabaseClient
            .from("po")
            .select("no_po, tanggal_po, nama_supplier")
            .eq("id_spb", data.id)
            .single();
          if (fallbackRes?.data) {
            dataPo = fallbackRes.data;
          }
        } catch {
          // Abaikan jika mock tidak menyediakan query kedua
        }
      }

      const req = data.qty_permintaan ?? 0;
      const arr = data.material_datang_qty ?? data.qty_datang ?? 0;
      const tglDatang = data.material_datang_tgl || null;
      const tglSpb = data.tgl_spb || data.tanggal_pembuatan_spb || null;
      const tglPo = dataPo?.tanggal_po || null;

      let status = "Belum PO";
      if (tglDatang) {
        if (req === arr) status = "Datang Sesuai";
        else if (req < arr) status = "Datang Lebih";
        else if (req > arr) status = "Datang Kurang";
        else status = "Datang";
      } else if (dataPo?.no_po && dataPo.no_po !== "-" && dataPo.no_po !== "null") {
        status = "Sudah PO";
      }

      const diffQty = arr - req;
      const kurangLebih =
        data.kurang_lebih !== undefined && data.kurang_lebih !== null
          ? data.kurang_lebih
          : diffQty;

      return {
        ...data,
        no_spb: data.no_spb || "-",
        tanggal_spb: tglSpb,
        nama_barang: data.nama_barang_spb || data.nama_barang || "-",
        ukuran: data.ukuran || "-",
        jumlah_permintaan: req,
        satuan: data.satuan || "-",
        no_po: dataPo?.no_po || "-",
        tanggal_po: tglPo,
        supplier: dataPo?.nama_supplier || dataPo?.supplier || data.supplier || "-",
        merk: data.merk || "-",
        spesifikasi_teknis: data.spesifikasi_teknis || "-",
        lokasi_pemasangan: data.lokasi_pemasangan || "-",
        rencana_pemasangan: data.rencana_pemasangan || "-",
        tanggal_datang: tglDatang,
        qty_datang: arr,
        satuan_datang: data.material_datang_satuan || data.satuan_datang || data.satuan || "-",
        lama_proses: calcLamaProses(tglPo || tglSpb, tglDatang, data.lama_proses),
        kurang_lebih: kurangLebih,
        keterangan: data.keterangan || "-",
        status,
      } as SPBItemDetail;
    },
    enabled,
    retry: false,
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

  // 20 baris rincian barang sesuai tampilan web produksi
  const rows: DetailRow[] = item
    ? [
        { key: "1", field: "No SPB", value: item.no_spb || "-" },
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
        { key: "7", field: "No PO", value: item.no_po || "-" },
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
            <Tag color={getStatusColor(item.status)}>
              {item.status || "-"}
            </Tag>
          ),
        },
      ]
    : [];

  const columns = [
    {
      title: "Rincian Informasi",
      dataIndex: "field",
      key: "field",
      width: isMobile ? "45%" : "35%",
      render: (v: string) => <Text type="secondary">{v}</Text>,
    },
    {
      title: "Detail",
      dataIndex: "value",
      key: "value",
      render: (v: ReactNode) => v,
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 32 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Button
          type="text"
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        />
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Rincian Barang
          </Title>
          <Text type="secondary">Informasi detail untuk satu barang</Text>
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
        <div style={{ textAlign: "center", padding: 50 }}>
          Data tidak ditemukan.
        </div>
      )}

      {!isLoading && item && (
        <Card
          variant="borderless"
          style={{ borderRadius: 12 }}
          styles={{ body: { padding: 0 } }}
        >
          <Table<DetailRow>
            dataSource={rows}
            columns={columns}
            pagination={false}
            size="middle"
          />
        </Card>
      )}
    </div>
  );
};

export default MonitoringSPBItemDetailPage;
