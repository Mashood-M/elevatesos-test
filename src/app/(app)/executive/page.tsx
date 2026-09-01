"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useStore, useCurrentUser } from "@/context/store-context";
import { calculateChapterActivityScore } from "@/lib/analytics";
import { activityLabel, executiveScore, hasPermission } from "@/lib/permissions";
import { roleKeyLabel } from "@/lib/leadership";
import { formatDateTime } from "@/lib/utils";
import type { RoleKey } from "@/types";

const roleConfig: Partial<
  Record<
    RoleKey,
    { title: string; accent: "cyan" | "magenta" | "green" | "orange"; focus: string[] }
  >
> = {
  chairman: {
    title: "Chairman (Campus Lead) Desk",
    accent: "cyan",
    focus: [
      "Executive Team oversight & role delegation",
      "Chapter activity & strategic roadmap",
      "Leadership term cycle & monthly reports",
      "Executive approvals & team governance",
    ],
  },
  vice_chairman: {
    title: "Vice Chairman Desk",
    accent: "cyan",
    focus: [
      "Executive team backup & delegation",
      "Chapter operations oversight",
      "Event support & report drafts",
      "Inter-team coordination",
    ],
  },
  secretary: {
    title: "Secretary Desk",
    accent: "magenta",
    focus: [
      "Event operations & registrations",
      "Certificate issuance & report filings",
      "Task pipeline & executive minutes",
      "Compliance & chapter logs",
    ],
  },
  joint_secretary: {
    title: "Joint Secretary Desk",
    accent: "magenta",
    focus: [
      "Registration review & support",
      "Event logistics & asset management",
      "Task pipeline assistance",
      "Student communication",
    ],
  },
  technical_lead: {
    title: "Technical Team Head Desk",
    accent: "green",
    focus: [
      "Technical project builds & architecture",
      "Hackathon & coding workshop delivery",
      "Technical team member mentoring",
      "Platform & infrastructure support",
    ],
  },
  technical_team: {
    title: "Technical Team Desk",
    accent: "green",
    focus: [
      "Software & web development",
      "Hands-on coding session support",
      "Tech task execution",
      "Lab & demo setups",
    ],
  },
  media_lead: {
    title: "Media Team Head Desk",
    accent: "orange",
    focus: [
      "Creative direction & brand assets",
      "Event photo/video coverage schedule",
      "Media team (8 members) task distribution",
      "Social campaigns & marketing collateral",
    ],
  },
  media_team: {
    title: "Media Team Desk",
    accent: "orange",
    focus: [
      "Poster design & creative assets",
      "Photography & video editing",
      "Social media post creation",
      "Event live coverage",
    ],
  },
  innovation_lead: {
    title: "Innovation Team Head Desk",
    accent: "cyan",
    focus: [
      "AI & emerging tech prototyping",
      "Project incubation & idea sprints",
      "Innovation team mentorship",
      "Industry challenges & demo days",
    ],
  },
  innovation_team: {
    title: "Innovation Team Desk",
    accent: "cyan",
    focus: [
      "Proof of concept development",
      "Research & novelty experiments",
      "Idea pitches & hackathon participation",
      "Prototype demonstrations",
    ],
  },
  elevates_coordinator: {
    title: "Coordinator Desk",
    accent: "green",
    focus: [
      "Cluster roadmaps & track sync",
      "Workshop delivery & labs",
      "Member engagement & community",
      "Project showcase tracking",
    ],
  },
  class_representative: {
    title: "Class Rep Desk",
    accent: "orange",
    focus: [
      "Student outreach & class communication",
      "Attendance check-in verification",
      "Class lists & registration review",
      "Feedback collection",
    ],
  },
};

export default function ExecutivePage() {
  const { store } = useStore();
  const { profile, role, session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.id === session.chapterId);
  const config = roleConfig[session.roleKey] ?? {
    title: "Executive Desk",
    accent: "cyan" as const,
    focus: ["Chapter operations"],
  };

  const isChairman =
    session.roleKey === "chairman" ||
    session.roleKey === "founder" ||
    session.roleKey === "hq_admin";

  const [selectedSubTeam, setSelectedSubTeam] = useState<string>("all");

  const score = profile ? executiveScore(store, profile.id) : 0;
  const myTasks = store.tasks.filter(
    (t) => t.assigneeId === session.userId && t.status !== "completed",
  );
  const chapterEvents = store.events.filter(
    (e) => e.chapterId === session.chapterId,
  );
  const draftEvents = chapterEvents.filter((e) => e.status === "draft");
  const pendingRegs = store.registrations.filter((r) => {
    const ev = chapterEvents.find((e) => e.id === r.eventId);
    return !!ev && r.status === "reviewed";
  });
  const reviewRegs = store.registrations.filter((r) => {
    const ev = chapterEvents.find((e) => e.id === r.eventId);
    return !!ev && r.status === "pending";
  });

  const canApproveRegs = hasPermission(store, session.roleKey, "registration.approve");
  const canReviewRegs = hasPermission(store, session.roleKey, "registration.review");

  // Current active leadership term & executive assignments
  const activeTerm = useMemo(() => {
    if (!chapter) return null;
    return (
      store.leadershipTerms.find(
        (t) => t.chapterId === chapter.id && t.status === "active",
      ) ?? null
    );
  }, [store.leadershipTerms, chapter]);

  const activeAssignments = useMemo(() => {
    if (!activeTerm) return [];
    return store.leadershipAssignments.filter((a) => a.termId === activeTerm.id);
  }, [store.leadershipAssignments, activeTerm]);

  // Executive Team categorization
  const executiveHierarchy = useMemo(() => {
    const chairmen = activeAssignments.filter((a) => a.roleKey === "chairman");
    const viceChairmen = activeAssignments.filter((a) => a.roleKey === "vice_chairman");
    const secretariat = activeAssignments.filter(
      (a) => a.roleKey === "secretary" || a.roleKey === "joint_secretary",
    );
    const mediaTeam = activeAssignments.filter(
      (a) => a.roleKey === "media_lead" || a.roleKey === "media_team",
    );
    const technicalTeam = activeAssignments.filter(
      (a) => a.roleKey === "technical_lead" || a.roleKey === "technical_team",
    );
    const innovationTeam = activeAssignments.filter(
      (a) => a.roleKey === "innovation_lead" || a.roleKey === "innovation_team",
    );
    const others = activeAssignments.filter(
      (a) =>
        ![
          "chairman",
          "vice_chairman",
          "secretary",
          "joint_secretary",
          "media_lead",
          "media_team",
          "technical_lead",
          "technical_team",
          "innovation_lead",
          "innovation_team",
        ].includes(a.roleKey),
    );

    return {
      chairmen,
      viceChairmen,
      secretariat,
      mediaTeam,
      technicalTeam,
      innovationTeam,
      others,
    };
  }, [activeAssignments]);

  const subTeamCategories = [
    { id: "all", label: "All Executive Roles", count: activeAssignments.length },
    { id: "vice_chairmen", label: "Vice Chairmen (2+)", count: executiveHierarchy.viceChairmen.length },
    { id: "secretariat", label: "Secretariat", count: executiveHierarchy.secretariat.length },
    { id: "media", label: "Media Team (2 Heads + 8 Members)", count: executiveHierarchy.mediaTeam.length },
    { id: "technical", label: "Technical Team (2 Heads + Members)", count: executiveHierarchy.technicalTeam.length },
    { id: "innovation", label: "Innovation Team (2 Heads + Members)", count: executiveHierarchy.innovationTeam.length },
  ];

  const filteredAssignments = useMemo(() => {
    switch (selectedSubTeam) {
      case "vice_chairmen":
        return executiveHierarchy.viceChairmen;
      case "secretariat":
        return executiveHierarchy.secretariat;
      case "media":
        return executiveHierarchy.mediaTeam;
      case "technical":
        return executiveHierarchy.technicalTeam;
      case "innovation":
        return executiveHierarchy.innovationTeam;
      default:
        return activeAssignments;
    }
  }, [selectedSubTeam, executiveHierarchy, activeAssignments]);

  return (
    <div>
      <PageHeader
        eyebrow="Home"
        title={config.title}
        description={`Your action queue, ${profile?.fullName?.split(" ")[0] ?? "lead"}. ${role?.description ?? "Focus on your open tasks and team execution."}`}
        actions={
          chapter ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/chapter/${chapter.slug}/leadership`}>
                <Button variant="primary">Manage Leadership</Button>
              </Link>
              <Link href={`/chapter/${chapter.slug}`}>
                <Button variant="ghost">Open chapter</Button>
              </Link>
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Executive score" value={score} accent="orange" />
        <Stat label="Open tasks" value={myTasks.length} />
        {canApproveRegs ? (
          <Stat label="Regs to approve" value={pendingRegs.length} />
        ) : canReviewRegs ? (
          <Stat label="Regs to review" value={reviewRegs.length} />
        ) : (
          <Stat label="Events" value={chapterEvents.length} />
        )}
        <Stat
          label="Activity score"
          value={chapter ? `${calculateChapterActivityScore(store, chapter.id)}%` : "—"}
          hint={chapter ? activityLabel(calculateChapterActivityScore(store, chapter.id)) : undefined}
        />
      </div>

      {/* Chairman Executive Team Sub-Roles Inspector */}
      {isChairman && chapter ? (
        <div className="mt-6">
          <TerminalPanel
            title="Executive Team Hierarchy & Role Inspector"
            meta={activeTerm ? activeTerm.title : "No active cycle"}
            action={
              <Link href={`/chapter/${chapter.slug}/leadership`}>
                <Button variant="ghost">Assign / Split Roles →</Button>
              </Link>
            }
          >
            <div className="space-y-4">
              <p className="text-[13px] text-text-dim">
                As <strong className="text-[var(--accent)]">Chairman</strong>, you oversee all sub-roles across the Executive Team. You can delegate duties, split responsibilities across Vice Chairmen, Secretariat, and functional Sub-Teams (Media, Technical, Innovation), and inspect their tasks and execution.
              </p>

              {/* Quick Sub-Role Hierarchy Summary */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-[12px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan">
                      👑 Chairman
                    </span>
                    <Badge tone="cyan">{executiveHierarchy.chairmen.length} Head</Badge>
                  </div>
                  <p className="mt-1.5 text-[12px] text-text-dim">
                    Campus Chapter Lead & Executive Head
                  </p>
                  <div className="mt-2 text-[13px] font-medium">
                    {executiveHierarchy.chairmen.length > 0 ? (
                      executiveHierarchy.chairmen.map((c) => {
                        const u = store.profiles.find((p) => p.id === c.userId);
                        return <div key={c.id} className="text-text">{u?.fullName}</div>;
                      })
                    ) : (
                      <span className="text-text-mute italic">Vacant</span>
                    )}
                  </div>
                </div>

                <div className="rounded-[12px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan">
                      🛡️ Vice Chairman
                    </span>
                    <Badge tone="cyan">{executiveHierarchy.viceChairmen.length} (2+ allowed)</Badge>
                  </div>
                  <p className="mt-1.5 text-[12px] text-text-dim">
                    Deputy Campus Leads & Chapter Backup
                  </p>
                  <div className="mt-2 text-[13px] font-medium">
                    {executiveHierarchy.viceChairmen.length > 0 ? (
                      executiveHierarchy.viceChairmen.map((vc) => {
                        const u = store.profiles.find((p) => p.id === vc.userId);
                        return <div key={vc.id} className="text-text">{u?.fullName}</div>;
                      })
                    ) : (
                      <span className="text-text-mute italic">No Vice Chairmen assigned</span>
                    )}
                  </div>
                </div>

                <div className="rounded-[12px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-magenta">
                      📋 Secretariat
                    </span>
                    <Badge tone="magenta">{executiveHierarchy.secretariat.length} Officers</Badge>
                  </div>
                  <p className="mt-1.5 text-[12px] text-text-dim">
                    Secretary & Joint Secretary
                  </p>
                  <div className="mt-2 text-[13px] font-medium">
                    {executiveHierarchy.secretariat.length > 0 ? (
                      executiveHierarchy.secretariat.map((s) => {
                        const u = store.profiles.find((p) => p.id === s.userId);
                        return (
                          <div key={s.id} className="text-text">
                            {u?.fullName} <span className="text-[11px] text-text-mute">({s.title})</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-text-mute italic">No Secretary assigned</span>
                    )}
                  </div>
                </div>

                <div className="rounded-[12px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-orange">
                      📸 Media Team
                    </span>
                    <Badge tone="orange">{executiveHierarchy.mediaTeam.length} / 10 Target</Badge>
                  </div>
                  <p className="mt-1.5 text-[12px] text-text-dim">
                    2 Heads + 8 Members (Content, Design, Coverage)
                  </p>
                  <div className="mt-2 text-[13px] font-medium">
                    {executiveHierarchy.mediaTeam.length > 0 ? (
                      <span className="text-text">{executiveHierarchy.mediaTeam.length} active members</span>
                    ) : (
                      <span className="text-text-mute italic">No media assignments</span>
                    )}
                  </div>
                </div>

                <div className="rounded-[12px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-green">
                      💻 Technical Team
                    </span>
                    <Badge tone="green">{executiveHierarchy.technicalTeam.length} Members</Badge>
                  </div>
                  <p className="mt-1.5 text-[12px] text-text-dim">
                    2 Heads + Members (Platform, Software, Infra)
                  </p>
                  <div className="mt-2 text-[13px] font-medium">
                    {executiveHierarchy.technicalTeam.length > 0 ? (
                      <span className="text-text">{executiveHierarchy.technicalTeam.length} active members</span>
                    ) : (
                      <span className="text-text-mute italic">No tech assignments</span>
                    )}
                  </div>
                </div>

                <div className="rounded-[12px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan">
                      🚀 Innovation Team
                    </span>
                    <Badge tone="cyan">{executiveHierarchy.innovationTeam.length} Members</Badge>
                  </div>
                  <p className="mt-1.5 text-[12px] text-text-dim">
                    2 Heads + Members (AI Labs, Hackathons, Ideas)
                  </p>
                  <div className="mt-2 text-[13px] font-medium">
                    {executiveHierarchy.innovationTeam.length > 0 ? (
                      <span className="text-text">{executiveHierarchy.innovationTeam.length} active members</span>
                    ) : (
                      <span className="text-text-mute italic">No innovation assignments</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-Team Filter Tabs */}
              <div className="mt-4 flex flex-wrap gap-2 border-b border-border/80 pb-3">
                {subTeamCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedSubTeam(cat.id)}
                    className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all ${
                      selectedSubTeam === cat.id
                        ? "bg-[var(--accent)] text-black"
                        : "bg-bg text-text-dim hover:text-text hover:bg-bg-hover"
                    }`}
                  >
                    {cat.label} ({cat.count})
                  </button>
                ))}
              </div>

              {/* Detailed Member Table */}
              <div className="space-y-2">
                {filteredAssignments.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-text-dim">
                    No members assigned to this category in the current active term.
                  </div>
                ) : (
                  filteredAssignments.map((a) => {
                    const u = store.profiles.find((p) => p.id === a.userId);
                    const userTasks = store.tasks.filter((t) => t.assigneeId === a.userId);
                    const pendingTasks = userTasks.filter((t) => t.status !== "completed");
                    const userScore = u ? executiveScore(store, u.id) : 0;

                    return (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-bg px-4 py-3 shadow-[var(--shadow-sm)]"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text">{u?.fullName ?? "Unknown"}</span>
                            <Badge tone="cyan">{a.title}</Badge>
                            <span className="text-[11px] uppercase text-text-mute">
                              [{roleKeyLabel(a.roleKey)}]
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-text-dim">
                            {u?.email ?? "No email"} · {u?.department ?? "Chapter Member"}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-[12px]">
                          <span className="text-text-dim">
                            Tasks: <strong className="text-text">{pendingTasks.length} open</strong> / {userTasks.length} total
                          </span>
                          <span className="text-text-dim">
                            Score: <strong className="text-orange">{userScore}</strong>
                          </span>
                          <Link href={`/profile/${a.userId}`}>
                            <Button variant="ghost" className="text-[11px] py-1 px-2.5">
                              Inspect Profile
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TerminalPanel>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <TerminalPanel title="Role focus">
          <ul className="divide-y divide-border/80 text-[13px]">
            {config.focus.map((f) => (
              <li key={f} className="py-2.5">
                {f}
              </li>
            ))}
          </ul>
          {chapter ? (
            <div className="mt-4">
              <ProgressBar
                value={calculateChapterActivityScore(store, chapter.id)}
                label={activityLabel(calculateChapterActivityScore(store, chapter.id))}
              />
            </div>
          ) : null}
        </TerminalPanel>

        <TerminalPanel title="Action queue">
          <div className="space-y-3 text-[13px]">
            {chapter && draftEvents.length > 0
              ? draftEvents.slice(0, 3).map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/chapter/${chapter.slug}/events/${ev.id}`}
                    className="block rounded-[14px] bg-bg px-4 py-3 hover:bg-bg-hover"
                  >
                    <p className="font-medium text-[var(--accent)]">
                      Draft: {ev.title}
                    </p>
                    <p className="mt-1 text-[11px] text-text-mute">
                      Publish to open registration →
                    </p>
                  </Link>
                ))
              : null}
            {chapter && canApproveRegs
              ? pendingRegs.slice(0, 3).map((r) => {
                  const ev = chapterEvents.find((e) => e.id === r.eventId);
                  if (!ev) return null;
                  return (
                    <Link
                      key={r.id}
                      href={`/chapter/${chapter.slug}/events/${ev.id}`}
                      className="block rounded-[14px] bg-bg px-4 py-3 hover:bg-bg-hover"
                    >
                      <p className="font-medium text-[var(--accent)]">
                        Approve registration — {ev.title}
                      </p>
                      <p className="mt-1 text-[11px] text-text-mute">
                        Reviewed queue →
                      </p>
                    </Link>
                  );
                })
              : null}
            {chapter && canReviewRegs && !canApproveRegs
              ? reviewRegs.slice(0, 3).map((r) => {
                  const ev = chapterEvents.find((e) => e.id === r.eventId);
                  if (!ev) return null;
                  return (
                    <Link
                      key={r.id}
                      href={`/chapter/${chapter.slug}/events/${ev.id}`}
                      className="block rounded-[14px] bg-bg px-4 py-3 hover:bg-bg-hover"
                    >
                      <p className="font-medium text-[var(--accent)]">
                        Review registration — {ev.title}
                      </p>
                      <p className="mt-1 text-[11px] text-text-mute">
                        Pending CR review →
                      </p>
                    </Link>
                  );
                })
              : null}
            {myTasks.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={chapter ? `/chapter/${chapter.slug}/tasks` : "#"}
                className="flex justify-between border-b border-border/80 py-2 hover:text-[var(--accent)]"
              >
                <span>{t.title}</span>
                <Badge tone={t.status === "in_progress" ? "cyan" : "orange"}>
                  {t.status}
                </Badge>
              </Link>
            ))}
            {myTasks.length === 0 &&
            draftEvents.length === 0 &&
            !(canApproveRegs && pendingRegs.length) &&
            !(canReviewRegs && !canApproveRegs && reviewRegs.length) ? (
              <p className="text-text-dim">Queue clear — no drafts or regs waiting.</p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[12px]">
            {chapter ? (
              <>
                <Link
                  href={`/chapter/${chapter.slug}/leadership`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Executive Leadership →
                </Link>
                <Link
                  href={`/chapter/${chapter.slug}/events`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Events →
                </Link>
                <Link
                  href={`/chapter/${chapter.slug}/attendance`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Attendance →
                </Link>
                <Link
                  href={`/chapter/${chapter.slug}/tasks`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Tasks →
                </Link>
              </>
            ) : null}
          </div>
        </TerminalPanel>

        <TerminalPanel title="Recent activity" className="xl:col-span-2">
          <ul className="divide-y border-border/80 text-[13px]">
            {store.activityLogs.slice(0, 6).map((log) => {
              const actor = store.profiles.find((p) => p.id === log.actorId);
              return (
                <li key={log.id} className="flex flex-wrap gap-x-2 py-2.5 text-text-dim">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                    {formatDateTime(log.createdAt)}
                  </span>
                  <span className="text-text">{actor?.fullName}</span>
                  <span>— {log.action.replaceAll("_", " ")}</span>
                </li>
              );
            })}
          </ul>
        </TerminalPanel>
      </div>
    </div>
  );
}
