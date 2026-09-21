import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";
import { resolveMediaUrl } from "@/lib/data/media";
import { loadPublicPeerLabs } from "@/lib/public/catalog";

export function OPTIONS() {
  return corsOptions();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { ok, error, labs } = await loadPublicPeerLabs(slug);
  if (!ok) {
    console.error("Peer Lab API database query error:", error);
    return jsonError("Database connection unavailable", 503);
  }
  const lab = labs[0];
  if (!lab) return jsonError("Peer lab not found", 404);
  return jsonOk({ ...lab, bannerUrl: resolveMediaUrl(lab.bannerUrl) });
}
