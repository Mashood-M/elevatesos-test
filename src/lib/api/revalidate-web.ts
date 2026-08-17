/** Notify Elevates Web to revalidate ISR tags after publish. */
export async function revalidateWeb(tags: string[]) {
  const url = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.WEB_REVALIDATE_SECRET ?? process.env.REVALIDATE_SECRET;
  if (!url || !secret || tags.length === 0) return { ok: false, skipped: true };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags, secret }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
