const DEFAULT_VOLUNTEER_POWERS = {
  canTakeAttendance: true,
  canScanQr: true,
  canVerifyTickets: true,
  canRegisterWalkins: false,
  canManageTasks: false,
  canViewdirectory: true,
};

type VolunteerPowers = typeof DEFAULT_VOLUNTEER_POWERS;

interface EventItem {
  id: string;
  slug: string;
  title: string;
  chapterId: string;
  status: string;
  category: string;
  startsAt: string;
  endsAt: string;
}

interface VolunteerGroup {
  id: string;
  chapterId: string;
  name: string;
  description?: string;
  groupType: "listed" | "temp";
  isPreset?: boolean;
  eventId?: string;
  validFrom?: string;
  validTo?: string;
  powers: VolunteerPowers;
  memberIds: string[];
  customMemberPowers?: Record<string, Partial<VolunteerPowers>>;
  createdAt: string;
  updatedAt: string;
}

interface Profile {
  id: string;
  fullName: string;
  email: string;
  elevatesId?: string;
  chapterId?: string;
  department?: string;
  year?: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function runTests() {
  console.log("==================================================");
  console.log("  AUTO VOLUNTEER TEAM & SEARCH VERIFICATION TEST  ");
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

  // 1. Auto Volunteer Squad Generation
  console.log("--- 1. Auto Volunteer Squad Construction ---");
  const sampleEvent: EventItem = {
    id: "evt-hackathon-2026",
    slug: "hackathon-2026",
    title: "Hackathon 2026",
    chapterId: "ch-ekc",
    status: "registration_open",
    category: "HACKATHON",
    startsAt: "2026-10-01T09:00:00Z",
    endsAt: "2026-10-02T18:00:00Z",
  };

  const expectedGroupName = `${sampleEvent.title} Volunteers`;
  const autoVolGroup: VolunteerGroup = {
    id: "vol-grp-auto-1",
    chapterId: sampleEvent.chapterId,
    name: expectedGroupName,
    description: `Official volunteer squad for ${sampleEvent.title}`,
    groupType: "temp",
    eventId: sampleEvent.id,
    validFrom: sampleEvent.startsAt,
    validTo: sampleEvent.endsAt,
    powers: { ...DEFAULT_VOLUNTEER_POWERS },
    memberIds: [],
    customMemberPowers: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert(autoVolGroup.name === "Hackathon 2026 Volunteers", "Squad name matches event name + Volunteers");
  assert(autoVolGroup.groupType === "temp", "Squad type is temp event squad");
  assert(autoVolGroup.eventId === sampleEvent.id, "Squad is linked to event id");
  assert(autoVolGroup.powers.canTakeAttendance === true, "Squad has attendance authority by default");
  assert(autoVolGroup.powers.canScanQr === true, "Squad has QR scanner authority by default");
  assert(autoVolGroup.powers.canVerifyTickets === true, "Squad has ticket verification authority by default");

  // 2. Student Search Filter Testing
  console.log("\n--- 2. Team Student Member Add Search Filter ---");
  const testProfiles: Profile[] = [
    {
      id: "u-1",
      fullName: "Ananya Sharma",
      email: "ananya@ekc.edu",
      elevatesId: "ELV-EKC-0001",
      chapterId: "ch-ekc",
      department: "Computer Science",
      year: "3",
      role: "student",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "u-2",
      fullName: "Rahul Menon",
      email: "rahul.menon@ekc.edu",
      elevatesId: "ELV-EKC-0042",
      chapterId: "ch-ekc",
      department: "Electronics & Communication",
      year: "2",
      role: "student",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "u-3",
      fullName: "Devika Nair",
      email: "devika@ekc.edu",
      elevatesId: "ELV-EKC-0089",
      chapterId: "ch-ekc",
      department: "Mechanical Engineering",
      year: "4",
      role: "student",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  function filterStudents(list: Profile[], query: string): Profile[] {
    const q = query.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.elevatesId && s.elevatesId.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.year && s.year.toLowerCase().includes(q)),
    );
  }

  // Test search by name
  const byName = filterStudents(testProfiles, "ananya");
  assert(byName.length === 1 && byName[0].id === "u-1", "Search by partial student name matches correctly");

  // Test search by Elevates ID
  const byId = filterStudents(testProfiles, "0042");
  assert(byId.length === 1 && byId[0].id === "u-2", "Search by Elevates ID snippet matches correctly");

  // Test search by department
  const byDept = filterStudents(testProfiles, "Mechanical");
  assert(byDept.length === 1 && byDept[0].id === "u-3", "Search by department matches correctly");

  // Test search by academic year
  const byYear = filterStudents(testProfiles, "3");
  assert(byYear.length === 1 && byYear[0].id === "u-1", "Search by academic year matches correctly");

  // Test search with no match
  const noMatch = filterStudents(testProfiles, "NonExistentXYZ");
  assert(noMatch.length === 0, "Non-matching query returns empty array");

  // 3. Volunteer Presets: Creation and In-Modal Member Selection
  console.log("\n--- 3. Volunteer Presets: Creation and Member Selection ---");
  const volunteerPreset: VolunteerGroup = {
    id: "preset-core-leads",
    chapterId: "ch-ekc",
    name: "Core Tech Leads Preset",
    description: "Reusable student preset for high-impact campus tech events",
    groupType: "listed",
    isPreset: true,
    powers: { ...DEFAULT_VOLUNTEER_POWERS, canManageTasks: true },
    memberIds: ["u-1", "u-2"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert(volunteerPreset.isPreset === true, "Volunteer preset flagged with isPreset: true");
  assert(volunteerPreset.groupType === "listed", "Preset stored as listed group for database compatibility");
  assert(volunteerPreset.memberIds.length === 2, "Preset initialized with selected student members");
  assert(volunteerPreset.powers.canManageTasks === true, "Preset holds customized powers");

  // 4. Preset Editability (Modifying members and powers)
  console.log("\n--- 4. Preset Editability ---");
  const updatedPreset: VolunteerGroup = {
    ...volunteerPreset,
    name: "Core Tech & Stage Leads Preset",
    memberIds: [...volunteerPreset.memberIds, "u-3"], // Added Devika
    updatedAt: new Date().toISOString(),
  };

  assert(updatedPreset.name === "Core Tech & Stage Leads Preset", "Preset name successfully editable");
  assert(updatedPreset.memberIds.includes("u-3") && updatedPreset.memberIds.length === 3, "Preset members successfully updated");

  // 5. Direct Event Assignment (Inherit event dates, no prompt)
  console.log("\n--- 5. Direct Event Assignment Contract ---");
  interface VolunteerAssignment {
    id: string;
    chapterId: string;
    userId: string;
    eventId: string;
    groupId?: string;
    tag: string;
    powers: VolunteerPowers;
    validFrom: string;
    validTo: string;
  }

  function directAssignSquadToEvent(group: VolunteerGroup, event: EventItem): VolunteerAssignment[] {
    return group.memberIds.map((userId) => ({
      id: `assign-${group.id}-${userId}`,
      chapterId: event.chapterId,
      userId,
      eventId: event.id,
      groupId: group.id,
      tag: group.name,
      powers: group.powers,
      validFrom: event.startsAt, // directly inherit without prompt
      validTo: event.endsAt,     // directly inherit without prompt
    }));
  }

  const assignments = directAssignSquadToEvent(autoVolGroup, sampleEvent);
  assert(assignments.length === autoVolGroup.memberIds.length, "Squad directly assigned to its own event");

  // If autoVolGroup has members:
  autoVolGroup.memberIds = ["u-1", "u-2"];
  const populatedAssignments = directAssignSquadToEvent(autoVolGroup, sampleEvent);
  assert(populatedAssignments.length === 2, "All squad members directly assigned to event");
  assert(populatedAssignments[0].validFrom === sampleEvent.startsAt, "Assignment directly inherits event startsAt date");
  assert(populatedAssignments[0].validTo === sampleEvent.endsAt, "Assignment directly inherits event endsAt date");
  assert(populatedAssignments[0].eventId === sampleEvent.id, "Assignment directly inherits target event id");

  // 6. One-Click Preset Application to Event
  console.log("\n--- 6. One-Click Preset Application to Event ---");
  function applyPresetToEvent(preset: VolunteerGroup, event: EventItem): {
    assignedMembers: string[];
    assignments: VolunteerAssignment[];
  } {
    const assignments: VolunteerAssignment[] = preset.memberIds.map((userId) => ({
      id: `assign-preset-${preset.id}-${userId}`,
      chapterId: event.chapterId,
      userId,
      eventId: event.id,
      groupId: preset.id,
      tag: preset.name,
      powers: preset.powers,
      validFrom: event.startsAt,
      validTo: event.endsAt,
    }));
    return {
      assignedMembers: [...preset.memberIds],
      assignments,
    };
  }

  const presetResult = applyPresetToEvent(updatedPreset, sampleEvent);
  assert(presetResult.assignedMembers.length === 3, "Preset members mapped to event");
  assert(presetResult.assignments.every((a) => a.eventId === sampleEvent.id), "All preset assignments bound to target event");
  assert(presetResult.assignments.every((a) => a.validFrom === sampleEvent.startsAt), "Preset assignments inherit event startsAt date without prompting");

  console.log("\n==================================================");
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runTests();
