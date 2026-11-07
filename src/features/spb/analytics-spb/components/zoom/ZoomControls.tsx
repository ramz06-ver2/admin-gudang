import { ZOOM_MAX, ZOOM_MIN } from "../../hooks/zoom/useZoom";

interface Props {
  zoom: number;
  onIn: () => void;
  onOut: () => void;
  onReset: () => void;
  placement?: "top" | "bottom";
}

const btn: React.CSSProperties = {
  width: 28,
  height: 28,
  border: "1px solid #1e3a5f",
  borderRadius: 6,
  background: "#0b2038",
  color: "#e2e8f0",
  fontSize: 16,
  lineHeight: 1,
  cursor: "pointer",
};

export const ZoomControls = ({ zoom, onIn, onOut, onReset, placement = "top" }: Props) => (
  <div
    style={{
      position: "absolute",
      right: 12,
      [placement]: 10,
      zIndex: 10,
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 6px",
      background: "rgba(15,39,66,.92)",
      border: "1px solid #1e3a5f",
      borderRadius: 8,
    }}
  >
    <button type="button" aria-label="Perkecil (zoom out)" title="Perkecil" style={{ ...btn, opacity: zoom <= ZOOM_MIN ? 0.4 : 1 }} onClick={onOut} disabled={zoom <= ZOOM_MIN}>
      −
    </button>
    <span style={{ minWidth: 44, textAlign: "center", fontSize: 12, color: "#9fb0c8", fontVariantNumeric: "tabular-nums" }}>
      {Math.round(zoom * 100)}%
    </span>
    <button type="button" aria-label="Perbesar (zoom in)" title="Perbesar" style={{ ...btn, opacity: zoom >= ZOOM_MAX ? 0.4 : 1 }} onClick={onIn} disabled={zoom >= ZOOM_MAX}>
      +
    </button>
    <button type="button" aria-label="Reset zoom" title="Reset zoom" style={{ ...btn, width: "auto", padding: "0 8px", fontSize: 12 }} onClick={onReset}>
      Reset
    </button>
  </div>
);