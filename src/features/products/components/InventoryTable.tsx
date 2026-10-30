// src/features/products/components/InventoryTable.tsx
import { useEffect, useState } from "react";
import {
  Table,
  Typography,
  Tag,
  Space,
  Card,
  Input,
  Grid,
  Button,
  Modal,
  Select,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatNumber } from "../../../shared/lib/format";
import {
  SendOutlined,
  UserOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type {
  Product,
  StockExit,
  StockExitItem,
  UserRole,
} from "../../../shared/types";
import { getStoredUser } from "../../../app/providers/authProvider";
import { canManageBarang } from "../../../app/providers/accessControlProvider";
import { createBarang, updateBarang, deleteBarang } from "../api";

const { Text } = Typography;

interface OutboundRow extends StockExitItem {
  transactionId: number;
  time: string;
  person: string;
  destination: string | null;
}

type InventoryTableProps =
  | {
      type: "stock";
      dataSource: Product[];
      loading?: boolean;
      defaultCategory?: string;
      role?: UserRole;
      onRefetch?: () => void;
    }
  | {
      type: "outbound";
      dataSource: StockExit[];
      loading?: boolean;
      role?: UserRole;
    };

export const InventoryTable = (props: InventoryTableProps) => {
  const { type, loading } = props;
  const [searchText, setSearchText] = useState("");

  // Deteksi role (superuser & admin bisa melakukan CRUD barang, user/unlogin hanya baca)
  const storedUser = getStoredUser();
  const effectiveRole: UserRole = props.role ?? storedUser?.role ?? "user";
  const isCrudAllowed = type === "stock" && canManageBarang(effectiveRole);

  // State lokal agar perubahan CRUD langsung tercermin di UI & test
  const [localProducts, setLocalProducts] = useState<Product[]>(
    type === "stock" ? props.dataSource : [],
  );

  useEffect(() => {
    if (type === "stock") {
      setLocalProducts(props.dataSource);
    }
  }, [type, props.dataSource]);

  // Modal Tambah / Edit Barang
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [deletingItem, setDeletingItem] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // State form input
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formSize, setFormSize] = useState("");
  const [formSpec, setFormSpec] = useState("");
  const [formCategory, setFormCategory] = useState(
    type === "stock" ? (props.defaultCategory ?? "Material") : "Material",
  );
  const [formUnit, setFormUnit] = useState("pcs");
  const [formStock, setFormStock] = useState<string>("0");

  const openCreateModal = () => {
    setEditingItem(null);
    setFormCode("");
    setFormName("");
    setFormSize("");
    setFormSpec("");
    setFormCategory(
      type === "stock" ? (props.defaultCategory ?? "Material") : "Material",
    );
    setFormUnit("pcs");
    setFormStock("0");
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingItem(product);
    setFormCode(product.code || "");
    setFormName(product.name || "");
    setFormSize(product.size || "");
    setFormSpec(product.specification || "");
    setFormCategory(product.category || "Material");
    setFormUnit(product.unit || "pcs");
    setFormStock(String(product.stock ?? 0));
    setModalOpen(true);
  };

  const handleSaveBarang = async () => {
    if (!formName.trim()) {
      message.error("Nama barang wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        const updated = await updateBarang(editingItem.id, {
          kode: formCode || editingItem.code,
          nama: formName,
          ukuran: formSize || null,
          spesifikasi: formSpec || null,
          kategori: formCategory,
          satuan: formUnit || "pcs",
          stok: Number(formStock || 0),
        });
        setLocalProducts((prev) =>
          prev.map((item) => (item.id === editingItem.id ? updated : item)),
        );
        message.success("Barang berhasil diperbarui");
      } else {
        const created = await createBarang({
          kode: formCode,
          nama: formName,
          ukuran: formSize || null,
          spesifikasi: formSpec || null,
          kategori: formCategory,
          satuan: formUnit || "pcs",
          stok: Number(formStock || 0),
        });
        setLocalProducts((prev) => [created, ...prev]);
        message.success("Barang baru berhasil ditambahkan");
      }
      setModalOpen(false);
      if (type === "stock") props.onRefetch?.();
    } catch (err) {
      message.error((err as Error)?.message ?? "Gagal menyimpan barang");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setSubmitting(true);
    try {
      await deleteBarang(deletingItem.id);
      setLocalProducts((prev) =>
        prev.filter((item) => item.id !== deletingItem.id),
      );
      message.success("Barang berhasil dihapus");
      setDeletingItem(null);
      if (type === "stock") props.onRefetch?.();
    } catch (err) {
      message.error((err as Error)?.message ?? "Gagal menghapus barang");
    } finally {
      setSubmitting(false);
    }
  };

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [vh, setVh] = useState<number>(
    typeof window !== "undefined" ? window.innerHeight : 900,
  );
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const scrollY = Math.max(280, vh - (isMobile ? 220 : 380));

  const stockColumns: ColumnsType<Product> = [
    {
      dataIndex: "name",
      title: "Nama Item",
      ellipsis: true,
      render: (v: string) => (
        <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
          {v}
        </Text>
      ),
    },
    {
      dataIndex: "size",
      title: "Ukuran",
      width: isMobile ? 110 : 200,
      ellipsis: true,
      render: (v: string | null) =>
        v ? <Text type="secondary">{v}</Text> : "-",
    },
    {
      dataIndex: "stock",
      title: "Stok",
      width: isMobile ? 96 : 160,
      align: "right",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.stock - b.stock,
      render: (v, r) => (
        <Tag
          color={v > 0 ? "blue" : "red"}
          style={{ fontSize: isMobile ? 11 : 13, margin: 0 }}
        >
          {formatNumber(v)} {r.unit}
        </Tag>
      ),
    },
    ...(isCrudAllowed
      ? [
          {
            title: "Aksi",
            key: "actions",
            width: isMobile ? 120 : 170,
            align: "center" as const,
            render: (_: unknown, r: Product) => (
              <Space size={6}>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEditModal(r)}
                  aria-label={`Edit ${r.name}`}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setDeletingItem(r)}
                  aria-label={`Hapus ${r.name}`}
                >
                  Hapus
                </Button>
              </Space>
            ),
          },
        ]
      : []),
  ];

  const outboundColumns: ColumnsType<OutboundRow> = [
    {
      title: "Waktu",
      dataIndex: "time",
      width: isMobile ? 70 : 100,
      render: (v: string) => (
        <Text strong style={{ color: "#1677ff", fontSize: isMobile ? 12 : 14 }}>
          {v}
        </Text>
      ),
    },
    {
      title: "Nama Item",
      dataIndex: "itemName",
      ellipsis: true,
      render: (v: string, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
            {v}
          </Text>
          {r.size && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.size}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Jumlah",
      dataIndex: "quantity",
      width: isMobile ? 84 : 140,
      align: "right",
      render: (v, r) => (
        <Text
          strong
          style={{ color: "#ff4d4f", fontSize: isMobile ? 13 : 14 }}
        >
          {formatNumber(v)}{" "}
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.unit}
          </Text>
        </Text>
      ),
    },
    {
      title: "Lokasi",
      dataIndex: "destination",
      width: isMobile ? 120 : 200,
      ellipsis: true,
      render: (v) =>
        v ? (
          <Tag
            icon={<SendOutlined />}
            color="cyan"
            style={{ fontSize: isMobile ? 11 : 12, margin: 0 }}
          >
            {v}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "PIC",
      dataIndex: "person",
      width: isMobile ? 110 : 180,
      ellipsis: true,
      render: (v: string) => (
        <Text style={{ fontSize: isMobile ? 12 : 13, color: "#595959" }}>
          <UserOutlined /> {v}
        </Text>
      ),
    },
  ];

  const lowerSearch = searchText.trim().toLowerCase();

  const stockData =
    type === "stock"
      ? localProducts.filter(
          (item) =>
            !lowerSearch ||
            item.name.toLowerCase().includes(lowerSearch) ||
            (item.size && item.size.toLowerCase().includes(lowerSearch)),
        )
      : [];

  const outboundData =
    type === "outbound"
      ? props.dataSource
          .flatMap((exit) =>
            exit.items.map((item) => ({
              ...item,
              transactionId: exit.id,
              time: exit.time,
              person: exit.person,
              destination: exit.destination,
            })),
          )
          .filter(
            (item) =>
              !lowerSearch ||
              item.itemName.toLowerCase().includes(lowerSearch) ||
              item.person.toLowerCase().includes(lowerSearch),
          )
      : [];

  const scrollConfig = isMobile
    ? { x: "max-content" as const, y: scrollY }
    : { x: 750, y: scrollY };

  const paginationConfig = {
    pageSize: 20,
    size: "small" as const,
    showSizeChanger: !isMobile,
    showTotal: (total: number) => `Total ${total} item`,
    simple: isMobile,
  };

  const cardStyle = isMobile
    ? {
        width: "100vw",
        position: "relative" as const,
        left: "50%",
        transform: "translateX(-50%)",
        borderRadius: 0,
        border: "none",
      }
    : {
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      };

  return (
    <Card
      variant="borderless"
      style={cardStyle}
      styles={{ body: { padding: 0 } }}
    >
      <div
        style={{
          padding: isMobile ? "10px 12px" : "16px 20px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Input
          placeholder="Cari..."
          prefix={<SearchOutlined />}
          allowClear
          size={isMobile ? "middle" : "large"}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: isMobile ? "100%" : 400 }}
        />

        {isCrudAllowed && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Tambah Barang
          </Button>
        )}
      </div>

      {type === "stock" ? (
        <Table<Product>
          dataSource={stockData}
          rowKey="id"
          loading={loading}
          size={isMobile ? "small" : "middle"}
          pagination={paginationConfig}
          scroll={scrollConfig}
          sticky
          columns={stockColumns}
          rowClassName={(_, i) =>
            i % 2 === 0 ? "table-row-light" : "table-row-dark"
          }
        />
      ) : (
        <Table<OutboundRow>
          dataSource={outboundData}
          rowKey={(r) => `${r.transactionId}-${r.itemId}`}
          loading={loading}
          size={isMobile ? "small" : "middle"}
          pagination={paginationConfig}
          scroll={scrollConfig}
          sticky
          columns={outboundColumns}
          rowClassName={(_, i) =>
            i % 2 === 0 ? "table-row-light" : "table-row-dark"
          }
        />
      )}

      {/* Modal Tambah / Edit Barang */}
      <Modal
        title={editingItem ? "Edit Barang" : "Tambah Barang"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSaveBarang}
        okText="Simpan Barang"
        cancelText="Batal"
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <div>
            <Text strong>Kode Barang</Text>
            <Input
              placeholder="Contoh: BRG-001 (opsional)"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              aria-label="Kode Barang"
            />
          </div>
          <div>
            <Text strong>Nama Barang *</Text>
            <Input
              placeholder="Masukkan nama barang"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              aria-label="Nama Barang"
            />
          </div>
          <div>
            <Text strong>Ukuran</Text>
            <Input
              placeholder="Contoh: 10mm / A4"
              value={formSize}
              onChange={(e) => setFormSize(e.target.value)}
              aria-label="Ukuran Barang"
            />
          </div>
          <div>
            <Text strong>Spesifikasi</Text>
            <Input
              placeholder="Spesifikasi teknis (opsional)"
              value={formSpec}
              onChange={(e) => setFormSpec(e.target.value)}
              aria-label="Spesifikasi Barang"
            />
          </div>
          <div>
            <Text strong>Kategori</Text>
            <Select
              style={{ width: "100%" }}
              value={formCategory}
              onChange={setFormCategory}
              aria-label="Kategori Barang"
              options={[
                { value: "Material", label: "Material" },
                { value: "Alat Bantu", label: "Alat Bantu" },
              ]}
            />
          </div>
          <div>
            <Text strong>Satuan</Text>
            <Input
              placeholder="pcs / unit / btg / roll"
              value={formUnit}
              onChange={(e) => setFormUnit(e.target.value)}
              aria-label="Satuan Barang"
            />
          </div>
          <div>
            <Text strong>Stok</Text>
            <Input
              type="number"
              placeholder="0"
              value={formStock}
              onChange={(e) => setFormStock(e.target.value)}
              aria-label="Stok Barang"
            />
          </div>
        </Space>
      </Modal>

      {/* Modal Konfirmasi Hapus Barang */}
      <Modal
        title="Hapus Barang"
        open={!!deletingItem}
        onCancel={() => setDeletingItem(null)}
        onOk={handleConfirmDelete}
        okText="Ya, Hapus"
        okButtonProps={{ danger: true }}
        cancelText="Batal"
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Text>
          Apakah Anda yakin ingin menghapus barang{" "}
          <Text strong>{deletingItem?.name}</Text>?
        </Text>
      </Modal>
    </Card>
  );
};
