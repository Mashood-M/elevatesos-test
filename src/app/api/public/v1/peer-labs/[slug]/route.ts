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
  if (!admin) {
    return jsonError("Database connection unavailable", 503);
  }

  const { data, error } = await admin
    .from("peer_labs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return jsonError("Peer lab not found", 404);
  }


  return jsonOk({
    id: data.id,
    slug: data.slug,
    title: data.title,
    track: data.track,
    description: data.description,
    syllabus: data.syllabus ?? [],
    status: data.status,
    applicationsOpen: data.applications_open,
    bannerUrl: data.banner_url,
    enrolledCount: data.enrolled_count,
  });
}
