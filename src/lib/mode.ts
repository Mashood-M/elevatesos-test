import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Live Supabase store is always active. Demo mode is disabled. */
export function isDemoMode(): boolean {
  return false;
}

export function useSupabaseAuth() {
  if (process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "false" || process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "0") {
    return false;
  }
  return isSupabaseConfigured();
}
