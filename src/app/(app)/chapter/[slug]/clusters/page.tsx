"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  Code,
  Palette,
  Shield,
  Cpu,
  Globe,
  Database,
  Users,
  CheckCircle2,
  Circle,
  Plus,
  Rocket,
  Lock,
  Unlock,
  Trophy,
  Search,
  SlidersHorizontal,
  ArrowRight,
  UserCheck,
  UserPlus,
  GraduationCap,
  Calendar,
  X,
  Compass,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore, showToast } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import { findChapterBySlugOrId } from "@/lib/chapters";
import { hasPermission } from "@/lib/permissions";
import { hasExecutiveDelegation } from "@/lib/leadership";
import { formatSlugInput, finalizeSlug } from "@/lib/slug";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import { cn } from "@/lib/utils";
import type { Cluster, ClusterAccessMode } from "@/types";

// Helper to determine track theme & styling based on name or slug
function getClusterTheme(name: string, slug: string) {
  const text = `${name} ${slug}`.toLowerCase();
  if (text.includes("ai") || text.includes("machine") || text.includes("ml") || text.includes("deep") || text.includes("bot")) {
    return {
      icon: Sparkles,
      tone: "magenta" as const,
      colorClass: "bg-purple-50 text-purple-600 border-purple-200",
      accentBg: "bg-purple-500",
      category: "Artificial Intelligence",
    };
  }
  if (text.includes("web") || text.includes("code") || text.includes("dev") || text.includes("frontend") || text.includes("full stack") || text.includes("software")) {
    return {
      icon: Code,
      tone: "orange" as const,
      colorClass: "bg-orange-50 text-orange-600 border-orange-200",
      accentBg: "bg-[var(--accent)]",
      category: "Software Engineering",
    };
  }
  if (text.includes("design") || text.includes("ui") || text.includes("ux") || text.includes("product") || text.includes("brand")) {
    return {
      icon: Palette,
      tone: "magenta" as const,
      colorClass: "bg-rose-50 text-rose-600 border-rose-200",
      accentBg: "bg-rose-500",
      category: "Product & Design",
    };
  }
  if (text.includes("security") || text.includes("cyber") || text.includes("hack") || text.includes("crypto")) {
    return {
      icon: Shield,
      tone: "green" as const,
      colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      accentBg: "bg-emerald-600",
      category: "Cybersecurity",
    };
  }
  if (text.includes("cloud") || text.includes("ops") || text.includes("infra") || text.includes("server") || text.includes("network")) {
    return {
      icon: Cpu,
      tone: "blue" as const,
      colorClass: "bg-sky-50 text-sky-600 border-sky-200",
      accentBg: "bg-sky-500",
      category: "Cloud & Systems",
    };
  }
  if (text.includes("data") || text.includes("analytics") || text.includes("sql") || text.includes("science")) {
    return {
      icon: Database,
      tone: "amber" as const,
      colorClass: "bg-amber-50 text-amber-700 border-amber-200",
      accentBg: "bg-amber-600",
      category: "Data & Systems",
    };
  }
  if (text.includes("mobile") || text.includes("android") || text.includes("ios") || text.includes("flutter")) {
    return {
      icon: Globe,
      tone: "blue" as const,
      colorClass: "bg-indigo-50 text-indigo-600 border-indigo-200",
      accentBg: "bg-indigo-500",
      category: "Mobile Apps",
    };
  }
  return {
    icon: Layers,
    tone: "mute" as const,
    colorClass: "bg-gray-100 text-gray-700 border-gray-200",
    accentBg: "bg-[var(--charcoal-900)]",
    category: "Specialized Track",
  };
}

export default function ChapterClustersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, createCluster, joinCluster } = useStore();
  const roleKey = store.session.roleKey;
  const currentUserId = store.session.userId;
  const currentUserProfile = store.profiles.find((p) => p.id === currentUserId);
  const isDiscordConnected = Boolean(
    currentUserProfile?.discordConnected ||
    (currentUserProfile as Record<string, unknown> | undefined)?.discord_connected ||
    currentUserProfile?.discordUserId ||
    (currentUserProfile as Record<string, unknown> | undefined)?.discord_user_id
  );
  const profileHref = currentUserProfile?.elevatesId
    ? `/profile/${currentUserProfile.elevatesId}`
    : currentUserId
    ? `/profile/${currentUserId}`
    : "/profile";
  const chapter = findChapterBySlugOrId(store.chapters, slug);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "mine" | "open" | "invite">("all");
  const [sortBy, setSortBy] = useState<"name" | "members">("name");

  // Create Cluster modal state
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [description, setDescription] = useState("");
  const [accessMode, setAccessMode] = useState<ClusterAccessMode>("invite");
  const [leaderId, setLeaderId] = useState("");
  const [flash, setFlash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discordModalOpen, setDiscordModalOpen] = useState(false);

  if (!chapter) return <ChapterNotFound />;

  const clusters = store.clusters.filter((c) => c.chapterId === chapter.id);

  const chapterUserRoleIds = useMemo(() => {
    return new Set(
      (store.userRoles ?? [])
        .filter((ur) => ur.chapterId === chapter.id || (chapter.slug && ur.chapterId === chapter.slug))
        .map((ur) => ur.userId)
    );
  }, [store.userRoles, chapter.id, chapter.slug]);

  const members = useMemo(() => {
    const list = (store.profiles ?? []).filter(
      (p) =>
        p.chapterId === chapter.id ||
        (p as unknown as Record<string, unknown>).chapter_id === chapter.id ||
        (chapter.slug && p.chapterId === chapter.slug) ||
        chapterUserRoleIds.has(p.id)
    );
    if (list.length > 0) return list;
    return store.profiles ?? [];
  }, [store.profiles, chapter.id, chapter.slug, chapterUserRoleIds]);

  const projects = store.projects.filter((p) => p.chapterId === chapter.id);

  const canCreate =
    hasPermission(store, roleKey, "chapter.manage") ||
    roleKey === "elevates_coordinator" ||
    roleKey === "secretary" ||
    roleKey === "faculty_coordinator" ||
    roleKey === "founder" ||
    roleKey === "hq_admin" ||
    roleKey === "campus_lead" ||
    roleKey === "chairman" ||
    hasExecutiveDelegation(store, currentUserId, chapter.id, "manage_clusters");

  const canManage = canCreate;

  // Summary statistics
  const totalClusters = clusters.length;
  const uniqueEnrolledIds = new Set(clusters.flatMap((c) => c.memberIds));
  const totalEnrolled = uniqueEnrolledIds.size;
  const clusterProjectsCount = projects.filter((p) => p.clusterId).length;

  // Filtered & sorted clusters
  const filteredClusters = useMemo(() => {
    return clusters
      .filter((c) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const leader = store.profiles.find((p) => p.id === c.leaderId);
          const matchName = c.name.toLowerCase().includes(q);
          const matchSlug = c.slug.toLowerCase().includes(q);
          const matchDesc = (c.description || "").toLowerCase().includes(q);
          const matchLead = leader ? leader.fullName.toLowerCase().includes(q) : false;
          if (!matchName && !matchSlug && !matchDesc && !matchLead) return false;
        }

        // Access/Membership filter
        if (filterMode === "mine") {
          const isMember = c.memberIds.includes(currentUserId);
          const isLead = c.leaderId === currentUserId;
          if (!isMember && !isLead) return false;
        } else if (filterMode === "open") {
          if ((c.accessMode ?? "invite") !== "open") return false;
        } else if (filterMode === "invite") {
          if ((c.accessMode ?? "invite") !== "invite") return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "members") {
          return b.memberIds.length - a.memberIds.length;
        }
        return 0;
      });
  }, [clusters, searchQuery, filterMode, sortBy, currentUserId, store.profiles]);

  function handleCreate() {
    if (!name.trim()) {
      setFlash("Please enter a cluster name.");
      return;
    }
    const nextSlug = finalizeSlug(slugInput || name);
    if (!nextSlug) {
      setFlash("A valid URL slug is required.");
      return;
    }
    if (clusters.some((c) => c.slug === nextSlug)) {
      setFlash("A cluster with this slug already exists in this chapter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const cluster = createCluster({
        chapterId: chapter!.id,
        name: name.trim(),
        slug: nextSlug,
        description: description.trim() || `Specialized ${name.trim()} learning track.`,
        leaderId: leaderId || undefined,
        accessMode,
      });

      setName("");
      setSlugInput("");
      setDescription("");
      setLeaderId("");
      setAccessMode("invite");
      setOpenModal(false);
      setFlash("");
      showToast(`Cluster "${cluster.name}" created successfully!`, "success");
    } catch (err: any) {
      setFlash(err?.message || "Failed to create cluster.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleQuickJoin(cluster: Cluster) {
    if (!isDiscordConnected) {
      setDiscordModalOpen(true);
      showToast(
        "Join the Elevates Discord server and connect your account first to join this cluster.",
        "error"
      );
      return;
    }
    joinCluster(cluster.id, currentUserId);
    showToast(`You have joined ${cluster.name}!`, "success");
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Finexy typography & actions */}
      <PageHeader
        eyebrow={chapterEyebrow(roleKey, "programs")}
        title="Learning Clusters & Tracks"
        description="Specialized chapter incubators where students deep-dive into high-impact fields, complete weekly roadmaps, and build showcase projects."
        actions={
          canCreate ? (
            <Button
              variant="orange"
              className="gap-2 shadow-sm"
              onClick={() => {
                setFlash("");
                setOpenModal(true);
              }}
            >
              <Plus size={16} />
              <span>Create Track</span>
            </Button>
          ) : null
        }
      />

      {/* 2. Sleek Metrics / Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-[20px] bg-bg-panel p-4 sm:p-5 shadow-[var(--shadow)] border border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">Active Clusters</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[var(--accent)]">
              <Layers size={17} />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text tabular-nums">
            {totalClusters}
          </p>
          <p className="mt-1 text-[11px] text-text-mute">Talent incubators</p>
        </div>

        <div className="rounded-[20px] bg-bg-panel p-4 sm:p-5 shadow-[var(--shadow)] border border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">Enrolled Students</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Users size={17} />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text tabular-nums">
            {totalEnrolled}
          </p>
          <p className="mt-1 text-[11px] text-text-mute">Across all tracks</p>
        </div>

        <div className="rounded-[20px] bg-bg-panel p-4 sm:p-5 shadow-[var(--shadow)] border border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-text-mute">Incubating Projects</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Rocket size={17} />
            </div>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-text tabular-nums">
            {clusterProjectsCount}
          </p>
          <p className="mt-1 text-[11px] text-text-mute">Building in tracks</p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[20px] bg-bg-panel p-3.5 sm:p-4 shadow-[var(--shadow)] border border-border/40">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracks by name, lead, or discipline..."
            className="w-full h-10 pl-10 pr-9 rounded-full bg-bg border border-border text-[13px] text-text placeholder:text-text-mute focus:outline-none focus:border-[var(--accent)] transition"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-mute hover:text-text"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setFilterMode("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] font-medium transition",
              filterMode === "all"
                ? "bg-[var(--charcoal-900)] text-white shadow-sm"
                : "bg-bg text-text-mute hover:text-text hover:bg-bg-hover"
            )}
          >
            All Tracks ({clusters.length})
          </button>
          <button
            onClick={() => setFilterMode("mine")}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] font-medium transition",
              filterMode === "mine"
                ? "bg-[var(--charcoal-900)] text-white shadow-sm"
                : "bg-bg text-text-mute hover:text-text hover:bg-bg-hover"
            )}
          >
            My Tracks
          </button>
          <button
            onClick={() => setFilterMode("open")}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] font-medium transition",
              filterMode === "open"
                ? "bg-[var(--charcoal-900)] text-white shadow-sm"
                : "bg-bg text-text-mute hover:text-text hover:bg-bg-hover"
            )}
          >
            Open to Join
          </button>
          <button
            onClick={() => setFilterMode("invite")}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] font-medium transition",
              filterMode === "invite"
                ? "bg-[var(--charcoal-900)] text-white shadow-sm"
                : "bg-bg text-text-mute hover:text-text hover:bg-bg-hover"
            )}
          >
            Invite Only
          </button>

          {/* Sort Dropdown */}
          <div className="ml-auto sm:ml-2 flex items-center gap-1 pl-2 border-l border-border/70">
            <SlidersHorizontal size={14} className="text-text-mute" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-[12px] font-medium text-text focus:outline-none cursor-pointer"
            >
              <option value="name">Name (A-Z)</option>
              <option value="members">Most Members</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Clusters Grid or Empty State */}
      {filteredClusters.length === 0 ? (
        <div className="rounded-[22px] bg-bg-panel p-10 sm:p-14 text-center shadow-[var(--shadow)] border border-border/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[var(--accent)] mb-4">
            <Compass size={28} />
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-text">
            {searchQuery || filterMode !== "all"
              ? "No matching tracks found"
              : "No learning clusters yet"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-text-mute leading-relaxed">
            {searchQuery || filterMode !== "all"
              ? "Try adjusting your search keywords or switching filters to see other tracks."
              : "Clusters are invite-first talent incubators where students specialize, follow weekly build roadmaps, and showcase projects."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {searchQuery || filterMode !== "all" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterMode("all");
                }}
              >
                Clear Filters
              </Button>
            ) : canCreate ? (
              <Button
                variant="orange"
                onClick={() => {
                  setFlash("");
                  setOpenModal(true);
                }}
              >
                Create First Track
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredClusters.map((cluster) => {
            const theme = getClusterTheme(cluster.name, cluster.slug);
            const ThemeIcon = theme.icon;
            const leader = store.profiles.find((p) => p.id === cluster.leaderId);
            const faculty = store.profiles.find((p) => p.id === cluster.facultyId);
            const isMember = cluster.memberIds.includes(currentUserId);
            const isLead = cluster.leaderId === currentUserId;
            const clusterProjects = projects.filter((p) => p.clusterId === cluster.id);
            const mode = cluster.accessMode ?? "invite";

            // Member profiles for avatar display
            const memberProfiles = cluster.memberIds
              .map((id) => store.profiles.find((p) => p.id === id))
              .filter(Boolean);

            return (
              <div
                key={cluster.id}
                className="group flex flex-col justify-between rounded-[22px] bg-bg-panel p-5 sm:p-6 shadow-[var(--shadow)] border border-border/60 hover:border-[var(--accent)]/30 hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Top Row: Icon + Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-2xl border transition group-hover:scale-105",
                          theme.colorClass
                        )}
                      >
                        <ThemeIcon size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-mute block">
                          {theme.category}
                        </span>
                        <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-dim">
                          @{cluster.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {mode === "open" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                          <Unlock size={11} /> Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-100">
                          <Lock size={11} /> Invite Only
                        </span>
                      )}

                      {isLead ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                          You Lead This
                        </span>
                      ) : isMember ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 size={10} /> Enrolled
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-4">
                    <Link
                      href={`/chapter/${slug}/clusters/${cluster.id}`}
                      className="block group/link"
                    >
                      <h3 className="font-[family-name:var(--font-display)] text-[18px] sm:text-[19px] font-bold text-text group-hover/link:text-[var(--accent)] transition line-clamp-1">
                        {cluster.name}
                      </h3>
                    </Link>
                    <p className="mt-1.5 text-[12.5px] text-text-dim leading-relaxed line-clamp-2">
                      {cluster.description || "Specialized learning and build track for student builders."}
                    </p>
                  </div>

                  {/* Leadership Cardlets */}
                  <div className="mt-4 flex flex-wrap gap-2 text-[11.5px]">
                    {leader ? (
                      <div className="flex items-center gap-2 rounded-full bg-bg px-3 py-1 border border-border/60">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700 uppercase">
                          {leader.fullName[0]}
                        </div>
                        <span className="text-text font-medium truncate max-w-[140px]">
                          {leader.fullName}
                        </span>
                        <span className="text-[10px] text-text-mute">Lead</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-full bg-bg/50 px-3 py-1 text-text-mute text-[11px] border border-dashed border-border">
                        <UserCheck size={12} />
                        <span>Lead unassigned</span>
                      </div>
                    )}

                    {faculty ? (
                      <div className="flex items-center gap-2 rounded-full bg-bg px-3 py-1 border border-border/60">
                        <GraduationCap size={13} className="text-emerald-600" />
                        <span className="text-text font-medium truncate max-w-[130px]">
                          {faculty.fullName}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Card Footer: Members, Projects & Action */}
                <div className="mt-5 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    {/* Stacked Member Avatars */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {memberProfiles.slice(0, 3).map((m: any) => (
                          <div
                            key={m.id}
                            title={m.fullName}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 border-2 border-bg-panel text-[9px] font-bold text-slate-700"
                          >
                            {m.fullName[0]}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11.5px] font-medium text-text-mute">
                        {cluster.memberIds.length}{" "}
                        {cluster.memberIds.length === 1 ? "member" : "members"}
                      </span>
                    </div>

                    {/* Incubating Projects Count */}
                    {clusterProjects.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-mute">
                        <Rocket size={12} className="text-sky-600" />
                        {clusterProjects.length}{" "}
                        {clusterProjects.length === 1 ? "project" : "projects"}
                      </span>
                    ) : null}
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/chapter/${slug}/clusters/${cluster.id}`}
                      className="flex-1"
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-between gap-1 group/btn text-[12px]"
                      >
                        <span>{isLead || canManage ? "Manage Track" : "Explore Track"}</span>
                        <ArrowRight
                          size={13}
                          className="transition-transform group-hover/btn:translate-x-0.5 text-text-mute"
                        />
                      </Button>
                    </Link>

                    {canManage || isLead ? (
                      <Link href={`/chapter/${slug}/clusters/${cluster.id}?addMember=true`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[12px] h-8 px-2.5 text-[var(--accent)] hover:bg-orange-50 shrink-0 gap-1 border border-[var(--accent)]/30"
                          title="Add students to cluster"
                        >
                          <UserPlus size={12} />
                          <span>Add Students</span>
                        </Button>
                      </Link>
                    ) : null}

                    {!isMember && mode === "open" ? (
                      <Button
                        variant="orange"
                        size="sm"
                        onClick={() => handleQuickJoin(cluster)}
                        className="text-[12px] px-3.5 shrink-0"
                      >
                        Join
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create Cluster Modal (Finexy Dialog) */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Create Learning Cluster"
        description="Launch a new specialized interest track for student builders in your chapter."
        className="max-w-xl"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              onClick={() => setOpenModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              onClick={handleCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Cluster Track"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          {flash ? (
            <div className="rounded-xl bg-red-50 p-3 text-[12.5px] font-medium text-red-600 border border-red-200">
              {flash}
            </div>
          ) : null}

          {/* Name & Slug */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Track Name *</FieldLabel>
              <Input
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  const currentAuto = finalizeSlug(name);
                  const isAuto = !slugInput || slugInput === currentAuto;
                  setName(val);
                  if (isAuto) {
                    setSlugInput(finalizeSlug(val));
                  }
                }}
                placeholder="e.g. AI & Intelligent Systems"
              />
            </div>
            <div>
              <FieldLabel>URL Identifier (Slug) *</FieldLabel>
              <Input
                value={slugInput}
                onChange={(e) => setSlugInput(formatSlugInput(e.target.value))}
                onBlur={() => setSlugInput(finalizeSlug(slugInput))}
                placeholder="e.g. ai-intelligent-systems"
              />
            </div>
          </div>

          {/* Access Mode Selector */}
          <div>
            <FieldLabel>Enrollment Access Mode</FieldLabel>
            <div className="grid grid-cols-2 gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => setAccessMode("invite")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition",
                  accessMode === "invite"
                    ? "bg-amber-50/70 border-amber-300 text-amber-900 shadow-sm"
                    : "bg-bg border-border text-text-mute hover:bg-bg-hover hover:text-text"
                )}
              >
                <Lock size={18} className="mb-1 text-amber-600" />
                <span className="text-[12px] font-bold block">Invite Only</span>
                <span className="text-[10px] text-text-mute">Nominated by leads</span>
              </button>

              <button
                type="button"
                onClick={() => setAccessMode("open")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition",
                  accessMode === "open"
                    ? "bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-sm"
                    : "bg-bg border-border text-text-mute hover:bg-bg-hover hover:text-text"
                )}
              >
                <Unlock size={18} className="mb-1 text-emerald-600" />
                <span className="text-[12px] font-bold block">Open to All</span>
                <span className="text-[10px] text-text-mute">Instant student join</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Track Focus & Description</FieldLabel>
            <TextArea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn, build, and ship in this track?"
            />
          </div>

          {/* Track Lead Picker */}
          <div>
            <FieldLabel>Assign Track Lead (Optional)</FieldLabel>
            <Select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
            >
              <option value="">Unassigned (Can be appointed later)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} {m.elevatesId ? `(${m.elevatesId})` : ""}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-text-mute">
              The assigned student lead will have delegation to manage milestones and review submissions.
            </p>
          </div>
        </div>
      </Dialog>

      {/* Discord Connection Required Modal */}
      <Dialog
        open={discordModalOpen}
        onClose={() => setDiscordModalOpen(false)}
        title="Discord Connection Required"
        description="Connect your Discord account to join Elevates clusters."
        className="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setDiscordModalOpen(false)}>
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
