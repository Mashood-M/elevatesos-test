import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser } from "@/lib/api/require-user";

export interface BulkRowResult {
  row: number;
  name: string;
  email: string;
  status: "success" | "error" | "warning";
  message: string;
}

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
    const { chapterId, csvContent } = body;

    if (!chapterId || !csvContent) {
      return NextResponse.json(
        { ok: false, error: "Missing chapterId or csvContent" },
        { status: 400 },
      );
    }

    // Check permissions using the session user
    const isHq = auth.isHq;
    const isChapterExec =
      auth.chapterId === chapterId &&
      [
        "campus_lead",
        "chairman",
        "vice_chairman",
        "secretary",
        "class_representative",
      ].includes(auth.roleKey);

    if (!isHq && !isChapterExec) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Permission denied: Only Chairman, Campus Lead, Class Rep, or HQ can bulk import students.",
        },
        { status: 403 },
      );
    }

    // Parse CSV
    const lines = csvContent
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const results: BulkRowResult[] = [];
    let succeeded = 0;
    let failed = 0;

    // Get student role id
    const { data: studentRole } = await admin
      .from("roles")
      .select("id")
      .eq("key", "student")
      .maybeSingle();

    const roleId = studentRole?.id ?? null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip CSV header line if present
      if (
        i === 0 &&
        (line.toLowerCase().includes("email") || line.toLowerCase().includes("name"))
      ) {
        continue;
      }

      // Format: Name, Email, Phone, Department, Year, Skills (semicolon separated)
      const parts = line.split(",").map((p: string) => p.trim());
      const name = parts[0] || "";
      const email = parts[1] || "";
      const phone = parts[2] || "";
      const department = parts[3] || "Unassigned";
      const year = parts[4] || "1st Year";
      const rawSkills = parts[5] || "";

      const rowNum = i + 1;

      // Validation
      if (!name) {
        results.push({
          row: rowNum,
          name: name || "Unknown",
          email,
          status: "error",
          message: "Student name is required",
        });
        failed++;
        continue;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        results.push({
          row: rowNum,
          name,
          email,
          status: "error",
          message: `Invalid email address '${email}'`,
        });
        failed++;
        continue;
      }

      const skillsArr = rawSkills
        .split(";")
        .map((s: string) => s.trim())
        .filter(Boolean);

      // Upsert profile
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      const userId = existing?.id || genRandomUuid();

      let profErr;
      if (existing) {
        const { error } = await admin
          .from("profiles")
          .update({
            full_name: name,
            phone: phone || null,
            department,
            year,
            chapter_id: chapterId,
            skills: skillsArr,
            status: "active",
          })
          .eq("id", userId);
        profErr = error;
      } else {
        const { error } = await admin
          .from("profiles")
          .insert({
            id: userId,
            email: email.toLowerCase(),
            full_name: name,
            phone: phone || null,
            department,
            year,
            chapter_id: chapterId,
            skills: skillsArr,
            status: "active",
          });
        profErr = error;
      }

      if (profErr) {
        results.push({
          row: rowNum,
          name,
          email,
          status: "error",
          message: `Database error: ${profErr.message}`,
        });
        failed++;
        continue;
      }

      // Insert role (delete existing student role for user first to avoid ON CONFLICT failure)
      await admin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .is("leadership_term_id", null);

      const { error: roleErr } = await admin.from("user_roles").insert({
        user_id: userId,
        role_key: "student",
        role_id: roleId,
        chapter_id: chapterId,
        organization_id: "00000000-0000-0000-0000-000000000001",
        is_permanent: true,
      });

      if (roleErr) {
        console.warn("Bulk user_role notice:", roleErr.message);
        results.push({
          row: rowNum,
          name,
          email,
          status: "warning",
          message: `Registered profile, but role assignment warning: ${roleErr.message}`,
        });
      } else {
        results.push({
          row: rowNum,
          name,
          email,
          status: "success",
          message: "Successfully registered and assigned to chapter",
        });
      }
      succeeded++;
    }

    return NextResponse.json({
      ok: true,
      summary: {
        total: lines.length,
        succeeded,
        failed,
      },
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Bulk upload handler exception:", err);
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
