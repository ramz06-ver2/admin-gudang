import {
  AutoComplete,
  Button,
  Card,
  Input,
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
import { formatNumber } from "../../utility/format";
import { COLORS } from "../../utility/constants";
import type { Product } from "../../types";
import type { useQuickEntry } from "../../hooks/useQuickEntry";

const { Text } = Typography;

interface Props {
  entry: ReturnType<typeof useQuickEntry>;
}

export const QuickEntryPanel = ({ entry }: Props) => {
  const {
    flow,
    keyword,
    setKeyword,
    highlightedIdx,
    searchResults,
    searchRef,
    handleSearchKeyDown,
    commitItem,
    activeItem,
    activeQty,
    setActiveQty,
    qtyRef,
    handleQtyKeyDown,
    pendingLines,
    totalPendingItems,
    removeLine,
    phase,
    handleFinish,
    handleCancel,
  } = entry;

  return (
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
      {/* Session bar */}
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
            <Button size="small" type="text" onClick={handleCancel}>
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
                  }))
                : []
            }
            onSelect={(_, opt) => {
              const p = (opt as { data: Product }).data;
              commitItem();
              // commitItem uses internal state; simpler to set directly
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
                  : "🔍 Menunggu sesi dimulai..."
              }
              onKeyDown={flow.isReady ? handleSearchKeyDown : undefined}
              readOnly={!flow.isReady}
              autoFocus={flow.isReady}
              style={{
                fontSize: 15,
                height: 48,
                cursor: flow.isReady ? "text" : "not-allowed",
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
                Pilih Lokasi → Tim → Nama untuk memulai
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
                    onClick={() => removeLine(line.itemId)}
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
  );
};
