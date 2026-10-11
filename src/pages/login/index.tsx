import { useState } from "react";
import { useLogin } from "@refinedev/core";
import { Button, Card, Form, Input, Typography, Alert, Space } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { USE_MOCK } from "../../utility/config";

const { Title, Text } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const { mutate: login, isLoading } = useLogin<LoginForm>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (values: LoginForm) => {
    setErrorMsg(null);
    login(values, {
      onError: (error) => {
        setErrorMsg(error?.message ?? "Login gagal, coba lagi");
      },
    });
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
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
        styles={{ body: { padding: 32 } }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
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
          <Text type="secondary">Masuk untuk mengelola inventaris</Text>
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

        {/* Form */}
        <Form<LoginForm>
          layout="vertical"
          onFinish={handleSubmit}
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

        {/* Info mock */}
        {USE_MOCK && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            message="Mode Demo"
            description={
              <Space direction="vertical" size={2}>
                <Text style={{ fontSize: 12 }}>
                  Email: <Text code>admin@admin.com</Text>
                </Text>
                <Text style={{ fontSize: 12 }}>
                  Password: <Text code>admin123</Text>
                </Text>
              </Space>
            }
          />
        )}
      </Card>
    </div>
  );
};
