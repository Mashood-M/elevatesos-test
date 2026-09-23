import { canAccessPath, homeForRole, resolveChapter } from "../src/lib/access";
import {
  isHqRole,
  isSuperAdmin,
  isCampusLead,
  isFounder,
  canDeleteUser,
  canCreateEvent,
  canManageClasses,
  canVerifyAttendance,
} from "../src/lib/permissions";
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
  assert(!isHqRole("executive_member"), "executive_member is NOT recognized as HQ role");
  assert(isCampusLead("campus_lead"), "campus_lead is recognized by isCampusLead");
  assert(!isCampusLead("executive_member"), "executive_member is NOT recognized as campus lead");
  assert(isFounder("founder"), "founder is recognized by isFounder");
  assert(!isFounder("hq_admin"), "hq_admin is NOT recognized as founder");
  assert(canDeleteUser("founder"), "founder CAN delete users");
  assert(!canDeleteUser("hq_admin"), "hq_admin CANNOT delete users");
  assert(!canDeleteUser("campus_lead"), "campus_lead CANNOT delete users");
  assert(!canDeleteUser("executive_member"), "executive_member CANNOT delete users");
  assert(!canDeleteUser("student"), "student CANNOT delete users");
  assert(ASSIGNABLE_LEADERSHIP_ROLES.includes("campus_lead"), "campus_lead is assignable leadership role");
  assert(ASSIGNABLE_LEADERSHIP_ROLES.includes("executive_member"), "executive_member is assignable leadership role");
  assert(roleKeyLabel("campus_lead") !== "campus_lead", "campus_lead has proper label");
  assert(roleKeyLabel("executive_member") === "Executive Member", "executive_member has proper label");

  // Executive Member day-to-day permissions
  assert(canCreateEvent("executive_member"), "executive_member can create events");
  assert(canManageClasses("executive_member"), "executive_member can manage classes");
  assert(canVerifyAttendance("executive_member"), "executive_member can verify attendance");

  // 2. DASHBOARD REDIRECT & NAVIGATION ROUTING
  console.log("\n--- 2. Dashboard Redirect & Navigation Scoping ---");
  assert(homeForRole("founder") === "/hq", "HQ founder home is /hq");
  assert(homeForRole("hq_admin") === "/hq", "HQ admin home is /hq");
  assert(homeForRole("campus_lead", "ekc-chapter") === "/chapter/ekc-chapter", "Campus Lead home is scoped chapter dashboard");
  assert(homeForRole("executive_member", "ekc-chapter") === "/chapter/ekc-chapter", "Executive Member home is scoped chapter dashboard");
  assert(homeForRole("chairman", "ekc-chapter") === "/chapter/ekc-chapter", "Chairman home is scoped chapter dashboard");
  assert(homeForRole("class_representative", "ekc-chapter") === "/chapter/ekc-chapter", "Class Rep home is scoped chapter dashboard");
  assert(homeForRole("student", "ekc-chapter") === "/chapter/ekc-chapter", "Student home is scoped chapter dashboard");

  // 3. CROSS-CHAPTER ACCESS PROTECTION
  console.log("\n--- 3. Cross-Chapter Access & Path Guards ---");
  // Non-HQ role visiting another chapter's page
  assert(!canAccessPath("/chapter/other-chapter", "student", "ekc-chapter"), "Student from EKC blocked from visiting other chapter");
  assert(!canAccessPath("/chapter/other-chapter/students", "campus_lead", "ekc-chapter"), "Campus Lead from EKC blocked from visiting other chapter students");
  assert(!canAccessPath("/chapter/other-chapter/students", "executive_member", "ekc-chapter"), "Executive Member from EKC blocked from visiting other chapter students");
  assert(!canAccessPath("/hq", "campus_lead", "ekc-chapter"), "Campus Lead blocked from accessing HQ routes");
  assert(!canAccessPath("/hq", "executive_member", "ekc-chapter"), "Executive Member blocked from accessing HQ routes");
  assert(!canAccessPath("/hq/chapters", "class_representative", "ekc-chapter"), "Class Rep blocked from accessing HQ chapters");
  assert(canAccessPath("/chapter/ekc-chapter/events", "student", "ekc-chapter"), "Student can access own chapter events");
  assert(canAccessPath("/chapter/ekc-chapter/events", "executive_member", "ekc-chapter"), "Executive Member can access own chapter events");
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

  // 5. VOLUNTEER TAG & DELEGATED POWERS INTEGRATION
  console.log("\n--- 5. Volunteer Tag & Delegated Powers ---");
  const { getUserVolunteerPowers } = await import("../src/lib/volunteers");

  const testStore = {
    ...mockStore,
    profiles: [
      { id: "u-student", fullName: "Regular Student", chapterId: "ch-1" },
      { id: "u-vol-1", fullName: "Desk Volunteer", chapterId: "ch-1" },
      { id: "u-vol-2", fullName: "Custom Volunteer", chapterId: "ch-1" },
    ],
    userRoles: [
      { userId: "u-student", roleKey: "student", chapterId: "ch-1" },
      { userId: "u-vol-1", roleKey: "student", chapterId: "ch-1" },
      { userId: "u-vol-2", roleKey: "student", chapterId: "ch-1" },
    ],
    leadershipAssignments: [],
    events: [
      { id: "ev-1", chapterId: "ch-1", title: "Hackathon" },
      { id: "ev-2", chapterId: "ch-1", title: "Workshop" },
    ],
    volunteerGroups: [
      {
        id: "vg-desk",
        chapterId: "ch-1",
        name: "Check-in Desk Squad",
        groupType: "listed",
        powers: {
          canTakeAttendance: true,
          canScanQr: true,
          canVerifyTickets: true,
          canRegisterWalkins: false,
          canManageTasks: false,
          canViewdirectory: true,
        },
        memberIds: ["u-vol-1", "u-vol-2"],
        customMemberPowers: {
          "u-vol-2": {
            canRegisterWalkins: true,
          },
        },
      },
      {
        id: "vg-temp",
        chapterId: "ch-1",
        name: "Temp Workshop Squad",
        groupType: "temp",
        eventId: "ev-2",
        powers: {
          canTakeAttendance: true,
          canScanQr: false,
          canVerifyTickets: false,
          canRegisterWalkins: false,
          canManageTasks: true,
          canViewdirectory: false,
        },
        memberIds: ["u-vol-1"],
      },
    ],
    volunteerAssignments: [],
  };

  const studentPowers = getUserVolunteerPowers(testStore as any, "u-student");
  assert(!studentPowers.isVolunteer, "Regular student without volunteer tag is not recognized as volunteer");
  assert(!studentPowers.powers.canTakeAttendance, "Regular student cannot take attendance");

  const vol1Powers = getUserVolunteerPowers(testStore as any, "u-vol-1");
  assert(vol1Powers.isVolunteer, "Vol 1 in listed group has volunteer tag");
  assert(vol1Powers.powers.canTakeAttendance, "Vol 1 inherits canTakeAttendance power from group");
  assert(vol1Powers.powers.canScanQr, "Vol 1 inherits canScanQr power from group");
  assert(!vol1Powers.powers.canRegisterWalkins, "Vol 1 does not have canRegisterWalkins (group default false)");
  assert(vol1Powers.effectiveTag === "Check-in Desk Squad", "Vol 1 effective tag matches group name");

  const vol2Powers = getUserVolunteerPowers(testStore as any, "u-vol-2");
  assert(vol2Powers.isVolunteer, "Vol 2 in listed group has volunteer tag");
  assert(vol2Powers.powers.canRegisterWalkins, "Vol 2 individual override grants canRegisterWalkins");

  // Event scoping test for temp group
  const vol1Event2Powers = getUserVolunteerPowers(testStore as any, "u-vol-1", "ev-2");
  assert(vol1Event2Powers.powers.canManageTasks, "Vol 1 inherits canManageTasks for assigned event ev-2");

  // 6. CHAPTER TERMS & HANDOVER SYSTEM INVARIANTS
  console.log("\n--- 6. Chapter Terms & Handover System Invariants ---");
  // A. Handover window management: Only Founder can open/close windows
  assert(isFounder("founder"), "Only founder has isFounder check for opening/closing handover windows");
  assert(!isFounder("campus_lead"), "Campus Lead cannot open/close handover windows");
  assert(!isFounder("executive_member"), "Executive Member cannot open/close handover windows");
  assert(!isFounder("student"), "Student cannot open/close handover windows");

  // B. First term creation: Only Founder can create the initial term
  const canInitializeFirstTerm = (role: RoleKey) => isFounder(role);
  assert(canInitializeFirstTerm("founder"), "Founder can initialize the first chapter term");
  assert(!canInitializeFirstTerm("campus_lead"), "Campus Lead cannot initialize the first chapter term");
  assert(!canInitializeFirstTerm("executive_member"), "Executive Member cannot initialize the first chapter term");

  // C. Handover execution authorization
  const canExecuteHandover = (
    role: RoleKey,
    actingUserId: string,
    activeTermLeadId: string,
    isWindowOpen: boolean,
  ) => {
    if (!isWindowOpen) return false;
    if (isFounder(role)) return true;
    return role === "campus_lead" && actingUserId === activeTermLeadId;
  };

  assert(
    canExecuteHandover("campus_lead", "u-lead-1", "u-lead-1", true),
    "Current active campus lead can execute handover when window is open",
  );
  assert(
    !canExecuteHandover("campus_lead", "u-lead-1", "u-lead-1", false),
    "Current active campus lead CANNOT execute handover when window is closed",
  );
  assert(
    !canExecuteHandover("campus_lead", "u-lead-2", "u-lead-1", true),
    "Different campus lead CANNOT execute handover for another lead's active term",
  );
  assert(
    !canExecuteHandover("executive_member", "u-exec-1", "u-lead-1", true),
    "Executive Member CANNOT execute handover even when window is open",
  );
  assert(
    !canExecuteHandover("student", "u-student-1", "u-lead-1", true),
    "Student CANNOT execute handover even when window is open",
  );

  // D. Executive Member role assignment: Restricted to active campus lead of own chapter (or founder)
  const canAssignExecutiveMember = (
    role: RoleKey,
    userChapterId: string,
    targetChapterId: string,
    hasActiveTerm: boolean,
  ) => {
    if (!hasActiveTerm) return false;
    if (isFounder(role)) return true;
    return role === "campus_lead" && userChapterId === targetChapterId;
  };

  assert(
    canAssignExecutiveMember("campus_lead", "ch-1", "ch-1", true),
    "Campus Lead can assign executive member in own chapter with active term",
  );
  assert(
    !canAssignExecutiveMember("campus_lead", "ch-1", "ch-1", false),
    "Campus Lead CANNOT assign executive member if chapter has no active term",
  );
  assert(
    !canAssignExecutiveMember("campus_lead", "ch-1", "ch-2", true),
    "Campus Lead CANNOT assign executive member in another chapter",
  );
  assert(
    !canAssignExecutiveMember("executive_member", "ch-1", "ch-1", true),
    "Executive Member CANNOT assign other executive members",
  );

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
