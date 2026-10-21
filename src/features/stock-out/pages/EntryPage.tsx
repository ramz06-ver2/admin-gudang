import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Col, Empty, InputNumber, Row, Select, Space, Switch, Tag, Typography, App, Table } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, EnvironmentOutlined, SwapOutlined, UserOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useProductSearch } from "../../products/useProductSearch";
import { usePersons } from "../usePersons";
import { useKeyboardShortcut } from "../../../shared/hooks/useKeyboardShortcut";
import { useDebounce } from "../../../shared/hooks/useDebounce";
import { SetupWizard } from "../components/SetupWizard";
import { mockWorkplaces } from "../../../mocks/entry";
import { supabaseClient } from "../../../shared/lib/supabaseClient";
import { USE_MOCK } from "../../../shared/lib/config";
import { formatNumber } from "../../../shared/lib/format";
import type { Product, Person, Workplace, OutboundLine } from "../../../shared/types"; // Menggunakan OutboundLine dari types/index

const { Title, Text } = Typography;

export const EntryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { persons } = usePersons();

  const initialPerson = searchParams.get("person") || "";
  const initialWorkplace = searchParams.get("workplace") || "";

  const [personName, setPersonName] = useState<string>(initialPerson);
  const [workplaceName, setWorkplaceName] = useState<string>(initialWorkplace);
  const [isBreakdown, setIsBreakdown] = useState<boolean>(true);
  const [wizardOpen, setWizardOpen] = useState<boolean>(!initialPerson || !initialWorkplace);
  const [wizardStep, setWizardStep] = useState<"person" | "workplace">("person");

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 250);
  const { products, isLoading: isLoadingProducts } = useProductSearch(debouncedKeyword, 30);

  const [activeItem, setActiveItem] = useState<Product | null>(null);
  const [activeQty, setActiveQty] = useState<number>(1);
  const [lines, setLines] = useState<OutboundLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchRef = useRef<any>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const phase = activeItem ? "quantity" : "search";

  useEffect(() => {
    if (wizardOpen) return;
    if (phase === "search") setTimeout(() => searchRef.current?.focus(), 100);
    else if (phase === "quantity") setTimeout(() => qtyRef.current?.focus(), 100);
  }, [phase, wizardOpen]);

  const handleWizardSelect = (val: Person | Workplace) => {
    if (wizardStep === "person") {
      setPersonName(val.name);
      setWizardStep("workplace");
    } else {
      setWorkplaceName(val.name);
      setWizardOpen(false);
      setSearchParams({ person: personName, workplace: val.name });
    }
  };

  const handleProductSelect = (productId: number) => {
    const item = products.find((p) => p.id === productId);
    if (item) {
      if (item.stock <= 0) return message.error(`Stok ${item.name} sedang habis`);
      setActiveItem(item);
      setActiveQty(1);
      setKeyword("");
    }
  };

  const confirmQuantity = () => {
    if (!activeItem) return;
    if (activeQty <= 0) return message.warning("Jumlah minimal 1");

    const existingQty = lines.find((l) => l.itemId === activeItem.id)?.quantity ?? 0;
    // ✅ PERBAIKAN: Validasi ketat sisi client sebelum submit
    if (existingQty + activeQty > activeItem.stock) {
      return message.warning(`Jumlah melebihi sisa stok! Maksimal tambahan: ${activeItem.stock - existingQty} ${activeItem.unit}`);
    }

    setLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === activeItem.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + activeQty };
        return copy;
      }
      return [{ itemId: activeItem.id, itemName: activeItem.name, size: activeItem.size, unit: activeItem.unit, maxStock: activeItem.stock, quantity: activeQty }, ...prev];
    });
    setActiveItem(null);
    setActiveQty(1);
  };

  const handleFinish = async () => {
    if (lines.length === 0) return message.warning("Tambahkan minimal 1 barang");
    if (!personName || !workplaceName) return setWizardOpen(true);

    setIsSubmitting(true);
    try {
      if (!USE_MOCK) {
        // ✅ PERBAIKAN: Gunakan RPC untuk transaksi atomik
        const { error } = await supabaseClient.rpc("issue_stock", {
          p_items: lines.map(l => ({ itemId: l.itemId, quantity: l.quantity, size: l.size, unit: l.unit, itemName: l.itemName })),
          p_person: personName,
          p_destination: workplaceName,
          p_breakdown: isBreakdown
        });
        if (error) throw error;
      }
      message.success(`Pengeluaran ${lines.length} jenis barang berhasil disimpan!`);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["stock-exits"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate("/dashboard");
    } catch (err: any) {
      message.error(err?.message || "Gagal menyimpan pengeluaran barang (cek stok)");
    } finally {
      setIsSubmitting(false);
    }
  };

  useKeyboardShortcut({ key: "Enter", ctrlKey: true, enabled: lines.length > 0 && !isSubmitting && !wizardOpen && !activeItem, preventDefault: true, handler: handleFinish });

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", paddingBottom: 32 }}>
      <SetupWizard open={wizardOpen} step={wizardStep} title={wizardStep === "person" ? "Pilih Nama Pekerja" : "Pilih Lokasi Pekerjaan"} placeholder={wizardStep === "person" ? "Ketik nama pekerja..." : "Ketik lokasi pekerjaan..."} options={wizardStep === "person" ? persons : mockWorkplaces} onSelect={handleWizardSelect} onBack={wizardStep === "workplace" ? () => setWizardStep("person") : undefined} onClose={() => { if (!personName || !workplaceName) navigate("/dashboard"); else setWizardOpen(false); }} />

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <Space align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/dashboard")} type="text" size="large" />
          <div>
            <Title level={3} style={{ margin: 0 }}>Pengeluaran Barang</Title>
            <Text type="secondary">Pilih barang yang diambil dan tentukan jumlahnya</Text>
          </div>
        </Space>
        <Card size="small" style={{ borderRadius: 10, background: isBreakdown ? "#e6f4ff" : "#fffbe6", borderColor: isBreakdown ? "#91caff" : "#ffe58f" }}>
          <Space align="center" size={10}>
            <div>
              <Text strong style={{ fontSize: 13, display: "block" }}>Status: {isBreakdown ? "Breakdown" : "Non Breakdown"}</Text>
            </div>
            <Switch checked={isBreakdown} onChange={setIsBreakdown} />
          </Space>
        </Card>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size={12} wrap>
              <Tag icon={<UserOutlined />} color="blue" style={{ fontSize: 14, padding: "6px 12px" }}>Pekerja: <strong>{personName || "-"}</strong></Tag>
              <Tag icon={<EnvironmentOutlined />} color="cyan" style={{ fontSize: 14, padding: "6px 12px" }}>Lokasi: <strong>{workplaceName || "-"}</strong></Tag>
            </Space>
          </Col>
          <Col><Button size="small" icon={<SwapOutlined />} onClick={() => { setWizardStep("person"); setWizardOpen(true); }}>Ubah Sesi</Button></Col>
        </Row>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: 20 } }}>
        {phase === "search" && (
          <Select showSearch autoFocus ref={searchRef} size="large" style={{ width: "100%" }} placeholder="Ketik nama, ukuran, atau kode barang..." filterOption={false} value={null} loading={isLoadingProducts} onSearch={setKeyword} onChange={handleProductSelect} options={products.map((p) => ({ value: p.id, label: `${p.name} ${p.size ? `(${p.size})` : ""} — Stok: ${p.stock} ${p.unit}` }))} notFoundContent={isLoadingProducts ? "Mencari data..." : "Barang tidak ditemukan"} />
        )}
        {phase === "quantity" && activeItem && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <Text strong style={{ fontSize: 16 }}>{activeItem.name} {activeItem.size ? `(${activeItem.size})` : ""}</Text>
              <Tag color="blue">Sisa Stok: {activeItem.stock} {activeItem.unit}</Tag>
            </div>
            <Space.Compact style={{ width: "100%" }}>
              <Button size="large" onClick={() => setActiveQty((q) => Math.max(1, q - 1))} style={{ width: 64, height: 50 }}>−</Button>
              <InputNumber ref={qtyRef as never} value={activeQty} onChange={(val) => setActiveQty(Number(val) || 1)} size="large" min={1} max={activeItem.stock} controls={false} onPressEnter={(e) => { e.preventDefault(); confirmQuantity(); }} onKeyDown={(e) => { if (e.key === "Escape") setActiveItem(null); if (e.key === "ArrowUp") setActiveQty((q) => Math.min(activeItem.stock, q + 1)); if (e.key === "ArrowDown") setActiveQty((q) => Math.max(1, q - 1)); }} style={{ flex: 1, textAlign: "center", fontSize: 22, fontWeight: 600, height: 50 }} />
              <Button size="large" onClick={() => setActiveQty((q) => Math.min(activeItem.stock, q + 1))} style={{ width: 64, height: 50 }}>+</Button>
            </Space.Compact>
            <Space style={{ marginTop: 14, width: "100%", justifyContent: "space-between" }}>
              <Space size="small"><Tag>Enter</Tag> <Text type="secondary">tambah</Text> <Tag>Esc</Tag> <Text type="secondary">batal</Text></Space>
              <Space><Button onClick={() => setActiveItem(null)}>Batal</Button><Button type="primary" onClick={confirmQuantity}>Tambah</Button></Space>
            </Space>
          </div>
        )}
      </Card>

      <Card title={`📦 Daftar Pengeluaran (${lines.length} jenis)`} variant="borderless" style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }} extra={<Button type="primary" icon={<CheckCircleOutlined />} disabled={lines.length === 0} loading={isSubmitting} onClick={handleFinish}>Simpan (Ctrl+Enter)</Button>}>
        {lines.length === 0 ? <div style={{ padding: 32 }}><Empty description="Belum ada barang di daftar" /></div> : (
          <Table dataSource={lines} rowKey="itemId" pagination={false} size="middle" columns={[
            { title: "Nama Barang", dataIndex: "itemName", render: (t, r) => <Space direction="vertical" size={0}><Text strong>{t}</Text>{r.size && <Text type="secondary">{r.size}</Text>}</Space> },
            { title: "Jumlah", dataIndex: "quantity", align: "right", render: (v, r) => <Tag color="red" style={{ fontSize: 14 }}>{formatNumber(v)} {r.unit}</Tag> },
            { title: "", align: "center", width: 60, render: (_, r) => <Button type="text" danger icon={<CloseCircleOutlined />} onClick={() => setLines((p) => p.filter((x) => x.itemId !== r.itemId))} /> },
          ]} />
        )}
      </Card>
    </div>
  );
};
export default EntryPage;