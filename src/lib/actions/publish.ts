"use server";

import { revalidateWeb } from "@/lib/api/revalidate-web";
import {
  publishChapterRemote,
  publishEventRemote,
} from "@/lib/data/supabase-bootstrap";

export async function publishEventAction(eventId: string, slug: string) {
  const result = await publishEventRemote(eventId, slug);
  if (!result.ok) return result;
  await revalidateWeb(["events", `event:${slug}`]);
  return { ok: true as const };
}

export async function publishChapterAction(chapterId: string, slug: string) {
  const result = await publishChapterRemote(chapterId);
  if (!result.ok) return result;
  await revalidateWeb(["chapters", `chapter:${slug}`]);
  return { ok: true as const };
}

export async function revalidateTagsAction(tags: string[]) {
  return revalidateWeb(tags);
}
