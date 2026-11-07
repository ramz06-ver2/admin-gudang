import { formatNumber } from "../../../../shared/lib/format";
import type { SpbBarItem } from "../useSpbAnalytics";
import { niceTicks, useContainerWidth } from "../hooks/useContainerWidth";

/** 3 batang, 3 warna gradasi (kuning-oranye, cyan-biru, hijau). */
const GRADIENTS: Record<string, [string, string]> = {
  Diajukan: ["#ffe94d", "#f57c00"],
  "Sudah PO": ["#4ee9ff", "#2b55e6"],
  "Sudah Datang": ["#b6f75a", "#18a24a"],
};
const FALLBACK: [string, string] = ["#a78bfa", "#6d28d9"];

const THEME = {
  bg: "#071a33",
  grid: "#16376b",
  axis: "#1d4ed8",
  tick: "#cbd5e1",
  label: "#9fb0c8",
};

interface Props {
  data: SpbBarItem[];
  height?: number;
}

export const SpbBarChart = ({ data, height = 360 }: Props) => {
  const { ref, width } = useContainerWidth<HTMLDivElement>(700);

  const m = { top: 64, right: 28, bottom: 52, left: 56 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;

  const maxVal = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(maxVal);
  const yMax = ticks[ticks.length - 1] || 1;
  const y = (v: number) => m.top + plotH - (v / yMax) * plotH;

  const slot = plotW / Math.max(1, data.length);
  const barW = Math.min(64, slot * 0.38);

  return (
    <div
      ref={ref}
      style={{ background: THEME.bg, borderRadius: 12, padding: "4px 0", width: "100%" }}
    >
      <svg width={width} height={height} role="img" aria-label="Diagram batang distribusi barang SPB">
        <style>{`
          @keyframes spbGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
          .spb-bar { transform-box: fill-box; transform-origin: bottom; animation: spbGrow .7s cubic-bezier(.2,.8,.2,1) both; }
        `}</style>

        <defs>
          {data.map((d) => {
            const [top, bottom] = GRADIENTS[d.label] ?? FALLBACK;
            return (
              <linearGradient key={d.label} id={`spb-grad-${d.label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={top} />
                <stop offset="100%" stopColor={bottom} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Legend (kanan atas) */}
        <g transform={`translate(${width - m.right}, 26)`} textAnchor="end">
          {[...data].reverse().reduce<{ els: JSX.Element[]; x: number }>(
            (acc, d) => {
              const w = d.label.length * 7.2 + 36;
              const x = acc.x - w;
              acc.els.push(
                <g key={d.label} transform={`translate(${x}, 0)`}>
                  <rect width={22} height={14} rx={4} y={-11} fill={`url(#spb-grad-${d.label.replace(/\s/g, "")})`} />
                  <text x={30} fontSize={13} fontWeight={600} fill={THEME.label} textAnchor="start">
                    {d.label}
                  </text>
                </g>,
              );
              return { els: acc.els, x };
            },
            { els: [], x: 0 },
          ).els}
        </g>

        {/* Grid putus-putus + label sumbu Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={m.left}
              x2={width - m.right}
              y1={y(t)}
              y2={y(t)}
              stroke={THEME.grid}
              strokeDasharray="6 5"
              strokeWidth={1}
            />
            <text x={m.left - 12} y={y(t) + 4} textAnchor="end" fontSize={13} fill={THEME.tick}>
              {formatNumber(t)}
            </text>
          </g>
        ))}

        {/* Garis sumbu */}
        <line x1={m.left} x2={m.left} y1={m.top - 6} y2={m.top + plotH} stroke={THEME.axis} strokeWidth={2} />
        <line x1={m.left} x2={width - m.right} y1={m.top + plotH} y2={m.top + plotH} stroke={THEME.axis} strokeWidth={2} />

        {/* Batang */}
        {data.map((d, i) => {
          const cx = m.left + slot * i + slot / 2;
          const h = Math.max(d.value > 0 ? 6 : 0, m.top + plotH - y(d.value));
          const top = m.top + plotH - h;
          return (
            <g key={d.label}>
              {d.value > 0 && (
                <rect
                  className="spb-bar"
                  x={cx - barW / 2}
                  y={top}
                  width={barW}
                  height={h}
                  rx={Math.min(barW / 2, h / 2)}
                  fill={`url(#spb-grad-${d.label.replace(/\s/g, "")})`}
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <title>{`${d.label}: ${formatNumber(d.value)} barang`}</title>
                </rect>
              )}
              <text x={cx} y={top - 10} textAnchor="middle" fontSize={16} fontWeight={700} fill="#ffffff">
                {formatNumber(d.value)}
              </text>
              <text x={cx} y={m.top + plotH + 28} textAnchor="middle" fontSize={14} fontWeight={600} fill={THEME.label}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SpbBarChart;