import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Empty,
  InputNumber,
  Row,
  Select, // ✅ Menggunakan Select bukan AutoComplete
  Space,
  Switch,
  Tag,
  Typography,
  App,
  Table,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  SwapOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useProductSearch } from "../../hooks/useProductSearch";
import { usePersons } from "../../hooks/usePersons";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { useDebounce } from "../../hooks/useDebounce"; // ✅ FIX 4: Import hook debounce
import { SetupWizard } from "../../components/entry/SetupWizard";
import { mockWorkplaces } from "../../mocks/entry";
import { supabaseClient } from "../../utility/supabaseClient";
import { TABLES } from "../../utility/constants";
import { USE_MOCK } from "../../utility/config";
import { formatNumber } from "../../utility/format";
import type { Product } from "../../types";
import type { Person, Workplace } from "../../types/entry";

const { Title, Text } = Typography;

interface OutboundLine {
  itemId: number;
  itemName: string;
  size: string | null;
  unit: string;
  maxStock: number;
  quantity: number;
}

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

  // State pencarian
  const [keyword, setKeyword] = useState("");
  // ✅ FIX 4: Debounce input agar tidak race / lompat-lompat
  const debouncedKeyword = useDebounce(keyword, 250); 
  // Hook pencarian memanggil API dinamis menggunakan text yang sudah di-debounce
  const { products, isLoading: isLoadingProducts } = useProductSearch(debouncedKeyword, 30);

  const [activeItem, setActiveItem] = useState<Product | null>(null);
  const [activeQty, setActiveQty] = useState<number>(1);
  const [lines, setLines] = useState<OutboundLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchRef = useRef<any>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const phase = activeItem ? "quantity" : "search";

  // Auto-focus logic
  useEffect(() => {
    if (wizardOpen) return;
    if (phase === "search") {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else if (phase === "quantity") {
      setTimeout(() => qtyRef.current?.focus(), 100);
    }
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
      setActiveItem(item);
      setActiveQty(1);
      setKeyword(""); // Reset keyword
    }
  };

  const confirmQuantity = () => {
    if (!activeItem) return;
    if (activeQty <= 0) {
      message.warning("Jumlah minimal 1");
      return;
    }

    setLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === activeItem.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + activeQty };
        return copy;
      }
      return [
        {
          itemId: activeItem.id,
          itemName: activeItem.name,
          size: activeItem.size,
          unit: activeItem.unit,
          maxStock: activeItem.stock,
          quantity: activeQty,
        },
        ...prev,
      ];
    });
    
    setActiveItem(null);
    setActiveQty(1);
  };

  const removeLine = (itemId: number) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  };

  const handleFinish = async () => {
    if (lines.length === 0) {
      message.warning("Tambahkan minimal 1 barang ke daftar terlebih dahulu");
      return;
    }
    if (!personName || !workplaceName) {
      setWizardStep("person");
      setWizardOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const trxNumber = `OUT-${Date.now()}`;

      if (!USE_MOCK) {
        const payload = lines.map((l) => ({
          nomor_transaksi: trxNumber,
          barang_id: l.itemId,
          nama_pekerja: personName,
          nama_barang: l.itemName,
          ukuran_barang: l.size,
          satuan_barang: l.unit,
          jumlah_barang_keluar: l.quantity,
          tujuan: workplaceName,
          is_breakdown: isBreakdown,
        }));

        const { error: insertErr } = await supabaseClient.from(TABLES.stockExits).insert(payload);
        if (insertErr) throw insertErr;

        for (const line of lines) {
          const newStock = Math.max(0, line.maxStock - line.quantity);
          await supabaseClient.from(TABLES.products).update({ stok: newStock }).eq("id", line.itemId);
        }
      }

      message.success(`Pengeluaran ${lines.length} jenis barang berhasil disimpan!`);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["stock-exits"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      navigate("/dashboard");
    } catch (err: any) {
      message.error(err?.message || "Gagal menyimpan pengeluaran barang");
    } finally {
      setIsSubmitting(false);
    }
  };

  useKeyboardShortcut({
    key: "Enter",
    ctrlKey: true,
    enabled: lines.length > 0 && !isSubmitting && !wizardOpen && !activeItem,
    preventDefault: true,
    handler: () => handleFinish(),
  });

  const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", paddingBottom: 32 }}>
      <SetupWizard
        open={wizardOpen}
        step={wizardStep}
        title={wizardStep === "person" ? "Pilih Nama Pekerja" : "Pilih Lokasi Pekerjaan"}
        placeholder={wizardStep === "person" ? "Ketik nama pekerja..." : "Ketik lokasi pekerjaan..."}
        options={wizardStep === "person" ? persons : mockWorkplaces}
        onSelect={handleWizardSelect}
        onBack={wizardStep === "workplace" ? () => setWizardStep("person") : undefined}
        onClose={() => {
          if (!personName || !workplaceName) navigate("/dashboard");
          else setWizardOpen(false);
        }}
      />

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <Space align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/dashboard")} type="text" size="large" />
          <div>
            <Title level={3} style={{ margin: 0 }}>Pengeluaran Barang</Title>
            <Text type="secondary">Pilih barang yang diambil dan tentukan jumlahnya</Text>
          </div>
        </Space>

        <Card
          size="small"
          style={{ borderRadius: 10, background: isBreakdown ? "#e6f4ff" : "#fffbe6", borderColor: isBreakdown ? "#91caff" : "#ffe58f" }}
          styles={{ body: { padding: "8px 14px" } }}
        >
          <Space align="center" size={10}>
            <div>
              <Text strong style={{ fontSize: 13, display: "block" }}>
                Status: {isBreakdown ? "Masuk Breakdown" : "Diluar Breakdown"}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {isBreakdown ? "Otomatis tercatat di daftar Breakdown" : "Tercatat sebagai Non-Breakdown"}
              </Text>
            </div>
            <Switch checked={isBreakdown} onChange={setIsBreakdown} checkedChildren="Breakdown" unCheckedChildren="Non" />
          </Space>
        </Card>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space size={12} wrap>
              <Tag icon={<UserOutlined />} color="blue" style={{ fontSize: 14, padding: "6px 12px", borderRadius: 8 }}>
                Pekerja: <strong>{personName || "Belum dipilih"}</strong>
              </Tag>
              <Tag icon={<EnvironmentOutlined />} color="cyan" style={{ fontSize: 14, padding: "6px 12px", borderRadius: 8 }}>
                Lokasi: <strong>{workplaceName || "Belum dipilih"}</strong>
              </Tag>
            </Space>
          </Col>
          <Col>
            <Button size="small" icon={<SwapOutlined />} onClick={() => { setWizardStep("person"); setWizardOpen(true); }}>
              Ubah Nama / Lokasi
            </Button>
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: 20 } }}>
        {phase === "search" && (
          <>
            <Text strong style={{ fontSize: 14, display: "block", marginBottom: 8 }}>
              Cari Material / Alat
            </Text>
            
            <Select
              showSearch
              autoFocus
              ref={searchRef}
              size="large"
              style={{ width: "100%" }}
              placeholder="Ketik nama, ukuran, atau kode barang..."
              // ✅ FIX 1: Matikan filter lokal Ant Design. Biarkan Supabase yang memfilter
              filterOption={false} 
              value={null}
              loading={isLoadingProducts}
              onSearch={setKeyword}
              onChange={handleProductSelect}
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} ${p.size ? `(${p.size})` : ""} — Stok: ${p.stock} ${p.unit}`,
              }))}
              notFoundContent={isLoadingProducts ? "Mencari data..." : "Barang tidak ditemukan"}
            />
          </>
        )}

        {phase === "quantity" && activeItem && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>
                  {activeItem.name} {activeItem.size ? `(${activeItem.size})` : ""}
                </Text>
              </div>
              <Tag color="blue" style={{ fontSize: 13, padding: "4px 10px" }}>
                Sisa Stok: {activeItem.stock} {activeItem.unit}
              </Tag>
            </div>

            <Space.Compact style={{ width: "100%" }}>
              <Button size="large" onClick={() => setActiveQty((q) => Math.max(1, q - 1))} style={{ width: 64, height: 50, fontSize: 22 }}>−</Button>
              <InputNumber
                ref={qtyRef as never}
                value={activeQty}
                onChange={(val) => setActiveQty(Number(val) || 1)}
                size="large"
                min={1}
                controls={false}
                onPressEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmQuantity();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setActiveItem(null);
                  if (e.key === "ArrowUp") setActiveQty((q) => q + 1);
                  if (e.key === "ArrowDown") setActiveQty((q) => Math.max(1, q - 1));
                }}
                style={{ flex: 1, textAlign: "center", fontSize: 22, fontWeight: 600, height: 50 }}
              />
              <Button size="large" onClick={() => setActiveQty((q) => q + 1)} style={{ width: 64, height: 50, fontSize: 22 }}>+</Button>
            </Space.Compact>

            <Space style={{ marginTop: 14, width: "100%", justifyContent: "space-between" }} wrap>
              <Space size="small" wrap>
                <Tag>Enter</Tag> <Text type="secondary" style={{ fontSize: 12 }}>tambahkan ke daftar</Text>
                <Tag>Esc</Tag> <Text type="secondary" style={{ fontSize: 12 }}>batal</Text>
              </Space>
              <Space>
                <Button onClick={() => { setActiveItem(null); setTimeout(() => searchRef.current?.focus(), 50); }}>Batal</Button>
                <Button type="primary" onClick={confirmQuantity}>Tambah ke Daftar</Button>
              </Space>
            </Space>
          </div>
        )}
      </Card>

      <Card
        title={`📦 Daftar Pengeluaran (${lines.length} jenis · ${formatNumber(totalItems)} item)`}
        variant="borderless"
        style={{ borderRadius: 12 }}
        styles={{ body: { padding: 0 } }}
        extra={
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            disabled={lines.length === 0}
            loading={isSubmitting}
            onClick={handleFinish}
          >
            Simpan ke Database (Ctrl+Enter)
          </Button>
        }
      >
        {lines.length === 0 ? (
          <div style={{ padding: 32 }}>
            <Empty description="Belum ada barang yang ditambahkan ke daftar" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <Table
            dataSource={lines}
            rowKey="itemId"
            pagination={false}
            size="middle"
            columns={[
              {
                title: "Nama Barang",
                dataIndex: "itemName",
                render: (text, record) => (
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: 15 }}>{text}</Text>
                    {record.size && <Text type="secondary" style={{ fontSize: 13 }}>Ukuran: {record.size}</Text>}
                  </Space>
                ),
              },
              {
                title: "Jumlah",
                dataIndex: "quantity",
                align: "right",
                render: (val, record) => (
                  <Tag color="red" style={{ fontSize: 15, padding: "4px 12px", fontWeight: 600 }}>
                    {formatNumber(val)} {record.unit}
                  </Tag>
                ),
              },
              {
                title: "",
                align: "center",
                width: 70,
                render: (_, record) => (
                  <Button
                    type="text"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => removeLine(record.itemId)}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default EntryPage;