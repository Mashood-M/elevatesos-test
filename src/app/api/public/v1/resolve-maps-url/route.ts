import { NextRequest } from "next/server";
import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";

export function OPTIONS() {
  return corsOptions();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = body?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return jsonError("URL is required", 400);
    }

    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      return jsonError("Invalid URL format - must start with https:// or http://", 400);
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
    } catch {
      return jsonError("Malformed URL", 400);
    }

    const host = parsed.hostname.toLowerCase();
    const isGoogle =
      host.includes("google.") ||
      host === "goo.gl" ||
      host === "maps.app.goo.gl" ||
      host.endsWith(".goo.gl");

    if (!isGoogle) {
      return jsonError("Only Google Maps URLs are supported", 400);
    }

    // Follow redirects to find destination URL
    const response = await fetch(trimmedUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    const finalUrl = response.url;
    const html = await response.text();

    // 1. Check for @lat,lng in final URL (e.g. /@11.3216,75.9336,17z)
    let lat: number | null = null;
    let lng: number | null = null;
    let name: string | undefined = undefined;

    const placeMatch = finalUrl.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      try {
        name = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      } catch {}
    }

    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }

    // 2. Query param search: ?q=lat,lng or &query=lat,lng or &ll=lat,lng
    if (lat == null || lng == null) {
      const qMatch = finalUrl.match(/[?&](?:q|ll|query|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        lat = parseFloat(qMatch[1]);
        lng = parseFloat(qMatch[2]);
      }
    }

    // 3. Search inside HTML body for embedded coordinates
    if (lat == null || lng == null) {
      const previewMatch = html.match(
        /google\.com\/maps\/preview\/place\/[^/@]*\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
      );
      if (previewMatch) {
        lat = parseFloat(previewMatch[1]);
        lng = parseFloat(previewMatch[2]);
      } else {
        const stateMatch = html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
        if (stateMatch) {
          lat = parseFloat(stateMatch[1]);
          lng = parseFloat(stateMatch[2]);
        }
      }
    }

    // Try extracting title from HTML if name not found
    if (!name) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        const rawTitle = titleMatch[1].replace(/ - Google Maps.*$/i, "").trim();
        if (rawTitle && !rawTitle.toLowerCase().includes("google maps")) {
          name = rawTitle;
        }
      }
    }

    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      return jsonOk({
        latitude: lat,
        longitude: lng,
        coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        name,
        resolvedUrl: finalUrl,
      });
    }

    return jsonError(
      "Could not extract coordinates from this Google Maps link. Try copying the coordinates directly (right-click on Google Maps) or copy the full address bar URL.",
      422,
    );
  } catch (err: any) {
    return jsonError(err?.message || "Failed to resolve Google Maps link", 500);
  }
}
