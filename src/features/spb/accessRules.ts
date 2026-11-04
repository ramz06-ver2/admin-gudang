/**
 * Aturan akses data SPB (sisi klien).
 *
 * CATATAN KEAMANAN: aturan ini hanya lapisan UX/defense-in-depth. Penegakan
 * sebenarnya ada di database (RLS pada tabel `spb`, lihat
 * supabase/migrations/20261103_enforce_auth_rls.sql). Jangan mengandalkan
 * filter klien saja.
 */
import { getVerifiedUser } from "../../shared/lib/authGuard";

/** Nilai kolom `status` tabel spb yang hanya boleh dilihat user yang login. */
export const RESTRICTED_SPB_STATUS = "belum di proses";

/** Label filter di UI yang hanya tersedia untuk user yang login. */
export const RESTRICTED_FILTER_LABEL = "Belum Diproses";

export const isRestrictedSpbStatus = (status: unknown): boolean =>
  String(status ?? "").trim().toLowerCase() === RESTRICTED_SPB_STATUS;

/** True jika user saat ini sudah login (role terautentikasi). */
export const canViewRestrictedSpb = (): boolean => getVerifiedUser() !== null;

/**
 * Menyaring baris SPB mentah: user yang belum login tidak menerima baris
 * berstatus "belum di proses".
 */
export const filterVisibleSpbRows = <T extends { status?: unknown }>(
  rows: T[],
  canViewRestricted: boolean,
): T[] =>
  canViewRestricted
    ? rows
    : rows.filter((row) => !isRestrictedSpbStatus(row.status));

/**
 * Validasi URL file sumber (mis. Google Drive) sebelum dijadikan link.
 * Hanya `https:` yang diterima — mencegah `javascript:`/`data:` URL dari data DB.
 * @returns URL ternormalisasi, atau null jika kosong/tidak aman.
 */
export const toSafeExternalUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

