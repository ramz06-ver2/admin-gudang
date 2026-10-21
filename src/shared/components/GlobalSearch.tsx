import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Modal, Spin, Empty, Tag, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import { useDebounce } from "../hooks/useDebounce";
import { useProductSearch } from "../../features/products/useProductSearch";
import type { Product } from "../types";

const { Text } = Typography;

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedKeyword = useDebounce(keyword, 250);
  const { products, isLoading } = useProductSearch(debouncedKeyword);

  useEffect(() => {
    if (open) {
      setKeyword("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (activeIndex >= products.length) setActiveIndex(0);
  }, [products.length, activeIndex]);

  const handleSelect = useCallback(
    (product: Product) => {
      setOpen(false);
      navigate(`/products/create?productId=${product.id}`);
    },
    [navigate],
  );

  // ⌨️ Ctrl+K → buka palette pencarian global
  useKeyboardShortcut({
    key: "k",
    ctrlKey: true,
    enabled: !open,
    handler: () => setOpen(true),
  });

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, products.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = products[activeIndex];
      if (selected) handleSelect(selected);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      closable={false}
      width={560}
      destroyOnClose
      styles={{ body: { padding: 0 } }}
      style={{ top: 80 }}
    >
      <div style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>
        <Input
          ref={inputRef as never}
          size="large"
          prefix={<SearchOutlined />}
          placeholder="Cari produk berdasarkan nama atau kode (Ctrl+K)..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="borderless"
          autoFocus
        />
      </div>

      <div style={{ maxHeight: 360, overflowY: "auto", padding: 8 }}>
        {isLoading && (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin />
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <Empty
            description="Produk tidak ditemukan"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: 24 }}
          />
        )}

        {!isLoading &&
          products.map((product, index) => (
            <div
              key={product.id}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleSelect(product)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                background: index === activeIndex ? "#e6f4ff" : "transparent",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  {product.name}{" "}
                  {product.size && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({product.size})
                    </Text>
                  )}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {product.code} · Stok: {product.stock} {product.unit}
                </Text>
              </div>
              <Tag color="blue" style={{ margin: 0 }}>
                Tambah Stok
              </Tag>
            </div>
          ))}
      </div>

      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: "#8c8c8c",
        }}
      >
        <span>↑↓ navigasi</span>
        <span>↵ pilih</span>
        <span>esc tutup</span>
      </div>
    </Modal>
  );
};