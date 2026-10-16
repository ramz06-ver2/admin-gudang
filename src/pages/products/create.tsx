import { useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Typography,
  App,
} from "antd";
import {
  PlusOutlined,
  SaveOutlined,
  AppstoreAddOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { supabaseClient } from "../../utility/supabaseClient";
import { TABLES } from "../../utility/constants";
import { USE_MOCK } from "../../utility/config";

// ✅ MEMASUKKAN FIX DEEPSEEK: Menggunakan Hook Search Pintar & Debounce
import { useProductSearch } from "../../hooks/useProductSearch"; 
import { useDebounce } from "../../hooks/useDebounce"; 

import { formatNumber, formatDate } from "../../utility/format";
import type { Product } from "../../types";

const { Title, Text } = Typography;

interface StockEntryFormValues {
  productId: number;
  jumlah: number;
  tanggal_pengiriman: dayjs.Dayjs;
  spesifikasi?: string;
  merk?: string;
}

export const ProductCreatePage = () => {
  const [form] = Form.useForm<StockEntryFormValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // ✅ FIX DEEPSEEK: Menerapkan state keyword dengan debounce 250ms
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 250);
  
  // ✅ FIX DEEPSEEK: Memanggil data dari server secara dinamis
  const { products, isLoading } = useProductSearch(debouncedKeyword, 30);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Menyimpan riwayat lokal sementara setelah diinput
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  const handleProductSelect = (val: number) => {
    const prod = products.find((p) => p.id === val);
    setSelectedProduct(prod || null);
  };

  const handleSubmit = async (values: StockEntryFormValues) => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    
    try {
      if (!USE_MOCK) {
        // 1. Catat di tabel barang_masuk
        const payload = {
          kode_barang: selectedProduct.code,
          nama_barang: selectedProduct.name,
          ukuran_barang: selectedProduct.size,
          spesifikasi_barang: values.spesifikasi || null,
          satuan_barang: selectedProduct.unit,
          kategori: selectedProduct.category,
          jumlah_barang_masuk: values.jumlah,
          tanggal_pengiriman: values.tanggal_pengiriman.format("YYYY-MM-DD"),
          keterangan: values.merk ? `Merk: ${values.merk}` : null,
        };

        const { error: insertErr } = await supabaseClient
          .from("barang_masuk")
          .insert(payload);

        if (insertErr) throw insertErr;

        // 2. Tambah stok di tabel barang
        const newStock = selectedProduct.stock + values.jumlah;
        const { error: updateErr } = await supabaseClient
          .from(TABLES.products)
          .update({ stok: newStock })
          .eq("id", selectedProduct.id);

        if (updateErr) throw updateErr;
      }

      message.success(`Berhasil menambahkan ${formatNumber(values.jumlah)} ${selectedProduct.unit} ke stok ${selectedProduct.name}!`);
      
      setRecentEntries((prev) => [
        {
          key: Date.now(),
          nama: selectedProduct.name,
          ukuran: selectedProduct.size,
          jumlah: values.jumlah,
          satuan: selectedProduct.unit,
          tanggal: values.tanggal_pengiriman.format("YYYY-MM-DD"),
        },
        ...prev,
      ]);

      // Reset form agar siap input barang lain
      form.resetFields();
      setSelectedProduct(null);
      setKeyword("");
      
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

    } catch (err: any) {
      message.error(err?.message || "Gagal menyimpan data barang masuk");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 32 }}>
      <div style={{ marginBottom: 16 }}>
        <Space align="center" size={10}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#1677ff15",
              color: "#1677ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            <AppstoreAddOutlined />
          </div>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Tambah Barang Masuk
            </Title>
            <Text type="secondary">
              Pilih barang dari database dan tambahkan jumlah stoknya
            </Text>
          </div>
        </Space>
      </div>

      <Card
        variant="borderless"
        style={{
          borderRadius: 14,
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          marginBottom: 24,
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Form<StockEntryFormValues>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            tanggal_pengiriman: dayjs(),
          }}
          requiredMark={false}
        >
          <Row gutter={[16, 8]}>
            <Col xs={24}>
              <Form.Item
                name="productId"
                label="Nama Barang (Pilih dari Database)"
                rules={[{ required: true, message: "Pilih barang terlebih dahulu" }]}
              >
                <Select
                  showSearch
                  size="large"
                  placeholder="Ketik nama atau ukuran barang..."
                  // ✅ FIX DEEPSEEK 1: filterOption={false} agar filter Antd tidak menimpa hasil dari server
                  filterOption={false} 
                  loading={isLoading}
                  onSearch={setKeyword} // Update keyword saat mengetik
                  onChange={handleProductSelect}
                  options={products.map((p) => ({
                    value: p.id,
                    label: `${p.name} ${p.size ? `(${p.size})` : ""} — Sisa Stok: ${p.stock} ${p.unit}`,
                  }))}
                  notFoundContent={isLoading ? "Mencari data..." : "Barang tidak ditemukan"}
                />
              </Form.Item>
            </Col>

            <Col xs={12} sm={8}>
              <Form.Item
                name="jumlah"
                label="Jumlah Masuk"
                rules={[{ required: true, message: "Wajib diisi" }]}
              >
                <InputNumber
                  size="large"
                  min={1}
                  style={{ width: "100%" }}
                  placeholder="0"
                  addonAfter={selectedProduct?.unit || ""}
                />
              </Form.Item>
            </Col>

            <Col xs={12} sm={16}>
              <Form.Item
                name="tanggal_pengiriman"
                label="Tanggal Pengiriman"
                rules={[{ required: true, message: "Wajib diisi" }]}
              >
                <DatePicker
                  size="large"
                  style={{ width: "100%" }}
                  format="DD MMMM YYYY"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="merk" label="Merk (Opsional)">
                <Input size="large" placeholder="Contoh: Rucika, Panasonic" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="spesifikasi" label="Spesifikasi (Opsional)">
                <Input size="large" placeholder="Keterangan tambahan..." />
              </Form.Item>
            </Col>
          </Row>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={isSubmitting}
              style={{ minWidth: 200 }}
              disabled={!selectedProduct}
            >
              Simpan Stok
            </Button>
          </div>
        </Form>
      </Card>

      {/* Daftar Riwayat Input Sesi Ini */}
      {recentEntries.length > 0 && (
        <Card
          title={
            <Space>
              <PlusOutlined />
              <span>Baru Saja Ditambahkan</span>
            </Space>
          }
          variant="borderless"
          style={{ borderRadius: 14 }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            dataSource={recentEntries}
            pagination={false}
            size="small"
            scroll={{ x: 500 }}
            columns={[
              { dataIndex: "nama", title: "Nama Barang", ellipsis: true },
              {
                dataIndex: "ukuran",
                title: "Ukuran",
                width: 140,
                render: (v) => v ?? "-",
              },
              {
                title: "Jumlah",
                width: 120,
                align: "right",
                render: (_, r) => (
                  <Text strong style={{ color: "#52c41a" }}>
                    +{formatNumber(r.jumlah)} <Text type="secondary" style={{fontSize: 12}}>{r.satuan}</Text>
                  </Text>
                ),
              },
              {
                dataIndex: "tanggal",
                title: "Tgl Kirim",
                width: 110,
                render: (v) => formatDate(v),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};

export default ProductCreatePage;