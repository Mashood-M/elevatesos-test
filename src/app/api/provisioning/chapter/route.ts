import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser, isUserHq } from "@/lib/api/require-user";

export async function DELETE(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    if (!isUserHq(auth)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Permission denied: Only HQ / HQ Admin can delete a chapter.",
        },
        { status: 403 },
      );
    }

    const admin = createServiceClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Supabase service client unavailable" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing chapter ID" },
        { status: 400 },
      );
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Delete chapter error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
