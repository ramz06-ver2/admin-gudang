import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SpbLinePoint } from "../useSpbAnalytics";
import { niceTicks, useContainerWidth } from "../hooks/useContainerWidth";
import { useZoom } from "../hooks/zoom/useZoom";
import { ZoomControls } from "./zoom/ZoomControls";

/** Biru = SPB terkirim (jumlah SPB), Merah = barang datang (jumlah barang). */
export const SERIES = [
  { key: "SPB Terkirim", color: "#1fb6ff", name: "SPB terkirim" },
  { key: "Barang Datang", color: "#ff4560", name: "Barang datang" },
] as const;

const THEME = {
  bg: "#031326",
  grid: "#12304f",
  axis: "#1e3a5f",
  tick: "#7b8ca5",
};

const MIN_STEP = 64; // lebar minimum per tanggal (px); lebih dari ini -> bisa di-scroll

interface Pt { x: number; y: number }
interface SeriesPoint { i: number; d: SpbLinePoint; x: number; y: number }

/** Spline monoton (halus, tidak "overshoot" ke bawah 0). */
const monotonePath = (p: Pt[]): string => {
  const n = p.length;
  if (n === 0) return "";
  if (n === 1) return `M${p[0].x},${p[0].y}`;
  if (n === 2) return `M${p[0].x},${p[0].y}L${p[1].x},${p[1].y}`;

  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = p[i + 1].x - p[i].x;
    m[i] = (p[i + 1].y - p[i].y) / dx[i];
  }
  const t: number[] = new Array(n).fill(0);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i];
      t[i + 1] = tau * b * m[i];
    }
  }
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${p[i].x + h},${p[i].y + t[i] * h},${p[i + 1].x - h},${p[i + 1].y - t[i + 1] * h},${p[i + 1].x},${p[i + 1].y}`;
  }
  return d;
};

const bubbleRadius = (v: number) => {
  const digits = String(v).length;
  return digits <= 2 ? 15 : 15 + (digits - 2) * 3;
};

interface Props {
  data: SpbLinePoint[];
  height?: number;
}

export const SpbTimelineChart = ({ data, height = 440 }: Props) => {
  const { ref, width: boxW } = useContainerWidth<HTMLDivElement>(900);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const { zoom, zoomIn, zoomOut, reset } = useZoom(ref);
  // posisi tengah layar (0..1) agar zoom tetap "berpusat" di area yang sedang dilihat
  const anchor = useRef(1);

  // Sumbu X = gabungan semua tanggal (urut), dipakai kedua garis.
  const { cats, lookup, maxVal } = useMemo(() => {
    const labelByRaw = new Map<string, string>();
    const lk = new Map<string, Map<string, SpbLinePoint>>();
    let mx = 0;
    data.forEach((d) => {
      labelByRaw.set(d.rawDate, d.date);
      if (!lk.has(d.type)) lk.set(d.type, new Map());
      lk.get(d.type)!.set(d.rawDate, d);
      mx = Math.max(mx, d.value);
    });
    const raws = [...labelByRaw.keys()].sort();
    return {
      cats: raws.map((r) => ({ raw: r, label: labelByRaw.get(r) ?? r })),
      lookup: lk,
      maxVal: mx,
    };
  }, [data]);

  const m = { top: 84, right: 32, bottom: 56, left: 52 };
  const fitStep = (boxW - m.left - m.right) / Math.max(1, cats.length);
  const baseStep = Math.max(MIN_STEP, fitStep);
  const width = Math.max(boxW, cats.length * baseStep * zoom + m.left + m.right);
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  const axisY = m.top + plotH;
  const step = plotW / Math.max(1, cats.length);

  const ticks = niceTicks(maxVal);
  const yMax = ticks[ticks.length - 1] || 1;
  const x = (i: number) => m.left + step * i + step / 2;
  const y = (v: number) => axisY - (v / yMax) * plotH;
  const labelEvery = Math.max(1, Math.ceil(76 / step));

  const series = SERIES.map((s) => {
    const pts: SeriesPoint[] = [];
    cats.forEach((c, i) => {
      const d = lookup.get(s.key)?.get(c.raw);
      if (d) pts.push({ i, d, x: x(i), y: y(d.value) });
    });
    return { ...s, pts };
  });
  const blue = series[0];
  const red = series[1];
  const blueAt = new Map(blue.pts.map((p) => [p.i, p]));
  const redAt = new Map(red.pts.map((p) => [p.i, p]));

  const onScroll = () => {
    const el = scrollRef.current;
    if (el && el.scrollWidth > 0) anchor.current = (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth;
  };

  // Data baru -> lompat ke tanggal terbaru (kanan)
  useLayoutEffect(() => {
    anchor.current = 1;
  }, [cats.length]);

  // Setiap lebar/zoom berubah -> pertahankan titik tengah yang sedang dilihat
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = anchor.current * el.scrollWidth - el.clientWidth / 2;
  }, [width, cats.length]);

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const idx = Math.floor((e.clientX - rect.left) / step);
    setHover(Math.min(cats.length - 1, Math.max(0, idx)));
  };

  // Angka di SETIAP titik: biru = bubble berisi angka, merah = angka saja.
  // Jika di tanggal yang sama keduanya berdekatan, yang lebih tinggi diberi
  // label di atas dan yang lebih rendah di bawah supaya tidak bertumpuk.
  const labels = cats.map((_, i) => {
    const b = blueAt.get(i);
    const r = redAt.get(i);
    const close = !!(b && r && Math.abs(b.y - r.y) < 70);
    const redHigher = close && r!.y < b!.y;

    let bubble: { cx: number; cy: number; r: number; v: number } | null = null;
    if (b) {
      const rad = bubbleRadius(b.d.value);
      let below = redHigher;
      let cy = below ? b.y + rad + 12 : b.y - rad - 12;
      if (below && cy + rad > axisY - 2) { below = false; cy = b.y - rad - 12; }
      cy = Math.max(rad + 38, cy);
      bubble = { cx: b.x, cy, r: rad, v: b.d.value };
    }

    let redLabel: { x: number; y: number; v: number } | null = null;
    if (r) {
      let above = redHigher;
      if (!above && r.y > axisY - 26) above = true; // dekat sumbu -> taruh di atas
      redLabel = { x: r.x, y: above ? r.y - 12 : r.y + 24, v: r.d.value };
    }
    return { bubble, redLabel };
  });

  // Tooltip
  const hc = hover !== null ? cats[hover] : null;
  const hSent = hc ? lookup.get("SPB Terkirim")?.get(hc.raw) : undefined;
  const hArr = hc ? lookup.get("Barang Datang")?.get(hc.raw) : undefined;
  const tipX = hover !== null ? x(hover) : 0;
  const flip = tipX > width - 230;

  return (
    <div ref={ref} style={{ background: THEME.bg, borderRadius: 12, width: "100%", position: "relative" }}>
      <ZoomControls zoom={zoom} onIn={zoomIn} onOut={zoomOut} onReset={reset} />
      <div ref={scrollRef} onScroll={onScroll} style={{ overflowX: "auto", overflowY: "hidden" }}>
        <div style={{ position: "relative", width, height }}>
          <svg width={width} height={height} role="img" aria-label="Grafik garis timeline SPB terkirim dan barang datang">
            <defs>
              <filter id="spb-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Legend */}
            <g transform={`translate(${m.left}, 26)`}>
              {SERIES.map((s, i) => (
                <g key={s.key} transform={`translate(${i * 150}, 0)`}>
                  <circle r={6} cx={6} cy={-4} fill="none" stroke={s.color} strokeWidth={2.5} />
                  <text x={20} fontSize={13} fontWeight={600} fill="#c3cfe0">
                    {s.name}
                  </text>
                </g>
              ))}
            </g>

            {/* Grid horizontal + label Y */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke={THEME.grid} strokeWidth={1} />
                <text x={m.left - 12} y={y(t) + 4} textAnchor="end" fontSize={12} fill={THEME.tick}>
                  {t}
                </text>
              </g>
            ))}

            {/* Grid vertikal tipis + label X */}
            {cats.map((c, i) => (
              <g key={c.raw}>
                <line x1={x(i)} x2={x(i)} y1={m.top} y2={axisY} stroke={THEME.grid} strokeWidth={1} opacity={0.45} />
                {i % labelEvery === 0 && (
                  <text x={x(i)} y={axisY + 26} textAnchor="middle" fontSize={12} fill={THEME.tick}>
                    {c.label}
                  </text>
                )}
              </g>
            ))}
            <line x1={m.left} x2={width - m.right} y1={axisY} y2={axisY} stroke={THEME.axis} strokeWidth={1.5} />

            {/* Garis panduan hover */}
            {hover !== null && (
              <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={axisY} stroke="#94a3b8" strokeDasharray="4 4" opacity={0.6} />
            )}

            {/* Garis spline */}
            {series.map((s) => (
              <path
                key={s.key}
                d={monotonePath(s.pts)}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                filter="url(#spb-glow)"
              />
            ))}

            {/* Titik cincin */}
            {series.map((s) =>
              s.pts.map((p) => (
                <circle
                  key={`${s.key}-${p.d.rawDate}`}
                  cx={p.x}
                  cy={p.y}
                  r={hover === p.i ? 7 : 5}
                  fill={THEME.bg}
                  stroke={s.color}
                  strokeWidth={3}
                />
              )),
            )}

            {/* Angka pada SETIAP titik */}
            <g pointerEvents="none">
              {labels.map(({ bubble, redLabel }, i) => (
                <g key={`lbl-${cats[i].raw}`}>
                  {redLabel && (
                    <text
                      x={redLabel.x}
                      y={redLabel.y}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight={700}
                      fill={red.color}
                      stroke={THEME.bg}
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {redLabel.v}
                    </text>
                  )}
                  {bubble && (
                    <>
                      <circle cx={bubble.cx} cy={bubble.cy} r={bubble.r} fill={blue.color} filter="url(#spb-glow)" />
                      <text
                        x={bubble.cx}
                        y={bubble.cy + 5}
                        textAnchor="middle"
                        fontSize={13}
                        fontWeight={700}
                        fill="#ffffff"
                      >
                        {bubble.v}
                      </text>
                    </>
                  )}
                </g>
              ))}
            </g>

            {/* Area tangkap mouse per tanggal */}
            <rect
              x={m.left}
              y={m.top - 10}
              width={plotW}
              height={plotH + 10}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
            />
          </svg>

          {/* Tooltip kartu gelap */}
          {hc && (hSent || hArr) && (
            <div
              style={{
                position: "absolute",
                top: m.top,
                left: flip ? undefined : tipX + 14,
                right: flip ? width - tipX + 14 : undefined,
                padding: "12px 16px",
                background: "#0f2742",
                borderRadius: 8,
                border: "1px solid #1e3a5f",
                boxShadow: "0 6px 18px rgba(0,0,0,.5)",
                pointerEvents: "none",
                minWidth: 170,
                zIndex: 5,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: "#f8fafc", marginBottom: 6 }}>{hc.label}</div>
              {hSent && (
                <div style={{ color: blue.color, fontSize: 13, marginTop: 4 }}>
                  ● SPB terkirim: <strong>{hSent.value}</strong> SPB
                </div>
              )}
              {hArr && (
                <>
                  <div style={{ color: red.color, fontSize: 13, marginTop: 4 }}>
                    ● Barang datang: <strong>{hArr.value}</strong> barang
                  </div>
                  <div style={{ color: red.color, fontSize: 13, marginTop: 2 }}>
                    ● Lama proses: <strong>{hArr.lamaProses ?? "-"}</strong> hari
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpbTimelineChart;