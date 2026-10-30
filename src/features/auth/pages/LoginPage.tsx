import { useState } from "react";
import { useLogin } from "@refinedev/core";
import {
  Button,
  Card,
  Form,
  Input,
  Typography,
  Alert,
  Space,
  Segmented,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  IdcardOutlined,
} from "@ant-design/icons";

import { USE_MOCK } from "../../../shared/lib/config";
import { registerAccountRequest } from "../accountRequests";

const { Title, Text } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export const LoginPage = () => {
  const { mutate: login, isLoading } = useLogin<LoginForm>();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerForm] = Form.useForm<RegisterForm>();

  const handleSubmitLogin = (values: LoginForm) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    login(values, {
      onError: (error) => {
        setErrorMsg(error?.message ?? "Login gagal, coba lagi");
      },
    });
  };

  const handleSubmitRegister = async (values: RegisterForm) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsRegistering(true);
    try {
      await registerAccountRequest(values);
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
              : "Daftar akun Admin baru (perlu persetujuan Super User)"}
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
            initialValues={
              USE_MOCK
                ? { email: "admin@admin.com", password: "admin123" }
                : undefined
            }
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
                placeholder="admin@admin.com"
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
          >
            <Form.Item
              name="name"
              label="Nama Lengkap"
              rules={[{ required: true, message: "Nama lengkap wajib diisi" }]}
            >
              <Input
                size="large"
                prefix={<IdcardOutlined />}
                placeholder="Nama calon admin"
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
                placeholder="calonadmin@email.com"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Password wajib diisi" },
                { min: 6, message: "Password minimal 6 karakter" },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="Minimal 6 karakter"
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

        {/* Info mock */}
        {USE_MOCK && mode === "login" && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            message="Mode Demo"
            description={
              <Space direction="vertical" size={2}>
                <Text style={{ fontSize: 12 }}>
                  Admin: <Text code>admin@admin.com</Text> /{" "}
                  <Text code>admin123</Text>
                </Text>
                <Text style={{ fontSize: 12 }}>
                  Super User: <Text code>superuser@admin.com</Text> /{" "}
                  <Text code>super123</Text>
                </Text>
              </Space>
            }
          />
        )}
      </Card>
    </div>
  );
};

export default LoginPage;
