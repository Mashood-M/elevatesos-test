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

    const { data, error } = await admin
      .from("projects")
      .select(
        "id, title, slug, description, stage, project_type, repository_url, demo_url, awards, progress",
      )
      .order("title");

    if (error) {
      console.error("Projects API database query error:", error);
      return jsonError("Database error while fetching projects", 500);
    }

    return jsonOk({
      projects: (data ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        stage: p.stage,
        projectType: p.project_type ?? "platform",
        repositoryUrl: p.repository_url,
        demoUrl: p.demo_url,
        awards: p.awards ?? [],
        progress: p.progress ?? 100,
      })),
    });
  } catch (err) {
    console.error("Projects API error:", err);
    return jsonError("Internal server error while fetching projects", 500);
  }
}
