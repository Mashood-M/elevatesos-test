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
        .from("peer_labs")
        .select("*")
        .in("status", ["upcoming", "active", "completed"])
        .order("title");

      if (!error && data && data.length > 0) {
        return jsonOk({
          peerLabs: data.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            track: p.track,
            description: p.description,
            syllabus: p.syllabus ?? [],
            status: p.status,
            applicationsOpen: p.applications_open,
            bannerUrl: p.banner_url,
            enrolledCount: p.enrolled_count,
          })),
        });
      }
    }
  } catch (err) {
    console.error("Peer Labs API database query error:", err);
  }

  return jsonOk({
    peerLabs: [
      {
        id: "cybersec-defense-lab",
        slug: "cybersec-defense-lab",
        title: "Cybersecurity Lab",
        track: "Defensive Security & Kali Linux",
        description: "Master terminal navigation, network mapping, vulnerability inspection, and defensive security drills in a safe, peer-mentored environment.",
        status: "completed",
        applicationsOpen: false,
        bannerUrl: "/images/events/cybersecurity-workshop.jpeg",
        enrolledCount: 76,
      },
    ],
  });
}

