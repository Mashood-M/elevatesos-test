import type { BrandKit, Organization } from "@/types";

export const DEFAULT_BRAND_KIT: BrandKit = {
  logoUrl: "/elevates-mark.svg",
  colors: {
    accent: "#f26430",
    charcoal: "#2d2d34",
    sage: "#5f7560",
    indigo: "#414066",
  },
};

export const BRAND_COLOR_KEYS = [
  "accent",
  "charcoal",
  "sage",
  "indigo",
] as const;

export type BrandColorKey = (typeof BRAND_COLOR_KEYS)[number];

export const BRAND_COLOR_LABELS: Record<BrandColorKey, string> = {
  accent: "Accent",
  charcoal: "Charcoal",
  sage: "Sage",
  indigo: "Indigo",
};

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function normalizeHex(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return fallback;
}

export function resolveBrandKit(org: Organization | undefined): BrandKit {
  const kit = org?.brandKit;
  return {
    logoUrl: kit?.logoUrl?.trim() || DEFAULT_BRAND_KIT.logoUrl,
    colors: {
      accent: normalizeHex(
        kit?.colors?.accent ?? "",
        DEFAULT_BRAND_KIT.colors.accent,
      ),
      charcoal: normalizeHex(
        kit?.colors?.charcoal ?? "",
        DEFAULT_BRAND_KIT.colors.charcoal,
      ),
      sage: normalizeHex(
        kit?.colors?.sage ?? "",
        DEFAULT_BRAND_KIT.colors.sage,
      ),
      indigo: normalizeHex(
        kit?.colors?.indigo ?? "",
        DEFAULT_BRAND_KIT.colors.indigo,
      ),
    },
  };
}

export function ensureOrganizationBrandKit(org: Organization): Organization {
  return {
    ...org,
    brandKit: resolveBrandKit(org),
  };
}
