import { Suspense, lazy } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerBindings, { UnsavedChangesNotifier, DocumentTitleHandler } from "@refinedev/react-router-v6";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { ErrorComponent } from "@refinedev/antd";
import { dataProvider } from "@refinedev/supabase";
import { App as AntdApp, ConfigProvider, Spin } from "antd";
import { DashboardOutlined, AppstoreOutlined, FileTextOutlined, PlusCircleOutlined, SendOutlined } from "@ant-design/icons";

import { supabaseClient } from "./utility/supabaseClient";
import { authProvider } from "./authProvider";
import { AdminLayout } from "./components/layout/AdminLayout";

// ✅ PERBAIKAN: Lazy Loading untuk optimasi bundle
const DashboardPage = lazy(() => import("./pages/dashboard"));
const EntryPage = lazy(() => import("./pages/entry"));
const InventoryPage = lazy(() => import("./pages/inventory"));
const LoginPage = lazy(() => import("./pages/login"));
const MonitoringSPBPage = lazy(() => import("./pages/monitoring-spb"));
const MonitoringSPBDetailPage = lazy(() => import("./pages/monitoring-spb/detail"));
const ProductCreatePage = lazy(() => import("./pages/products/create"));

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
            routerProvider={routerBindings}
            resources={[
              { name: "dashboard", list: "/dashboard", meta: { label: "Dashboard", icon: <DashboardOutlined /> } },
              { name: "barang", list: "/inventory", meta: { label: "Inventory", icon: <AppstoreOutlined /> } },
              { name: "spb", list: "/monitoring-spb", meta: { label: "Monitoring SPB", icon: <FileTextOutlined /> } },
              { name: "barang_masuk", list: "/products/create", meta: { label: "Tambah Barang Masuk", icon: <PlusCircleOutlined /> } },
              { name: "pengeluaran", list: "/entry", meta: { label: "Pengeluaran Barang", icon: <SendOutlined /> } },
            ]}
            options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
          >
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* ✅ PERBAIKAN: Rute Publik (Read-Only) */}
                <Route element={<AdminLayout><Outlet /></AdminLayout>}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/monitoring-spb" element={<MonitoringSPBPage />} />
                  <Route path="/monitoring-spb/detail" element={<MonitoringSPBDetailPage />} />
                </Route>

                {/* ✅ PERBAIKAN: Rute Admin (Write) Dilindungi */}
                <Route element={
                  <Authenticated key="admin-routes" fallback={<Navigate to="/login" />}>
                    <AdminLayout><Outlet /></AdminLayout>
                  </Authenticated>
                }>
                  <Route path="/products/create" element={<ProductCreatePage />} />
                  <Route path="/entry" element={<EntryPage />} />
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