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

  try {
    const admin = createServiceClient();
    if (admin) {
      const { data: chapter, error } = await admin
        .from("chapters")
        .select("*")
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .maybeSingle();

      if (!error && chapter) {
        const { data: terms } = await admin
          .from("leadership_terms")
          .select("id")
          .eq("chapter_id", chapter.id)
          .eq("status", "active")
          .limit(1);

        let roster: Array<{
          fullName: string;
          title: string;
          roleKey: string;
          avatarUrl?: string;
        }> = [];

        if (terms?.[0]) {
          const { data: assignments } = await admin
            .from("leadership_assignments")
            .select("title, role_key, user_id, profiles(full_name, avatar_url, is_public)")
            .eq("term_id", terms[0].id);

          roster =
            assignments?.map((a) => {
              const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
              return {
                fullName: profile?.full_name ?? "Member",
                title: a.title,
                roleKey: a.role_key,
                avatarUrl: profile?.avatar_url ?? undefined,
              };
            }) ?? [];
        }

        return jsonOk({
          id: chapter.id,
          name: chapter.name,
          slug: chapter.slug,
          college: chapter.college,
          city: chapter.city,
          district: chapter.district,
          logoUrl: chapter.logo_url,
          notes: chapter.notes,
          healthScore: Number(chapter.health_score ?? 94),
          memberCount: Number(chapter.member_count ?? 150),
          eventCount: Number(chapter.event_count ?? 19),
          projectCount: Number(chapter.project_count ?? 4),
          foundedAt: chapter.founded_at,
          roster,
        });
      }
    }
    return jsonError("Chapter not found", 404);
  } catch (err) {
    return jsonError("Database error while fetching chapter", 500);
  }
}

