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

    const userId = existingProfile?.id || targetUser.id || genRandomUuid();

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

export async function DELETE(req: Request) {
  try {
    const admin = createServiceClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Supabase service client unavailable" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    let actingUserId = searchParams.get("actingUserId");

    if (!id) {
      try {
        const body = await req.json();
        id = body.id || body.userId || body.targetUserId;
        if (!actingUserId) actingUserId = body.actingUserId;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing target user ID" },
        { status: 400 },
      );
    }

    // 1. Authorization check if actingUserId is provided
    if (actingUserId && actingUserId !== id) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role_key, chapter_id")
        .eq("user_id", actingUserId);

      const actingRoles = roles || [];
      const isHq = actingRoles.some((r) =>
        ["founder", "hq_admin"].includes(r.role_key),
      );

      if (!isHq) {
        const { data: targetProf } = await admin
          .from("profiles")
          .select("chapter_id")
          .eq("id", id)
          .maybeSingle();

        const isChapterAdmin =
          targetProf?.chapter_id &&
          actingRoles.some(
            (r) =>
              r.chapter_id === targetProf.chapter_id &&
              ["campus_lead", "chairman"].includes(r.role_key),
          );

        if (!isChapterAdmin) {
          return NextResponse.json(
            {
              ok: false,
              error: "Permission denied: Only HQ Admins or Chapter Leads can delete users.",
            },
            { status: 403 },
          );
        }
      }
    }

    // 2. Clear / Nullify foreign key references that might restrict deletion
    await Promise.allSettled([
      admin.from("chapters").update({ faculty_id: null }).eq("faculty_id", id),
      admin.from("events").update({ organizer_id: null }).eq("organizer_id", id),
      admin.from("events").update({ faculty_id: null }).eq("faculty_id", id),
      admin.from("projects").update({ leader_id: null }).eq("leader_id", id),
      admin.from("projects").update({ faculty_id: null }).eq("faculty_id", id),
      admin.from("class_cohorts").update({ representative_id: null }).eq("representative_id", id),
      admin.from("guidelines").update({ author_id: null }).eq("author_id", id),
      admin.from("announcements").update({ author_id: null }).eq("author_id", id),
      admin.from("reports").update({ submitted_by: null }).eq("submitted_by", id),
      admin.from("reports").update({ approved_by: null }).eq("approved_by", id),
      admin.from("tasks").update({ assignee_id: null }).eq("assignee_id", id),
      admin.from("resources").update({ uploaded_by: null }).eq("uploaded_by", id),
      admin.from("resources").update({ updated_by: null }).eq("updated_by", id),
      admin.from("leadership_terms").update({ user_id: null }).eq("user_id", id),
      admin.from("leadership_nominations").update({ nominated_by: null }).eq("nominated_by", id),
      admin.from("invite_tokens").update({ used_by: null }).eq("used_by", id),
      admin.from("attendance").update({ checked_in_by: null }).eq("checked_in_by", id),
      admin.from("attendance_records").update({ checked_in_by: null }).eq("checked_in_by", id),
    ]);

    // 3. Delete dependent rows explicitly
    await Promise.allSettled([
      admin.from("user_roles").delete().eq("user_id", id),
      admin.from("event_registrations").delete().eq("user_id", id),
      admin.from("attendance").delete().eq("user_id", id),
      admin.from("attendance_records").delete().eq("user_id", id),
      admin.from("certificates").delete().eq("user_id", id),
      admin.from("student_academics").delete().eq("user_id", id),
      admin.from("student_points").delete().eq("user_id", id),
      admin.from("leadership_nominations").delete().eq("user_id", id),
      admin.from("leadership_applications").delete().eq("user_id", id),
      admin.from("support_tickets").delete().eq("user_id", id),
      admin.from("form_responses").delete().eq("user_id", id),
      admin.from("notifications").delete().eq("user_id", id),
      admin.from("activity_logs").delete().eq("actor_id", id),
      admin.from("invite_tokens").delete().eq("created_by", id),
    ]);

    // 4. Delete profile row
    const { error: profileError } = await admin
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      console.error("Error deleting profile from Supabase:", profileError);
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 400 },
      );
    }

    // 5. Delete Supabase Auth user if exists
    try {
      await admin.auth.admin.deleteUser(id);
    } catch (authErr: any) {
      // Ignore if user was not an auth.users record (e.g. provisioned only in profiles)
      console.warn("Auth delete user notice (may not be in auth.users):", authErr?.message || authErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Delete user exception:", err);
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
