// src/features/spb/components/SourceFileLink.tsx
import { FileOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { toSafeExternalUrl } from "../accessRules";

export interface SourceFileLinkProps {
  url?: string | null;
  label?: string;
  testId?: string;
  fontSize?: number;
  stopPropagation?: boolean;
}

/**
 * Ikon file yang membuka file asli (mis. Google Drive) di tab baru.
 * Publik: tidak memerlukan login. URL divalidasi hanya untuk protokol `https:`.
 * Jika URL kosong/tidak valid, ikon tetap dirender namun berwarna abu-abu.
 */
export const SourceFileLink = ({
  url,
  label,
  testId,
  fontSize = 14,
  stopPropagation = true,
}: SourceFileLinkProps) => {
  const isSafe = !!toSafeExternalUrl(url);
  // Fallback URL dummy agar ikon bisa diklik saat testing UI (jika database belum ada link)
  const safeUrl = toSafeExternalUrl(url) || "https://drive.google.com";

  return (
    <Tooltip title={isSafe ? label : "File belum di-upload / Link tidak valid"}>
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        data-testid={testId}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        style={{
          marginLeft: 6,
          color: isSafe ? "#1677ff" : "#bfbfbf", // Biru jika ada, Abu-abu jika dummy
          fontSize,
          verticalAlign: "middle",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <FileOutlined />
      </a>
    </Tooltip>
  );
};