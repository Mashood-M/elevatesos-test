import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";
import { resolveMediaUrl } from "@/lib/data/media";
import { loadPublicPeerLabs } from "@/lib/public/catalog";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    const { ok, error, labs } = await loadPublicPeerLabs();
    if (!ok) {
      console.error("Peer Labs API database query error:", error);
      return jsonError("Database error while fetching peer labs", 500);
    }
    return jsonOk({
      peerLabs: labs.map((l) => ({ ...l, bannerUrl: resolveMediaUrl(l.bannerUrl) })),
    });
  } catch (err) {
    console.error("Peer Labs API error:", err);
    return jsonError("Internal server error while fetching peer labs", 500);
  }
}
