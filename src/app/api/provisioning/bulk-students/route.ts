import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface BulkRowResult {
  row: number;
  name: string;
  email: string;
  status: "success" | "error";
  message: string;
}

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
    const { actingUserId, chapterId, csvContent } = body;

    if (!chapterId || !csvContent) {
      return NextResponse.json(
        { ok: false, error: "Missing chapterId or csvContent" },
        { status: 400 },
      );
    }

    // Check permissions
    if (actingUserId) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role_key, chapter_id")
        .eq("user_id", actingUserId);

      const isHq = (roles || []).some((r) =>
        ["founder", "hq_admin"].includes(r.role_key),
      );
      const isChapterExec = (roles || []).some(
        (r) =>
          r.chapter_id === chapterId &&
          [
            "campus_lead",
            "chairman",
            "vice_chairman",
            "secretary",
            "class_representative",
          ].includes(r.role_key),
      );

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
      const department = parts[3] || "Computer Science & Engineering";
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

      const { error: profErr } = await admin.from("profiles").upsert({
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

      // Upsert role
      const { error: roleErr } = await admin.from("user_roles").upsert(
        {
          user_id: userId,
          role_key: "student",
          role_id: roleId,
          chapter_id: chapterId,
          organization_id: "00000000-0000-0000-0000-000000000001",
          is_permanent: true,
        },
        { onConflict: "user_id,role_key,chapter_id" },
      );

      if (roleErr) {
        console.warn("Bulk user_role notice:", roleErr.message);
      }

      results.push({
        row: rowNum,
        name,
        email,
        status: "success",
        message: "Successfully registered and assigned to chapter",
      });
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
  } catch (err: any) {
    console.error("Bulk upload handler exception:", err);
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
