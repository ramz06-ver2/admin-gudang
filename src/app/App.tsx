import { Suspense, lazy } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerBindings, { UnsavedChangesNotifier, DocumentTitleHandler } from "@refinedev/react-router-v6";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { ErrorComponent } from "@refinedev/antd";
import { dataProvider } from "@refinedev/supabase";
import { App as AntdApp, ConfigProvider, Spin } from "antd";
import {
  DashboardOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  SendOutlined,
  BellOutlined,
} from "@ant-design/icons";

import { supabaseClient } from "../shared/lib/supabaseClient";
import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { AdminLayout } from "../shared/layout/AdminLayout";

const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage"));
const EntryPage = lazy(() => import("../features/stock-out/pages/EntryPage"));
const InventoryPage = lazy(() => import("../features/products/pages/InventoryPage"));
const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const NotificationsPage = lazy(() => import("../features/auth/pages/NotificationsPage"));
const MonitoringSPBPage = lazy(() => import("../features/spb/pages/MonitoringSPBPage"));
const MonitoringSPBDetailPage = lazy(() => import("../features/spb/pages/MonitoringSPBDetailPage"));
const MonitoringSPBItemDetailPage = lazy(() => import("../features/spb/pages/MonitoringSPBItemDetailPage"));
const ProductCreatePage = lazy(() => import("../features/products/pages/ProductCreatePage"));

const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
    <Spin size="large" tip="Memuat halaman..." />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={{ token: { colorPrimary: "#1677ff", borderRadius: 8 } }}>
        <AntdApp>
          <Refine
            dataProvider={dataProvider(supabaseClient)}
            authProvider={authProvider}
            accessControlProvider={accessControlProvider}
            routerProvider={routerBindings}
            resources={[
              { name: "dashboard", list: "/dashboard", meta: { label: "Dashboard", icon: <DashboardOutlined /> } },
              { name: "barang", list: "/inventory", meta: { label: "Inventory", icon: <AppstoreOutlined /> } },
              { name: "spb", list: "/monitoring-spb", meta: { label: "Monitoring SPB", icon: <FileTextOutlined /> } },
              { name: "barang_masuk", list: "/products/create", meta: { label: "Tambah Barang Masuk", icon: <PlusCircleOutlined /> } },
              { name: "pengeluaran", list: "/entry", meta: { label: "Pengeluaran Barang", icon: <SendOutlined /> } },
              { name: "notifications", list: "/notifications", meta: { label: "Notifikasi", icon: <BellOutlined /> } },
            ]}
            options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
          >
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Rute Publik */}
                <Route element={<AdminLayout><Outlet /></AdminLayout>}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/monitoring-spb" element={<MonitoringSPBPage />} />
                  <Route path="/monitoring-spb/detail" element={<MonitoringSPBDetailPage />} />
                  <Route path="/monitoring-spb/item/:id" element={<MonitoringSPBItemDetailPage />} />
                </Route>

                {/* Rute Admin & Super User */}
                <Route element={
                  <Authenticated key="admin-routes" fallback={<Navigate to="/login" replace />}>
                    <AdminLayout><Outlet /></AdminLayout>
                  </Authenticated>
                }>
                  <Route path="/products/create" element={<ProductCreatePage />} />
                  <Route path="/entry" element={<EntryPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                </Route>

                <Route path="*" element={<ErrorComponent />} />
              </Routes>
            </Suspense>
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
