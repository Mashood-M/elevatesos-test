import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";

export function OPTIONS() {
  return corsOptions();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const admin = createServiceClient();
  if (!admin) return jsonError("Service unavailable", 503);

  const { data: project, error } = await admin
    .from("projects")
    .select(
      "*, chapters(slug, name)",
    )
    .eq("slug", slug)
    .eq("is_showcased", true)
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!project) return jsonError("Project not found", 404);

  const ch = Array.isArray(project.chapters)
    ? project.chapters[0]
    : project.chapters;

  return jsonOk({
    id: project.id,
    title: project.title,
    slug: project.slug,
    description: project.description,
    stage: project.stage,
    projectType: project.project_type,
    repositoryUrl: project.repository_url,
    demoUrl: project.demo_url,
    awards: project.awards ?? [],
    progress: project.progress,
    chapterSlug: ch?.slug,
    chapterName: ch?.name,
  });
}
