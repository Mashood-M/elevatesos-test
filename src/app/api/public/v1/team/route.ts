import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";
import { resolveMediaUrl } from "@/lib/data/media";

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
      .from("profiles")
      .select(
        "id, full_name, avatar_url, bio, department, year, github_url, linkedin_url, portfolio_url, chapter_id",
      )
      .order("full_name");

    if (error) {
      console.error("Team API database query error:", error);
      return jsonError("Database error while fetching team profiles", 500);
    }

    return jsonOk({
      team: (data ?? []).map((p) => ({
        id: p.id,
        fullName: p.full_name,
        avatarUrl: resolveMediaUrl(p.avatar_url),
        bio: p.bio,
        department: p.department,
        year: p.year,
        githubUrl: p.github_url,
        linkedinUrl: p.linkedin_url,
        portfolioUrl: p.portfolio_url,
        chapterId: p.chapter_id,
      })),
    });
  } catch (err) {
    console.error("Team API error:", err);
    return jsonError("Internal server error while fetching team profiles", 500);
  }
}
