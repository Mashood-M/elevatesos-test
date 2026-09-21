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
    const { eventId, userId, permissionType, isTemporary = true, expiresAt } = body;

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
    const isHq = auth.isHq;
    const isExec =
      auth.chapterId === event.chapter_id &&
      [
        "campus_lead",
        "chairman",
        "vice_chairman",
        "secretary",
        "joint_secretary",
      ].includes(auth.roleKey);

    if (!isHq && !isExec) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Permission denied: Only Campus Executives or HQ can grant event permissions.",
        },
        { status: 403 },
      );
    }

    const { data: permRow, error } = await admin
      .from("event_permissions")
      .upsert(
        {
          event_id: eventId,
          user_id: userId,
          permission_type: permissionType,
          is_temporary: isTemporary,
          granted_by: auth.userId,
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Grant event permission exception:", err);
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
    const eventId = searchParams.get("eventId");
    const userId = searchParams.get("userId");
    const permissionType = searchParams.get("permissionType");

    if (!eventId || !userId || !permissionType) {
      return NextResponse.json(
        { ok: false, error: "Missing parameters" },
        { status: 400 },
      );
    }

    // Verify event & chapter permissions
    const { data: event } = await admin
      .from("events")
      .select("chapter_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
    }

    const isHq = auth.isHq;
    const isExec =
      auth.chapterId === event.chapter_id &&
      [
        "campus_lead",
        "chairman",
        "vice_chairman",
        "secretary",
        "joint_secretary",
      ].includes(auth.roleKey);

    if (!isHq && !isExec) {
      return NextResponse.json(
        { ok: false, error: "Permission denied: Only Campus Executives or HQ can revoke event permissions." },
        { status: 403 },
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Delete event permission exception:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
