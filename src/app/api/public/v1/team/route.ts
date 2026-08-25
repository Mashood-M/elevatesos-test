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
        .from("profiles")
        .select(
          "id, full_name, avatar_url, bio, department, year, github_url, linkedin_url, portfolio_url, chapter_id",
        )
        .order("full_name");

      if (!error && data && data.length > 0) {
        return jsonOk({
          team: data.map((p) => ({
            id: p.id,
            fullName: p.full_name,
            avatarUrl: p.avatar_url,
            bio: p.bio,
            department: p.department,
            year: p.year,
            githubUrl: p.github_url ?? "https://github.com/Elevates-Foundation",
            linkedinUrl: p.linkedin_url ?? "https://linkedin.com",
            portfolioUrl: p.portfolio_url ?? "https://elevates.live",
            chapterSlug: "ekc",
            chapterName: "Eranad Knowledge City Chapter",
          })),
        });
      }
    }
  } catch (err) {
    console.error("Team API database query error:", err);
  }

  // Fallback to in-memory / seed profiles
  try {
    const { SEED_STORE } = await import("@/lib/demo/seed");
    if (SEED_STORE.profiles?.length > 0) {
      return jsonOk({
        team: SEED_STORE.profiles.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          avatarUrl: p.avatarUrl,
          bio: p.bio,
          department: p.department,
          year: p.year,
          githubUrl: "https://github.com/Elevates-Foundation",
          linkedinUrl: "https://linkedin.com",
          portfolioUrl: "https://elevates.live",
          chapterSlug: "ekc",
          chapterName: "Eranad Knowledge City Chapter",
        })),
      });
    }
  } catch {}

  return jsonOk({ team: [] });
}

