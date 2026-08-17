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

      const chCount = chapters.count ?? 1;
      const evCount = events.count ?? 7;
      const prCount = projects.count ?? 4;
      const stCount = students.count ?? 18;

      return jsonOk({
        chapters: Math.max(1, chCount),
        events: Math.max(7, evCount),
        projects: Math.max(4, prCount),
        students: Math.max(18, stCount),
      });
    }
  } catch (err) {
    console.error("Stats API database query error:", err);
  }

  return jsonOk({
    chapters: 1,
    events: 7,
    projects: 4,
    students: 18,
  });
}

