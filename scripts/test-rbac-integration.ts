import { canAccessPath, homeForRole, resolveChapter } from "../src/lib/access";
import { isHqRole, isSuperAdmin, isCampusLead } from "../src/lib/permissions";
import { roleKeyLabel, ASSIGNABLE_LEADERSHIP_ROLES } from "../src/lib/leadership";
import type { ElevatesStore, RoleKey } from "../src/types";

async function runTests() {
  console.log("==================================================");
  console.log("  ELEVATES OS: ROLE-BASED AUTH & SCOPING TEST SUITE ");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(` ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${description}`);
      failed++;
    }
  }

  // 1. ROLE IDENTIFICATION & LABELS
  console.log("--- 1. Role Identification & Labels ---");
  assert(isHqRole("founder"), "founder is recognized as HQ role");
  assert(isHqRole("hq_admin"), "hq_admin is recognized as HQ role");
  assert(!isHqRole("campus_lead"), "campus_lead is NOT recognized as HQ role");
  assert(!isHqRole("student"), "student is NOT recognized as HQ role");
  assert(isCampusLead("campus_lead"), "campus_lead is recognized by isCampusLead");
  assert(ASSIGNABLE_LEADERSHIP_ROLES.includes("campus_lead"), "campus_lead is assignable leadership role");
  assert(roleKeyLabel("campus_lead") !== "campus_lead", "campus_lead has proper label");

  // 2. DASHBOARD REDIRECT & NAVIGATION ROUTING
  console.log("\n--- 2. Dashboard Redirect & Navigation Scoping ---");
  assert(homeForRole("founder") === "/hq", "HQ founder home is /hq");
  assert(homeForRole("hq_admin") === "/hq", "HQ admin home is /hq");
  assert(homeForRole("campus_lead", "ekc-chapter") === "/chapter/ekc-chapter", "Campus Lead home is scoped chapter dashboard");
  assert(homeForRole("chairman", "ekc-chapter") === "/chapter/ekc-chapter", "Chairman home is scoped chapter dashboard");
  assert(homeForRole("class_representative", "ekc-chapter") === "/chapter/ekc-chapter", "Class Rep home is scoped chapter dashboard");
  assert(homeForRole("student", "ekc-chapter") === "/chapter/ekc-chapter", "Student home is scoped chapter dashboard");

  // 3. CROSS-CHAPTER ACCESS PROTECTION
  console.log("\n--- 3. Cross-Chapter Access & Path Guards ---");
  // Non-HQ role visiting another chapter's page
  assert(!canAccessPath("/chapter/other-chapter", "student", "ekc-chapter"), "Student from EKC blocked from visiting other chapter");
  assert(!canAccessPath("/chapter/other-chapter/students", "campus_lead", "ekc-chapter"), "Campus Lead from EKC blocked from visiting other chapter students");
  assert(!canAccessPath("/hq", "campus_lead", "ekc-chapter"), "Campus Lead blocked from accessing HQ routes");
  assert(!canAccessPath("/hq/chapters", "class_representative", "ekc-chapter"), "Class Rep blocked from accessing HQ chapters");
  assert(canAccessPath("/chapter/ekc-chapter/events", "student", "ekc-chapter"), "Student can access own chapter events");
  assert(canAccessPath("/chapter/ekc-chapter/students", "campus_lead", "ekc-chapter"), "Campus Lead can access own chapter students");
  assert(canAccessPath("/chapter/other-chapter/students", "founder", "ekc-chapter"), "HQ Founder can access any chapter page");

  // 4. MOCK CHAPTER RESOLUTION SCOPING
  console.log("\n--- 4. Data Scoping Resolution ---");
  const mockStore = {
    chapters: [
      { id: "ch-1", slug: "ekc-chapter", name: "EKC Chapter", status: "active" },
      { id: "ch-2", slug: "mes-chapter", name: "MES Chapter", status: "active" },
    ],
  };

  const ekcResolvedForStudent = resolveChapter(mockStore as any, "mes-chapter", "student", "ch-1");
  assert(ekcResolvedForStudent === undefined, "Student assigned to EKC cannot resolve MES Chapter data");

  const ekcResolvedForHQ = resolveChapter(mockStore as any, "mes-chapter", "founder", "ch-1");
  assert(ekcResolvedForHQ?.id === "ch-2", "HQ user can resolve any active Chapter data");

  // SUMMARY
  console.log("\n==================================================");
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
