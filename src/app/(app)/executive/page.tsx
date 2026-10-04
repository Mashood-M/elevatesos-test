"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Calendar,
  CheckCircle2,
  Activity,
  ArrowRight,
  Sparkles,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
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

  const canManageLeadership =
    session.roleKey === "campus_lead" ||
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

  const activityScore = chapter ? calculateChapterActivityScore(store, chapter.id) : 0;
  const chapterCode = (chapter?.shortCode || chapter?.slug || "CAMPUS").toUpperCase();

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. ARCHITECTURAL HERO BANNER ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-7 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Subtle Decorative Geometric Accents */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-10 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-24 w-24 bg-[#414066] opacity-8 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            {/* Monospace Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                DESK // {chapterCode} · {role?.name || "EXECUTIVE"}
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                {chapter ? chapter.name : "System Command"}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              {config.title}
            </h1>

            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              Welcome back, {profile?.fullName?.split(" ")[0] ?? "Leader"}. {role?.description ?? "Focus on open operational tasks, leadership delegation, and campus roadmap execution."}
            </p>
          </div>

          {/* Quick Header Actions */}
          {chapter && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
              {canManageLeadership && (
                <Link href={`/chapter/${chapter.slug}/leadership`}>
                  <button
                    type="button"
                    className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Manage Leadership</span>
                  </button>
                </Link>
              )}
              <Link href={`/chapter/${chapter.slug}`}>
                <button
                  type="button"
                  className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[#f26430]" />
                  <span>Open Chapter</span>
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 2. 4-METRIC STRIP ───────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 01: Executive Score */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // EXECUTIVE SCORE
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#fef0eb] text-[#f26430] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {score}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a]">
            Verified operational standing
          </p>
        </div>

        {/* Metric 02: Action Queue (Open Tasks) */}
        <Link
          href={chapter ? `/chapter/${chapter.slug}/tasks` : "#"}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // ACTION QUEUE
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#414066] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <ClipboardList className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {myTasks.length}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>Open tasks pending</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 03: Registrations / Events */}
        <Link
          href={chapter ? `/chapter/${chapter.slug}/events` : "#"}
          className="group relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              {canApproveRegs ? "03 // REGS TO APPROVE" : canReviewRegs ? "03 // REGS TO REVIEW" : "03 // CHAPTER SESSIONS"}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#5f7560] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34] group-hover:bg-[#fef0eb] group-hover:text-[#f26430] transition">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {canApproveRegs ? pendingRegs.length : canReviewRegs ? reviewRegs.length : chapterEvents.length}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#71717a] group-hover:text-[#f26430] transition">
            <span>{canApproveRegs ? "Pending sign-off" : canReviewRegs ? "Awaiting rep review" : "Active & past sessions"}</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Metric 04: Chapter Health & Velocity */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // CHAPTER HEALTH
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#faf9f6] text-[#f59e0b] border border-[#2d2d34]/15 shadow-[1px_1px_0px_#2d2d34]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {chapter ? `${activityScore}%` : "—"}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#71717a]">
            {chapter ? activityLabel(activityScore) : "No chapter attached"}
          </p>
        </div>
      </section>

      {/* ── 3. CHAIRMAN EXECUTIVE HIERARCHY INSPECTOR ────────────────────── */}
      {isChairman && canManageLeadership && chapter && (
        <section className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#2d2d34]/15 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#f26430]" />
                  EXECUTIVE TEAM HIERARCHY & ROLE DELEGATION
                </span>
              </div>
              <p className="text-xs text-[#71717a] mt-1">
                Active Cycle: {activeTerm ? activeTerm.title : "No active cycle configured"} · Oversee and delegate responsibilities across sub-teams.
              </p>
            </div>
            <Link href={`/chapter/${chapter.slug}/leadership`}>
              <button
                type="button"
                className="h-8 px-3 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition flex items-center gap-1 cursor-pointer"
              >
                <span>Assign / Split Roles</span>
                <ArrowRight className="w-3 h-3 text-[#f26430]" />
              </button>
            </Link>
          </div>

          {/* Sub-Role Hierarchy Summary Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {/* Chairman */}
            <div className="rounded-[12px] border border-[#2d2d34]/20 bg-[#faf9f6] p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34]">
                  Chairman
                </span>
                <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
                  {executiveHierarchy.chairmen.length} Head
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-[#71717a]">
                Campus Chapter Lead & Executive Head
              </p>
              <div className="mt-2 font-mono text-xs font-bold text-[#2d2d34]">
                {executiveHierarchy.chairmen.length > 0 ? (
                  executiveHierarchy.chairmen.map((c) => {
                    const u = store.profiles.find((p) => p.id === c.userId);
                    return <div key={c.id}>{u?.fullName}</div>;
                  })
                ) : (
                  <span className="text-[#71717a] italic">Vacant</span>
                )}
              </div>
            </div>

            {/* Vice Chairmen */}
            <div className="rounded-[12px] border border-[#2d2d34]/20 bg-[#faf9f6] p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34]">
                  Vice Chairmen
                </span>
                <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#414066] text-white">
                  {executiveHierarchy.viceChairmen.length} (2+ allowed)
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-[#71717a]">
                Deputy Campus Leads & Chapter Backup
              </p>
              <div className="mt-2 font-mono text-xs font-bold text-[#2d2d34]">
                {executiveHierarchy.viceChairmen.length > 0 ? (
                  executiveHierarchy.viceChairmen.map((vc) => {
                    const u = store.profiles.find((p) => p.id === vc.userId);
                    return <div key={vc.id}>{u?.fullName}</div>;
                  })
                ) : (
                  <span className="text-[#71717a] italic">No Vice Chairmen assigned</span>
                )}
              </div>
            </div>

            {/* Secretariat */}
            <div className="rounded-[12px] border border-[#2d2d34]/20 bg-[#faf9f6] p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34]">
                  Secretariat
                </span>
                <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#f26430] text-white">
                  {executiveHierarchy.secretariat.length} Officers
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-[#71717a]">
                Secretary & Joint Secretary
              </p>
              <div className="mt-2 font-mono text-xs font-bold text-[#2d2d34]">
                {executiveHierarchy.secretariat.length > 0 ? (
                  executiveHierarchy.secretariat.map((s) => {
                    const u = store.profiles.find((p) => p.id === s.userId);
                    return (
                      <div key={s.id}>
                        {u?.fullName} <span className="text-[10px] font-normal text-[#71717a]">({s.title})</span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-[#71717a] italic">No Secretary assigned</span>
                )}
              </div>
            </div>

            {/* Media Team */}
            <div className="rounded-[12px] border border-[#2d2d34]/20 bg-[#faf9f6] p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34]">
                  Media Team
                </span>
                <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#f59e0b] text-white">
                  {executiveHierarchy.mediaTeam.length} / 10 Target
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-[#71717a]">
                2 Heads + 8 Members (Content, Design, Coverage)
              </p>
              <div className="mt-2 font-mono text-xs font-bold text-[#2d2d34]">
                {executiveHierarchy.mediaTeam.length > 0 ? (
                  <span>{executiveHierarchy.mediaTeam.length} active team members</span>
                ) : (
                  <span className="text-[#71717a] italic">No media assignments</span>
                )}
              </div>
            </div>

            {/* Technical Team */}
            <div className="rounded-[12px] border border-[#2d2d34]/20 bg-[#faf9f6] p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34]">
                  Technical Team
                </span>
                <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#5f7560] text-white">
                  {executiveHierarchy.technicalTeam.length} Members
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-[#71717a]">
                2 Heads + Members (Platform, Software, Infra)
              </p>
              <div className="mt-2 font-mono text-xs font-bold text-[#2d2d34]">
                {executiveHierarchy.technicalTeam.length > 0 ? (
                  <span>{executiveHierarchy.technicalTeam.length} active members</span>
                ) : (
                  <span className="text-[#71717a] italic">No tech assignments</span>
                )}
              </div>
            </div>

            {/* Innovation Team */}
            <div className="rounded-[12px] border border-[#2d2d34]/20 bg-[#faf9f6] p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#2d2d34]">
                  Innovation Team
                </span>
                <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#414066] text-white">
                  {executiveHierarchy.innovationTeam.length} Members
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-[#71717a]">
                2 Heads + Members (AI Labs, Hackathons, Ideas)
              </p>
              <div className="mt-2 font-mono text-xs font-bold text-[#2d2d34]">
                {executiveHierarchy.innovationTeam.length > 0 ? (
                  <span>{executiveHierarchy.innovationTeam.length} active members</span>
                ) : (
                  <span className="text-[#71717a] italic">No innovation assignments</span>
                )}
              </div>
            </div>
          </div>

          {/* Sub-Team Category Chips */}
          <div className="mt-4 flex flex-wrap gap-2 border-b border-[#2d2d34]/15 pb-3">
            {subTeamCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedSubTeam(cat.id)}
                className={`rounded-[6px] px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  selectedSubTeam === cat.id
                    ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                    : "bg-white text-[#2d2d34] border-[#2d2d34]/20 hover:bg-[#faf9f6]"
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {/* Detailed Member Rows */}
          <div className="space-y-2 mt-3">
            {filteredAssignments.length === 0 ? (
              <div className="py-6 text-center font-mono text-xs text-[#71717a]">
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
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#2d2d34]/15 bg-[#faf9f6] px-3.5 py-2.5 shadow-[1px_1px_0px_#2d2d34]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#2d2d34]">{u?.fullName ?? "Unknown"}</span>
                        <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800">
                          {a.title}
                        </span>
                        <span className="font-mono text-[10px] text-[#71717a] uppercase">
                          [{roleKeyLabel(a.roleKey)}]
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-[#71717a]">
                        {u?.email ?? "No email"} · {u?.department ?? "Chapter Member"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-[#71717a]">
                        Tasks: <strong className="text-[#2d2d34]">{pendingTasks.length} open</strong> / {userTasks.length} total
                      </span>
                      <span className="text-[#71717a]">
                        Score: <strong className="text-[#f26430]">{userScore}</strong>
                      </span>
                      <Link href={`/profile/${u?.elevatesId || a.userId}`}>
                        <button
                          type="button"
                          className="h-7 px-2.5 rounded-[5px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition cursor-pointer"
                        >
                          Inspect Profile
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* ── 4. ROLE FOCUS & ACTION QUEUE ───────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Role Focus */}
        <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
            <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5f7560]" />
              ROLE FOCUS & RESPONSIBILITIES
            </span>
          </div>

          <ul className="divide-y divide-[#2d2d34]/10 text-xs text-[#2d2d34] mt-2">
            {config.focus.map((f, idx) => (
              <li key={f} className="py-2.5 flex items-start gap-2">
                <span className="font-mono text-[10px] font-bold text-[#f26430] shrink-0 mt-0.5">
                  0{idx + 1} {"//"}
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {chapter && (
            <div className="mt-4 pt-3 border-t border-[#2d2d34]/15">
              <div className="flex items-center justify-between font-mono text-xs mb-1.5">
                <span className="text-[#71717a] uppercase">Campus Activity Score</span>
                <span className="font-bold text-[#f26430]">{activityScore}% · {activityLabel(activityScore)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden border border-[#2d2d34]/15">
                <div
                  className="h-full bg-[#f26430] transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, activityScore))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Queue */}
        <div className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
          <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
            <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-[#f26430]" />
              ACTION QUEUE
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2d2d34] text-white">
              {myTasks.length + (draftEvents.length > 0 ? 1 : 0) + (pendingRegs.length > 0 ? 1 : 0)}
            </span>
          </div>

          <div className="space-y-2.5 mt-3 text-xs">
            {chapter && draftEvents.length > 0 &&
              draftEvents.slice(0, 3).map((ev) => (
                <Link
                  key={ev.id}
                  href={`/chapter/${chapter.slug}/events/${ev.id}`}
                  className="block rounded-[10px] border border-[#2d2d34]/15 bg-[#faf9f6] p-3 shadow-[1px_1px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition"
                >
                  <p className="font-bold text-sm text-[#f26430]">
                    Draft: {ev.title}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-[#71717a]">
                    Publish to open student registrations →
                  </p>
                </Link>
              ))}

            {chapter && canApproveRegs &&
              pendingRegs.slice(0, 3).map((r) => {
                const ev = chapterEvents.find((e) => e.id === r.eventId);
                if (!ev) return null;
                return (
                  <Link
                    key={r.id}
                    href={`/chapter/${chapter.slug}/events/${ev.id}`}
                    className="block rounded-[10px] border border-[#2d2d34]/15 bg-[#faf9f6] p-3 shadow-[1px_1px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition"
                  >
                    <p className="font-bold text-sm text-[#2d2d34]">
                      Approve registration — {ev.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-[#71717a]">
                      Reviewed queue awaiting lead sign-off →
                    </p>
                  </Link>
                );
              })}

            {myTasks.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={chapter ? `/chapter/${chapter.slug}/tasks` : "#"}
                className="flex items-center justify-between border-b border-[#2d2d34]/10 py-2 hover:text-[#f26430] transition"
              >
                <span className="font-medium text-[#2d2d34]">{t.title}</span>
                <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  t.status === "in_progress" ? "bg-cyan-100 text-cyan-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {t.status.replace("_", " ")}
                </span>
              </Link>
            ))}

            {myTasks.length === 0 &&
            draftEvents.length === 0 &&
            !(canApproveRegs && pendingRegs.length) &&
            !(canReviewRegs && !canApproveRegs && reviewRegs.length) && (
              <p className="text-xs text-[#71717a] py-4 text-center font-mono">
                Queue clear — no drafts or registrations waiting.
              </p>
            )}
          </div>

          {chapter && (
            <div className="mt-4 pt-3 border-t border-[#2d2d34]/15 flex flex-wrap gap-2 text-xs font-mono font-bold">
              {canManageLeadership && (
                <Link
                  href={`/chapter/${chapter.slug}/leadership`}
                  className="text-[#f26430] hover:underline"
                >
                  Leadership Term →
                </Link>
              )}
              <Link
                href={`/chapter/${chapter.slug}/events`}
                className="text-[#2d2d34] hover:text-[#f26430] hover:underline"
              >
                Events →
              </Link>
              <Link
                href={`/chapter/${chapter.slug}/attendance`}
                className="text-[#2d2d34] hover:text-[#f26430] hover:underline"
              >
                Attendance →
              </Link>
              <Link
                href={`/chapter/${chapter.slug}/tasks`}
                className="text-[#2d2d34] hover:text-[#f26430] hover:underline"
              >
                Tasks →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 5. RECENT ACTIVITY STREAM ──────────────────────────────────── */}
      <section className="rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34]">
        <div className="flex items-center justify-between border-b border-[#2d2d34]/15 pb-3">
          <span className="font-mono text-xs font-bold text-[#2d2d34] uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#414066]" />
            RECENT OPERATIONAL LOGS
          </span>
        </div>

        <ul className="divide-y divide-[#2d2d34]/10 text-xs mt-2">
          {store.activityLogs.slice(0, 6).map((log) => {
            const actor = store.profiles.find((p) => p.id === log.actorId);
            return (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[#71717a]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] text-[#71717a]">
                    {formatDateTime(log.createdAt)}
                  </span>
                  <span className="font-bold text-[#2d2d34]">{actor?.fullName || "System Agent"}</span>
                  <span className="text-[#2d2d34]/80">— {log.action.replaceAll("_", " ")}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
