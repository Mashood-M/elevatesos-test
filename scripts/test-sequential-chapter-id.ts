import {
  formatChapterElevatesId,
  parseChapterElevatesId,
  isValidChapterElevatesId,
  getNextSequentialChapterElevatesId,
  getChapterElevatesId,
  findChapterBySlugOrId,
} from "../src/lib/chapters";
import { resolveChapter, canAccessPath } from "../src/lib/access";
import type { Chapter } from "../src/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failed++;
  }
}

async function run() {
  console.log("==================================================");
  console.log("  TEST: SEQUENTIAL CHAPTER ELEVATES ID & RESOLUTION ");
  console.log("==================================================\n");

  // 1. FORMATTING RULES
  console.log("--- 1. Sequential Chapter ID Formatting Rules ---");
  // Chapters 1 – 999: Sequential 4 digits: CHP-0001, CHP-0002, etc.
  assert(formatChapterElevatesId(1) === "CHP-0001", "1 -> CHP-0001");
  assert(formatChapterElevatesId(2) === "CHP-0002", "2 -> CHP-0002");
  assert(formatChapterElevatesId(42) === "CHP-0042", "42 -> CHP-0042");
  assert(formatChapterElevatesId(999) === "CHP-0999", "999 -> CHP-0999");

  // Above 1,000 (1,000 – 26,999): First character rolls over to a letter (A through Z) followed by 3 digits
  assert(formatChapterElevatesId(1000) === "CHP-A000", "1000 -> CHP-A000");
  assert(formatChapterElevatesId(1001) === "CHP-A001", "1001 -> CHP-A001");
  assert(formatChapterElevatesId(1999) === "CHP-A999", "1999 -> CHP-A999");
  assert(formatChapterElevatesId(2000) === "CHP-B000", "2000 -> CHP-B000");
  assert(formatChapterElevatesId(26999) === "CHP-Z999", "26999 -> CHP-Z999");

  // Above 27,000: Two letters + 2 digits: CHP-AA00 to CHP-ZZ99
  assert(formatChapterElevatesId(27000) === "CHP-AA00", "27000 -> CHP-AA00");
  assert(formatChapterElevatesId(27001) === "CHP-AA01", "27001 -> CHP-AA01");
  assert(formatChapterElevatesId(27099) === "CHP-AA99", "27099 -> CHP-AA99");
  assert(formatChapterElevatesId(27100) === "CHP-AB00", "27100 -> CHP-AB00");
  assert(formatChapterElevatesId(94599) === "CHP-ZZ99", "94599 -> CHP-ZZ99");

  // 2. PARSING & ROUND-TRIP VERIFICATION
  console.log("\n--- 2. Parsing & Invertibility (Round-Trip) ---");
  const testNums = [1, 2, 42, 999, 1000, 1001, 1999, 2000, 15432, 26999, 27000, 27001, 27099, 27100, 94599];
  for (const n of testNums) {
    const formatted = formatChapterElevatesId(n);
    const parsed = parseChapterElevatesId(formatted);
    assert(parsed === n, `Roundtrip for ${n} -> ${formatted} -> ${parsed}`);
  }

  // 3. FORMAT VALIDATION
  console.log("\n--- 3. Format Validation (isValidChapterElevatesId) ---");
  assert(isValidChapterElevatesId("CHP-0001"), "CHP-0001 is valid");
  assert(isValidChapterElevatesId("CHP-0999"), "CHP-0999 is valid");
  assert(isValidChapterElevatesId("CHP-A000"), "CHP-A000 is valid");
  assert(isValidChapterElevatesId("CHP-Z999"), "CHP-Z999 is valid");
  assert(isValidChapterElevatesId("CHP-AA00"), "CHP-AA00 is valid");
  assert(isValidChapterElevatesId("CHP-ZZ99"), "CHP-ZZ99 is valid");
  assert(isValidChapterElevatesId("chp-0042"), "chp-0042 (lowercase) is valid");
  assert(!isValidChapterElevatesId("CHP-123"), "CHP-123 (only 3 digits) is invalid");
  assert(!isValidChapterElevatesId("CHP-3VHC4E"), "CHP-3VHC4E (random string) is invalid");
  assert(!isValidChapterElevatesId("ELV-0001"), "ELV-0001 is not a chapter ID");
  assert(!isValidChapterElevatesId(""), "Empty string is invalid");
  assert(!isValidChapterElevatesId(null), "Null is invalid");

  // 4. NEXT SEQUENTIAL ID DETERMINATION (NO RANDOM GUESSING)
  console.log("\n--- 4. Next Sequential ID Calculation ---");
  assert(getNextSequentialChapterElevatesId([]) === "CHP-0001", "Empty chapters list yields CHP-0001");
  const existingChapters: Chapter[] = [
    { id: "c1", elevatesId: "CHP-0001", name: "Ch 1", slug: "ch-1" } as any,
    { id: "c2", elevatesId: "CHP-0002", name: "Ch 2", slug: "ch-2" } as any,
    { id: "c3", elevatesId: "CHP-0003", name: "Ch 3", slug: "ch-3" } as any,
  ];
  assert(getNextSequentialChapterElevatesId(existingChapters) === "CHP-0004", "Sequence 1..3 yields CHP-0004");
  
  const rollover999: Chapter[] = [
    { id: "c1", elevatesId: "CHP-0999", name: "Ch 999", slug: "ch-999" } as any,
  ];
  assert(getNextSequentialChapterElevatesId(rollover999) === "CHP-A000", "After CHP-0999 yields CHP-A000");

  const rolloverZ999: Chapter[] = [
    { id: "c1", elevatesId: "CHP-Z999", name: "Ch Z999", slug: "ch-z999" } as any,
  ];
  assert(getNextSequentialChapterElevatesId(rolloverZ999) === "CHP-AA00", "After CHP-Z999 yields CHP-AA00");

  // getChapterElevatesId does not hash or randomly guess
  assert(getChapterElevatesId({ id: "random-uuid-here" }) === "CHP-0001", "getChapterElevatesId defaults to CHP-0001, never hashes UUID");
  assert(getChapterElevatesId({ id: "random-uuid-here", elevatesId: "CHP-0042" }) === "CHP-0042", "getChapterElevatesId returns valid ID");

  // 5. ROUTING & RESOLUTION IN ACCESS.TS
  console.log("\n--- 5. Routing: URL Slug and Sequential ID Lookup ---");
  const mockChapters: Chapter[] = [
    {
      id: "ch-uuid-1",
      slug: "school-of-science",
      elevatesId: "CHP-0001",
      name: "School of Science",
      status: "active",
      organizationId: "org-1",
      college: "School of Science",
      city: "Campus A",
      healthScore: 100,
      memberCount: 10,
      eventCount: 2,
      projectCount: 1,
      foundedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "ch-uuid-2",
      slug: "institute-of-tech",
      elevatesId: "CHP-0002",
      name: "Institute of Technology",
      status: "active",
      organizationId: "org-1",
      college: "Institute of Technology",
      city: "Campus B",
      healthScore: 95,
      memberCount: 25,
      eventCount: 4,
      projectCount: 3,
      foundedAt: "2026-01-02T00:00:00.000Z",
    },
  ];

  const store = { chapters: mockChapters };

  // Lookup by slug
  const bySlug = resolveChapter(store, "school-of-science", "founder");
  assert(bySlug?.id === "ch-uuid-1", "resolveChapter finds chapter by URL slug");

  // Lookup by sequential ID (uppercase)
  const byIdUpper = resolveChapter(store, "CHP-0001", "founder");
  assert(byIdUpper?.id === "ch-uuid-1", "resolveChapter finds chapter by sequential ID (CHP-0001)");

  // Lookup by sequential ID (lowercase)
  const byIdLower = resolveChapter(store, "chp-0001", "founder");
  assert(byIdLower?.id === "ch-uuid-1", "resolveChapter finds chapter by lowercase sequential ID (chp-0001)");

  // Lookup by chapter UUID
  const byUuid = resolveChapter(store, "ch-uuid-1", "founder");
  assert(byUuid?.id === "ch-uuid-1", "resolveChapter finds chapter by UUID");

  // findChapterBySlugOrId helper
  assert(findChapterBySlugOrId(mockChapters, "CHP-0002")?.id === "ch-uuid-2", "findChapterBySlugOrId resolves CHP-0002");
  assert(findChapterBySlugOrId(mockChapters, "institute-of-tech")?.id === "ch-uuid-2", "findChapterBySlugOrId resolves institute-of-tech");

  // 6. TENANT BOUNDARY AND CANACCESSPATH ROUTING
  console.log("\n--- 6. Tenant Scoping & Path Access with Sequential IDs ---");
  // Student belonging to ch-uuid-1 (school-of-science, CHP-0001)
  const studentResolvedOwnBySlug = resolveChapter(store, "school-of-science", "student", "ch-uuid-1");
  assert(studentResolvedOwnBySlug?.id === "ch-uuid-1", "Student resolves own chapter by slug");

  const studentResolvedOwnById = resolveChapter(store, "CHP-0001", "student", "ch-uuid-1");
  assert(studentResolvedOwnById?.id === "ch-uuid-1", "Student resolves own chapter by sequential ID (CHP-0001)");

  const studentResolvedOther = resolveChapter(store, "CHP-0002", "student", "ch-uuid-1");
  assert(studentResolvedOther === undefined, "Student blocked from resolving other chapter by sequential ID (CHP-0002)");

  // canAccessPath for student with chapterSlug and chapterElevatesId
  assert(
    canAccessPath("/chapter/school-of-science/events", "student", "school-of-science", undefined, false, [], "CHP-0001"),
    "canAccessPath allows student to access /chapter/school-of-science/events",
  );
  assert(
    canAccessPath("/chapter/CHP-0001/events", "student", "school-of-science", undefined, false, [], "CHP-0001"),
    "canAccessPath allows student to access /chapter/CHP-0001/events via sequential ID",
  );
  assert(
    !canAccessPath("/chapter/CHP-0002/events", "student", "school-of-science", undefined, false, [], "CHP-0001"),
    "canAccessPath blocks student from accessing /chapter/CHP-0002/events",
  );
  assert(
    canAccessPath("/chapter/CHP-0002/events", "founder", "school-of-science", undefined, false, [], "CHP-0001"),
    "canAccessPath allows HQ Founder to access any chapter by sequential ID",
  );

  // 7. PROBLEM 2: MUTATION PAYLOAD & UPSERT RULES (NEW VS EXISTING CHAPTER)
  console.log("\n--- 7. Mutation Payload Rules for New vs Existing Chapters ---");
  function buildChapterMutationPayload(
    isNewChapter: boolean,
    existingElevatesId: string | null,
    clientData: { id: string; name: string; slug: string; elevatesId?: string },
  ) {
    let chapterElevatesId: string | undefined = undefined;
    if (!isNewChapter) {
      chapterElevatesId = existingElevatesId || (clientData.elevatesId ? String(clientData.elevatesId) : undefined);
    }
    const basePayload: Record<string, any> = {
      id: clientData.id,
      ...(chapterElevatesId ? { elevates_id: chapterElevatesId } : {}),
      name: clientData.name,
      slug: clientData.slug,
    };
    return basePayload;
  }

  // Case A: New chapter insert (no existing DB record)
  const newPayload = buildChapterMutationPayload(true, null, {
    id: "new-uuid-1",
    name: "New Campus",
    slug: "new-campus",
    elevatesId: "CHP-0099", // client tried to supply one, should be stripped!
  });
  assert(!("elevates_id" in newPayload), "New chapter payload strictly OMITS elevates_id so DB trigger fires nextval()");
  assert(newPayload.id === "new-uuid-1", "New chapter payload includes id");

  // Case B: Existing chapter update
  const editPayload = buildChapterMutationPayload(false, "CHP-0003", {
    id: "existing-uuid-3",
    name: "Existing Campus Edited",
    slug: "existing-campus",
  });
  assert("elevates_id" in editPayload, "Existing chapter payload strictly INCLUDES elevates_id");
  assert(editPayload.elevates_id === "CHP-0003", "Existing chapter payload preserves exact DB elevates_id (CHP-0003)");

  // Case C: Existing chapter update with legacy ID
  const editLegacyPayload = buildChapterMutationPayload(false, "CHP-0853", {
    id: "existing-uuid-legacy",
    name: "Existing Legacy Campus",
    slug: "legacy-campus",
  });
  assert(editLegacyPayload.elevates_id === "CHP-0853", "Existing legacy chapter preserves unchanged elevates_id (CHP-0853), preventing sequence burn");

  console.log("\n==================================================");
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
