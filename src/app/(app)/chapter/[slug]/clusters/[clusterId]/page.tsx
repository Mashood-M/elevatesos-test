"use client";

import { use, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import { useStore, useCurrentUser } from "@/context/store-context";
import { isHqRole } from "@/lib/permissions";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";

export default function ClusterDetailPage({
  params,
}: {
  params: Promise<{ slug: string; clusterId: string }>;
}) {
  const { slug, clusterId } = use(params);
  const {
    store,
    updateCluster,
    joinCluster,
    leaveCluster,
    addClusterMember,
    removeClusterMember,
    toggleRoadmapWeek,
    addRoadmapWeek,
    removeRoadmapWeek,
    inviteToCluster,
    submitClusterChallenge,
  } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);
  const cluster = store.clusters.find((c) => c.id === clusterId);
  const [weekTitle, setWeekTitle] = useState("");
  const [addMemberId, setAddMemberId] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");
  const [challengeNote, setChallengeNote] = useState("");
  const [flash, setFlash] = useState("");

  if (!chapter || !cluster || cluster.chapterId !== chapter.id) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold">Cluster not found</p>
        <Link href={`/chapter/${slug}/clusters`} className="mt-2 inline-block text-[var(--accent)]">
          Back to clusters
        </Link>
      </div>
    );
  }

  const canManage =
    isHqRole(session.roleKey) ||
    isFacultyRole(session.roleKey) ||
    isExecutiveRole(session.roleKey);
  const isMember = cluster.memberIds.includes(session.userId);
  const members = store.profiles.filter((p) => p.chapterId === chapter.id);
  const nonMembers = members.filter((p) => !cluster.memberIds.includes(p.id));
  const projects = store.projects.filter((p) => p.clusterId === cluster.id);
  const doneWeeks = cluster.roadmap.filter((r) => r.done).length;
  const progress = cluster.roadmap.length
    ? (doneWeeks / cluster.roadmap.length) * 100
    : 0;

  return (
    <div>
      <PageHeader
        title={cluster.name}
        description={cluster.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/chapter/${slug}/clusters`}>
              <Button variant="ghost">All clusters</Button>
            </Link>
            {!isMember ? (
              (cluster.accessMode ?? "invite") === "open" ? (
                <Button
                  variant="orange"
                  onClick={() => joinCluster(cluster.id, session.userId)}
                >
                  Join cluster
                </Button>
              ) : null
            ) : (
              <Button
                variant="ghost"
                onClick={() => leaveCluster(cluster.id, session.userId)}
              >
                Leave
              </Button>
            )}
          </div>
        }
      />

      {flash ? (
        <p className="mb-4 text-[13px] text-[var(--accent)]">{flash}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="cyan">{cluster.accessMode ?? "invite"} access</Badge>
        {(cluster.responsibilities ?? []).map((r) => (
          <Badge key={r} tone="magenta">
            {r}
          </Badge>
        ))}
      </div>

      {!isMember && (cluster.accessMode ?? "invite") === "challenge" ? (
        <TerminalPanel title="challenge.path" accent="orange" className="mb-4">
          <p className="text-[13px] text-text-dim">
            {cluster.challengePrompt ??
              "Complete a challenge to request cluster access."}
          </p>
          <div className="mt-3">
            <FieldLabel>Your submission note</FieldLabel>
            <TextArea
              rows={2}
              value={challengeNote}
              onChange={(e) => setChallengeNote(e.target.value)}
              placeholder="What you built / learned…"
            />
          </div>
          <Button
            variant="orange"
            className="mt-3"
            onClick={() => {
              const ok = submitClusterChallenge({
                clusterId: cluster.id,
                userId: session.userId,
                note: challengeNote,
              });
              setFlash(
                ok
                  ? "Challenge submitted — execs will review."
                  : "Could not submit challenge.",
              );
            }}
          >
            Submit challenge
          </Button>
        </TerminalPanel>
      ) : null}

      {!isMember && (cluster.accessMode ?? "invite") === "invite" ? (
        <TerminalPanel title="invite.only" className="mb-4">
          <p className="text-[13px] text-text-dim">
            This cluster is invite-only (EOS talent path). Ask a CR or exec after
            workshops — or wait for a nomination.
          </p>
        </TerminalPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {canManage ? (
            <TerminalPanel title="Settings">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Access mode</FieldLabel>
                  <Select
                    value={cluster.accessMode ?? "invite"}
                    onChange={(e) =>
                      updateCluster(cluster.id, {
                        accessMode: e.target.value as
                          | "open"
                          | "invite"
                          | "challenge",
                      })
                    }
                  >
                    <option value="invite">Invite</option>
                    <option value="challenge">Challenge</option>
                    <option value="open">Open (discouraged)</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Invite member</FieldLabel>
                  <div className="flex gap-2">
                    <Select
                      value={inviteUserId}
                      onChange={(e) => setInviteUserId(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {nonMembers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (!inviteUserId) return;
                        const ok = inviteToCluster({
                          clusterId: cluster.id,
                          userId: inviteUserId,
                          note: "Talent nomination",
                        });
                        setFlash(ok ? "Invite sent" : "Could not invite");
                        setInviteUserId("");
                      }}
                    >
                      Invite
                    </Button>
                  </div>
                </div>
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    defaultValue={cluster.name}
                    onBlur={(e) =>
                      updateCluster(cluster.id, { name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Slug</FieldLabel>
                  <Input
                    defaultValue={cluster.slug}
                    onBlur={(e) =>
                      updateCluster(cluster.id, { slug: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Description</FieldLabel>
                  <TextArea
                    rows={3}
                    defaultValue={cluster.description}
                    onBlur={(e) =>
                      updateCluster(cluster.id, {
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Leader</FieldLabel>
                  <Select
                    value={cluster.leaderId ?? ""}
                    onChange={(e) =>
                      updateCluster(cluster.id, {
                        leaderId: e.target.value || undefined,
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel>Faculty</FieldLabel>
                  <Select
                    value={cluster.facultyId ?? ""}
                    onChange={(e) =>
                      updateCluster(cluster.id, {
                        facultyId: e.target.value || undefined,
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </TerminalPanel>
          ) : null}

          <TerminalPanel title="Roadmap" meta={`${doneWeeks}/${cluster.roadmap.length} done`}>
            <ProgressBar value={progress} label="Progress" />
            <ul className="mt-4 space-y-2">
              {cluster.roadmap.map((week) => (
                <li
                  key={week.week}
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] rounded-[14px] bg-bg shadow-[var(--shadow-sm)] px-3 py-2"
                >
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => toggleRoadmapWeek(cluster.id, week.week)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] disabled:cursor-default"
                  >
                    <span className={week.done ? "text-[var(--success)]" : "text-text-mute"}>
                      {week.done ? "✓" : "○"}
                    </span>
                    <span>
                      W{week.week}: {week.title}
                    </span>
                  </button>
                  {canManage ? (
                    <button
                      type="button"
                      className="text-[11px] text-text-mute hover:text-[var(--danger)]"
                      onClick={() => removeRoadmapWeek(cluster.id, week.week)}
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            {canManage ? (
              <div className="mt-3 flex gap-2">
                <Input
                  value={weekTitle}
                  onChange={(e) => setWeekTitle(e.target.value)}
                  placeholder="New week title"
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!weekTitle.trim()) return;
                    addRoadmapWeek(cluster.id, weekTitle.trim());
                    setWeekTitle("");
                  }}
                >
                  Add week
                </Button>
              </div>
            ) : null}
          </TerminalPanel>
        </div>

        <div className="space-y-4">
          <TerminalPanel title="Members" meta={`${cluster.memberIds.length}`}>
            <ul className="space-y-2">
              {cluster.memberIds.map((id) => {
                const m = store.profiles.find((p) => p.id === id);
                if (!m) return null;
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 text-[13px]"
                  >
                    <Link
                      href={`/profile/${id}`}
                      className="font-medium hover:text-[var(--accent)]"
                    >
                      {m.fullName}
                      {cluster.leaderId === id ? (
                        <Badge tone="magenta" className="ml-2">
                          Lead
                        </Badge>
                      ) : null}
                    </Link>
                    {canManage ? (
                      <button
                        type="button"
                        className="text-[11px] text-text-mute hover:text-[var(--danger)]"
                        onClick={() => removeClusterMember(cluster.id, id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {canManage && nonMembers.length > 0 ? (
              <div className="mt-3 flex gap-2">
                <Select
                  value={addMemberId}
                  onChange={(e) => setAddMemberId(e.target.value)}
                >
                  <option value="">Add member…</option>
                  {nonMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!addMemberId) return;
                    addClusterMember(cluster.id, addMemberId);
                    setAddMemberId("");
                  }}
                >
                  Add
                </Button>
              </div>
            ) : null}
          </TerminalPanel>

          <TerminalPanel title="Projects" meta={`${projects.length}`}>
            {projects.length === 0 ? (
              <p className="text-[13px] text-text-dim">No projects linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/chapter/${slug}/projects`}
                      className="text-[13px] font-medium hover:text-[var(--accent)]"
                    >
                      {p.title}
                      <span className="ml-2 text-[11px] text-text-mute">
                        {p.stage}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TerminalPanel>
        </div>
      </div>
    </div>
  );
}
