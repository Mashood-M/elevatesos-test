/**
 * Helper utility to convert relative local paths (e.g. /images/founders/sarhan-qadir.jpeg)
 * or raw storage keys into full Supabase Storage CDN URLs.
 */
export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return "";

  // If already a full HTTP/HTTPS URL, return directly
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://shidqhewtbjjeyxaedzu.supabase.co";
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  return `${supabaseUrl}/storage/v1/object/public/elevates-media/${cleanPath}`;
}
