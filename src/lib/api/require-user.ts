import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isHqRole, isSuperAdmin, isCampusLead } from "@/lib/permissions";
import { isExecutiveRole } from "@/lib/access";
import type { RoleKey } from "@/types";

export interface AuthenticatedUser {
  ok: true;
  userId: string;
  roleKey: RoleKey;
  chapterId: string | null;
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
  "faculty_coordinator",
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
    .select("id, email, chapter_id")
    .eq("id", user.id)
    .maybeSingle();

  let matchedProfile = profileById;
  if (!matchedProfile && user.email) {
    const { data: profileByEmail } = await admin
      .from("profiles")
      .select("id, email, chapter_id")
      .ilike("email", user.email.trim())
      .maybeSingle();
    matchedProfile = profileByEmail;
  }

  const effectiveUserId = matchedProfile?.id || user.id;

  // 2. Resolve User Roles
  const { data: userRolesData } = await admin
    .from("user_roles")
    .select("id, role_key, role_id, chapter_id")
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

  for (const ur of userRoles) {
    if (ur.chapter_id && !resolvedChapterId) {
      resolvedChapterId = ur.chapter_id;
    }
    const k = (ur.role_key as RoleKey) || roleKeyMap[ur.role_id];
    if (k && (k as string) !== "volunteer") {
      assignedKeys.push(k);
    }
  }

  // Fallback matching using email / user ID heuristics if no explicit roles found
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
  return isCampusLead(auth.roleKey) || isExecutiveRole(auth.roleKey) || isSuperAdmin(auth.roleKey);
}
