import { useState } from "react";
import { useLogin } from "@refinedev/core";
import {
  Button,
  Card,
  Form,
  Input,
  Typography,
  Alert,
  Segmented,
  Select,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  IdcardOutlined,
} from "@ant-design/icons";

import { MIN_PASSWORD_LENGTH, registerAccountRequest } from "../accountRequests";
import { getAssignableRoles } from "../../../app/providers/accessControlProvider";
import type { UserRole } from "../../../shared/types";

const { Title, Text } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export const LoginPage = () => {
  const { mutate: login, isLoading } = useLogin<LoginForm>();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerForm] = Form.useForm<RegisterForm>();

  const assignableRoles = getAssignableRoles();

  // 🔧 PERBAIKAN: Tambahkan e.preventDefault() untuk mencegah browser me-refresh halaman
  const handleSubmitLogin = (values: LoginForm, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    login(values, {
      onError: (error) => {
        setErrorMsg(error?.message ?? "Login gagal, coba lagi");
      },
    });
  };

  const handleSubmitRegister = async (values: RegisterForm, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsRegistering(true);
    try {
      await registerAccountRequest({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role || "admin",
      });
      setSuccessMsg(
        "Permintaan pembuatan akun berhasil dikirim! Akun Anda telah masuk ke halaman Notifikasi Super User dan menunggu persetujuan.",
      );
      registerForm.resetFields();
    } catch (err) {
      setErrorMsg((err as Error)?.message ?? "Gagal membuat permintaan akun");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #1677ff 0%, #0e4fb8 50%, #062d6e 100%)",
        padding: 16,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
        styles={{ body: { padding: 32 } }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 12px",
              borderRadius: 16,
              background: "linear-gradient(135deg, #1677ff, #0e4fb8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            AS
          </div>
          <Title level={3} style={{ margin: 0 }}>
            Admin Stok
          </Title>
          <Text type="secondary">
            {mode === "login"
              ? "Masuk untuk mengelola inventaris"
              : "Daftar akun baru (perlu persetujuan Super User)"}
          </Text>
        </div>

        {/* Toggle Masuk / Buat Akun */}
        <div style={{ marginBottom: 20 }}>
          <Segmented
            block
            value={mode}
            onChange={(val) => {
              setMode(val as "login" | "register");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            options={[
              { label: "Masuk", value: "login" },
              { label: "Buat Akun", value: "register" },
            ]}
          />
        </div>

        {/* Error */}
        {errorMsg && (
          <Alert
            type="error"
            message={errorMsg}
            showIcon
            closable
            onClose={() => setErrorMsg(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Success */}
        {successMsg && (
          <Alert
            type="success"
            message={successMsg}
            showIcon
            closable
            onClose={() => setSuccessMsg(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {mode === "login" ? (
          <Form<LoginForm>
            layout="vertical"
            onFinish={handleSubmitLogin}
            autoComplete="off"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Email wajib diisi" },
                { type: "email", message: "Format email tidak valid" },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="nama@perusahaan.com"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Password wajib diisi" }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="••••••••"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={isLoading}
              >
                Masuk
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form<RegisterForm>
            form={registerForm}
            layout="vertical"
            onFinish={handleSubmitRegister}
            autoComplete="off"
            requiredMark={false}
            initialValues={{ role: "admin" }}
          >
            <Form.Item
              name="name"
              label="Nama Lengkap"
              rules={[{ required: true, message: "Nama lengkap wajib diisi" }]}
            >
              <Input
                size="large"
                prefix={<IdcardOutlined />}
                placeholder="Nama lengkap pengguna"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Email wajib diisi" },
                { type: "email", message: "Format email tidak valid" },
              ]}
            >
              <Input
                size="large"
                prefix={<MailOutlined />}
                placeholder="pengguna@email.com"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Password wajib diisi" },
                { min: MIN_PASSWORD_LENGTH, message: `Password minimal ${MIN_PASSWORD_LENGTH} karakter` },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder={`Minimal ${MIN_PASSWORD_LENGTH} karakter`}
              />
            </Form.Item>

            <Form.Item name="role" label="Role yang Diajukan">
              <Select
                size="large"
                aria-label="Role yang Diajukan"
                options={assignableRoles.map((r) => ({
                  value: r.key,
                  label: r.label,
                }))}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={isRegistering}
              >
                Daftar Akun
              </Button>
            </Form.Item>
          </Form>
        )}

      </Card>
    </div>
  );
};

export default LoginPage;