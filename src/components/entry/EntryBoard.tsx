import { useEffect, useRef, useState } from "react";
import {
  AutoComplete,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  List,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useProductSearch } from "../../hooks/useProductSearch";
import { formatNumber } from "../../utility/format";
import type { Person, Team, Workplace, EntryLine } from "../../types/entry";
import type { Product } from "../../types";

const { Title, Text } = Typography;

interface Props {
  team: Team;
  person: Person;
  workplace: Workplace;
  phase: "search" | "quantity";
  activeItem: Product | null;
  activeQty: number;
  lines: EntryLine[];
  onSelectItem: (item: Product) => void;
  onConfirmQuantity: () => void;
  onCancelQuantity: () => void;
  onIncreaseQty: () => void;
  onDecreaseQty: () => void;
  onRemoveLine: (itemId: number) => void;
  onFinish: () => void;
}

export const EntryBoard = ({
  team,
  person,
  workplace,
  phase,
  activeItem,
  activeQty,
  lines,
  onSelectItem,
  onConfirmQuantity,
  onCancelQuantity,
  onIncreaseQty,
  onDecreaseQty,
  onRemoveLine,
  onFinish,
}: Props) => {
  // ==========================================
  // Local state
  // ==========================================
  const [keyword, setKeyword] = useState("");
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const { products } = useProductSearch(keyword, 8);

  // ==========================================
  // Auto-focus sesuai phase
  // ==========================================
  useEffect(() => {
    if (phase === "search") {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else if (phase === "quantity") {
      setTimeout(() => qtyRef.current?.focus(), 100);
    }
  }, [phase]);

  // ==========================================
  // Reset highlight saat keyword berubah
  // ==========================================
  useEffect(() => {
    setHighlightedIdx(0);
  }, [keyword]);

  // ==========================================
  // Ctrl+Enter → selesai
  // ==========================================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        if (lines.length > 0) onFinish();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lines.length, onFinish]);

  // ==========================================
  // Handlers — search phase
  // ==========================================
  const commitItem = () => {
    if (products.length === 0) return;
    const chosen = products[highlightedIdx] ?? products[0];
    onSelectItem(chosen);
    setKeyword("");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, products.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commitItem();
    }
  };

  // ==========================================
  // Handlers — quantity phase
  // ==========================================
  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onConfirmQuantity();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancelQuantity();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onIncreaseQty();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onDecreaseQty();
    }
  };

  // ==========================================
  // Derived
  // ==========================================
  const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* ====================================== */}
      {/* Header card — workplace + team + person */}
      {/* ====================================== */}
      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 16 }}>
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Space size={8}>
            <EnvironmentOutlined style={{ color: "#1677ff", fontSize: 20 }} />
            <Title level={3} style={{ margin: 0 }}>
              {workplace.name}
            </Title>
          </Space>
          <Space size={12} wrap>
            <Text type="secondary">
              <EnvironmentOutlined /> {workplace.name}
            </Text>
            <Text type="secondary">
              <TeamOutlined /> {team.name}
            </Text>
            <Text type="secondary">
              <UserOutlined /> {person.name}
            </Text>
          </Space>
        </Space>
      </Card>

      {/* ====================================== */}
      {/* Input card — search atau quantity       */}
      {/* ====================================== */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, marginBottom: 16 }}
        styles={{ body: { padding: 24 } }}
      >
        {phase === "search" && (
          <>
            <Text strong style={{ fontSize: 14 }}>
              Nama Barang
            </Text>
            <AutoComplete
              value={keyword}
              onChange={setKeyword}
              options={products.map((p, idx) => ({
                value: p.name,
                label: (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "2px 0",
                      background:
                        idx === highlightedIdx ? "#e6f4ff" : "transparent",
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
              }))}
              onSelect={(_, opt) => {
                onSelectItem((opt as { data: Product }).data);
                setKeyword("");
              }}
              style={{ width: "100%", marginTop: 8 }}
            >
              <Input
                ref={searchRef as never}
                size="large"
                prefix={<SearchOutlined />}
                placeholder="Ketik nama barang, lalu Enter..."
                onKeyDown={handleSearchKeyDown}
                autoFocus
              />
            </AutoComplete>

            <Space style={{ marginTop: 12 }} size="small" wrap>
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
          </>
        )}

        {phase === "quantity" && activeItem && (
          <>
            <Space
              style={{
                marginBottom: 12,
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              <Text strong style={{ fontSize: 14 }}>
                Jumlah — {activeItem.name}
              </Text>
              <Tag color="blue">
                Stok: {activeItem.stock} {activeItem.unit}
              </Tag>
            </Space>

            <Space.Compact style={{ width: "100%" }}>
              <Button
                size="large"
                onClick={onDecreaseQty}
                style={{ width: 60, height: 48, fontSize: 20 }}
              >
                −
              </Button>

              <InputNumber
                ref={qtyRef as never}
                value={activeQty}
                size="large"
                min={1}
                max={activeItem.stock}
                controls={false}
                onKeyDown={handleQtyKeyDown}
                readOnly
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 20,
                  fontWeight: 600,
                }}
              />

              <Button
                size="large"
                onClick={onIncreaseQty}
                style={{ width: 60, height: 48, fontSize: 20 }}
              >
                +
              </Button>
            </Space.Compact>

            <div style={{ marginTop: 8, textAlign: "right" }}>
              <Text type="secondary">
                {activeQty} {activeItem.unit}
              </Text>
            </div>

            <Space style={{ marginTop: 12 }} size="small" wrap>
              <Tag>↑↓ / + −</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ubah jumlah
              </Text>
              <Tag>Enter</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                tambah & lanjut
              </Text>
              <Tag>Esc</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                batal
              </Text>
            </Space>
          </>
        )}
      </Card>

      {/* ====================================== */}
      {/* Lines list — barang yang sudah di-input */}
      {/* ====================================== */}
      <Card
        title={`Daftar Barang (${lines.length} jenis · ${formatNumber(totalItems)} total)`}
        variant="borderless"
        style={{ borderRadius: 12 }}
        extra={
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            disabled={lines.length === 0}
            onClick={onFinish}
          >
            Selesai (Ctrl+Enter)
          </Button>
        }
      >
        {lines.length === 0 ? (
          <Empty
            description="Belum ada barang ditambahkan"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            size="small"
            dataSource={lines}
            renderItem={(line) => (
              <List.Item
                actions={[
                  <Button
                    key="del"
                    type="text"
                    danger
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={() => onRemoveLine(line.itemId)}
                  />,
                ]}
              >
                <List.Item.Meta
                  title={line.itemName}
                  description={`${formatNumber(line.quantity)} ${line.unit}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};
