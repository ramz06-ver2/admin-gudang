import { createClient } from "@refinedev/supabase";
import { USE_MOCK } from "./config";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!USE_MOCK && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.warn("⚠️  Supabase env vars missing");
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
  },
);