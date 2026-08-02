"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import {
  EOS_ACTIVITIES,
  EOS_CHAPTER_STANDARDS,
  EOS_COMMUNITY_TIERS,
  EOS_EVENT_PROGRESSION,
  EOS_JOURNEY_STAGES,
  EOS_SUCCESS_METRICS,
} from "@/lib/eos/doctrine";
import {
  deriveEngagementTier,
  deriveJourneyStage,
  workshopNominateCandidates,
} from "@/lib/eos/progression";
import { hasPermission, isHqRole } from "@/lib/permissions";

export default function ChapterCommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const {
    store,
    respondClusterInvite,
    toggleChapterStandard,
    inviteToCluster,
  } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const canManage =
    isHqRole(session.roleKey) ||
    hasPermission(store, session.roleKey, "chapter.manage") ||
    hasPermission(store, session.roleKey, "leadership.manage");

  const members = useMemo(
    () =>
      chapter
        ? store.profiles.filter((p) => p.chapterId === chapter.id)
        : [],
    [store.profiles, chapter],
  );

  const derivedMembers = useMemo(
    () =>
      members.map((m) => ({
        ...m,
        engagementTier: deriveEngagementTier(store, m.id),
        journeyStage: deriveJourneyStage(store, m.id),
      })),
    [members, store],
  );

  const byTier = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of EOS_COMMUNITY_TIERS) map[t.key] = 0;
    for (const m of derivedMembers) {
      map[m.engagementTier] = (map[m.engagementTier] ?? 0) + 1;
    }
    return map;
  }, [derivedMembers]);

  const byJourney = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of EOS_JOURNEY_STAGES) map[s.key] = 0;
    for (const m of derivedMembers) {
      map[m.journeyStage] = (map[m.journeyStage] ?? 0) + 1;
    }
    return map;
  }, [derivedMembers]);

  const nominateQueue = useMemo(
    () => (chapter ? workshopNominateCandidates(store, chapter.id) : []),
    [store, chapter],
  );

  const chapterClusters = useMemo(
    () =>
      chapter
        ? store.clusters.filter((c) => c.chapterId === chapter.id)
        : [],
    [store.clusters, chapter],
  );

  if (!chapter) return <p className="text-[var(--accent)]">Chapter not found</p>;

  const invites = (store.clusterInvites ?? []).filter(
    (i) => i.chapterId === chapter.id && i.status === "pending",
  );
  const myInvites = invites.filter((i) => i.userId === session.userId);

  const clusterCount = chapterClusters.length;
  const clusterMembers = new Set(
    chapterClusters.flatMap((c) => c.memberIds),
  ).size;
  const workshopAttendance = store.attendance.filter((a) => {
    const ev = store.events.find((e) => e.id === a.eventId);
    return (
      ev?.chapterId === chapter.id &&
      (a.status === "present" || a.status === "late")
    );
  }).length;
  const projectsDone = store.projects.filter(
    (p) =>
      p.chapterId === chapter.id &&
      (p.stage === "demo" || p.stage === "showcase"),
  ).length;

  const standards = EOS_CHAPTER_STANDARDS.map((s) => {
    const check = (store.chapterStandardChecks ?? []).find(
      (c) => c.chapterId === chapter.id && c.standardId === s.id,
    );
    return { ...s, done: check?.done ?? false };
  });

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Community"
        description="Community path — tiers earned from activity, workshop → cluster invites, standards. Faculty optional."
        actions={
          <Link href="/eos">
            <Button variant="ghost">Playbook</Button>
          </Link>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Community" value={members.length} />
        <Stat label="Cluster members" value={clusterMembers} />
        <Stat label="Clusters" value={clusterCount} />
        <Stat label="Workshop check-ins" value={workshopAttendance} />
      </div>

      {myInvites.length ? (
        <TerminalPanel title="your.invites" accent="orange" className="mb-6">
          <ul className="space-y-3">
            {myInvites.map((inv) => {
              const cl = store.clusters.find((c) => c.id === inv.clusterId);
              return (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium">Invite to {cl?.name ?? "cluster"}</p>
                    {inv.note ? (
                      <p className="text-[12px] text-text-dim">{inv.note}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => respondClusterInvite(inv.id, "accepted")}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => respondClusterInvite(inv.id, "declined")}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </TerminalPanel>
      ) : null}

      {canManage ? (
        <TerminalPanel
          title="nominate.from.workshop"
          meta={`${nominateQueue.length} candidates`}
          accent="orange"
          className="mb-6"
        >
          <p className="mb-4 text-[13px] text-text-dim">
            After workshop / challenge attendance, nominate curious students into
            a cluster (invite by default — not open join).
          </p>
          {nominateQueue.length === 0 ? (
            <p className="text-[12px] text-text-mute">
              No pending nominees — check in attendees at a workshop, or they are
              already in a cluster / have a pending invite.
            </p>
          ) : (
            <ul className="space-y-3">
              {nominateQueue.map((c) => (
                <NominateRow
                  key={c.userId}
                  fullName={c.fullName}
                  eventCount={c.eventIds.length}
                  clusters={chapterClusters.map((cl) => ({
                    id: cl.id,
                    name: cl.name,
                  }))}
                  onNominate={(clusterId) => {
                    inviteToCluster({
                      clusterId,
                      userId: c.userId,
                      nominatedBy: session.userId,
                      note: "Nominated after workshop attendance",
                    });
                  }}
                />
              ))}
            </ul>
          )}
        </TerminalPanel>
      ) : null}

      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <TerminalPanel title="Engagement tiers" meta="derived">
          <ul className="divide-y divide-border">
            {EOS_COMMUNITY_TIERS.map((t) => (
              <li
                key={t.key}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span>
                  {t.label}
                  <span className="ml-2 text-[11px] text-text-dim">{t.blurb}</span>
                </span>
                <Badge tone="cyan">{byTier[t.key] ?? 0}</Badge>
              </li>
            ))}
          </ul>
        </TerminalPanel>

        <TerminalPanel title="Journey stages" meta="derived">
          <ul className="divide-y divide-border">
            {EOS_JOURNEY_STAGES.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span>{s.label}</span>
                <Badge tone="magenta">{byJourney[s.key] ?? 0}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-text-dim">
            Event ladder:{" "}
            {EOS_EVENT_PROGRESSION.map((s) => s.label).join(" → ")}
          </p>
        </TerminalPanel>
      </div>

      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <TerminalPanel title="Chapter standards">
          <ul className="divide-y divide-border">
            {standards.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 py-2.5 text-sm"
              >
                <span>{s.label}</span>
                {canManage ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      toggleChapterStandard(chapter.id, s.id, !s.done)
                    }
                  >
                    {s.done ? "Done" : "Mark"}
                  </Button>
                ) : (
                  <Badge tone={s.done ? "green" : "mute"}>
                    {s.done ? "done" : "open"}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </TerminalPanel>

        <TerminalPanel title="EOS metrics">
          <ul className="divide-y divide-border text-[13px]">
            <li className="flex justify-between py-2.5">
              <span>Students reached</span>
              <span>{members.length}</span>
            </li>
            <li className="flex justify-between py-2.5">
              <span>Workshop attendance</span>
              <span>{workshopAttendance}</span>
            </li>
            <li className="flex justify-between py-2.5">
              <span>Active+ members</span>
              <span>
                {
                  derivedMembers.filter((m) =>
                    ["active", "cluster", "executive", "campus_lead"].includes(
                      m.engagementTier,
                    ),
                  ).length
                }
              </span>
            </li>
            <li className="flex justify-between py-2.5">
              <span>Projects completed</span>
              <span>{projectsDone}</span>
            </li>
          </ul>
          <p className="mt-4 text-[11px] text-text-dim">
            Track also: {EOS_SUCCESS_METRICS.slice(5, 9).join(" · ")}
          </p>
        </TerminalPanel>
      </div>

      <TerminalPanel title="Activities" className="mb-8">
        <div className="flex flex-wrap gap-2">
          {EOS_ACTIVITIES.map((a) => (
            <Badge key={a} tone="mute">
              {a}
            </Badge>
          ))}
        </div>
      </TerminalPanel>

      <TerminalPanel title="Members" meta={`${members.length} · earned`}>
        <ul className="divide-y divide-border">
          {derivedMembers
            .slice()
            .sort((a, b) => a.fullName.localeCompare(b.fullName))
            .map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <Link
                  href={`/profile/${m.id}`}
                  className="font-medium text-[var(--accent)]"
                >
                  {m.fullName}
                </Link>
                <div className="flex gap-2">
                  <Badge tone="cyan">
                    {EOS_COMMUNITY_TIERS.find((t) => t.key === m.engagementTier)
                      ?.label ?? m.engagementTier}
                  </Badge>
                  <Badge tone="magenta">
                    {EOS_JOURNEY_STAGES.find((s) => s.key === m.journeyStage)
                      ?.label ?? m.journeyStage}
                  </Badge>
                </div>
              </li>
            ))}
        </ul>
      </TerminalPanel>

      {canManage && invites.length ? (
        <TerminalPanel title="pending.cluster.invites" className="mt-6">
          <ul className="space-y-2">
            {invites.map((inv) => {
              const user = store.profiles.find((p) => p.id === inv.userId);
              const cl = store.clusters.find((c) => c.id === inv.clusterId);
              return (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-bg shadow-[var(--shadow-sm)] px-3 py-2 text-sm"
                >
                  <span>
                    {user?.fullName} → {cl?.name}
                    <span className="ml-2 text-text-dim">{inv.note}</span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => respondClusterInvite(inv.id, "accepted")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => respondClusterInvite(inv.id, "declined")}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </TerminalPanel>
      ) : null}
    </div>
  );
}

function NominateRow({
  fullName,
  eventCount,
  clusters,
  onNominate,
}: {
  fullName: string;
  eventCount: number;
  clusters: { id: string; name: string }[];
  onNominate: (clusterId: string) => void;
}) {
  const [clusterId, setClusterId] = useState(clusters[0]?.id ?? "");

  return (
    <li className="flex flex-wrap items-end justify-between gap-3 border-b border-border py-3 last:border-0">
      <div>
        <p className="font-medium">{fullName}</p>
        <p className="text-[12px] text-text-dim">
          {eventCount} workshop / challenge check-in
          {eventCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <FieldLabel>Cluster</FieldLabel>
          <Select
            value={clusterId}
            onChange={(e) => setClusterId(e.target.value)}
          >
            {clusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="primary"
          disabled={!clusterId}
          onClick={() => onNominate(clusterId)}
        >
          Nominate
        </Button>
      </div>
    </li>
  );
}
