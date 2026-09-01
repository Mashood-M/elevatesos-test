import { navItemsForRole } from "@/lib/access";
import { isHqRole } from "@/lib/permissions";
import type { ElevatesStore, RoleKey } from "@/types";

export type SearchCategory =
  | "nav"
  | "student"
  | "chapter"
  | "event"
  | "form"
  | "project"
  | "cluster"
  | "certificate"
  | "resource";

export type SearchResult = {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
};

export function buildSearchIndex(
  store: ElevatesStore,
  roleKey: RoleKey = store.session.roleKey,
): SearchResult[] {
  const chapterSlug =
    store.chapters.find((c) => c.id === store.session.chapterId)?.slug ??
    store.chapters[0]?.slug ??
    "";

  const results: SearchResult[] = navItemsForRole(roleKey, chapterSlug).map(
    (n) => ({
      id: `nav-${n.href}`,
      category: "nav",
      title: n.title,
      subtitle: n.subtitle,
      href: n.href,
      keywords: `${n.title} ${n.subtitle}`.toLowerCase(),
    }),
  );

  const visibleChapters = isHqRole(roleKey)
    ? store.chapters
    : store.chapters.filter((c) => c.slug === chapterSlug);

  for (const c of visibleChapters) {
    results.push({
      id: `ch-${c.id}`,
      category: "chapter",
      title: c.name,
      subtitle: `${c.college} · ${c.city} · activity ${c.healthScore}%`,
      href: `/chapter/${c.slug}`,
      keywords: `${c.name} ${c.college} ${c.city} ${c.slug}`.toLowerCase(),
    });
  }

  const chapterIds = new Set(visibleChapters.map((c) => c.id));

  for (const p of store.profiles) {
    if (p.chapterId && !chapterIds.has(p.chapterId) && !isHqRole(roleKey)) {
      continue;
    }
    const chapter = store.chapters.find((c) => c.id === p.chapterId);
    results.push({
      id: `user-${p.id}`,
      category: "student",
      title: p.fullName,
      subtitle: [p.elevatesId, p.department, p.year, chapter?.name].filter(Boolean).join(" · "),
      href: `/profile/${p.id}`,
      keywords: `${p.fullName} ${p.email} ${p.elevatesId ?? ""} ${p.skills.join(" ")} ${p.department ?? ""}`.toLowerCase(),
    });
  }

  for (const e of store.events) {
    if (!chapterIds.has(e.chapterId) && !isHqRole(roleKey)) continue;
    const chapter = store.chapters.find((c) => c.id === e.chapterId);
    results.push({
      id: `ev-${e.id}`,
      category: "event",
      title: e.title,
      subtitle: `${chapter?.name ?? "Chapter"} · ${e.category} · ${e.status}`,
      href: chapter
        ? `/chapter/${chapter.slug}/events/${e.id}`
        : "/hq/calendar",
      keywords: `${e.title} ${e.category} ${e.venue} ${e.ticketNo}`.toLowerCase(),
    });
  }

  for (const f of store.forms ?? []) {
    if (!chapterIds.has(f.chapterId) && !isHqRole(roleKey)) continue;
    const chapter = store.chapters.find((c) => c.id === f.chapterId);
    results.push({
      id: `form-${f.id}`,
      category: "form",
      title: f.title,
      subtitle: `${chapter?.name ?? "Chapter"} · ${f.purpose} · ${f.status}`,
      href: chapter
        ? `/chapter/${chapter.slug}/forms/${f.id}`
        : "/hq",
      keywords: `${f.title} ${f.purpose} ${f.description ?? ""} form survey`.toLowerCase(),
    });
  }

  for (const p of store.projects) {
    if (!chapterIds.has(p.chapterId) && !isHqRole(roleKey)) continue;
    const chapter = store.chapters.find((c) => c.id === p.chapterId);
    results.push({
      id: `pr-${p.id}`,
      category: "project",
      title: p.title,
      subtitle: `${chapter?.name ?? ""} · ${p.stage} · ${p.progress}%`,
      href: chapter ? `/chapter/${chapter.slug}/projects` : "/hq",
      keywords: `${p.title} ${p.description} ${p.stage}`.toLowerCase(),
    });
  }

  for (const cl of store.clusters) {
    if (!chapterIds.has(cl.chapterId) && !isHqRole(roleKey)) continue;
    const chapter = store.chapters.find((c) => c.id === cl.chapterId);
    results.push({
      id: `cl-${cl.id}`,
      category: "cluster",
      title: cl.name,
      subtitle: `${chapter?.name ?? ""} · ${cl.memberIds.length} members`,
      href: chapter ? `/chapter/${chapter.slug}/clusters` : "/hq",
      keywords: `${cl.name} ${cl.description} ${cl.slug}`.toLowerCase(),
    });
  }

  for (const cert of store.certificates) {
    const user = store.profiles.find((p) => p.id === cert.userId);
    const event = store.events.find((e) => e.id === cert.eventId);
    results.push({
      id: `cert-${cert.id}`,
      category: "certificate",
      title: cert.certificateId,
      subtitle: `${user?.fullName ?? "Student"} · ${event?.title ?? "Event"}`,
      href: `/verify/certificate/${cert.certificateId}`,
      keywords: `${cert.certificateId} ${user?.fullName ?? ""} ${event?.title ?? ""}`.toLowerCase(),
    });
  }

  for (const r of store.resources) {
    const href =
      isHqRole(roleKey) || !chapterSlug
        ? "/hq/resources"
        : `/chapter/${chapterSlug}/resources`;
    if (!isHqRole(roleKey) && !chapterSlug) continue;
    results.push({
      id: `res-${r.id}`,
      category: "resource",
      title: r.title,
      subtitle: `${r.category} · resource library`,
      href,
      keywords: `${r.title} ${r.category} ${r.description}`.toLowerCase(),
    });
  }

  return results;
}

export function searchIndex(index: SearchResult[], query: string, limit = 12) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return index.filter((i) => i.category === "nav").slice(0, limit);
  }
  const scored = index
    .map((item) => {
      let score = 0;
      if (item.title.toLowerCase().startsWith(q)) score += 40;
      if (item.title.toLowerCase().includes(q)) score += 25;
      if (item.subtitle.toLowerCase().includes(q)) score += 15;
      if (item.keywords.includes(q)) score += 10;
      for (const token of q.split(/\s+/)) {
        if (item.keywords.includes(token)) score += 5;
      }
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
  return scored;
}

export const CATEGORY_LABEL: Record<SearchCategory, string> = {
  nav: "Navigate",
  student: "Students",
  chapter: "Chapters",
  event: "Events",
  form: "Forms",
  project: "Projects",
  cluster: "Clusters",
  certificate: "Certificates",
  resource: "Resources",
};
