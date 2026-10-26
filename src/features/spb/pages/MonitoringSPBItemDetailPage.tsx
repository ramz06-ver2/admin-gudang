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

        const tglDatang = data.material_datang_tgl || null;
        const req = data.material_datang_qty || 0;
        const arr = data.material_datang_qty || 0;

        let kurangLebih = "0";
        const diff = arr - req;
        if (diff > 0) kurangLebih = `+${diff}`;
        else if (diff < 0) kurangLebih = `${diff}`;

        // ✅ Lama Proses untuk PO murni
        let lamaProses = "-";
        if (tglDatang && data.tanggal_po) {
          const diffDays = dayjs(tglDatang).diff(dayjs(data.tanggal_po), "day");
          if (diffDays >= 0) lamaProses = `${diffDays} Hari`;
        }

        // ✅ Status untuk PO murni
        let status = "Sudah PO";
        if (tglDatang) {
          if (req === arr) status = "Datang Sesuai";
          else if (req < arr) status = "Datang Lebih";
          else if (req > arr) status = "Datang Kurang";
          else status = "Datang Sesuai"; // Fallback jika req=0 & arr=0
        }

        return {
          ...data,
          no_spb: "-",
          tanggal_spb: "-",
          no_po: data.no_po || "-",
          tanggal_po: data.tanggal_po || null,
          nama_barang: data.nama_barang_po || "-",
          ukuran: "-",
          jumlah_permintaan: req,
          satuan: data.material_datang_satuan || "-",
          supplier: data.nama_supplier || "-",
          merk: "-",
          spesifikasi_teknis: "-",
          lokasi_pemasangan: "-",
          rencana_pemasangan: "-",
          tanggal_datang: tglDatang,
          qty_datang: arr,
          satuan_datang: data.material_datang_satuan || "-",
          lama_proses: lamaProses,
          kurang_lebih: kurangLebih,
          keterangan: data.keterangan || "-",
          status,
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

      let kurangLebih = "0";
      const diff = arr - req;
      if (diff > 0) kurangLebih = `+${diff}`;
      else if (diff < 0) kurangLebih = `${diff}`;

      // ✅ Logika Lama Proses (Ambil tanggal terlama antara SPB & PO)
      let lamaProses = "-";
      if (tglDatang) {
        const tglSpb = data.tgl_spb ? dayjs(data.tgl_spb) : null;
        const tglPo = dataPo?.tanggal_po ? dayjs(dataPo.tanggal_po) : null;

        let startDate = null;
        if (tglSpb && tglPo)
          startDate = tglSpb.isBefore(tglPo) ? tglSpb : tglPo; // Ambil yang paling lama (paling awal)
        else startDate = tglSpb || tglPo;

        if (startDate) {
          const diffDays = dayjs(tglDatang).diff(startDate, "day");
          if (diffDays >= 0) lamaProses = `${diffDays} Hari`;
        }
      }

      // ✅ Status SPB
      let status = "Belum PO";
      if (tglDatang) {
        if (req === arr) status = "Datang Sesuai";
        else if (req < arr) status = "Datang Lebih";
        else if (req > arr) status = "Datang Kurang";
        else status = "Datang";
      } else if (dataPo?.no_po && dataPo?.tanggal_po) {
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
        merk: data.merk || "-",
        spesifikasi_teknis: data.spesifikasi_teknis || "-",
        lokasi_pemasangan: data.lokasi_pemasangan || "-",
        rencana_pemasangan: data.rencana_pemasangan || "-",
        tanggal_datang: tglDatang,
        qty_datang: arr,
        satuan_datang: data.material_datang_satuan || "-",
        lama_proses: lamaProses,
        kurang_lebih: kurangLebih,
        keterangan: data.keterangan || "-",
        status,
      } as SPBItemDetail;
    },
    enabled: !!id,
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

  const { data: item, isLoading } = useSPBItem(id, type);

  const rows: DetailRow[] = item
    ? [
        { key: "1", field: "No SPB", value: item.no_spb || "-" },
        {
          key: "2",
          field: "Tanggal SPB",
          value:
            item.tanggal_spb && item.tanggal_spb !== "-"
              ? formatDate(item.tanggal_spb)
              : "-",
        },
        {
          key: "3",
          field: "Nama Barang",
          value: <Text strong>{item.nama_barang}</Text>,
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
        {
          key: "13",
          field: "Rencana Pemasangan",
          value: item.rencana_pemasangan || "-",
        },
        {
          key: "14",
          field: "Tanggal Datang",
          value: item.tanggal_datang ? formatDate(item.tanggal_datang) : "-",
        },
        { key: "15", field: "Qty Datang", value: item.qty_datang ?? "-" },
        {
          key: "16",
          field: "Satuan (Datang)",
          value: item.satuan_datang || "-",
        },
        { key: "17", field: "Lama Proses", value: item.lama_proses || "-" },
        { key: "18", field: "Kurang/Lebih", value: item.kurang_lebih || "0" },
        { key: "19", field: "Keterangan", value: item.keterangan || "-" },
        {
          key: "20",
          field: "Status",
          value: (
            <Tag
              color={
                item.status === "Belum PO"
                  ? "orange"
                  : item.status === "Sudah PO"
                    ? "blue"
                    : item.status === "Datang Sesuai"
                      ? "green"
                      : item.status === "Datang Lebih"
                        ? "purple"
                        : "volcano"
              }
            >
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
      width: "40%",
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
      {!isLoading && !item && (
        <div style={{ textAlign: "center", padding: 50, color: "#ff4d4f" }}>
          Data tidak ditemukan.
        </div>
      )}

      {!isLoading && item && (
        <Card
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
          <Table<DetailRow>
            dataSource={rows}
            columns={columns}
            pagination={false}
            size="middle"
            rowClassName={(_, i) =>
              i % 2 === 0 ? "table-row-light" : "table-row-dark"
            }
          />
        </Card>
      )}
    </div>
  );
};

export default MonitoringSPBItemDetailPage;
