import type { ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";

interface CustomOptions extends Omit<RenderOptions, "wrapper"> {
  initialRoute?: string;
  withRouter?: boolean;
}

export function renderWithProviders(
  ui: ReactNode,
  {
    initialRoute = "/",
    withRouter = true,
    ...options
  }: CustomOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      // ⬇️ v4 pakai cacheTime, bukan gcTime
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ConfigProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          {withRouter ? (
            <MemoryRouter initialEntries={[initialRoute]}>
              {children}
            </MemoryRouter>
          ) : (
            children
          )}
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

export { render, screen, fireEvent, waitFor } from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";