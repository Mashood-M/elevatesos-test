"use client";

import { use, useEffect, useMemo, useState } from "react";
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
  Copy,
  Check,
  ExternalLink,
  Timer,
  Loader2,
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

function DiscordIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

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
  const { store, createCluster, joinCluster, generateDiscordLinkCode } = useStore();
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

  // Inline Discord linking state for cluster gate
  const [discordCode, setDiscordCode] = useState<string | null>(null);
  const [discordCodeExpiresAt, setDiscordCodeExpiresAt] = useState<Date | null>(null);
  const [discordCodeExpired, setDiscordCodeExpired] = useState(false);
  const [discordCodeCopied, setDiscordCodeCopied] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [generateCodeError, setGenerateCodeError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("5:00");

  useEffect(() => {
    if (!discordCodeExpiresAt) return;
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, discordCodeExpiresAt.getTime() - now);
      if (diff === 0) {
        setDiscordCodeExpired(true);
        setCountdown("0:00");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
      setDiscordCodeExpired(false);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [discordCodeExpiresAt]);

  async function handleGenerateDiscordCode() {
    setIsGeneratingCode(true);
    setGenerateCodeError(null);
    setDiscordCodeExpired(false);
    try {
      const res = await generateDiscordLinkCode(currentUserId);
      if (res.ok && res.code && res.expiresAt) {
        setDiscordCode(res.code);
        setDiscordCodeExpiresAt(new Date(res.expiresAt));
        setDiscordCodeCopied(false);
      } else {
        setGenerateCodeError(res.message || "Failed to generate code. Please try again.");
      }
    } catch (err: unknown) {
      setGenerateCodeError(
        err instanceof Error ? err.message : "Failed to generate code. Please try again.",
      );
    } finally {
      setIsGeneratingCode(false);
    }
  }

  async function handleCopyDiscordCode() {
    if (!discordCode) return;
    try {
      await navigator.clipboard.writeText(discordCode);
      setDiscordCodeCopied(true);
      setTimeout(() => setDiscordCodeCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  }

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
      showToast(
        "Discord connection required to join clusters. See the connection guide above.",
        "info"
      );
      const el = document.getElementById("discord-connect-card");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
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

      {/* Inline Discord Account Linking Guide (Shown when user is not connected) */}
      {!isDiscordConnected && (
        <div
          id="discord-connect-card"
          className="relative overflow-hidden rounded-[24px] bg-white p-6 sm:p-7 shadow-[var(--shadow)] border border-[#5865F2]/25"
        >
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-56 w-56 rounded-full bg-[#5865F2]/10 blur-3xl pointer-events-none" />

          <div className="relative space-y-5">
            {/* Top Banner Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#5865F2] text-white shadow-sm shadow-[#5865F2]/20">
                  <DiscordIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-[family-name:var(--font-display)] text-[17px] font-bold text-text">
                      Connect Discord to Join Learning Clusters
                    </h3>
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 text-[11px] font-bold px-2.5 py-0.5">
                      Discord Link Required
                    </span>
                  </div>
                  <p className="text-[13px] text-text-dim max-w-2xl leading-relaxed">
                    Elevates clusters are specialized builder tracks where cohort discussions, weekly roadmaps, and project reviews take place directly in our Discord server. Link your Discord account below to unlock cluster memberships.
                  </p>
                </div>
              </div>

              {/* Server join CTA */}
              <a
                href="https://discord.gg/elevates"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2]/15 text-[#5865F2] text-[12px] font-bold border border-[#5865F2]/20 transition"
              >
                <DiscordIcon className="w-4 h-4" />
                <span>Join Server</span>
                <ExternalLink size={13} />
              </a>
            </div>

            {/* 3 Step Interactive Card */}
            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              {/* Step 1 */}
              <div className="rounded-2xl bg-bg/80 border border-border/80 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--charcoal-900)] text-white text-[11px] font-bold">
                      1
                    </span>
                    <span className="text-[13px] font-bold text-text">Join Discord</span>
                  </div>
                  <p className="text-[12px] text-text-mute leading-relaxed">
                    Join the official Elevates Discord server with your active Discord account.
                  </p>
                </div>
                <div className="mt-3 pt-2">
                  <a
                    href="https://discord.gg/elevates"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11.5px] font-semibold text-[#5865F2] hover:underline inline-flex items-center gap-1"
                  >
                    <span>discord.gg/elevates</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Step 2: Code Generator */}
              <div className="rounded-2xl bg-bg/80 border border-border/80 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#5865F2] text-white text-[11px] font-bold">
                      2
                    </span>
                    <span className="text-[13px] font-bold text-text">Generate Code</span>
                  </div>
                  <p className="text-[12px] text-text-mute leading-relaxed">
                    Generate a unique 6-character code linked to your student Elevates ID.
                  </p>
                </div>

                <div className="mt-3">
                  {!discordCode || discordCodeExpired ? (
                    <Button
                      type="button"
                      variant="orange"
                      size="sm"
                      disabled={isGeneratingCode}
                      onClick={handleGenerateDiscordCode}
                      className="w-full h-8 text-[11px] font-bold gap-1.5"
                    >
                      {isGeneratingCode ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Generating…</span>
                        </>
                      ) : (
                        <span>{discordCodeExpired ? "Generate New Code" : "Get Linking Code"}</span>
                      )}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-lg border border-[#5865F2]/40 bg-[#5865F2]/10 px-2.5 py-1 text-center font-mono text-[15px] font-black text-text tracking-wider">
                        {discordCode}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyDiscordCode}
                        className="h-8 px-2.5 rounded-lg border border-border bg-white text-[11px] font-bold text-text hover:bg-bg transition flex items-center gap-1"
                      >
                        {discordCodeCopied ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {discordCode && !discordCodeExpired && (
                    <p className="mt-1.5 text-[10px] text-text-mute flex items-center gap-1">
                      <Timer size={11} className="text-[#5865F2]" />
                      <span>Expires in <span className="font-mono font-bold text-[#5865F2]">{countdown}</span></span>
                    </p>
                  )}
                  {generateCodeError && (
                    <p className="mt-1 text-[11px] text-rose-600">{generateCodeError}</p>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl bg-bg/80 border border-border/80 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--charcoal-900)] text-white text-[11px] font-bold">
                      3
                    </span>
                    <span className="text-[13px] font-bold text-text">Verify in Discord</span>
                  </div>
                  <p className="text-[12px] text-text-mute leading-relaxed">
                    Go to the <span className="font-bold text-text">#link-server</span> channel and paste your code:
                  </p>
                </div>
                <div className="mt-3">
                  <div className="rounded-lg bg-black/5 dark:bg-white/5 border border-border/70 px-2.5 py-1.5 font-mono text-[11px] font-bold text-text select-all">
                    /link {discordCode || "<code>"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                        variant={isDiscordConnected ? "orange" : "secondary"}
                        size="sm"
                        onClick={() => handleQuickJoin(cluster)}
                        className={cn(
                          "text-[12px] px-3.5 shrink-0",
                          !isDiscordConnected && "text-[#5865F2] border-[#5865F2]/30 hover:bg-[#5865F2]/10"
                        )}
                      >
                        {!isDiscordConnected ? (
                          <span className="flex items-center gap-1.5">
                            <DiscordIcon className="w-3.5 h-3.5" />
                            <span>Link to Join</span>
                          </span>
                        ) : (
                          "Join"
                        )}
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

    </div>
  );
}
