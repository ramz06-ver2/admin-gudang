import { useEffect, useRef, useState } from "react";
import {
  AutoComplete,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  App,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { SetupWizard } from "../../components/entry/SetupWizard";
import { useEntryFlow } from "../../hooks/useEntryFlow";
import { useProductSearch } from "../../hooks/useProductSearch";
import { mockProducts } from "../../mocks/products";
import { mockStockExits } from "../../mocks/stockExist";
import { formatFullDate, formatNumber } from "../../utility/format";
import { COLORS } from "../../utility/constants";
import type { Product, StockExit } from "../../types";

const { Title, Text } = Typography;

// ============================================
// Pending line
// ============================================
interface PendingLine {
  itemId: number;
  itemName: string;
  unit: string;
  quantity: number;
}

// ============================================
// Dashboard Page
// ============================================
export const DashboardPage = () => {
  const { message } = App.useApp();
  const flow = useEntryFlow();

  // Local state — realtime update
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [exits, setExits] = useState<StockExit[]>(mockStockExits);

  // ✅ State untuk kontrol wizard
  const [wizardOpen, setWizardOpen] = useState(false);

  // Quick entry state
  const [keyword, setKeyword] = useState("");
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [activeItem, setActiveItem] = useState<Product | null>(null);
  const [activeQty, setActiveQty] = useState(1);
  const [pendingLines, setPendingLines] = useState<PendingLine[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const { products: searchResults } = useProductSearch(keyword, 8);
  const phase = activeItem ? "quantity" : "search";

  // ==========================================
  // Auto-focus
  // ==========================================
  useEffect(() => {
    if (!flow.isReady) return;
    if (phase === "search") {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setTimeout(() => qtyRef.current?.focus(), 100);
    }
  }, [phase, flow.isReady]);

  useEffect(() => setHighlightedIdx(0), [keyword]);

  // ==========================================
  // Ctrl+Enter → selesai
  // ==========================================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter" && pendingLines.length > 0) {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLines.length]);

  // ==========================================
  // Ctrl+K → buka wizard (kalau sesi belum aktif)
  // ==========================================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k" && !flow.isReady) {
        e.preventDefault();
        setWizardOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flow.isReady]);

  // ==========================================
  // Auto-close wizard saat sesi siap
  // ==========================================
  useEffect(() => {
    if (flow.isReady) {
      setWizardOpen(false);
    }
  }, [flow.isReady]);

  // ==========================================
  // Search handlers
  // ==========================================
  const commitItem = () => {
    if (searchResults.length === 0) return;
    const chosen = searchResults[highlightedIdx] ?? searchResults[0];
    setActiveItem(chosen);
    setActiveQty(1);
    setKeyword("");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commitItem();
    }
  };

  // ==========================================
  // Quantity handlers
  // ==========================================
  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmQuantity();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setActiveItem(null);
      setActiveQty(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveQty((q) => q + 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveQty((q) => Math.max(1, q - 1));
    }
  };

  const confirmQuantity = () => {
    if (!activeItem) return;
    setPendingLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === activeItem.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + activeQty };
        return copy;
      }
      return [
        ...prev,
        {
          itemId: activeItem.id,
          itemName: activeItem.name,
          unit: activeItem.unit,
          quantity: activeQty,
        },
      ];
    });
    setActiveItem(null);
    setActiveQty(1);
  };

  // ==========================================
  // FINISH — update stok + log exit
  // ==========================================
  const handleFinish = () => {
    if (pendingLines.length === 0) return;
    if (!flow.team || !flow.person || !flow.workplace) return;

    // 1. Update stok (kurangi)
    setProducts((prev) =>
      prev.map((p) => {
        const line = pendingLines.find((l) => l.itemId === p.id);
        if (!line) return p;
        return { ...p, stock: Math.max(0, p.stock - line.quantity) };
      }),
    );

    // 2. Tambah log exit
    const now = dayjs();
    const newExit: StockExit = {
      id: Date.now(),
      timestamp: now.toISOString(),
      date: now.format("YYYY-MM-DD"),
      time: now.format("HH:mm"),
      team: flow.team.name,
      person: flow.person.name,
      workplace: flow.workplace.name,
      items: pendingLines.map((l) => ({
        itemId: l.itemId,
        itemName: l.itemName,
        unit: l.unit,
        quantity: l.quantity,
      })),
    };
    setExits((prev) => [newExit, ...prev]);

    // 3. Toast + reset
    message.success(
      `Tersimpan: ${pendingLines.length} jenis barang di ${flow.workplace.name}`,
    );
    setPendingLines([]);
    setActiveItem(null);
    setActiveQty(1);
    setKeyword("");
    flow.resetSession();
  };

  const handleCancelSession = () => {
    setPendingLines([]);
    setActiveItem(null);
    setActiveQty(1);
    setKeyword("");
    flow.resetSession();
  };

  const totalPendingItems = pendingLines.reduce((s, l) => s + l.quantity, 0);

  // ==========================================
  // Render
  // ==========================================
  return (
    <>
      {/* ==========================================
          WIZARD — buka hanya saat dipicu user
          ========================================== */}
      <SetupWizard
        open={wizardOpen}
        step={
          flow.step === "done"
            ? "team"
            : (flow.step as "team" | "person" | "workplace")
        }
        title={flow.currentWizardData?.title ?? ""}
        placeholder={flow.currentWizardData?.placeholder ?? ""}
        options={flow.currentWizardData?.options ?? []}
        onSelect={flow.selectWizardValue}
        onBack={flow.step !== "team" ? flow.backWizard : undefined}
        onClose={() => {
          setWizardOpen(false);
          flow.resetSession();
        }}
      />

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Dashboard
        </Title>
        <Text type="secondary">{formatFullDate(new Date())}</Text>
      </div>

      {/* ==========================================
          QUICK ENTRY — paling atas
          ========================================== */}
      <Card
        variant="borderless"
        style={{
          borderRadius: 12,
          marginBottom: 16,
          border:
            flow.isReady && pendingLines.length > 0
              ? `1px solid ${COLORS.primary}`
              : undefined,
        }}
        styles={{ body: { padding: 16 } }}
      >
        {/* Session bar — muncul kalau sesi aktif */}
        {flow.isReady && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Space size={8} wrap>
              <Tag icon={<EnvironmentOutlined />} color="blue">
                {flow.workplace?.name}
              </Tag>
              <Tag icon={<TeamOutlined />}>{flow.team?.name}</Tag>
              <Tag icon={<UserOutlined />}>{flow.person?.name}</Tag>
            </Space>
            <Space size={8}>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                disabled={pendingLines.length === 0}
                onClick={handleFinish}
              >
                Selesai (Ctrl+Enter)
              </Button>
              <Button size="small" type="text" onClick={handleCancelSession}>
                Batal
              </Button>
            </Space>
          </div>
        )}

        {/* Search phase */}
        {phase === "search" && (
          <>
            <AutoComplete
              value={keyword}
              onChange={setKeyword}
              options={
                flow.isReady
                  ? searchResults.map((p, idx) => ({
                      value: p.name,
                      label: (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "2px 0",
                            background:
                              idx === highlightedIdx
                                ? "#e6f4ff"
                                : "transparent",
                          }}
                        >
                          <span>
                            {p.name}{" "}
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              · {p.code}
                            </Text>
                          </span>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            stok: {p.stock} {p.unit}
                          </Text>
                        </div>
                      ),
                      data: p,
                    }))
                  : []
              }
              onSelect={(_, opt) => {
                const p = (opt as { data: Product }).data;
                setActiveItem(p);
                setActiveQty(1);
                setKeyword("");
              }}
              style={{ width: "100%" }}
            >
              <Input
                ref={searchRef as never}
                size="large"
                prefix={<SearchOutlined style={{ fontSize: 18 }} />}
                placeholder={
                  flow.isReady
                    ? "🔍 Ketik nama barang, lalu Enter untuk tambah..."
                    : "👆 Klik di sini atau Ctrl+K untuk mulai entry cepat..."
                }
                onKeyDown={flow.isReady ? handleSearchKeyDown : undefined}
                readOnly={!flow.isReady}
                autoFocus={flow.isReady}
                onClick={() => {
                  if (!flow.isReady) {
                    setWizardOpen(true);
                  }
                }}
                style={{
                  fontSize: 15,
                  height: 48,
                  cursor: flow.isReady ? "text" : "pointer",
                  background: flow.isReady ? undefined : "#f5f5f5",
                }}
              />
            </AutoComplete>

            <div style={{ marginTop: 8 }}>
              {flow.isReady ? (
                <Space size="small" wrap>
                  <Tag>↑↓</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    navigasi
                  </Text>
                  <Tag>Enter</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    pilih & lanjut ke jumlah
                  </Text>
                  <Tag>Ctrl+Enter</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    selesai
                  </Text>
                </Space>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Klik kolom di atas, atau tekan <Tag>Ctrl+K</Tag> untuk memulai
                  sesi baru
                </Text>
              )}
            </div>
          </>
        )}

        {/* Quantity phase */}
        {phase === "quantity" && activeItem && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ marginRight: 8 }}>
                Jumlah — {activeItem.name}
              </Text>
              <Tag color="blue">
                Stok: {activeItem.stock} {activeItem.unit}
              </Tag>
            </div>
            <Space.Compact style={{ width: "100%" }}>
              <Button
                size="large"
                onClick={() => setActiveQty((q) => Math.max(1, q - 1))}
                style={{ width: 60, height: 48, fontSize: 22, fontWeight: 600 }}
              >
                −
              </Button>
              <Input
                ref={qtyRef as never}
                value={activeQty}
                size="large"
                onKeyDown={handleQtyKeyDown}
                readOnly
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: 600,
                  height: 48,
                }}
              />
              <Button
                size="large"
                onClick={() => setActiveQty((q) => q + 1)}
                style={{ width: 60, height: 48, fontSize: 22, fontWeight: 600 }}
              >
                +
              </Button>
            </Space.Compact>
            <div style={{ marginTop: 8 }}>
              <Space size="small" wrap>
                <Tag>↑↓ / + −</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ubah jumlah
                </Text>
                <Tag>Enter</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  tambah
                </Text>
                <Tag>Esc</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  batal
                </Text>
              </Space>
            </div>
          </div>
        )}

        {/* Pending list */}
        {pendingLines.length > 0 && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px dashed #f0f0f0",
            }}
          >
            <Text
              strong
              style={{ fontSize: 13, display: "block", marginBottom: 8 }}
            >
              📝 Akan disimpan ({pendingLines.length} jenis ·{" "}
              {formatNumber(totalPendingItems)} total):
            </Text>
            <List
              size="small"
              dataSource={pendingLines}
              renderItem={(line) => (
                <List.Item
                  style={{ padding: "4px 0" }}
                  actions={[
                    <Button
                      key="del"
                      type="text"
                      danger
                      size="small"
                      icon={<CloseCircleOutlined />}
                      onClick={() =>
                        setPendingLines((prev) =>
                          prev.filter((l) => l.itemId !== line.itemId),
                        )
                      }
                    />,
                  ]}
                >
                  <Space>
                    <Text style={{ fontSize: 13 }}>{line.itemName}</Text>
                    <Tag color="blue" style={{ margin: 0 }}>
                      {formatNumber(line.quantity)} {line.unit}
                    </Tag>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        )}
      </Card>

      {/* ==========================================
          BOTTOM: Stok (kiri) + Barang Keluar (kanan)
          ========================================== */}
      <Row gutter={[16, 16]}>
        {/* Stok Persediaan — kiri */}
        <Col xs={24} lg={16}>
          <Card
            title="📦 Stok Persediaan Barang"
            variant="borderless"
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 0 } }}
          >
            <Table<Product>
              dataSource={products}
              rowKey="id"
              pagination={{ pageSize: 10, size: "small" }}
              size="small"
              columns={[
                { dataIndex: "code", title: "Kode", width: 110 },
                { dataIndex: "name", title: "Nama", ellipsis: true },
                {
                  dataIndex: "stock",
                  title: "Stok",
                  width: 160,
                  align: "right",
                  render: (v: number, r: Product) => (
                    <Text strong style={{ fontSize: 15 }}>
                      {formatNumber(v)}{" "}
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, fontWeight: 400 }}
                      >
                        {r.unit}
                      </Text>
                    </Text>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Barang Keluar — kanan kecil */}
        <Col xs={24} lg={8}>
          <Card
            title="📤 Barang Keluar Hari Ini"
            variant="borderless"
            style={{ borderRadius: 12, height: "100%" }}
            styles={{
              body: {
                padding: exits.length ? 12 : 24,
                maxHeight: 600,
                overflowY: "auto",
              },
            }}
          >
            {exits.length === 0 ? (
              <Empty
                description="Belum ada barang keluar"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                {exits.map((exit) => (
                  <Card
                    key={exit.id}
                    size="small"
                    style={{
                      borderRadius: 8,
                      background: "#fafafa",
                      border: "1px solid #f0f0f0",
                    }}
                    styles={{ body: { padding: 10 } }}
                  >
                    {/* Header: jam + lokasi */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <Text strong style={{ fontSize: 14, color: "#1677ff" }}>
                        {exit.time}
                      </Text>
                      <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                        <EnvironmentOutlined /> {exit.workplace}
                      </Tag>
                    </div>

                    {/* Tim + Nama */}
                    <div
                      style={{
                        fontSize: 12,
                        color: "#666",
                        marginBottom: 6,
                      }}
                    >
                      <TeamOutlined /> {exit.team} · <UserOutlined />{" "}
                      {exit.person}
                    </div>

                    {/* Items */}
                    <div
                      style={{
                        borderTop: "1px dashed #e0e0e0",
                        paddingTop: 6,
                      }}
                    >
                      {exit.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            padding: "2px 0",
                          }}
                        >
                          <Text style={{ fontSize: 12 }}>
                            • {item.itemName}
                          </Text>
                          <Text
                            strong
                            style={{ fontSize: 12, color: "#ff4d4f" }}
                          >
                            {formatNumber(item.quantity)} {item.unit}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default DashboardPage;
