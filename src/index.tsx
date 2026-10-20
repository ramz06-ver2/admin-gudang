import React from "react";
import "antd/dist/reset.css";
import "./App.css"; // ✅ PERBAIKAN: Import CSS
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import App from "./App";

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);