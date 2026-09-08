/**
 * Slug utilities for URL-friendly paths.
 * Enforces:
 * - Only alphanumeric characters (a-z, 0-9) and hyphens (-)
 * - Spaces and special characters are converted to hyphens (-)
 * - Consecutive hyphens are collapsed to a single hyphen (-)
 * - Leading hyphens are stripped
 */

/**
 * Formats user input in real-time as they type or paste into a slug field.
 * Allows trailing hyphens so users can type words separated by spaces or hyphens.
 */
export function formatSlugInput(value: string): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Strip diacritics / accents (e.g. é -> e)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-") // Replace spaces & special characters with '-'
    .replace(/--+/g, "-") // Collapse consecutive hyphens
    .replace(/^-+/, ""); // Strip leading hyphens
}

/**
 * Finalizes a slug on blur or before saving to ensure clean URL-friendly paths.
 * Trims any trailing hyphens.
 */
export function finalizeSlug(value: string): string {
  if (!value) return "";
  return formatSlugInput(value).replace(/-+$/, "");
}

/**
 * Standard slugify helper.
 */
export function slugify(value: string): string {
  return finalizeSlug(value);
}

export interface ChapterGeoData {
  coordinates?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  mapUrl?: string;
  district?: string;
  state?: string;
}

const GEO_PREFIX = "<!--elevates:geo:";
const GEO_SUFFIX = "-->";

/**
 * Embeds coordinates and location into notes as a structured hidden metadata comment.
 * This guarantees location persistence even on older Supabase schemas without dedicated columns.
 */
export function embedLocationInNotes(
  notes: string | undefined | null,
  geo: ChapterGeoData,
): string | null {
  const cleanNotes = (notes || "").replace(/<!--elevates:geo:[\s\S]*?-->/g, "").trim();
  const hasGeo = Boolean(
    (geo.coordinates && geo.coordinates.trim()) ||
    (geo.location && geo.location.trim()) ||
    geo.latitude != null ||
    geo.longitude != null ||
    (geo.mapUrl && geo.mapUrl.trim()) ||
    (geo.district && geo.district.trim()) ||
    (geo.state && geo.state.trim())
  );
  if (!hasGeo) return cleanNotes || null;

  const payload = JSON.stringify({
    coordinates: geo.coordinates?.trim() || undefined,
    latitude: geo.latitude != null && !isNaN(geo.latitude) ? geo.latitude : undefined,
    longitude: geo.longitude != null && !isNaN(geo.longitude) ? geo.longitude : undefined,
    location: geo.location?.trim() || undefined,
    mapUrl: geo.mapUrl?.trim() || undefined,
    district: geo.district?.trim() || undefined,
    state: geo.state?.trim() || undefined,
  });

  return cleanNotes
    ? `${cleanNotes}\n\n${GEO_PREFIX}${payload}${GEO_SUFFIX}`
    : `${GEO_PREFIX}${payload}${GEO_SUFFIX}`;
}

/**
 * Extracts coordinates and location from notes if present.
 * Returns clean userNotes without metadata comment.
 */
export function extractLocationFromNotes(notes: string | undefined | null): {
  userNotes: string;
  geo?: ChapterGeoData;
} {
  if (!notes) return { userNotes: "" };
  const match = notes.match(/<!--elevates:geo:([\s\S]*?)-->/);
  if (!match) return { userNotes: notes };
  try {
    const geo = JSON.parse(match[1]) as ChapterGeoData;
    const userNotes = notes.replace(/<!--elevates:geo:[\s\S]*?-->/g, "").trim();
    return { userNotes, geo };
  } catch {
    return { userNotes: notes };
  }
}

