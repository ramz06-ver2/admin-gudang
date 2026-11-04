import { useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import {
  Card,
  Typography,
  Table,
  Button,
  Tag,
  Space,
  Empty,
  Result,
  Select,
  Input,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { AccountRequest, RoleDefinition, UserRole } from "../../../shared/types";
import {
  getAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
  updateAccountRole,
} from "../accountRequests";
import { getStoredUser } from "../../../app/providers/authProvider";
import {
  canApproveAccounts,
  canManageRoles,
  getAllRoleDefinitions,
  getAssignableRoles,
  getRoleDefinition,
  registerCustomRole,
} from "../../../app/providers/accessControlProvider";
import { formatDate } from "../../../shared/lib/format";

const { Title, Text } = Typography;

interface IdentityUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
}

export const NotificationsPage = () => {
  const { data: identity } = useGetIdentity<IdentityUser>();
  const storedUser = getStoredUser();
  const effectiveRole: UserRole =
    identity?.role ?? storedUser?.role ?? "user";

  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>(() =>
    getAllRoleDefinitions(),
  );
  const [newRoleInput, setNewRoleInput] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getAccountRequests();
      setRequests(data);
      const initialRoles: Record<string, UserRole> = {};
      data.forEach((item) => {
        initialRoles[item.id] = item.role || "admin";
      });
      setSelectedRoles(initialRoles);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Point 1 & Point 2 hanya bisa diakses oleh Super User
  if (!canApproveAccounts(effectiveRole) || !canManageRoles(effectiveRole)) {
    return (
      <Result
        status="403"
        title="Akses Ditolak"
        subTitle="Hanya Super User yang dapat mengakses halaman Notifikasi persetujuan akun dan manajemen role."
      />
    );
  }

  const assignableRoles = getAssignableRoles();

  const handleRoleSelectChange = async (req: AccountRequest, nextRole: UserRole) => {
    setSelectedRoles((prev) => ({ ...prev, [req.id]: nextRole }));
    if (req.status === "approved") {
      try {
        const updated = await updateAccountRole(req.id, nextRole, effectiveRole);
        setRequests((prev) =>
          prev.map((item) => (item.id === req.id ? updated : item)),
        );
        const def = getRoleDefinition(nextRole);
        message.success(`Role akun ${req.email} diperbarui menjadi ${def.label}.`);
      } catch (err) {
        message.error((err as Error)?.message ?? "Gagal mengubah role akun");
      }
    }
  };

  const handleApprove = async (req: AccountRequest) => {
    const roleToAssign = selectedRoles[req.id] || req.role || "admin";
    const updated = await approveAccountRequest(req.id, roleToAssign, effectiveRole);
    setRequests((prev) =>
      prev.map((item) => (item.id === req.id ? updated : item)),
    );
    const def = getRoleDefinition(updated.role);
    message.success(`Akun ${req.email} diizinkan dan aktif sebagai ${def.label}.`);
  };

  const handleReject = async (req: AccountRequest) => {
    const updated = await rejectAccountRequest(req.id, effectiveRole);
    setRequests((prev) =>
      prev.map((item) => (item.id === req.id ? updated : item)),
    );
    message.info(`Permintaan akun ${req.email} tidak diizinkan (dibatalkan).`);
  };

  const handleAddCustomRole = () => {
    const trimmed = newRoleInput.trim();
    if (!trimmed) {
      message.warning("Masukkan nama role baru terlebih dahulu");
      return;
    }
    try {
      const created = registerCustomRole({
        key: trimmed,
        label: trimmed,
      });
      setRoleDefinitions(getAllRoleDefinitions());
      setNewRoleInput("");
      message.success(`Role baru "${created.label}" berhasil ditambahkan.`);
    } catch (err) {
      message.error((err as Error)?.message ?? "Gagal menambahkan role baru");
    }
  };

  const getStatusTag = (record: AccountRequest) => {
    if (record.status === "pending") {
      return <Tag color="orange">Menunggu Persetujuan</Tag>;
    }
    if (record.status === "approved") {
      const def = getRoleDefinition(record.role || "admin");
      return <Tag color="green">{`Diizinkan (${def.label} Aktif)`}</Tag>;
    }
    return <Tag color="red">Tidak Diizinkan (Batal)</Tag>;
  };

  const columns: ColumnsType<AccountRequest> = [
    {
      title: "Nama Pengguna",
      dataIndex: "name",
      key: "name",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role Hak Akses",
      dataIndex: "role",
      key: "role",
      render: (_: unknown, record: AccountRequest) => {
        const currentRole = selectedRoles[record.id] || record.role || "admin";
        return (
          <Select
            size="small"
            value={currentRole}
            style={{ minWidth: 140 }}
            disabled={record.status === "rejected"}
            aria-label={`Pilih role ${record.email}`}
            onChange={(val) => handleRoleSelectChange(record, val)}
            options={assignableRoles.map((r) => ({
              value: r.key,
              label: r.label,
            }))}
          />
        );
      },
    },
    {
      title: "Tanggal Pengajuan",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => (v ? formatDate(v) : "-"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (_: unknown, record: AccountRequest) => getStatusTag(record),
    },
    {
      title: "Aksi Persetujuan",
      key: "actions",
      render: (_: unknown, record: AccountRequest) => {
        if (record.status !== "pending") {
          const def = getRoleDefinition(record.role || "admin");
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.status === "approved"
                ? `Akun ${def.label} telah aktif`
                : "Pembuatan akun dibatalkan"}
            </Text>
          );
        }
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(record)}
              aria-label={`Izinkan ${record.email}`}
            >
              Izinkan
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => handleReject(record)}
              aria-label={`Tidak Izinkan ${record.email}`}
            >
              Tidak Izinkan
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space align="center">
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: "#722ed115",
            color: "#722ed1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          <BellOutlined />
        </div>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Notifikasi Super User
          </Title>
          <Text type="secondary">
            Kelola persetujuan akun baru dan struktur hierarki role pengguna
          </Text>
        </div>
      </Space>

      {/* Panel Hierarki & Tambah Role Dinamis (Point 2 - Khusus Super User) */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12 }}
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: "#722ed1" }} />
            <span>Hierarki Role & Manajemen Hak Akses</span>
          </Space>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Text type="secondary" style={{ marginRight: 4 }}>
              Urutan Hak Akses:
            </Text>
            {roleDefinitions
              .filter((r) => r.isAuthenticated)
              .map((r) => (
                <Tag key={r.key} color={r.color} style={{ margin: 0 }}>
                  {r.label} ({r.key === "superuser" ? "Tertinggi - Kelola Akun & Edit" : "Akses Edit Data"})
                </Tag>
              ))}
          </div>

          <Space.Compact style={{ maxWidth: 420, width: "100%" }}>
            <Input
              placeholder="Tambah role login baru (contoh: Kepala Gudang)"
              value={newRoleInput}
              onChange={(e) => setNewRoleInput(e.target.value)}
              onPressEnter={handleAddCustomRole}
              aria-label="Nama Role Baru"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddCustomRole}
              aria-label="Tambah Role"
            >
              Tambah Role
            </Button>
          </Space.Compact>
        </Space>
      </Card>

      {/* Tabel Persetujuan Akun Baru (Point 1 - Khusus Super User) */}
      <Card variant="borderless" style={{ borderRadius: 12 }}>
        {requests.length === 0 ? (
          <Empty description="Belum ada permintaan pendaftaran akun baru" />
        ) : (
          <Table<AccountRequest>
            dataSource={requests}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </Space>
  );
};

export default NotificationsPage;