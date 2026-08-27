export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return false;

  if (
    url.includes("your-project") ||
    url.includes("example.com") ||
    key.includes("your-anon-key") ||
    key.includes("change-me")
  ) {
    return false;
  }

  return true;
}
