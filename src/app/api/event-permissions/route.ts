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
    const { eventId, userId, permissionType, isTemporary = true, expiresAt, actingUserId } = body;

    if (!eventId || !userId || !permissionType) {
      return NextResponse.json(
        { ok: false, error: "Missing eventId, userId, or permissionType" },
        { status: 400 },
      );
    }

    // Verify event & chapter
    const { data: event } = await admin
      .from("events")
      .select("chapter_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json(
        { ok: false, error: "Event not found" },
        { status: 404 },
      );
    }

    // Check authorization of acting user
    if (actingUserId) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role_key, chapter_id")
        .eq("user_id", actingUserId);

      const isHq = (roles || []).some((r) =>
        ["founder", "hq_admin"].includes(r.role_key),
      );
      const isExec = (roles || []).some(
        (r) =>
          r.chapter_id === event.chapter_id &&
          [
            "campus_lead",
            "chairman",
            "vice_chairman",
            "secretary",
            "joint_secretary",
          ].includes(r.role_key),
      );

      if (!isHq && !isExec) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Permission denied: Only Campus Lead, Chairman, or HQ can grant event permissions.",
          },
          { status: 403 },
        );
      }
    }

    // Upsert into event_permissions
    const { data: permRow, error } = await admin
      .from("event_permissions")
      .upsert(
        {
          event_id: eventId,
          user_id: userId,
          permission_type: permissionType,
          is_temporary: isTemporary,
          granted_by: actingUserId || null,
          expires_at: expiresAt || null,
        },
        { onConflict: "event_id,user_id,permission_type" },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, permission: permRow });
  } catch (err: any) {
    console.error("Grant event permission exception:", err);
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
    const eventId = searchParams.get("eventId");
    const userId = searchParams.get("userId");
    const permissionType = searchParams.get("permissionType");

    if (!eventId || !userId || !permissionType) {
      return NextResponse.json(
        { ok: false, error: "Missing parameters" },
        { status: 400 },
      );
    }

    const { error } = await admin
      .from("event_permissions")
      .delete()
      .match({ event_id: eventId, user_id: userId, permission_type: permissionType });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Delete event permission exception:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
