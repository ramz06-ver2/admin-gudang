import { Refine } from "@refinedev/core";
import { RefineKbarProvider } from "@refinedev/kbar";
import routerProvider, {
  NavigateToResource,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from "@refinedev/react-router-v6";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { useNotificationProvider, ErrorComponent } from "@refinedev/antd";
import { App as AntdApp, ConfigProvider } from "antd";
import {
  DashboardOutlined,
  AppstoreOutlined,
  AppstoreAddOutlined,
} from "@ant-design/icons";
import "@refinedev/antd/dist/reset.css";

import { supabaseClient } from "./utility/supabaseClient";
import { USE_MOCK } from "./utility/config";
import { DashboardPage } from "./pages/dashboard";
import { InventoryPage } from "./pages/inventory";
import { LoginPage } from "./pages/login";
import { ProductCreatePage } from "./pages/products/create";
import { EntryPage } from "./pages/entry";
import { AdminLayout } from "./components/layout/AdminLayout";
import { authProvider } from "./authProvider";

const mockDataProvider = {
  getList: async () => ({ data: [], total: 0 }),
  getOne: async () => ({ data: {} }),
  create: async () => ({ data: {} }),
  update: async () => ({ data: {} }),
  deleteOne: async () => ({ data: {} }),
  getApiUrl: () => "",
  custom: async () => ({ data: {} }),
} as never;

function App() {
  const dataProviderConfig = USE_MOCK
    ? mockDataProvider
    : dataProvider(supabaseClient);

  const liveProviderConfig = USE_MOCK
    ? undefined
    : liveProvider(supabaseClient);

  return (
    <BrowserRouter>
      <ConfigProvider
        theme={{ token: { borderRadius: 8, colorPrimary: "#1677ff" } }}
      >
        <AntdApp>
          <RefineKbarProvider>
            <Refine
              dataProvider={dataProviderConfig}
              liveProvider={liveProviderConfig}
              routerProvider={routerProvider}
              notificationProvider={useNotificationProvider}
              authProvider={authProvider}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                projectId: "admin-stock",
                title: { text: "Admin Stock" },
              }}
              resources={[
                {
                  name: "dashboard",
                  list: "/dashboard",
                  meta: {
                    label: "Dashboard",
                    icon: <DashboardOutlined />,
                  },
                },
                {
                  name: "products-create",
                  list: "/products/create",
                  meta: {
                    label: "Tambah Barang +",
                    icon: <AppstoreAddOutlined />,
                  },
                },
                {
                  name: "inventory",
                  list: "/inventory",
                  meta: {
                    label: "Data Persediaan",
                    icon: <AppstoreOutlined />,
                  },
                },
              ]}
            >
              <Routes>
                <Route
                  element={
                    <AdminLayout>
                      <Outlet />
                    </AdminLayout>
                  }
                >
                  <Route
                    index
                    element={<NavigateToResource resource="dashboard" />}
                  />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route
                    path="/products/create"
                    element={<ProductCreatePage />}
                  />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/entry" element={<EntryPage />} />
                </Route>

                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<ErrorComponent />} />
              </Routes>

              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
          </RefineKbarProvider>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;