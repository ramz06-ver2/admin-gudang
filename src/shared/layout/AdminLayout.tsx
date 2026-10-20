import { useState, type PropsWithChildren } from "react";
import { ThemedLayoutV2, ThemedSiderV2 } from "@refinedev/antd";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Button, Tag, Typography } from "antd";
import { LogoutOutlined, LoginOutlined, DownOutlined, UpOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { GlobalSearch } from "../common/GlobalSearch"; // ✅ Mount Global Search

const { Text } = Typography;

interface IdentityUser { id: string; name: string; email?: string; role: "admin" | "user"; }

const CustomLogoWithDropdown = ({ collapsed }: { collapsed?: boolean }) => {
  const [openMenu, setOpenMenu] = useState(false);
  const { data: identity } = useGetIdentity<IdentityUser>();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const isAdmin = identity?.role === "admin";

  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      <div onClick={() => setOpenMenu((prev) => !prev)} style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 10, cursor: "pointer", padding: "4px 6px", borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: isAdmin ? "linear-gradient(135deg, #1677ff, #0e4fb8)" : "linear-gradient(135deg, #52c41a, #389e0d)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{isAdmin ? "AS" : "US"}</div>
          {!collapsed && (
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1f1f1f" }}>Admin Stock</div>
              <Text type="secondary" style={{ fontSize: 11 }}>{isAdmin ? "Mode Admin" : "User (Public)"}</Text>
            </div>
          )}
        </div>
        {!collapsed && <span style={{ fontSize: 11, color: "#8c8c8c" }}>{openMenu ? <UpOutlined /> : <DownOutlined />}</span>}
      </div>

      {openMenu && !collapsed && (
        <div style={{ marginTop: 8, padding: "10px 12px", background: "#f5f7fa", borderRadius: 10, border: "1px solid #e6ebf1" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 12 }} strong ellipsis>{identity?.name ?? "User"}</Text>
            <Tag color={isAdmin ? "blue" : "green"} icon={isAdmin ? <SafetyCertificateOutlined /> : <UserOutlined />} style={{ margin: 0, fontSize: 11 }}>{isAdmin ? "Admin" : "Public"}</Tag>
          </div>
          {isAdmin ? <Button danger type="primary" size="small" block icon={<LogoutOutlined />} onClick={() => { setOpenMenu(false); logout(); }}>Logout</Button> : <Button type="primary" size="small" block icon={<LoginOutlined />} onClick={() => { setOpenMenu(false); navigate("/login"); }}>Login Admin</Button>}
        </div>
      )}
    </div>
  );
};

export const AdminLayout = ({ children }: PropsWithChildren) => (
  <ThemedLayoutV2
    Header={() => null}
    Sider={() => <ThemedSiderV2 Title={CustomLogoWithDropdown} render={({ items }) => <>{items}</>} />}
  >
    <GlobalSearch />
    {children}
  </ThemedLayoutV2>
);