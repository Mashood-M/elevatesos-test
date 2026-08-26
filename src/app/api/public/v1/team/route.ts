import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonOk } from "@/lib/api/public";

import { resolveMediaUrl } from "@/lib/data/media";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    const admin = createServiceClient();
    if (admin) {
      const { data, error } = await admin
        .from("profiles")
        .select(
          "id, full_name, avatar_url, bio, department, year, github_url, linkedin_url, portfolio_url, chapter_id",
        )
        .order("full_name");

      if (!error && data) {
        return jsonOk({
          team: data.map((p) => ({
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
      }
    }
  } catch (err) {
    console.error("Team API database query error:", err);
  }

  return jsonOk({ team: [] });
}

