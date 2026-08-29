import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const admin = createServiceClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Supabase service client unavailable" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { actingUserId, targetUser } = body;

    if (!targetUser || !targetUser.email || !targetUser.roleKey || !targetUser.chapterId) {
      return NextResponse.json(
        { ok: false, error: "Missing mandatory user fields (email, roleKey, chapterId)" },
        { status: 400 },
      );
    }

    // 1. Resolve acting user role & chapter
    let actingRoles: any[] = [];
    if (actingUserId) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role_key, chapter_id")
        .eq("user_id", actingUserId);
      actingRoles = roles || [];
    }

    const isHq = actingRoles.some((r) =>
      ["founder", "hq_admin"].includes(r.role_key),
    );
    const actingChapterIds = actingRoles.map((r) => r.chapter_id);
    const isActingChapterAdmin =
      isHq ||
      actingRoles.some(
        (r) =>
          r.chapter_id === targetUser.chapterId &&
          ["campus_lead", "chairman"].includes(r.role_key),
      );
    const isActingClassRep =
      isActingChapterAdmin ||
      actingRoles.some(
        (r) =>
          r.chapter_id === targetUser.chapterId &&
          r.role_key === "class_representative",
      );

    // 2. Hierarchy Enforcement
    const requestedRole = targetUser.roleKey;

    if (requestedRole === "campus_lead" && !isHq) {
      return NextResponse.json(
        {
          ok: false,
          error: "Permission denied: Only HQ / HQ Admin can provision a Campus Lead.",
        },
        { status: 403 },
      );
    }

    if (requestedRole === "class_representative" && !isActingChapterAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Permission denied: Only Campus Lead or HQ can provision Class Representatives.",
        },
        { status: 403 },
      );
    }

    if (requestedRole === "student" && !isActingClassRep && !isHq) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Permission denied: Only Class Representatives, Campus Leads, or HQ can add Students.",
        },
        { status: 403 },
      );
    }

    // 3. Upsert Profile
    const skillsArr = Array.isArray(targetUser.skills)
      ? targetUser.skills
      : (targetUser.skills || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);

    const interestsArr = Array.isArray(targetUser.interests)
      ? targetUser.interests
      : (targetUser.interests || "")
          .split(",")
          .map((i: string) => i.trim())
          .filter(Boolean);

    // Check if profile exists by email
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", targetUser.email.trim().toLowerCase())
      .maybeSingle();

    const userId = existingProfile?.id || genRandomUuid();

    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      email: targetUser.email.trim().toLowerCase(),
      full_name: targetUser.fullName || targetUser.name || "Student User",
      phone: targetUser.phone || null,
      department: targetUser.department || "Computer Science",
      year: targetUser.year || "1st Year",
      section: targetUser.section || "A",
      chapter_id: targetUser.chapterId,
      skills: skillsArr,
      interests: interestsArr,
      status: "active",
    });

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 400 },
      );
    }

    // 4. Resolve role_id from roles table
    const { data: roleRow } = await admin
      .from("roles")
      .select("id")
      .eq("key", requestedRole)
      .maybeSingle();

    // 5. Upsert user_roles
    const { error: roleError } = await admin.from("user_roles").upsert(
      {
        user_id: userId,
        role_key: requestedRole,
        role_id: roleRow?.id ?? null,
        chapter_id: targetUser.chapterId,
        organization_id: "00000000-0000-0000-0000-000000000001",
        is_permanent: true,
      },
      { onConflict: "user_id,role_key,chapter_id" },
    );

    if (roleError) {
      console.warn("user_roles upsert notice:", roleError.message);
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email: targetUser.email,
        fullName: targetUser.fullName,
        roleKey: requestedRole,
        chapterId: targetUser.chapterId,
      },
    });
  } catch (err: any) {
    console.error("Provisioning user error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

function genRandomUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
