import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isHqRole, isSuperAdmin, isCampusLead, canCreateEvent } from "@/lib/permissions";
import { isExecutiveRole } from "@/lib/access";
import type { RoleKey } from "@/types";

export interface AuthenticatedUser {
  ok: true;
  userId: string;
  roleKey: RoleKey;
  chapterId: string | null;
  allowedChapterIds: string[];
  email: string | null;
  isHq: boolean;
  assignedKeys: RoleKey[];
  response?: undefined;
}

export interface AuthErrorResponse {
  ok: false;
  response: NextResponse;
  userId?: undefined;
  roleKey?: undefined;
  chapterId?: undefined;
  allowedChapterIds?: undefined;
  email?: undefined;
  isHq?: undefined;
  assignedKeys?: undefined;
}

export type RequireUserResult = AuthenticatedUser | AuthErrorResponse;

const ROLE_PRIORITY: RoleKey[] = [
  "alumni",
  "guest",
  "student",
  "media_team",
  "technical_team",
  "innovation_team",
  "faculty_coordinator",
  "class_representative",
  "media_lead",
  "technical_lead",
  "innovation_lead",
  "joint_secretary",
  "secretary",
  "vice_chairman",
  "chairman",
  "elevates_coordinator",
  "campus_lead",
  "industry_mentor",
  "hq_mentor",
  "hq_admin",
  "founder",
];

/**
 * Validates the Supabase session from request cookies, extracts the authenticated user,
 * and resolves their canonical profile ID, highest role key, and chapter ID.
 * Returns either an AuthenticatedUser object (with ok: true) or an AuthErrorResponse (with ok: false and a 401 response).
 */
export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await createServerClient();
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Authentication client unavailable" },
        { status: 401 },
      ),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Unauthorized: valid session required" },
        { status: 401 },
      ),
    };
  }

  const admin = createServiceClient();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Database service client unavailable" },
        { status: 500 },
      ),
    };
  }

  // 1. Resolve Profile
  const { data: profileById } = await admin
    .from("profiles")
    .select("id, email, chapter_id, designation, role")
    .eq("id", user.id)
    .maybeSingle();

  let matchedProfile = profileById;
  if (!matchedProfile && user.email) {
    const { data: profileByEmail } = await admin
      .from("profiles")
      .select("id, email, chapter_id, designation, role")
      .ilike("email", user.email.trim())
      .maybeSingle();
    matchedProfile = profileByEmail;
  }

  const effectiveUserId = matchedProfile?.id || user.id;

  // 2. Resolve User Roles from user_roles
  const { data: userRolesData } = await admin
    .from("user_roles")
    .select("id, role_key, role, role_id, chapter_id")
    .or(`user_id.eq.${effectiveUserId},user_id.eq.${user.id}`);

  const userRoles = userRolesData || [];

  // If role_id exists but role_key is missing, fetch from roles table
  const missingRoleIds = userRoles
    .filter((ur) => !ur.role_key && ur.role_id)
    .map((ur) => ur.role_id as string);

  const roleKeyMap: Record<string, RoleKey> = {};
  if (missingRoleIds.length > 0) {
    const { data: rolesList } = await admin
      .from("roles")
      .select("id, key")
      .in("id", missingRoleIds);
    if (rolesList) {
      for (const r of rolesList) {
        if (r.key) roleKeyMap[r.id] = r.key as RoleKey;
      }
    }
  }

  const assignedKeys: RoleKey[] = [];
  let resolvedChapterId: string | null = matchedProfile?.chapter_id || null;
  const allowedChapterIds: string[] = [];
  if (matchedProfile?.chapter_id) {
    allowedChapterIds.push(matchedProfile.chapter_id);
  }

  for (const ur of userRoles) {
    if (ur.chapter_id) {
      if (!allowedChapterIds.includes(ur.chapter_id)) {
        allowedChapterIds.push(ur.chapter_id);
      }
      if (!resolvedChapterId) {
        resolvedChapterId = ur.chapter_id;
      }
    }
    const raw = ur.role_key || ur.role || roleKeyMap[ur.role_id];
    if (raw) {
      const k = String(raw).toLowerCase().trim().replace(/[\s-]+/g, "_") as RoleKey;
      if (k && (k as string) !== "volunteer" && !assignedKeys.includes(k)) {
        assignedKeys.push(k);
      }
    }
  }

  // 3. Check Profile designation and role
  if (matchedProfile?.designation) {
    const d = matchedProfile.designation.toLowerCase().trim();
    if (d === "campus_lead" && !assignedKeys.includes("campus_lead")) {
      assignedKeys.push("campus_lead");
    } else if (d === "chairman" && !assignedKeys.includes("chairman")) {
      assignedKeys.push("chairman");
    } else if (d === "class_rep" && !assignedKeys.includes("class_representative")) {
      assignedKeys.push("class_representative");
    }
  }
  if (matchedProfile?.role) {
    const r = matchedProfile.role.toLowerCase().trim();
    if (r.includes("campus lead") && !assignedKeys.includes("campus_lead")) {
      assignedKeys.push("campus_lead");
    } else if (r.includes("chairman") && !assignedKeys.includes("chairman")) {
      assignedKeys.push("chairman");
    } else if (r.includes("class representative") && !assignedKeys.includes("class_representative")) {
      assignedKeys.push("class_representative");
    }
  }

  // 4. Check if user is appointed as campus_lead_id in chapters table
  try {
    const { data: leadChapters } = await admin
      .from("chapters")
      .select("id, campus_lead_id")
      .or(`campus_lead_id.eq.${effectiveUserId},campus_lead_id.eq.${user.id}`);

    if (leadChapters && leadChapters.length > 0) {
      for (const lc of leadChapters) {
        if (!allowedChapterIds.includes(lc.id)) {
          allowedChapterIds.push(lc.id);
        }
      }
      if (!assignedKeys.includes("campus_lead")) {
        assignedKeys.push("campus_lead");
      }
      if (!resolvedChapterId) {
        resolvedChapterId = leadChapters[0].id;
      }
    }
  } catch {}

  // 5. Check leadership_assignments
  try {
    const { data: leadAssignments } = await admin
      .from("leadership_assignments")
      .select("role_key, term_id")
      .or(`user_id.eq.${effectiveUserId},user_id.eq.${user.id}`);

    if (leadAssignments && leadAssignments.length > 0) {
      for (const la of leadAssignments) {
        if (la.role_key && la.role_key !== "volunteer") {
          const k = String(la.role_key).toLowerCase().trim().replace(/[\s-]+/g, "_") as RoleKey;
          if (!assignedKeys.includes(k)) {
            assignedKeys.push(k);
          }
        }
      }
    }
  } catch {}

  // 6. Check user metadata
  const metaRole = (user.user_metadata?.role_key || user.user_metadata?.role || user.user_metadata?.designation) as string | undefined;
  if (metaRole) {
    const k = metaRole.toLowerCase().trim().replace(/[\s-]+/g, "_") as RoleKey;
    if (k && k !== "volunteer" && !assignedKeys.includes(k)) {
      assignedKeys.push(k);
    }
  }

  // 7. Fallback matching using email / user ID heuristics if no explicit roles found
  if (assignedKeys.length === 0) {
    const emailLower = (matchedProfile?.email || user.email || "").toLowerCase();
    const idLower = effectiveUserId.toLowerCase();
    if (emailLower.includes("founder") || idLower.includes("founder")) {
      assignedKeys.push("founder");
    } else if (emailLower.includes("admin") || idLower.includes("admin")) {
      assignedKeys.push("hq_admin");
    } else if (emailLower.includes("chairman") || idLower.includes("chairman")) {
      assignedKeys.push("chairman");
    } else if (emailLower.includes("lead") || idLower.includes("lead")) {
      assignedKeys.push("campus_lead");
    } else if (emailLower.includes("faculty") || idLower.includes("faculty")) {
      assignedKeys.push("faculty_coordinator");
    } else if (emailLower.includes("cr") || idLower.includes("cr")) {
      assignedKeys.push("class_representative");
    } else {
      assignedKeys.push("student");
    }
  }

  // Enforce faculty coordinator / student exclusivity:
  // If faculty is assigned, student role is removed automatically and only faculty remains.
  // Non-faculty accounts default to student.
  if (assignedKeys.includes("faculty_coordinator")) {
    const sIdx = assignedKeys.indexOf("student");
    if (sIdx !== -1) {
      assignedKeys.splice(sIdx, 1);
    }
  } else if (!assignedKeys.includes("student")) {
    assignedKeys.push("student");
  }

  // Determine highest priority role key
  const topRoleKey = assignedKeys.reduce<RoleKey>((best, cur) => {
    const curIdx = ROLE_PRIORITY.indexOf(cur);
    const bestIdx = ROLE_PRIORITY.indexOf(best);
    return curIdx > bestIdx ? cur : best;
  }, assignedKeys[0] || "student");

  const isHq = isHqRole(topRoleKey) || assignedKeys.some((k) => isHqRole(k));

  return {
    ok: true,
    userId: effectiveUserId,
    roleKey: topRoleKey,
    chapterId: resolvedChapterId,
    allowedChapterIds,
    email: user.email || matchedProfile?.email || null,
    isHq,
    assignedKeys,
  };
}

/** Check if user is an HQ administrator */
export function isUserHq(auth: AuthenticatedUser): boolean {
  return auth.isHq || isHqRole(auth.roleKey);
}

/** Check if user has permission to manage a specific chapter */
export function canUserManageChapter(
  auth: AuthenticatedUser,
  targetChapterId: string | null | undefined,
): boolean {
  if (isUserHq(auth)) return true;
  if (!targetChapterId) return false;
  if (auth.chapterId !== targetChapterId) return false;
  return (
    isCampusLead(auth.roleKey) ||
    isExecutiveRole(auth.roleKey) ||
    isSuperAdmin(auth.roleKey) ||
    auth.assignedKeys.some((k) => isCampusLead(k) || isExecutiveRole(k) || isSuperAdmin(k))
  );
}

/** Check if user has permission to create or delete events */
export function canAuthUserCreateEvent(auth: AuthenticatedUser): boolean {
  return (
    auth.isHq ||
    canCreateEvent(auth.roleKey) ||
    auth.assignedKeys.some((k) => canCreateEvent(k))
  );
}

