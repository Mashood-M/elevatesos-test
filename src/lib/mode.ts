/** Live Supabase store is the default. Set NEXT_PUBLIC_USE_DEMO_STORE=true in development to enable mock store. */
export function isDemoMode() {
  if (process.env.NODE_ENV === "production") return false;
  const flag = process.env.NEXT_PUBLIC_USE_DEMO_STORE;
  if (flag === "true" || flag === "1") return true;
  return false;
}

export function useSupabaseAuth() {
  return (
    process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "true" ||
    process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "1"
  );
}
