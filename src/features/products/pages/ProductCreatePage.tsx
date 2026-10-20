import { useState } from "react";
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Table, Typography, App } from "antd";
import { PlusOutlined, SaveOutlined, AppstoreAddOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { supabaseClient } from "../../utility/supabaseClient";
import { USE_MOCK } from "../../utility/config";
import { useProductSearch } from "../../hooks/useProductSearch";
import { useDebounce } from "../../hooks/useDebounce";
import { formatNumber, formatDate } from "../../utility/format";
import type { Product } from "../../types";

const { Title, Text } = Typography;

interface StockEntryFormValues { productId: number; jumlah: number; tanggal_pengiriman: dayjs.Dayjs; spesifikasi?: string; merk?: string; }

export const ProductCreatePage = () => {
  const [form] = Form.useForm<StockEntryFormValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 250);
  const { products, isLoading } = useProductSearch(debouncedKeyword, 30);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  const handleProductSelect = (val: number) => setSelectedProduct(products.find((p) => p.id === val) || null);

  const handleSubmit = async (values: StockEntryFormValues) => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    
    try {
      if (!USE_MOCK) {
        // ✅ PERBAIKAN: Gunakan RPC Supabase untuk atomicity (stok masuk)
        const { error } = await supabaseClient.rpc("receive_stock", {
          p_product_id: selectedProduct.id,
          p_quantity: values.jumlah,
          p_date: values.tanggal_pengiriman.format("YYYY-MM-DD"),
          p_merk: values.merk || null,
          p_spesifikasi: values.spesifikasi || null
        });
        if (error) throw error;
      }

      message.success(`Berhasil menambah ${formatNumber(values.jumlah)} ${selectedProduct.unit} ke ${selectedProduct.name}!`);
      setRecentEntries((prev) => [{ key: Date.now(), nama: selectedProduct.name, ukuran: selectedProduct.size, jumlah: values.jumlah, satuan: selectedProduct.unit, tanggal: values.tanggal_pengiriman.format("YYYY-MM-DD") }, ...prev]);
      
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
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "#1677ff15", color: "#1677ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}><AppstoreAddOutlined /></div>
          <div><Title level={3} style={{ margin: 0 }}>Tambah Barang Masuk</Title><Text type="secondary">Pilih barang dan tambahkan stoknya</Text></div>
        </Space>
      </div>

      <Card variant="borderless" style={{ borderRadius: 14, marginBottom: 24 }} styles={{ body: { padding: 24 } }}>
        <Form<StockEntryFormValues> form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ tanggal_pengiriman: dayjs() }} requiredMark={false}>
          <Row gutter={[16, 8]}>
            <Col xs={24}>
              <Form.Item name="productId" label="Nama Barang" rules={[{ required: true }]}>
                <Select showSearch size="large" filterOption={false} loading={isLoading} onSearch={setKeyword} onChange={handleProductSelect} options={products.map((p) => ({ value: p.id, label: `${p.name} ${p.size ? `(${p.size})` : ""} — Sisa: ${p.stock} ${p.unit}` }))} notFoundContent={isLoading ? "Mencari data..." : "Tidak ditemukan"} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name="jumlah" label="Jumlah" rules={[{ required: true }]}><InputNumber size="large" min={1} style={{ width: "100%" }} addonAfter={selectedProduct?.unit || ""} /></Form.Item>
            </Col>
            <Col xs={12} sm={16}>
              <Form.Item name="tanggal_pengiriman" label="Tgl Pengiriman" rules={[{ required: true }]}><DatePicker size="large" style={{ width: "100%" }} format="DD MMM YYYY" /></Form.Item>
            </Col>
            <Col xs={24} sm={12}><Form.Item name="merk" label="Merk (Opsional)"><Input size="large" /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="spesifikasi" label="Spesifikasi (Opsional)"><Input size="large" /></Form.Item></Col>
          </Row>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}><Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={isSubmitting} disabled={!selectedProduct}>Simpan Stok</Button></div>
        </Form>
      </Card>

      {recentEntries.length > 0 && (
        <Card title={<Space><PlusOutlined /><span>Baru Saja Ditambahkan</span></Space>} variant="borderless" style={{ borderRadius: 14 }} styles={{ body: { padding: 0 } }}>
          <Table dataSource={recentEntries} pagination={false} size="small" scroll={{ x: 500 }} columns={[{ dataIndex: "nama", title: "Nama", ellipsis: true }, { dataIndex: "ukuran", title: "Ukuran", width: 140, render: (v) => v ?? "-" }, { title: "Jumlah", width: 120, align: "right", render: (_, r) => <Text strong style={{ color: "#52c41a" }}>+{formatNumber(r.jumlah)} <Text type="secondary" style={{fontSize: 12}}>{r.satuan}</Text></Text> }, { dataIndex: "tanggal", title: "Tgl Kirim", width: 110, render: (v) => formatDate(v) }]} />
        </Card>
      )}
    </div>
  );
};
export default ProductCreatePage;