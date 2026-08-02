import { isExecutiveRole } from "@/lib/access";
import { executiveScore, healthLabel, isHqRole } from "@/lib/permissions";
import type { ElevatesStore, RoleKey } from "@/types";

export type LeaderEntry = {
  id: string;
  rank: number;
  name: string;
  value: number | string;
  href?: string;
  meta?: string;
};

function withRanks(
  rows: Omit<LeaderEntry, "rank">[],
): LeaderEntry[] {
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

function roleKeyForUser(store: ElevatesStore, userId: string): RoleKey | null {
  const ur = store.userRoles.find((r) => r.userId === userId);
  if (!ur) return null;
  return store.roles.find((r) => r.id === ur.roleId)?.key ?? null;
}

function chapterSlug(store: ElevatesStore, chapterId: string): string | null {
  return store.chapters.find((c) => c.id === chapterId)?.slug ?? null;
}

/** Chapter members by points — excludes HQ-only personas. */
export function buildStudentLeaders(store: ElevatesStore, limit = 5): LeaderEntry[] {
  const rows = store.profiles
    .filter((p) => {
      if (!p.chapterId) return false;
      const key = roleKeyForUser(store, p.id);
      if (!key) return false;
      if (isHqRole(key)) return false;
      return true;
    })
    .slice()
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      name: p.fullName,
      value: p.points,
      href: `/profile/${p.id}`,
      meta: p.department,
    }));
  return withRanks(rows);
}

export function buildRepLeaders(store: ElevatesStore, limit = 5): LeaderEntry[] {
  const rows = store.profiles
    .filter((p) =>
      store.userRoles.some(
        (ur) => ur.userId === p.id && ur.roleId === "r-cr",
      ),
    )
    .map((p) => ({
      profile: p,
      reviewed: store.registrations.filter((r) => r.reviewedBy === p.id).length,
    }))
    .sort((a, b) => b.reviewed - a.reviewed)
    .slice(0, limit)
    .map((r) => ({
      id: r.profile.id,
      name: r.profile.fullName,
      value: r.reviewed,
      href: `/profile/${r.profile.id}`,
      meta: "reviews",
    }));
  return withRanks(rows);
}

export function buildCoordinatorLeaders(
  store: ElevatesStore,
  limit = 5,
): LeaderEntry[] {
  const rows = store.leadershipAssignments
    .filter((a) => a.roleKey === "elevates_coordinator")
    .map((a) => {
      const profile = store.profiles.find((pr) => pr.id === a.userId);
      const clusters = store.clusters.filter(
        (c) => c.leaderId === a.userId,
      ).length;
      return { profile, clusters, assignmentId: a.id };
    })
    .filter((c): c is typeof c & { profile: NonNullable<typeof c.profile> } =>
      Boolean(c.profile),
    )
    .sort((a, b) => b.clusters - a.clusters)
    .slice(0, limit)
    .map((c) => ({
      id: c.profile.id,
      name: c.profile.fullName,
      value: c.clusters,
      href: `/profile/${c.profile.id}`,
      meta: "clusters",
    }));
  return withRanks(rows);
}

export function buildChapterLeaders(store: ElevatesStore): LeaderEntry[] {
  const rows = [...store.chapters]
    .sort((a, b) => b.healthScore - a.healthScore)
    .map((c) => ({
      id: c.id,
      name: c.name,
      value: `${c.healthScore}%`,
      href: `/chapter/${c.slug}`,
      meta: healthLabel(c.healthScore),
    }));
  return withRanks(rows);
}

export function buildProjectLeaders(
  store: ElevatesStore,
  limit = 5,
): LeaderEntry[] {
  const rows = [...store.projects]
    .sort((a, b) => b.progress - a.progress)
    .slice(0, limit)
    .map((p) => {
      const slug = chapterSlug(store, p.chapterId);
      return {
        id: p.id,
        name: p.title,
        value: `${p.progress}%`,
        href: slug ? `/chapter/${slug}/projects` : undefined,
        meta: p.stage,
      };
    });
  return withRanks(rows);
}

export function buildClusterLeaders(
  store: ElevatesStore,
  limit = 5,
): LeaderEntry[] {
  const rows = store.clusters
    .filter((c) => c.roadmap.length > 0)
    .map((c) => {
      const done = c.roadmap.filter((r) => r.done).length;
      const total = c.roadmap.length;
      return { cluster: c, done, total, ratio: done / total };
    })
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit)
    .map((c) => {
      const slug = chapterSlug(store, c.cluster.chapterId);
      return {
        id: c.cluster.id,
        name: c.cluster.name,
        value: `${Math.round(c.ratio * 100)}%`,
        href: slug
          ? `/chapter/${slug}/clusters/${c.cluster.id}`
          : undefined,
        meta: `${c.done}/${c.total} weeks`,
      };
    });
  return withRanks(rows);
}

export function buildExecutiveLeaders(
  store: ElevatesStore,
  limit = 5,
): LeaderEntry[] {
  const seen = new Set<string>();
  const candidates: { id: string; name: string; score: number; role: string }[] =
    [];

  for (const ur of store.userRoles) {
    const role = store.roles.find((r) => r.id === ur.roleId);
    if (!role || !isExecutiveRole(role.key)) continue;
    if (seen.has(ur.userId)) continue;
    const profile = store.profiles.find((p) => p.id === ur.userId);
    if (!profile?.chapterId) continue;
    seen.add(ur.userId);
    candidates.push({
      id: profile.id,
      name: profile.fullName,
      score: executiveScore(store, profile.id),
      role: role.name,
    });
  }

  const rows = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      name: c.name,
      value: c.score,
      href: `/profile/${c.id}`,
      meta: c.role,
    }));
  return withRanks(rows);
}

export type LeaderboardHqStats = {
  chapterCount: number;
  topChapterName: string;
  topChapterHealth: number;
  topMemberName: string;
  topMemberPoints: number;
  totalMemberPoints: number;
};

export function buildLeaderboardHqStats(
  store: ElevatesStore,
): LeaderboardHqStats {
  const chapters = buildChapterLeaders(store);
  const students = buildStudentLeaders(store, 50);
  const topChapter = store.chapters
    .slice()
    .sort((a, b) => b.healthScore - a.healthScore)[0];
  const totalMemberPoints = students.reduce(
    (sum, s) => sum + (typeof s.value === "number" ? s.value : 0),
    0,
  );
  return {
    chapterCount: store.chapters.length,
    topChapterName: topChapter?.name ?? "—",
    topChapterHealth: topChapter?.healthScore ?? 0,
    topMemberName: students[0]?.name ?? "—",
    topMemberPoints:
      typeof students[0]?.value === "number" ? students[0].value : 0,
    totalMemberPoints,
  };
}
