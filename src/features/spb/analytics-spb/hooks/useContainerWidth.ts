import { useEffect, useRef, useState } from "react";

/** Mengukur lebar elemen secara responsif (tanpa library tambahan). */
export const useContainerWidth = <T extends HTMLElement>(fallback = 800) => {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(280, Math.floor(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
};

/** Tick sumbu Y yang "rapi" (kelipatan 1/2/5 x 10^n), selalu bilangan bulat. */
export const niceTicks = (max: number, target = 4): number[] => {
  if (max <= 0) return [0, 1, 2, 3, 4];
  const raw = max / target;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = Math.max(1, mult * pow);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return ticks;
};