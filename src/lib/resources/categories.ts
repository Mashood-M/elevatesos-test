import type { ResourceCategory } from "@/types";

/** Fallback empty category list — all categories are stored in and loaded from Supabase */
export const DEFAULT_RESOURCE_CATEGORIES: ResourceCategory[] = [];

export function slugifyCategoryKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function humanizeCategoryKey(key: string): string {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resourceCategoryLabel(
  categories: ResourceCategory[] | undefined,
  key: string,
): string {
  const hit = (categories ?? []).find((c) => c.key === key);
  if (hit) return hit.label;
  return humanizeCategoryKey(key);
}

/** Merge stored categories from Supabase + any keys found on resources. */
export function mergeResourceCategories(
  stored: ResourceCategory[] | undefined,
  resourceKeys: string[],
): ResourceCategory[] {
  const map = new Map<string, ResourceCategory>();
  for (const c of stored ?? []) {
    if (c?.key) map.set(c.key, { key: c.key, label: c.label || humanizeCategoryKey(c.key) });
  }
  for (const key of resourceKeys) {
    if (key && !map.has(key)) {
      map.set(key, { key, label: humanizeCategoryKey(key) });
    }
  }
  return Array.from(map.values());
}
