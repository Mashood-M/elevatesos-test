import type { Chapter } from "@/types";

export const TEST_CHAPTER_ID = "e1e7a050-7e57-4c8a-9b12-a1b2c3d4e5f6";
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
    // Return with test chapter pinned at index 0, followed by all other chapters
    return [existingTest, ...chapters.filter((c) => c.id !== existingTest.id)];
  }
  return [TEST_CHAPTER_DEFAULT, ...chapters];
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
