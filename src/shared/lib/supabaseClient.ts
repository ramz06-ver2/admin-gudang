// File: src/shared/lib/supabaseClient.ts

// 1. PERBAIKAN IMPORT: Harus dari @supabase/supabase-js, BUKAN @refinedev/supabase
import { createClient } from "@supabase/supabase-js";
import { USE_MOCK } from "./config";

// 2. PERBAIKAN ENV: Tambahkan fallback agar mendeteksi kunci yang dipakai di .env.local
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;

if (!USE_MOCK && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.warn("⚠️  Variabel environment Supabase tidak ditemukan. Cek file .env.local Anda.");
}

export const supabaseClient = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_KEY || "placeholder-key",
  {
    db: { schema: "public" },
    auth: {
      persistSession: !USE_MOCK,
      autoRefreshToken: !USE_MOCK,
      detectSessionInUrl: !USE_MOCK,
    },
  }
);