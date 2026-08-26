import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonOk } from "@/lib/api/public";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    const admin = createServiceClient();
    if (admin) {
      const { data, error } = await admin
        .from("projects")
        .select(
          "id, title, slug, description, stage, project_type, repository_url, demo_url, awards, progress",
        )
        .order("title");

      if (!error && data) {
        return jsonOk({
          projects: data.map((p) => ({
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
      }
    }
  } catch (err) {
    console.error("Projects API database query error:", err);
  }

  return jsonOk({ projects: [] });
}

