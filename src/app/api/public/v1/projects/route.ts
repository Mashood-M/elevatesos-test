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

      if (!error && data && data.length > 0) {
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
            chapterSlug: "eranad-knowledge-city",
            chapterName: "Eranad Knowledge City Chapter",
          })),
        });
      }
    }
  } catch (err) {
    console.error("Projects API database query error:", err);
  }

  return jsonOk({
    projects: [
      {
        id: "vibranium",
        title: "Vibranium RFID & TechFest Platform",
        slug: "vibranium",
        description: "RFID smart badge ingress, automated leaderboard, dynamic certificate dispenser & event operations system.",
        stage: "production",
        projectType: "platform",
        repositoryUrl: "https://github.com/Elevates-Foundation/vibranium",
        demoUrl: "https://vibranium.live",
        awards: ["Best Technical Platform 2025"],
        progress: 100,
        chapterSlug: "ekc",
        chapterName: "Eranad Knowledge City Chapter",
      },
      {
        id: "aaroh",
        title: "Aaroh Cultural Fest Platform",
        slug: "aaroh",
        description: "Official event ticketing, live voting, dynamic schedule & stage tracking engine built for Aaroh.",
        stage: "production",
        projectType: "platform",
        repositoryUrl: "https://github.com/Elevates-Foundation/aaroh",
        demoUrl: "https://aaroh.live",
        awards: ["Scale Benchmark (400k req)"],
        progress: 100,
        chapterSlug: "ekc",
        chapterName: "Eranad Knowledge City Chapter",
      },
      {
        id: "elevates-os",
        title: "Elevates OS Multi-Campus Management Engine",
        slug: "elevates-os",
        description: "Chapter governance, event lifecycle, QR validation, forms pipeline & analytics dashboard.",
        stage: "production",
        projectType: "platform",
        repositoryUrl: "https://github.com/Elevates-Foundation/elevates-os",
        demoUrl: "https://os.elevates.live",
        awards: ["Architecture Award 2026"],
        progress: 100,
        chapterSlug: "ekc",
        chapterName: "Eranad Knowledge City Chapter",
      },
    ],
  });
}

