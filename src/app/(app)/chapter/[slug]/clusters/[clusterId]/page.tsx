"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import { useStore, useCurrentUser } from "@/context/store-context";
import { isHqRole } from "@/lib/permissions";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";
import { findChapterBySlugOrId } from "@/lib/chapters";
import { formatSlugInput, finalizeSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/client";
import { formatDate, cn } from "@/lib/utils";
import type { Profile } from "@/types";

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
  const chapter = findChapterBySlugOrId(store.chapters, slug);
  const cluster = store.clusters.find((c) => c.id === clusterId);
  const [weekTitle, setWeekTitle] = useState("");
  const [addMemberId, setAddMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");
  const [challengeNote, setChallengeNote] = useState("");
  const [flash, setFlash] = useState("");
  const [discordGateOpen, setDiscordGateOpen] = useState(false);

  const currentUserProfile = store.profiles.find((p) => p.id === session.userId);
  const isDiscordConnected = Boolean(
    currentUserProfile?.discordConnected ||
    (currentUserProfile as Record<string, unknown> | undefined)?.discord_connected ||
    currentUserProfile?.discordUserId ||
    (currentUserProfile as Record<string, unknown> | undefined)?.discord_user_id
  );
  const profileHref = currentUserProfile?.elevatesId
    ? `/profile/${currentUserProfile.elevatesId}`
    : session.userId
    ? `/profile/${session.userId}`
    : "/profile";

  function handleJoinCluster() {
    if (!isDiscordConnected) {
      setDiscordGateOpen(true);
      setFlash("Join the Elevates Discord server and connect your account first to join this cluster.");
      return;
    }
    if (!cluster) return;
    joinCluster(cluster.id, session.userId);
  }

  function handleSubmitChallenge() {
    if (!isDiscordConnected) {
      setDiscordGateOpen(true);
      setFlash("Join the Elevates Discord server and connect your account first to join this cluster.");
      return;
    }
    if (!cluster) return;
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
  }

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
  const filteredNonMembers = useMemo(() => {
    if (!memberSearch.trim()) return nonMembers;
    const q = memberSearch.toLowerCase().trim();
    return nonMembers.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.elevatesId && m.elevatesId.toLowerCase().includes(q)),
    );
  }, [nonMembers, memberSearch]);
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
                  onClick={handleJoinCluster}
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
        <div
          className={cn(
            "mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-3.5 text-xs",
            flash.includes("Discord")
              ? "border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              : "text-[var(--accent)]",
          )}
        >
          <span>{flash}</span>
          {flash.includes("Discord") ? (
            <Link href={profileHref}>
              <Button variant="orange" size="sm" className="shrink-0 text-xs">
                Connect Discord
              </Button>
            </Link>
          ) : null}
        </div>
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
            onClick={handleSubmitChallenge}
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
                    onChange={(e) => {
                      e.target.value = formatSlugInput(e.target.value);
                    }}
                    onBlur={(e) => {
                      const finalSlug = finalizeSlug(e.target.value);
                      e.target.value = finalSlug;
                      if (finalSlug !== cluster.slug) {
                        updateCluster(cluster.id, { slug: finalSlug });
                      }
                    }}
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

          <ClusterTasksSection
            clusterId={cluster.id}
            memberIds={cluster.memberIds}
            profiles={store.profiles}
          />

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
                      href={`/profile/${m.elevatesId || id}`}
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
              <div className="mt-3 space-y-2">
                {nonMembers.length > 3 && (
                  <Input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search students to add..."
                    className="text-xs h-8 w-full"
                  />
                )}
                <div className="flex gap-2">
                  <Select
                    value={addMemberId}
                    onChange={(e) => setAddMemberId(e.target.value)}
                    className="text-xs"
                  >
                    <option value="">
                      {filteredNonMembers.length === 0
                        ? "No students match search…"
                        : "Select member to add…"}
                    </option>
                    {filteredNonMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.elevatesId || m.email})
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="ghost"
                    className="text-xs shrink-0"
                    disabled={!addMemberId}
                    onClick={() => {
                      if (!addMemberId) return;
                      addClusterMember(cluster.id, addMemberId);
                      setAddMemberId("");
                      setMemberSearch("");
                    }}
                  >
                    Add
                  </Button>
                </div>
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

      {/* Discord Connection Required Modal */}
      <Dialog
        open={discordGateOpen}
        onClose={() => setDiscordGateOpen(false)}
        title="Discord Connection Required"
        description="Connect your Discord account to join Elevates clusters."
        className="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setDiscordGateOpen(false)}>
              Cancel
            </Button>
            <Link href={profileHref}>
              <Button variant="orange">
                Connect Discord
              </Button>
            </Link>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-[13px] text-text-dim leading-relaxed">
            Join the Elevates Discord server and connect your account first to join this cluster.
          </p>
        </div>
      </Dialog>
    </div>
  );
}

interface ClusterTask {
  id: string;
  cluster_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: string;
  forum_thread_id?: string | null;
  created_by?: string | null;
  created_at?: string;
}

interface TaskSubmission {
  id: string;
  task_id: string;
  os_user_id: string;
  discord_message_id?: string | null;
  status: string;
  marked_by?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

/**
 * Isolated Read-Only Section: Cluster Weekly Tasks & Member Submissions
 * Displays active cluster tasks and tracks member completion status from Discord.
 */
function ClusterTasksSection({
  clusterId,
  memberIds,
  profiles,
}: {
  clusterId: string;
  memberIds: string[];
  profiles: Profile[];
}) {
  const [tasks, setTasks] = useState<ClusterTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadTasksAndSubmissions() {
      setLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) {
          if (isMounted) setLoading(false);
          return;
        }

        const { data: taskData, error: taskErr } = await supabase
          .from("cluster_tasks")
          .select("id, cluster_id, title, description, due_date, status, forum_thread_id, created_by, created_at")
          .eq("cluster_id", clusterId)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (taskErr) {
          // Gracefully handle schema cache / missing table without crashing
          if (isMounted) {
            setTasks([]);
            setLoading(false);
          }
          return;
        }

        const typedTasks = (taskData as unknown as ClusterTask[]) || [];
        if (isMounted) setTasks(typedTasks);

        if (typedTasks.length > 0) {
          const taskIds = typedTasks.map((t: ClusterTask) => t.id);
          const { data: subData, error: subErr } = await supabase
            .from("task_submissions")
            .select("id, task_id, os_user_id, discord_message_id, status, marked_by, completed_at, created_at")
            .in("task_id", taskIds)
            .eq("status", "completed");

          if (subErr) {
            if (isMounted) setSubmissions([]);
          } else {
            if (isMounted) setSubmissions((subData as unknown as TaskSubmission[]) || []);
          }
        } else {
          if (isMounted) setSubmissions([]);
        }
      } catch (err) {
        console.warn("Cluster tasks fetch exception:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTasksAndSubmissions();

    return () => {
      isMounted = false;
    };
  }, [clusterId]);

  return (
    <TerminalPanel
      title="Cluster Tasks"
      meta={tasks.length > 0 ? `${tasks.length} active · Discord Synced` : "Discord Synced"}
    >
      {loading ? (
        <div className="py-6 text-center text-[13px] text-text-dim animate-pulse">
          Loading tasks…
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-[13px] text-text-dim">
          No active weekly tasks right now. Active tasks assigned in Discord will appear here.
        </p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const completedCount = memberIds.filter((mId) =>
              submissions.some(
                (s) => s.task_id === task.id && s.os_user_id === mId && s.status === "completed",
              ),
            ).length;

            return (
              <div
                key={task.id}
                className="rounded-[14px] bg-bg p-4 shadow-[var(--shadow-sm)] border border-border/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-text text-[14px] leading-snug">
                      {task.title}
                    </h4>
                    {task.due_date ? (
                      <p className="text-[11px] font-mono text-text-mute mt-1">
                        Due: {formatDate(task.due_date)}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone="green">Active</Badge>
                </div>

                {task.description ? (
                  <p className="text-[12px] text-text-dim leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                ) : null}

                <div className="pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between text-[11px] font-medium text-text-mute mb-2">
                    <span className="uppercase tracking-wider">Member Progress</span>
                    <span className="font-mono">
                      {completedCount}/{memberIds.length} completed
                    </span>
                  </div>

                  {memberIds.length === 0 ? (
                    <p className="text-[12px] text-text-dim italic">
                      No members in this cluster yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {memberIds.map((mId) => {
                        const profile = profiles.find((p) => p.id === mId);
                        const isCompleted = submissions.some(
                          (s) =>
                            s.task_id === task.id &&
                            s.os_user_id === mId &&
                            s.status === "completed",
                        );

                        return (
                          <li
                            key={mId}
                            className="flex items-center justify-between py-1 text-[13px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] select-none" aria-hidden="true">
                                {isCompleted ? "✅" : "⬜"}
                              </span>
                              <span
                                className={cn(
                                  "font-medium",
                                  isCompleted ? "text-text" : "text-text-dim",
                                )}
                              >
                                {profile?.fullName || "Member"}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "font-mono text-[10px]",
                                isCompleted
                                  ? "text-[var(--success)] font-semibold"
                                  : "text-text-mute",
                              )}
                            >
                              {isCompleted ? "Done" : "Pending"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TerminalPanel>
  );
}
