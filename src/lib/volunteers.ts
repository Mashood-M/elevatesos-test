import type {
  ElevatesStore,
  RoleKey,
  VolunteerAssignment,
  VolunteerGroup,
  VolunteerPowers,
} from "@/types";
import { isCampusLead, isHqRole } from "@/lib/permissions";

export const DEFAULT_VOLUNTEER_POWERS: VolunteerPowers = {
  canTakeAttendance: true,
  canScanQr: true,
  canVerifyTickets: true,
  canRegisterWalkins: false,
  canManageTasks: false,
  canViewdirectory: true,
};

export interface PowerDefinition {
  key: keyof VolunteerPowers;
  label: string;
  description: string;
  badge: string;
  category: "attendance" | "operations" | "access";
}

export const VOLUNTEER_POWER_DEFINITIONS: PowerDefinition[] = [
  {
    key: "canTakeAttendance",
    label: "Attendance & Check-in",
    description: "Can record and verify attendance (mark present/absent) for assigned events",
    badge: "Attendance",
    category: "attendance",
  },
  {
    key: "canScanQr",
    label: "Camera QR Scanner",
    description: "Can open and operate the high-speed QR camera scanner at event check-in",
    badge: "QR Scanner",
    category: "attendance",
  },
  {
    key: "canVerifyTickets",
    label: "Verify Tickets & Passes",
    description: "Can inspect student registration tickets, Elevates IDs, and entry validity",
    badge: "Tickets",
    category: "access",
  },
  {
    key: "canRegisterWalkins",
    label: "On-Spot Walk-in Registrations",
    description: "Can register unregistered walk-in attendees directly at the venue entrance",
    badge: "Walk-ins",
    category: "operations",
  },
  {
    key: "canManageTasks",
    label: "Event Tasks & Checklists",
    description: "Can view and check off operational event tasks and team checklists",
    badge: "Tasks",
    category: "operations",
  },
  {
    key: "canViewdirectory",
    label: "View Attendee directory",
    description: "Can search and view attendee directory list, department info, and contact details",
    badge: "directory",
    category: "access",
  },
];

export interface VolunteerPowerPreset {
  id: string;
  name: string;
  description: string;
  powers: VolunteerPowers;
}

export const VOLUNTEER_POWER_PRESETS: VolunteerPowerPreset[] = [
  {
    id: "checkin_desk",
    name: "Check-in Desk",
    description: "Scan QR codes, mark attendance, verify tickets, and view directory",
    powers: {
      canTakeAttendance: true,
      canScanQr: true,
      canVerifyTickets: true,
      canRegisterWalkins: false,
      canManageTasks: false,
      canViewdirectory: true,
    },
  },
  {
    id: "lead_desk",
    name: "Registration Lead",
    description: "Check-in Desk powers + permission to register on-spot walk-ins",
    powers: {
      canTakeAttendance: true,
      canScanQr: true,
      canVerifyTickets: true,
      canRegisterWalkins: true,
      canManageTasks: false,
      canViewdirectory: true,
    },
  },
  {
    id: "logistics",
    name: "Logistics & Tasks",
    description: "Manage event operational checklist, verify tickets, and view directory",
    powers: {
      canTakeAttendance: false,
      canScanQr: false,
      canVerifyTickets: true,
      canRegisterWalkins: false,
      canManageTasks: true,
      canViewdirectory: true,
    },
  },
  {
    id: "full_staff",
    name: "Full Event Staff",
    description: "All volunteer powers enabled (like Campus Lead for the event)",
    powers: {
      canTakeAttendance: true,
      canScanQr: true,
      canVerifyTickets: true,
      canRegisterWalkins: true,
      canManageTasks: true,
      canViewdirectory: true,
    },
  },
];

/** Check if a date string is within valid range */
export function isWithinValidityPeriod(
  validFrom?: string,
  validTo?: string,
  targetDate = new Date(),
): boolean {
  const targetMs = targetDate.getTime();
  if (validFrom) {
    const fromMs = new Date(validFrom).getTime();
    if (!Number.isNaN(fromMs) && targetMs < fromMs) return false;
  }
  if (validTo) {
    const toMs = new Date(validTo).getTime();
    if (!Number.isNaN(toMs) && targetMs > toMs) return false;
  }
  return true;
}

export interface UserVolunteerPowersResult {
  isVolunteer: boolean;
  powers: VolunteerPowers;
  activeGroups: VolunteerGroup[];
  activeAssignments: VolunteerAssignment[];
  activeTags: string[];
  effectiveTag: string;
}

/**
 * Resolves effective volunteer powers for a user, optionally scoped to a particular event.
 * If user is a Campus Lead, Chairman, or HQ role, all powers are granted.
 * Otherwise, checks active volunteer assignments and volunteer groups.
 */
export function getUserVolunteerPowers(
  store: ElevatesStore,
  userId: string,
  eventId?: string,
  targetDate = new Date(),
): UserVolunteerPowersResult {
  const emptyPowers: VolunteerPowers = {
    canTakeAttendance: false,
    canScanQr: false,
    canVerifyTickets: false,
    canRegisterWalkins: false,
    canManageTasks: false,
    canViewdirectory: false,
  };

  const fullPowers: VolunteerPowers = {
    canTakeAttendance: true,
    canScanQr: true,
    canVerifyTickets: true,
    canRegisterWalkins: true,
    canManageTasks: true,
    canViewdirectory: true,
  };

  if (!userId) {
    return {
      isVolunteer: false,
      powers: emptyPowers,
      activeGroups: [],
      activeAssignments: [],
      activeTags: [],
      effectiveTag: "",
    };
  }

  // Campus Lead, Chairman, or HQ have full native powers
  const userRoles = store.userRoles.filter((ur) => ur.userId === userId);
  const isLead = userRoles.some(
    (ur) =>
      ur.roleKey === "campus_lead" ||
      ur.roleKey === "chairman" ||
      isHqRole(ur.roleKey as RoleKey),
  );

  if (isLead) {
    return {
      isVolunteer: true,
      powers: fullPowers,
      activeGroups: [],
      activeAssignments: [],
      activeTags: ["Lead"],
      effectiveTag: "Campus Lead",
    };
  }

  const volunteerGroups = store.volunteerGroups || [];
  const volunteerAssignments = store.volunteerAssignments || [];

  // 1. Find matching volunteer groups
  const activeGroups = volunteerGroups.filter((g) => {
    if (!g.memberIds.includes(userId)) return false;
    // Check event scoping: if eventId is provided, the group must be explicitly assigned to this event
    if (eventId) {
      if (!g.eventId || g.eventId !== eventId) return false;
    }
    // Check date validity
    return isWithinValidityPeriod(g.validFrom, g.validTo, targetDate);
  });

  // 2. Find matching direct volunteer assignments
  const activeAssignments = volunteerAssignments.filter((a) => {
    if (a.userId !== userId) return false;
    if (a.status === "inactive" || a.status === "expired") return false;
    // Check event scoping: if eventId is provided, direct assignment must match
    if (eventId) {
      if (!a.eventId || a.eventId !== eventId) return false;
    }
    // Check date validity
    return isWithinValidityPeriod(a.validFrom, a.validTo, targetDate);
  });

  // Check event-level volunteerStudentIds
  const isEventVolStudent = eventId
    ? Boolean(store.events.find((e) => e.id === eventId)?.volunteerStudentIds?.includes(userId))
    : false;

  // Check legacy leadership assignments for fallback compatibility only if no eventId specified
  const legacyVolAssignment = !eventId
    ? store.leadershipAssignments.find((la) => la.userId === userId && la.roleKey === "volunteer")
    : undefined;

  const isVolunteer =
    activeGroups.length > 0 ||
    activeAssignments.length > 0 ||
    Boolean(legacyVolAssignment) ||
    isEventVolStudent;

  if (!isVolunteer) {
    return {
      isVolunteer: false,
      powers: emptyPowers,
      activeGroups: [],
      activeAssignments: [],
      activeTags: [],
      effectiveTag: "",
    };
  }

  // Merge powers starting with empty
  const resolvedPowers: VolunteerPowers = { ...emptyPowers };

  // Fallback defaults for legacy or eventStudentIds volunteers
  if (legacyVolAssignment || isEventVolStudent) {
    resolvedPowers.canTakeAttendance = true;
    resolvedPowers.canScanQr = true;
    resolvedPowers.canVerifyTickets = true;
    resolvedPowers.canViewdirectory = true;
  }

  // Merge from groups
  for (const group of activeGroups) {
    const groupPowers = group.powers || DEFAULT_VOLUNTEER_POWERS;
    const memberOverride = group.customMemberPowers?.[userId];

    for (const key of Object.keys(DEFAULT_VOLUNTEER_POWERS) as Array<keyof VolunteerPowers>) {
      if (memberOverride && memberOverride[key] !== undefined) {
        if (memberOverride[key]) resolvedPowers[key] = true;
      } else if (groupPowers[key]) {
        resolvedPowers[key] = true;
      }
    }
  }

  // Merge from direct assignments
  for (const assignment of activeAssignments) {
    const aPowers = assignment.powers || DEFAULT_VOLUNTEER_POWERS;
    for (const key of Object.keys(DEFAULT_VOLUNTEER_POWERS) as Array<keyof VolunteerPowers>) {
      if (aPowers[key]) resolvedPowers[key] = true;
    }
  }

  // Collect tags
  const tags = new Set<string>();
  for (const g of activeGroups) {
    tags.add(g.name);
  }
  for (const a of activeAssignments) {
    if (a.tag) tags.add(a.tag);
  }
  if (tags.size === 0) tags.add("Volunteer");

  const tagList = Array.from(tags);
  const effectiveTag = tagList[0] || "Volunteer";

  return {
    isVolunteer: true,
    powers: resolvedPowers,
    activeGroups,
    activeAssignments,
    activeTags: tagList,
    effectiveTag,
  };
}
