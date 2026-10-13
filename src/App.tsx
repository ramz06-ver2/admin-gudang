import { Refine, Authenticated } from "@refinedev/core";
import { RefineKbarProvider } from "@refinedev/kbar";
import routerProvider, {
  NavigateToResource,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
  CatchAllNavigate,
} from "@refinedev/react-router-v6";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import {
  ThemedLayoutV2,
  useNotificationProvider,
  ErrorComponent,
} from "@refinedev/antd";
import { App as AntdApp, ConfigProvider } from "antd";
import {
  DashboardOutlined,
  PlusCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import "@refinedev/antd/dist/reset.css";

import { supabaseClient } from "./utility/supabaseClient";
import { USE_MOCK } from "./utility/config";
import { DashboardPage } from "./pages/dashboard";
import { LoginPage } from "./pages/login";
import { StockEntryCreatePage } from "./pages/stock-entries/create";
import { EntryPage } from "./pages/entry";
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
        theme={{
          token: { borderRadius: 8, colorPrimary: "#1677ff" },
        }}
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
                  name: "entry",
                  list: "/entry",
                  meta: {
                    label: "Entry Cepat",
                    icon: <ThunderboltOutlined />,
                  },
                },
                {
                  name: "stock-entries",
                  create: "/stock-entries/create",
                  meta: {
                    label: "Input Barang Masuk",
                    icon: <PlusCircleOutlined />,
                  },
                },
              ]}
            >
              <Routes>
                <Route
                  element={
                    <Authenticated
                      key="app"
                      fallback={<CatchAllNavigate to="/login" />}
                    >
                      <ThemedLayoutV2>
                        <Outlet />
                      </ThemedLayoutV2>
                    </Authenticated>
                  }
                >
                  <Route
                    index
                    element={<NavigateToResource resource="dashboard" />}
                  />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/entry" element={<EntryPage />} />
                  <Route
                    path="/stock-entries/create"
                    element={<StockEntryCreatePage />}
                  />
                </Route>

                <Route
                  element={
                    <Authenticated key="auth" fallback={<Outlet />}>
                      <NavigateToResource resource="dashboard" />
                    </Authenticated>
                  }
                >
                  <Route path="/login" element={<LoginPage />} />
                </Route>

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
