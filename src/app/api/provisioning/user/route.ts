import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser } from "@/lib/api/require-user";

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const admin = createServiceClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Supabase service client unavailable" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { targetUser } = body;

    if (!targetUser || !targetUser.email || !targetUser.roleKey || !targetUser.chapterId) {
      return NextResponse.json(
        { ok: false, error: "Missing mandatory user fields (email, roleKey, chapterId)" },
        { status: 400 },
      );
    }

    // 1. Resolve caller role & chapter permissions
    const isHq = auth.isHq;
    const isActingChapterAdmin =
      isHq ||
      (auth.chapterId === targetUser.chapterId &&
        ["campus_lead", "chairman"].includes(auth.roleKey));
    const isActingClassRep =
      isActingChapterAdmin ||
      (auth.chapterId === targetUser.chapterId &&
        auth.roleKey === "class_representative");

    // Non-HQ users can only provision for their own chapter
    if (!isHq && targetUser.chapterId !== auth.chapterId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Permission denied: Cannot provision users for another chapter.",
        },
        { status: 403 },
      );
    }

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

    if (
      !["campus_lead", "class_representative", "student"].includes(requestedRole) &&
      !isActingChapterAdmin &&
      !isHq
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Permission denied: Only Campus Leads or HQ can assign executive/staff roles.",
        },
        { status: 403 },
      );
    }

    // 3. Resolve role ID from DB
    const { data: roleData, error: roleError } = await admin
      .from("roles")
      .select("id, key")
      .eq("key", requestedRole)
      .maybeSingle();

    if (roleError || !roleData) {
      return NextResponse.json(
        { ok: false, error: `Invalid role specified: ${requestedRole}` },
        { status: 400 },
      );
    }

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

    // 4. Provision in Supabase Auth if needed
    let finalUserId: string | null = null;

    const { data: existingProfiles } = await admin
      .from("profiles")
      .select("id")
      .eq("email", targetUser.email.trim().toLowerCase())
      .maybeSingle();

    if (!existingProfiles) {
      const authUserPayload: {
        email: string;
        password?: string;
        email_confirm: boolean;
        user_metadata: { full_name: string };
        id?: string;
      } = {
        email: targetUser.email.trim().toLowerCase(),
        password: "ChangeMe123!",
        email_confirm: true,
        user_metadata: {
          full_name: targetUser.fullName || targetUser.name || "Student User",
        },
      };

      if (targetUser.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUser.id)) {
        authUserPayload.id = targetUser.id;
      }

      const { data: authCreatedUser, error: authCreateError } =
        await admin.auth.admin.createUser(authUserPayload);

      if (authCreateError) {
        if (authCreateError.message?.toLowerCase().includes("already registered")) {
          const { data: listData } = await admin.auth.admin.listUsers();
          const matched = (listData?.users || []).find(
            (u) => u.email?.toLowerCase() === targetUser.email.trim().toLowerCase(),
          );
          if (matched) finalUserId = matched.id;
        }
      } else if (authCreatedUser?.user) {
        finalUserId = authCreatedUser.user.id;
      }
    } else {
      finalUserId = existingProfiles.id;
    }

    if (!finalUserId) {
      finalUserId = targetUser.id || genRandomUuid();
    }

    // 5. Upsert profile row
    const profilePayload = {
      id: finalUserId,
      email: targetUser.email.trim().toLowerCase(),
      full_name: targetUser.fullName || targetUser.name || "Student User",
      phone: targetUser.phone || null,
      department: targetUser.department || "Computer Science",
      year: targetUser.year || "1st Year",
      section: targetUser.section || "A",
      chapter_id: targetUser.chapterId,
      skills: skillsArr,
      interests: interestsArr,
      avatar_url: targetUser.avatarUrl || null,
      status: "active",
      updated_at: new Date().toISOString(),
    };

    const { error: profileUpsertError } = await admin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (profileUpsertError) {
      console.error("Profile upsert error:", profileUpsertError);
      return NextResponse.json(
        { ok: false, error: profileUpsertError.message },
        { status: 400 },
      );
    }

    // 6. Assign User Role
    await admin
      .from("user_roles")
      .delete()
      .eq("user_id", finalUserId)
      .eq("chapter_id", targetUser.chapterId);

    const { error: roleAssignError } = await admin.from("user_roles").insert({
      user_id: finalUserId,
      role_id: roleData.id,
      role_key: requestedRole,
      chapter_id: targetUser.chapterId,
    });

    let warning: string | undefined;
    if (roleAssignError) {
      console.error("Role assign error:", roleAssignError);
      warning = `User profile created, but role assignment failed: ${roleAssignError.message}`;
    }

    // 7. Auto-link Class Cohort if Class Rep
    if (requestedRole === "class_representative" && targetUser.department && targetUser.year && targetUser.section) {
      try {
        const { data: cohort, error: cohortSelectErr } = await admin
          .from("class_cohorts")
          .select("id")
          .eq("chapter_id", targetUser.chapterId)
          .eq("department", targetUser.department)
          .eq("year", targetUser.year)
          .eq("section", targetUser.section)
          .maybeSingle();

        if (cohortSelectErr) {
          console.warn("Auto cohort select error:", cohortSelectErr);
        } else if (cohort) {
          const { error: cohortUpdateErr } = await admin
            .from("class_cohorts")
            .update({ representative_id: finalUserId })
            .eq("id", cohort.id);
          if (cohortUpdateErr) {
            console.warn("Auto cohort update error:", cohortUpdateErr);
          }
        } else {
          const { error: cohortInsertErr } = await admin.from("class_cohorts").insert({
            chapter_id: targetUser.chapterId,
            department: targetUser.department,
            year: targetUser.year,
            section: targetUser.section,
            representative_id: finalUserId,
          });
          if (cohortInsertErr) {
            console.warn("Auto cohort insert error:", cohortInsertErr);
          }
        }
      } catch (cohortErr: unknown) {
        console.warn("Auto cohort link exception:", cohortErr);
      }
    }

    const finalElevatesId = targetUser.elevatesId || null;

    return NextResponse.json({
      ok: true,
      ...(warning ? { warning } : {}),
      user: {
        id: finalUserId,
        email: targetUser.email,
        name: targetUser.fullName || targetUser.name,
        role: requestedRole,
        chapterId: targetUser.chapterId,
        elevatesId: finalElevatesId,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Provisioning user exception:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const admin = createServiceClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Supabase service client unavailable" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body.id || body.userId || body.targetUserId;
      } catch {
        // Body reading is optional fallback
      }
    }

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing target user ID" },
        { status: 400 },
      );
    }

    // 1. Authorization check: Only Founder can delete users
    const isFounder =
      auth.roleKey === "founder" ||
      (Array.isArray(auth.assignedKeys) && auth.assignedKeys.includes("founder"));

    if (!isFounder) {
      return NextResponse.json(
        {
          ok: false,
          error: "Permission denied: Only the Founder can delete users.",
        },
        { status: 403 },
      );
    }

    if (id === auth.userId) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete your own founder account." },
        { status: 400 },
      );
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
    } catch (authErr: unknown) {
      const authMessage = authErr instanceof Error ? authErr.message : String(authErr);
      console.warn("Auth delete user notice (may not be in auth.users):", authMessage);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Delete user exception:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function genRandomUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
