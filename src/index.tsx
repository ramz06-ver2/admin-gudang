import React from "react";
import "antd/dist/reset.css";
// Hapus import "./App.css"; karena filenya sudah dihapus

import { createRoot } from "react-dom/client";

// ✅ Path disesuaikan dengan arsitektur baru
import { ErrorBoundary } from "./shared/components/ErrorBoundary";
import App from "./app/App";

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);