import { useState, useEffect, type PropsWithChildren } from "react";
import { ThemedLayoutV2, ThemedSiderV2 } from "@refinedev/antd";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Space, Tag, Typography } from "antd";
import {
  LogoutOutlined,
  LoginOutlined,
  DownOutlined,
  UpOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  BellOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import { GlobalSearch } from "../components/GlobalSearch";
import { ChatbotWidget } from "../../features/chatbot/ChatbotWidget";
import type { UserRole } from "../types";
import { getPendingRequestsCount } from "../../features/auth/accountRequests";
import {
  AUTH_CHANGED_EVENT,
  getStoredUser,
} from "../../app/providers/authProvider";
import {
  canApproveAccounts,
  getRoleDefinition,
  isAuthenticatedRole,
  isSuperUser,
} from "../../app/providers/accessControlProvider";

const { Text } = Typography;

interface IdentityUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
}

const CustomLogoWithDropdown = ({ collapsed }: { collapsed?: boolean }) => {
  const [openMenu, setOpenMenu] = useState(false);
  const { data: identity } = useGetIdentity<IdentityUser>();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();

  const [stored, setStored] = useState(() => getStoredUser());

  useEffect(() => {
    const syncAuth = () => setStored(getStoredUser());
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  const role: UserRole = identity?.role ?? stored?.role ?? "user";
  const roleDef = getRoleDefinition(role);
  const isSuper = isSuperUser(role);
  const isLoggedIn = isAuthenticatedRole(role);
  const pendingCount = canApproveAccounts(role) ? getPendingRequestsCount() : 0;

  const badgeText = roleDef.badge;
  const roleLabel = isLoggedIn ? `Mode ${roleDef.label}` : "User (Public)";

  const getBadgeGradient = () => {
    if (isSuper) return "linear-gradient(135deg, #722ed1, #531dab)";
    if (roleDef.key === "supervisor") return "linear-gradient(135deg, #13c2c2, #006d75)";
    if (isLoggedIn) return "linear-gradient(135deg, #1677ff, #0e4fb8)";
    return "linear-gradient(135deg, #52c41a, #389e0d)";
  };

  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      <div
        onClick={() => setOpenMenu((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 10,
          cursor: "pointer",
          padding: "4px 6px",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: getBadgeGradient(),
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {badgeText}
          </div>
          {!collapsed && (
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1f1f1f" }}>
                Admin Stock
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {roleLabel}
              </Text>
            </div>
          )}
        </div>
        {!collapsed && (
          <span style={{ fontSize: 11, color: "#8c8c8c" }}>
            {openMenu ? <UpOutlined /> : <DownOutlined />}
          </span>
        )}
      </div>

      {openMenu && !collapsed && (
        <div
          style={{
            marginTop: 8,
            padding: "10px 12px",
            background: "#f5f7fa",
            borderRadius: 10,
            border: "1px solid #e6ebf1",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 12 }} strong ellipsis>
              {identity?.name ?? stored?.name ?? "User"}
            </Text>
            <Tag
              color={roleDef.color}
              icon={
                isSuper ? (
                  <CrownOutlined />
                ) : isLoggedIn ? (
                  <SafetyCertificateOutlined />
                ) : (
                  <UserOutlined />
                )
              }
              style={{ margin: 0, fontSize: 11 }}
            >
              {isLoggedIn ? roleDef.label : "Public"}
            </Tag>
          </div>

          <Space direction="vertical" size={6} style={{ width: "100%" }}>
            {canApproveAccounts(role) && (
              <Badge count={pendingCount} size="small" style={{ width: "100%" }}>
                <Button
                  size="small"
                  block
                  icon={<BellOutlined />}
                  onClick={() => {
                    setOpenMenu(false);
                    navigate("/notifications");
                  }}
                >
                  Notifikasi Persetujuan
                </Button>
              </Badge>
            )}

            {isLoggedIn ? (
              <Button
                danger
                type="primary"
                size="small"
                block
                icon={<LogoutOutlined />}
                onClick={() => {
                  setOpenMenu(false);
                  logout();
                }}
              >
                Logout
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                block
                icon={<LoginOutlined />}
                onClick={() => {
                  setOpenMenu(false);
                  navigate("/login");
                }}
              >
                Login / Buat Akun
              </Button>
            )}
          </Space>
        </div>
      )}
    </div>
  );
};

export const AdminLayout = ({ children }: PropsWithChildren) => (
  <ThemedLayoutV2
    Header={() => null}
    Sider={() => (
      <ThemedSiderV2
        Title={CustomLogoWithDropdown}
        render={({ items }) => <>{items}</>}
      />
    )}
  >
    <GlobalSearch />
    {children}
    <ChatbotWidget />
  </ThemedLayoutV2>
);