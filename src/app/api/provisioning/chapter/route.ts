import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

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
    const id = searchParams.get("id");
    const actingUserId = searchParams.get("actingUserId");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing chapter ID" },
        { status: 400 },
      );
    }

    // Verify acting user is HQ
    if (actingUserId) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role_key")
        .eq("user_id", actingUserId);

      const isHq = (roles || []).some((r) =>
        ["founder", "hq_admin"].includes(r.role_key),
      );

      if (!isHq) {
        return NextResponse.json(
          {
            ok: false,
            error: "Permission denied: Only HQ / HQ Admin can delete a chapter.",
          },
          { status: 403 },
        );
      }
    }

    // Delete chapter record
    const { error } = await admin.from("chapters").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Delete chapter error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
