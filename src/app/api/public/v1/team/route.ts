import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";
import { resolveMediaUrl } from "@/lib/data/media";
import { FOUNDING_TEAM_IMAGE } from "@/lib/data/founders-team";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    const admin = createServiceClient();
    if (!admin) {
      return jsonError("Database connection unavailable", 503);
    }

    const [profilesRes, orgRes] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, full_name, avatar_url, bio, department, year, github_url, linkedin_url, portfolio_url, chapter_id",
        )
        .order("full_name"),
      admin
        .from("organizations")
        .select("settings")
        .limit(1)
        .maybeSingle(),
    ]);

    if (profilesRes.error) {
      console.error("Team API database query error:", profilesRes.error);
      return jsonError("Database error while fetching team profiles", 500);
    }

    const orgSettings = (orgRes?.data?.settings as Record<string, any>) ?? {};
    const foundersList: any[] = Array.isArray(orgSettings.founders) ? orgSettings.founders : [];
    const advisorsList: any[] = Array.isArray(orgSettings.advisors) ? orgSettings.advisors : [];
    const teamImage = orgSettings.founding_team_image || FOUNDING_TEAM_IMAGE;

    return jsonOk({
      foundingTeamImage: resolveMediaUrl(teamImage),
      founders: foundersList.map((f) => ({
        ...f,
        image: resolveMediaUrl(f.image),
      })),
      advisors: advisorsList.map((a) => ({
        ...a,
        image: a.image ? resolveMediaUrl(a.image) : undefined,
      })),
      team: (profilesRes.data ?? []).map((p) => ({
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
