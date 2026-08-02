export type PageOrientation = "portrait" | "landscape";
export type PageSizeId = "letter" | "a4";
export type PageColumns = 1 | 2;
export type PageBorder = "none" | "thin" | "thick";

/** Base sizes in CSS px at 96dpi (portrait). */
export const PAGE_SIZES = {
  letter: { w: 816, h: 1056, print: "letter" },
  a4: { w: 794, h: 1123, print: "A4" },
} as const;

export function pageBox(
  size: PageSizeId,
  orientation: PageOrientation,
): { width: number; height: number } {
  const base = PAGE_SIZES[size];
  if (orientation === "landscape") {
    return { width: base.h, height: base.w };
  }
  return { width: base.w, height: base.h };
}

export function printPageSize(
  size: PageSizeId,
  orientation: PageOrientation,
): string {
  const name = PAGE_SIZES[size].print;
  return orientation === "landscape" ? `${name} landscape` : name;
}
