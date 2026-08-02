import type {
  ElevatesStore,
  EngagementTier,
  JourneyStage,
  Profile,
} from "@/types";

const TIER_RANK: Record<EngagementTier, number> = {
  everyone: 0,
  participant: 1,
  active: 2,
  cluster: 3,
  executive: 4,
  campus_lead: 5,
};

/** Derive EOS engagement tier from activity — not manual labels. */
export function deriveEngagementTier(
  store: ElevatesStore,
  userId: string,
): EngagementTier {
  const profile = store.profiles.find((p) => p.id === userId);
  if (!profile) return "everyone";

  const leadership = (store.leadershipAssignments ?? []).filter((a) => {
    const term = store.leadershipTerms.find((t) => t.id === a.termId);
    return a.userId === userId && term?.status === "active";
  });
  if (leadership.some((a) => a.roleKey === "chairman")) return "campus_lead";
  if (leadership.length > 0) return "executive";

  const inCluster = store.clusters.some((c) => c.memberIds.includes(userId));
  if (inCluster) return "cluster";

  const presentIds = new Set(
    store.attendance
      .filter(
        (a) =>
          a.userId === userId &&
          (a.status === "present" ||
            a.status === "late" ||
            a.status === "volunteer" ||
            a.status === "speaker"),
      )
      .map((a) => a.eventId),
  );
  if (presentIds.size >= 2) return "active";
  if (presentIds.size >= 1) return "participant";

  return "everyone";
}

/** Derive EOS journey stage from participation depth. */
export function deriveJourneyStage(
  store: ElevatesStore,
  userId: string,
): JourneyStage {
  const tier = deriveEngagementTier(store, userId);
  if (tier === "campus_lead" || tier === "executive") return "leadership";

  const inCluster = store.clusters.some((c) => c.memberIds.includes(userId));
  const onProject = store.projects.some((p) => p.teamIds.includes(userId));
  if (onProject && inCluster) return "projects";
  if (inCluster) return "cluster";

  const attended = store.attendance.filter(
    (a) =>
      a.userId === userId &&
      (a.status === "present" || a.status === "late"),
  );
  if (attended.length >= 2) return "hands_on";
  if (attended.length >= 1) return "workshop";

  if (profileHasChapter(store, userId)) return "awareness";
  return "awareness";
}

function profileHasChapter(store: ElevatesStore, userId: string) {
  return Boolean(store.profiles.find((p) => p.id === userId)?.chapterId);
}

export function maxTier(a: EngagementTier, b: EngagementTier): EngagementTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

/** Profile view with derived EOS progression (source of truth for display). */
export function withDerivedProgression(
  store: ElevatesStore,
  profile: Profile,
): Profile {
  return {
    ...profile,
    engagementTier: deriveEngagementTier(store, profile.id),
    journeyStage: deriveJourneyStage(store, profile.id),
  };
}

/** Users who attended workshop/challenge-style events and are not yet in any chapter cluster. */
export function workshopNominateCandidates(
  store: ElevatesStore,
  chapterId: string,
): { userId: string; eventIds: string[]; fullName: string }[] {
  const chapterEvents = store.events.filter(
    (e) =>
      e.chapterId === chapterId &&
      (e.progressStage === "workshop" ||
        e.progressStage === "challenge" ||
        e.progressStage === "hands_on" ||
        /workshop|challenge|hands/i.test(e.category + e.title)),
  );
  const eventIds = new Set(chapterEvents.map((e) => e.id));
  const clusterMemberIds = new Set(
    store.clusters
      .filter((c) => c.chapterId === chapterId)
      .flatMap((c) => c.memberIds),
  );
  const pendingInvite = new Set(
    (store.clusterInvites ?? [])
      .filter((i) => i.chapterId === chapterId && i.status === "pending")
      .map((i) => i.userId),
  );

  const byUser = new Map<string, string[]>();
  for (const a of store.attendance) {
    if (!eventIds.has(a.eventId)) continue;
    if (
      !(
        a.status === "present" ||
        a.status === "late" ||
        a.status === "volunteer"
      )
    ) {
      continue;
    }
    if (clusterMemberIds.has(a.userId) || pendingInvite.has(a.userId)) continue;
    const list = byUser.get(a.userId) ?? [];
    if (!list.includes(a.eventId)) list.push(a.eventId);
    byUser.set(a.userId, list);
  }

  return [...byUser.entries()]
    .map(([userId, evIds]) => {
      const p = store.profiles.find((x) => x.id === userId);
      if (!p || p.chapterId !== chapterId) return null;
      return { userId, eventIds: evIds, fullName: p.fullName };
    })
    .filter((x): x is { userId: string; eventIds: string[]; fullName: string } =>
      Boolean(x),
    )
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
