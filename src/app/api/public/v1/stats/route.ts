import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    const admin = createServiceClient();
    if (!admin) {
      return jsonError("Database connection unavailable", 503);
    }

    const [chapters, events, projects, students] = await Promise.all([
      admin.from("chapters").select("*", { count: "exact", head: true }),
      admin.from("events").select("*", { count: "exact", head: true }),
      admin.from("projects").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("*", { count: "exact", head: true }),
    ]);

    if (chapters.error || events.error || projects.error || students.error) {
      const err = chapters.error || events.error || projects.error || students.error;
      console.error("Stats API database query error:", err);
      return jsonError("Database error while fetching system stats", 500);
    }

    return jsonOk({
      chapters: chapters.count ?? 0,
      events: events.count ?? 0,
      projects: projects.count ?? 0,
      students: students.count ?? 0,
    });
  } catch (err) {
    console.error("Stats API error:", err);
    return jsonError("Internal server error while fetching system stats", 500);
  }
}
