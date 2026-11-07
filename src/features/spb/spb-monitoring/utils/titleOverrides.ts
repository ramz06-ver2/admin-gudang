// src/features/spb/utils/titleOverrides.ts

const TITLE_OVERRIDES_KEY = "spb-po-title-overrides";

export const getTitleOverrides = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(TITLE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveTitleOverride = (key: string, title: string): void => {
  try {
    const current = getTitleOverrides();
    current[key] = title;
    localStorage.setItem(TITLE_OVERRIDES_KEY, JSON.stringify(current));
  } catch {
    // ignore storage errors
  }
};

export const buildSpbOverrideKey = (
  docNo: string,
  originalTitle?: string | null,
): string => `SPB_${docNo}::${originalTitle ?? ""}`;

export const buildPoOverrideKey = (docNo: string): string => `PO_${docNo}`;

export const buildLocalTitleKey = (
  type: "spb" | "po",
  docNo: string,
  title: string | null | undefined,
): string =>
  type === "spb" ? `SPB_${docNo}::${title ?? ""}` : `PO_${docNo}`;

