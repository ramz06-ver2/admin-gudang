import { useCallback, useEffect, useState, type RefObject } from "react";

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 4;
const BUTTON_FACTOR = 1.25;
const WHEEL_FACTOR = 1.1;

const clamp = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

/**
 * State zoom + kontrol. Zoom juga bisa lewat Ctrl/Cmd + scroll mouse
 * (atau pinch di trackpad) pada elemen `targetRef`.
 */
export const useZoom = (targetRef: RefObject<HTMLElement | null>) => {
  const [zoom, setZoom] = useState(1);

  const zoomIn = useCallback(() => setZoom((z) => clamp(z * BUTTON_FACTOR)), []);
  const zoomOut = useCallback(() => setZoom((z) => clamp(z / BUTTON_FACTOR)), []);
  const reset = useCallback(() => setZoom(1), []);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // scroll biasa tetap menggulir halaman
      e.preventDefault();
      setZoom((z) => clamp(e.deltaY < 0 ? z * WHEEL_FACTOR : z / WHEEL_FACTOR));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [targetRef]);

  return { zoom, zoomIn, zoomOut, reset };
};