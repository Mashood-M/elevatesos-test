/** Demo store is the default. Set NEXT_PUBLIC_USE_DEMO_STORE=false to prefer Supabase data. */
export function isDemoMode() {
  const flag = process.env.NEXT_PUBLIC_USE_DEMO_STORE;
  if (flag === "false" || flag === "0") return false;
  return true;
}

export function useSupabaseAuth() {
  return (
    process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "true" ||
    process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "1"
  );
}
