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

export const SourceFileLink = ({
  url,
  label,
  testId,
  fontSize = 14,
  stopPropagation = true,
}: SourceFileLinkProps) => {
  const safeUrl = toSafeExternalUrl(url);
  
  // 🔧 PERBAIKAN: Jika URL tidak aman / kosong, jangan render apa-apa (return null)
  if (!safeUrl) return null;

  return (
    <Tooltip title={label}>
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        data-testid={testId}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        style={{
          marginLeft: 6,
          color: "#1677ff",
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