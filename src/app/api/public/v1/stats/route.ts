import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonOk } from "@/lib/api/public";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    const admin = createServiceClient();
    if (admin) {
      const [chapters, events, projects, students] = await Promise.all([
        admin.from("chapters").select("*", { count: "exact", head: true }),
        admin.from("events").select("*", { count: "exact", head: true }),
        admin.from("projects").select("*", { count: "exact", head: true }),
        admin.from("profiles").select("*", { count: "exact", head: true }),
      ]);

      const chCount = chapters.count ?? 0;
      const evCount = events.count ?? 0;
      const prCount = projects.count ?? 0;
      const stCount = students.count ?? 0;

      return jsonOk({
        chapters: chCount,
        events: evCount,
        projects: prCount,
        students: stCount,
      });
    }
  } catch (err) {
    console.error("Stats API database query error:", err);
  }

  return jsonOk({
    chapters: 0,
    events: 0,
    projects: 0,
    students: 0,
  });
}

