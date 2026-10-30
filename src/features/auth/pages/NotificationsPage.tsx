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
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { AccountRequest, UserRole } from "../../../shared/types";
import {
  getAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
} from "../accountRequests";
import { getStoredUser } from "../../../app/providers/authProvider";
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

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getAccountRequests();
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  if (effectiveRole !== "superuser") {
    return (
      <Result
        status="403"
        title="Akses Ditolak"
        subTitle="Hanya Super User yang dapat mengakses halaman Notifikasi persetujuan akun."
      />
    );
  }

  const handleApprove = async (req: AccountRequest) => {
    const updated = await approveAccountRequest(req.id);
    setRequests((prev) =>
      prev.map((item) => (item.id === req.id ? updated : item)),
    );
    message.success(`Akun ${req.email} diizinkan dan aktif sebagai Admin.`);
  };

  const handleReject = async (req: AccountRequest) => {
    const updated = await rejectAccountRequest(req.id);
    setRequests((prev) =>
      prev.map((item) => (item.id === req.id ? updated : item)),
    );
    message.info(`Permintaan akun ${req.email} tidak diizinkan (dibatalkan).`);
  };

  const getStatusTag = (status: AccountRequest["status"]) => {
    if (status === "pending") {
      return <Tag color="orange">Menunggu Persetujuan</Tag>;
    }
    if (status === "approved") {
      return <Tag color="green">Diizinkan (Admin Aktif)</Tag>;
    }
    return <Tag color="red">Tidak Diizinkan (Batal)</Tag>;
  };

  const columns: ColumnsType<AccountRequest> = [
    {
      title: "Nama Calon Admin",
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
      title: "Tanggal Pengajuan",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => (v ? formatDate(v) : "-"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: AccountRequest["status"]) => getStatusTag(status),
    },
    {
      title: "Aksi Persetujuan",
      key: "actions",
      render: (_: unknown, record: AccountRequest) => {
        if (record.status !== "pending") {
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.status === "approved"
                ? "Akun Admin telah aktif"
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
            Kelola permintaan pembuatan akun Admin baru
          </Text>
        </div>
      </Space>

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