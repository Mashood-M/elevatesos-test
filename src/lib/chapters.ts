import type { Chapter } from "@/types";

export const TEST_CHAPTER_ID = "f59244b8-b5c9-4906-8ae8-9d1ee819ec75";
export const TEST_CHAPTER_SLUG = "test-chapter";

export const TEST_CHAPTER_DEFAULT: Chapter = {
  id: TEST_CHAPTER_ID,
  elevatesId: "CHP-TEST01",
  organizationId: "00000000-0000-0000-0000-000000000001",
  name: "Elevates Test Chapter",
  slug: TEST_CHAPTER_SLUG,
  college: "Elevates Sandbox Institute of Technology",
  city: "HQ Sandbox Campus",
  status: "active",
  healthScore: 98,
  memberCount: 32,
  eventCount: 8,
  projectCount: 6,
  foundedAt: "2026-01-01T00:00:00.000Z",
  notes: "Pinned test sandbox chapter for testing all chapter-wise features, roles, attendance, and forms in isolation.",
  published: true,
};

/**
 * Checks if a chapter is the dedicated test chapter.
 */
export function isTestChapter(chapter: { id?: string; slug?: string; name?: string } | null | undefined): boolean {
  if (!chapter) return false;
  if (chapter.id === TEST_CHAPTER_ID) return true;
  if (chapter.slug === TEST_CHAPTER_SLUG) return true;
  if (chapter.name && chapter.name.toLowerCase().includes("test chapter")) return true;
  return false;
}

/**
 * Ensures the test chapter exists in the chapters array.
 */
export function ensureTestChapter(chapters: Chapter[] = []): Chapter[] {
  const existingTest = chapters.find(isTestChapter);
  if (existingTest) {
    // Keep real campus chapters first, test chapter at the end
    return [...chapters.filter((c) => c.id !== existingTest.id), existingTest];
  }
  return [...chapters, TEST_CHAPTER_DEFAULT];
}

/**
 * Filters and partitions chapters into the pinned test chapter and other matching chapters.
 */
export function filterAndSortChapters(
  chapters: Chapter[] = [],
  searchQuery = "",
): {
  testChapter: Chapter | null;
  otherChapters: Chapter[];
  totalCount: number;
} {
  const allWithTest = ensureTestChapter(chapters);
  const q = searchQuery.trim().toLowerCase();

  const testCh = allWithTest.find(isTestChapter) ?? TEST_CHAPTER_DEFAULT;
  const nonTestChs = allWithTest.filter((c) => !isTestChapter(c));

  // Sort non-test chapters alphabetically by name
  const sortedNonTest = [...nonTestChs].sort((a, b) => a.name.localeCompare(b.name));

  if (!q) {
    return {
      testChapter: testCh,
      otherChapters: sortedNonTest,
      totalCount: (testCh ? 1 : 0) + sortedNonTest.length,
    };
  }

  // Check if test chapter matches search query
  const testMatches =
    testCh.name.toLowerCase().includes(q) ||
    testCh.college.toLowerCase().includes(q) ||
    testCh.city.toLowerCase().includes(q) ||
    testCh.slug.toLowerCase().includes(q) ||
    "test chapter sandbox".includes(q);

  const matchedOther = sortedNonTest.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.college.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.district && c.district.toLowerCase().includes(q)),
  );

  return {
    testChapter: testMatches ? testCh : null,
    otherChapters: matchedOther,
    totalCount: (testMatches ? 1 : 0) + matchedOther.length,
  };
}

/**
 * Derives a clean, uppercase 3-letter shortform / shortcode from a chapter or college name.
 * Examples:
 *  - "School of Science" -> "SOS"
 *  - "National Institute of Technology" -> "NIT"
 *  - "Eranad Knowledge City" -> "EKC"
 *  - "Malabar Christian College" -> "MCC"
 *  - "Elevates Test Chapter" -> "ETC"
 *  - "nit" -> "NIT"
 */
export function deriveChapterShortCode(name: string): string {
  if (!name || !name.trim()) return "ELV";
  const cleaned = name.trim();

  // If already a short acronym (2 to 4 chars with no spaces, e.g. "NIT", "MCC", "EKC")
  const singleWord = cleaned.replace(/[^a-zA-Z0-9]/g, "");
  if (singleWord.length <= 4 && singleWord.length >= 2 && !cleaned.includes(" ")) {
    return singleWord.toUpperCase().padEnd(3, "X").slice(0, 3);
  }

  const rawWords = cleaned
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (rawWords.length === 0) return "ELV";

  const stopWords = new Set(["of", "and", "the", "for", "in", "at", "campus", "chapter"]);
  const significantWords = rawWords.filter((w) => !stopWords.has(w.toLowerCase()));

  // 1. If 3 or more significant words, take initials of first 3 significant words (e.g. "National Institute of Technology" -> NIT)
  if (significantWords.length >= 3) {
    return (significantWords[0][0] + significantWords[1][0] + significantWords[2][0]).toUpperCase();
  }

  // 2. If 3 or more raw words (e.g. "School of Science" -> S + O + S = SOS)
  if (rawWords.length >= 3) {
    return (rawWords[0][0] + rawWords[1][0] + rawWords[2][0]).toUpperCase();
  }

  // 3. If 2 significant words, take first 2 chars of 1st word + first char of 2nd word
  if (significantWords.length === 2) {
    const w1 = significantWords[0];
    const w2 = significantWords[1];
    return (w1.slice(0, 2) + w2.slice(0, 1)).toUpperCase().padEnd(3, "X").slice(0, 3);
  }

  // 4. If 2 raw words
  if (rawWords.length === 2) {
    const w1 = rawWords[0];
    const w2 = rawWords[1];
    return (w1.slice(0, 2) + w2.slice(0, 1)).toUpperCase().padEnd(3, "X").slice(0, 3);
  }

  // 5. Single long word (e.g. "Elevates" -> "ELV")
  return rawWords[0].slice(0, 3).toUpperCase().padEnd(3, "X").slice(0, 3);
}

/**
 * Formats a sequence number into the official sequential Chapter Elevates ID:
 * - 1 to 999: "CHP-0001" to "CHP-0999" (Sequential 4 digits)
 * - 1,000 to 26,999: "CHP-A000" to "CHP-Z999" (First char letter A-Z, followed by 3 digits)
 * - 27,000 to 94,599: "CHP-AA00" to "CHP-ZZ99" (Two letters AA-ZZ, followed by 2 digits)
 */
export function formatChapterElevatesId(n: number): string {
  if (n < 1000) {
    return `CHP-${String(Math.max(1, n)).padStart(4, "0")}`;
  } else if (n < 27000) {
    const letterIdx = Math.floor((n - 1000) / 1000);
    const letter = String.fromCharCode(65 + letterIdx);
    const rem = (n - 1000) % 1000;
    return `CHP-${letter}${String(rem).padStart(3, "0")}`;
  } else if (n < 94600) {
    const twoLetterOffset = Math.floor((n - 27000) / 100);
    const firstLetter = String.fromCharCode(65 + Math.floor(twoLetterOffset / 26));
    const secondLetter = String.fromCharCode(65 + (twoLetterOffset % 26));
    const rem = (n - 27000) % 100;
    return `CHP-${firstLetter}${secondLetter}${String(rem).padStart(2, "0")}`;
  }
  return `CHP-${String(n).padStart(6, "0")}`;
}

/**
 * Validates whether a string matches the official sequential Chapter Elevates ID format:
 * - CHP-0001 to CHP-0999
 * - CHP-A000 to CHP-Z999
 * - CHP-AA00 to CHP-ZZ99
 */
export function isValidChapterElevatesId(id?: string | null): boolean {
  if (!id) return false;
  return /^CHP-([0-9]{4}|[A-Z][0-9]{3}|[A-Z]{2}[0-9]{2})$/i.test(id.trim());
}

/**
 * Parses a sequential Chapter Elevates ID back to its chronological sequence number.
 * Returns null if the format does not conform.
 */
export function parseChapterElevatesId(elevatesId?: string | null): number | null {
  if (!elevatesId) return null;
  const clean = elevatesId.trim().toUpperCase();

  // 1 to 999: CHP-0001 to CHP-0999
  const m1 = clean.match(/^CHP-([0-9]{4})$/);
  if (m1) {
    const val = parseInt(m1[1], 10);
    return val > 0 ? val : null;
  }

  // 1,000 to 26,999: CHP-A000 to CHP-Z999
  const m2 = clean.match(/^CHP-([A-Z])([0-9]{3})$/);
  if (m2) {
    const letterIdx = m2[1].charCodeAt(0) - 65;
    const rem = parseInt(m2[2], 10);
    if (letterIdx >= 0 && letterIdx < 26) {
      return 1000 + letterIdx * 1000 + rem;
    }
  }

  // 27,000 to 94,599: CHP-AA00 to CHP-ZZ99
  const m3 = clean.match(/^CHP-([A-Z])([A-Z])([0-9]{2})$/);
  if (m3) {
    const firstIdx = m3[1].charCodeAt(0) - 65;
    const secondIdx = m3[2].charCodeAt(0) - 65;
    const rem = parseInt(m3[3], 10);
    if (firstIdx >= 0 && firstIdx < 26 && secondIdx >= 0 && secondIdx < 26) {
      const twoLetterOffset = firstIdx * 26 + secondIdx;
      return 27000 + twoLetterOffset * 100 + rem;
    }
  }

  return null;
}

/**
 * Calculates the next sequential Chapter Elevates ID by analyzing existing chapters in state.
 */
export function getNextSequentialChapterElevatesId(
  chapters: Array<{ elevatesId?: string; elevates_id?: string }> = [],
): string {
  let maxSeq = 0;
  for (const c of chapters) {
    const raw = c.elevatesId || c.elevates_id;
    const num = parseChapterElevatesId(raw);
    if (num !== null && num > maxSeq) {
      maxSeq = num;
    }
  }
  return formatChapterElevatesId(maxSeq + 1);
}

/**
 * @deprecated Deprecated for the chapter creation path. The database sequence/trigger automatically
 * assigns sequential elevates_id (CHP-XXXX). Do not use this when building creation payloads.
 * Keep for backward compatibility or local sequence prediction.
 */
export function generateChapterElevatesId(
  context?: string | number | Array<{ elevatesId?: string; elevates_id?: string }>,
): string {
  if (Array.isArray(context)) {
    return getNextSequentialChapterElevatesId(context);
  }
  if (typeof context === "number") {
    return formatChapterElevatesId(context);
  }
  if (typeof context === "string") {
    const parsed = parseChapterElevatesId(context);
    if (parsed !== null) return formatChapterElevatesId(parsed + 1);
  }
  return "CHP-0001";
}

/**
 * @deprecated Deprecated for the chapter creation path. Use DB-assigned sequential elevates_id.
 * Keep for backward compatibility, display, and resolving existing records.
 */
export function getChapterElevatesId(
  chapter?: { id?: string; elevatesId?: string; elevates_id?: string } | null,
  fallbackIndex?: number,
): string {
  if (!chapter) return "CHP-0001";
  const id = chapter.elevatesId || chapter.elevates_id;
  if (id && isValidChapterElevatesId(id)) return id.trim().toUpperCase();
  if (id && id.trim()) return id.trim();
  if (typeof fallbackIndex === "number" && fallbackIndex > 0) {
    return formatChapterElevatesId(fallbackIndex);
  }
  return "CHP-0001";
}

/**
 * Resolves a chapter from a collection by its slug, its UUID, or its sequential Elevates ID (e.g. CHP-0001).
 * Case-insensitive lookup.
 */
export function findChapterBySlugOrId(
  chapters: Chapter[] = [],
  identifier?: string | null,
): Chapter | undefined {
  if (!identifier || !chapters.length) return undefined;
  const s = identifier.trim().toLowerCase();
  return chapters.find(
    (c) =>
      c.slug.toLowerCase() === s ||
      c.id.toLowerCase() === s ||
      (c.elevatesId && c.elevatesId.toLowerCase() === s),
  );
}

