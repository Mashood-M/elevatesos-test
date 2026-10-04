"use client";

import { use, useEffect, useState } from "react";
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
  CheckCircle2,
  Plus,
  Rocket,
  Lock,
  Unlock,
  Search,
  SlidersHorizontal,
  ArrowRight,
  UserCheck,
  UserPlus,
  GraduationCap,
  X,
  Compass,
  Copy,
  Check,
  ExternalLink,
  Timer,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore, showToast } from "@/context/store-context";
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

  const chapterUserRoleIds = new Set(
    (store.userRoles ?? [])
      .filter((ur) => ur.chapterId === chapter.id || (chapter.slug && ur.chapterId === chapter.slug))
      .map((ur) => ur.userId)
  );

  const memberList = (store.profiles ?? []).filter(
    (p) =>
      p.chapterId === chapter.id ||
      (p as unknown as Record<string, unknown>).chapter_id === chapter.id ||
      (chapter.slug && p.chapterId === chapter.slug) ||
      chapterUserRoleIds.has(p.id)
  );
  const members = memberList.length > 0 ? memberList : (store.profiles ?? []);

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

  // Filtered & sorted clusters computed directly inline
  const filteredClusters = clusters
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
    } catch (err: unknown) {
      setFlash(err instanceof Error ? err.message : "Failed to create cluster.");
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
      {/* 1. ARCHITECTURAL HERO BANNER */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-8 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-28 w-28 bg-[#414066] opacity-6 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                CAMPUS · {(chapter.shortCode || chapter.slug).toUpperCase()} {"//"} TECHNICAL GUILDS
              </span>
              <span className="font-mono text-[10.5px] font-bold text-[#71717a] uppercase tracking-wider">
                SPECIALIZED TRACKS
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight">
              Interest Clusters &amp; Tracks.
            </h1>
            <p className="mt-1.5 text-[13px] text-[#52525b] leading-relaxed">
              Specialized campus incubators where builders deep-dive into high-impact fields, complete weekly roadmaps, and ship showcase projects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setFlash("");
                  setOpenModal(true);
                }}
                className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#d85322] text-white font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Create Cluster</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Inline Discord Account Linking Guide (Shown when user is not connected) */}
      {!isDiscordConnected && (
        <div
          id="discord-connect-card"
          className="relative overflow-hidden rounded-[14px] bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] border border-[#2d2d34]/20 bauhaus-grid-bg"
        >
          <div className="relative space-y-4">
            {/* Top Banner Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#5865F2] text-white border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34]">
                  <DiscordIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
                      Connect Discord to Unlock Cluster Membership
                    </h3>
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] bg-amber-500/10 border border-amber-500/30 text-amber-800">
                      Link Required
                    </span>
                  </div>
                  <p className="text-xs text-[#52525b] max-w-2xl leading-relaxed">
                    Elevates clusters are specialized builder tracks where discussions, roadmaps, and sprint standups take place directly in Discord. Link your account to verify track enrollment.
                  </p>
                </div>
              </div>

              {/* Server join CTA */}
              <a
                href="https://discord.gg/elevates"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] bg-white hover:bg-[#faf9f6] text-[#5865F2] font-mono text-[11px] font-bold uppercase border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition cursor-pointer"
              >
                <DiscordIcon className="w-4 h-4" />
                <span>Join Discord</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* 3 Step Interactive Card */}
            <div className="grid gap-3 sm:grid-cols-3 pt-1">
              {/* Step 1 */}
              <div className="rounded-[10px] bg-[#faf9f6] border border-[#2d2d34]/20 p-3.5 flex flex-col justify-between shadow-[1px_1px_0px_#2d2d34]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-white bg-[#2d2d34] px-1.5 py-0.5 rounded-[3px]">
                      01
                    </span>
                    <span className="font-mono text-[11px] font-bold text-[#2d2d34] uppercase tracking-wider">Join Discord</span>
                  </div>
                  <p className="text-[11.5px] text-[#71717a] leading-relaxed">
                    Join the official Elevates Discord server with your active Discord account.
                  </p>
                </div>
                <div className="mt-3 pt-2">
                  <a
                    href="https://discord.gg/elevates"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] font-bold text-[#5865F2] hover:underline inline-flex items-center gap-1 uppercase"
                  >
                    <span>discord.gg/elevates</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Step 2: Code Generator */}
              <div className="rounded-[10px] bg-[#faf9f6] border border-[#2d2d34]/20 p-3.5 flex flex-col justify-between shadow-[1px_1px_0px_#2d2d34]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-white bg-[#2d2d34] px-1.5 py-0.5 rounded-[3px]">
                      02
                    </span>
                    <span className="font-mono text-[11px] font-bold text-[#2d2d34] uppercase tracking-wider">Generate Code</span>
                  </div>
                  <p className="text-[11.5px] text-[#71717a] leading-relaxed">
                    Generate a unique 6-character code linked to your student Elevates ID.
                  </p>
                </div>

                <div className="mt-3">
                  {!discordCode || discordCodeExpired ? (
                    <button
                      type="button"
                      disabled={isGeneratingCode}
                      onClick={handleGenerateDiscordCode}
                      className="w-full h-8 rounded-[6px] bg-[#f26430] hover:bg-[#d85322] text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                    >
                      {isGeneratingCode ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Generating…</span>
                        </>
                      ) : (
                        <span>{discordCodeExpired ? "Generate New Code" : "Get Linking Code"}</span>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-8 rounded-[6px] border border-[#2d2d34]/30 bg-white px-2.5 flex items-center justify-center font-mono text-[14px] font-bold text-[#2d2d34] tracking-widest">
                        {discordCode}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyDiscordCode}
                        className="h-8 px-2.5 rounded-[6px] border border-[#2d2d34]/30 bg-white text-[11px] font-mono font-bold text-[#2d2d34] hover:bg-[#faf9f6] transition flex items-center gap-1 cursor-pointer"
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
                    <p className="mt-1.5 text-[10px] text-[#71717a] font-mono flex items-center gap-1">
                      <Timer size={11} className="text-[#5865F2]" />
                      <span>Expires in <span className="font-bold text-[#5865F2]">{countdown}</span></span>
                    </p>
                  )}
                  {generateCodeError && (
                    <p className="mt-1 text-[11px] text-rose-600 font-mono">{generateCodeError}</p>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-[10px] bg-[#faf9f6] border border-[#2d2d34]/20 p-3.5 flex flex-col justify-between shadow-[1px_1px_0px_#2d2d34]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-white bg-[#2d2d34] px-1.5 py-0.5 rounded-[3px]">
                      03
                    </span>
                    <span className="font-mono text-[11px] font-bold text-[#2d2d34] uppercase tracking-wider">Verify in Discord</span>
                  </div>
                  <p className="text-[11.5px] text-[#71717a] leading-relaxed">
                    Go to the <span className="font-bold text-[#2d2d34]">#link-server</span> channel and paste your code:
                  </p>
                </div>
                <div className="mt-3">
                  <div className="rounded-[6px] bg-white border border-[#2d2d34]/30 px-2.5 py-1.5 font-mono text-[11px] font-bold text-[#2d2d34] select-all">
                    /link {discordCode || "<code>"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. 4-METRIC ARCHITECTURAL TECHNICAL STRIP */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>01 // ACTIVE TRACKS</span>
            <span className="h-2 w-2 rounded-full bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {totalClusters}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Talent Incubators</p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>02 // ENROLLED BUILDERS</span>
            <span className="h-2 w-2 rounded-full bg-[#414066]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {totalEnrolled}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Across All Guilds</p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>03 // INCUBATING PROJECTS</span>
            <span className="h-2 w-2 rounded-full bg-[#5f7560]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {clusterProjectsCount}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Under Development</p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>04 // DISCIPLINE DOMAINS</span>
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#f26430]">
            {new Set(clusters.map((c) => getClusterTheme(c.name, c.slug).category)).size}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Core Specializations</p>
        </div>
      </section>

      {/* 3. TACTILE SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[12px] border border-[#2d2d34]/20 shadow-[1.5px_1.5px_0px_#2d2d34]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={13} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracks, leads, domains..."
            className="w-full h-8 pl-8 pr-7 rounded-[6px] bg-[#faf9f6] border border-[#2d2d34]/20 font-mono text-[11px] text-[#2d2d34] focus:outline-none focus:border-[#f26430]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#2d2d34]"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "all", label: `ALL (${clusters.length})` },
              { key: "mine", label: "MY TRACKS" },
              { key: "open", label: "OPEN TO JOIN" },
              { key: "invite", label: "INVITE ONLY" },
            ] as const
          ).map((tab) => {
            const active = filterMode === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterMode(tab.key)}
                className={cn(
                  "h-7 px-2.5 rounded-[5px] font-mono text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer",
                  active
                    ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1px_1px_0px_#f26430]"
                    : "bg-[#faf9f6] text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34] hover:text-[#2d2d34]",
                )}
              >
                {tab.label}
              </button>
            );
          })}

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1 pl-2 border-l border-[#2d2d34]/20">
            <SlidersHorizontal size={12} className="text-[#71717a]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "members")}
              className="bg-transparent font-mono text-[10.5px] font-bold text-[#2d2d34] uppercase focus:outline-none cursor-pointer"
            >
              <option value="name">NAME (A-Z)</option>
              <option value="members">MOST MEMBERS</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. CLUSTERS GRID OR EMPTY STATE */}
      {filteredClusters.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-[#2d2d34]/30 bg-white p-12 text-center shadow-[1.5px_1.5px_0px_rgba(45,45,52,0.05)] space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#faf9f6] border border-[#2d2d34]/20 text-[#f26430] shadow-[1.5px_1.5px_0px_#2d2d34]">
            <Compass size={22} />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
              {searchQuery || filterMode !== "all"
                ? "No Matching Tracks Found"
                : "No Learning Clusters Yet"}
            </h3>
            <p className="mt-1 text-xs text-[#71717a] max-w-md mx-auto leading-relaxed">
              {searchQuery || filterMode !== "all"
                ? "Try adjusting your search keywords or switching filters to see other tracks."
                : "Clusters are talent incubators where students specialize, follow weekly build roadmaps, and showcase projects."}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {searchQuery || filterMode !== "all" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterMode("all");
                }}
                className="font-mono text-xs uppercase"
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
                className="font-mono text-xs uppercase shadow-[1.5px_1.5px_0px_#2d2d34]"
              >
                Create First Track
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClusters.map((cluster) => {
            const theme = getClusterTheme(cluster.name, cluster.slug);
            const ThemeIcon = theme.icon;
            const leader = store.profiles.find((p) => p.id === cluster.leaderId);
            const faculty = store.profiles.find((p) => p.id === cluster.facultyId);
            const isMember = cluster.memberIds.includes(currentUserId);
            const isLead = cluster.leaderId === currentUserId;
            const clusterProjects = projects.filter((p) => p.clusterId === cluster.id);
            const mode = cluster.accessMode ?? "invite";

            const memberProfiles = cluster.memberIds
              .map((id) => store.profiles.find((p) => p.id === id))
              .filter(Boolean) as (typeof store.profiles)[number][];

            return (
              <div
                key={cluster.id}
                className="group flex flex-col justify-between rounded-[14px] bg-white p-5 shadow-[2px_2px_0px_#2d2d34] border border-[#2d2d34]/20 hover:shadow-[3.5px_3.5px_0px_#2d2d34] hover:border-[#2d2d34] transition-all"
              >
                <div>
                  {/* Top Row: Track Icon & Access Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#faf9f6] border border-[#2d2d34] text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34]">
                        <ThemeIcon size={18} className="text-[#f26430]" />
                      </div>
                      <div>
                        <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-[#71717a] block">
                          {theme.category}
                        </span>
                        <span className="font-mono text-[10.5px] font-bold text-[#2d2d34]">
                          @{cluster.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {mode === "open" ? (
                        <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#5f7560]/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-[#5f7560] border border-[#5f7560]/30">
                          <Unlock size={10} /> OPEN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#f59e0b]/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-[#b45309] border border-[#f59e0b]/30">
                          <Lock size={10} /> INVITE ONLY
                        </span>
                      )}

                      {isLead ? (
                        <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#f26430]/10 px-1.5 py-0.2 font-mono text-[8.5px] font-bold uppercase text-[#f26430] border border-[#f26430]/30">
                          LEAD
                        </span>
                      ) : isMember ? (
                        <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#5f7560]/10 px-1.5 py-0.2 font-mono text-[8.5px] font-bold uppercase text-[#5f7560] border border-[#5f7560]/30">
                          <CheckCircle2 size={9} /> ENROLLED
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3.5">
                    <Link
                      href={`/chapter/${slug}/clusters/${cluster.id}`}
                      className="block group/link"
                    >
                      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34] group-hover/link:text-[#f26430] transition line-clamp-1">
                        {cluster.name}
                      </h3>
                    </Link>
                    <p className="mt-1 text-xs text-[#52525b] leading-relaxed line-clamp-2">
                      {cluster.description || "Specialized learning and build track for campus builders."}
                    </p>
                  </div>

                  {/* Leadership Cardlets */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {leader ? (
                      <div className="flex items-center gap-1.5 rounded-[4px] bg-[#faf9f6] px-2 py-0.5 border border-[#2d2d34]/20">
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2d2d34] text-[8px] font-mono font-bold text-white uppercase">
                          {leader.fullName[0]}
                        </div>
                        <span className="font-mono text-[10px] font-bold text-[#2d2d34] truncate max-w-[120px]">
                          {leader.fullName}
                        </span>
                        <span className="font-mono text-[9px] text-[#71717a]">LEAD</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 rounded-[4px] bg-[#faf9f6] px-2 py-0.5 font-mono text-[#71717a] text-[10px] border border-dashed border-[#2d2d34]/20">
                        <UserCheck size={11} />
                        <span>LEAD UNASSIGNED</span>
                      </div>
                    )}

                    {faculty ? (
                      <div className="flex items-center gap-1.5 rounded-[4px] bg-[#faf9f6] px-2 py-0.5 border border-[#2d2d34]/20">
                        <GraduationCap size={11} className="text-[#5f7560]" />
                        <span className="font-mono text-[10px] font-bold text-[#2d2d34] truncate max-w-[110px]">
                          {faculty.fullName}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-[#2d2d34]/15">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Stacked Member Avatars */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {memberProfiles.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            title={m.fullName}
                            className="inline-flex h-5.5 w-5.5 items-center justify-center rounded-full bg-[#2d2d34] text-white border border-white font-mono text-[8.5px] font-bold uppercase"
                          >
                            {m.fullName[0]}
                          </div>
                        ))}
                      </div>
                      <span className="font-mono text-[10.5px] font-bold text-[#71717a]">
                        {cluster.memberIds.length} {cluster.memberIds.length === 1 ? "MEMBER" : "MEMBERS"}
                      </span>
                    </div>

                    {/* Incubating Projects Count */}
                    {clusterProjects.length > 0 && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#f26430]">
                        <Rocket size={11} />
                        {clusterProjects.length} {clusterProjects.length === 1 ? "PROJ" : "PROJS"}
                      </span>
                    )}
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/chapter/${slug}/clusters/${cluster.id}`}
                      className="flex-1"
                    >
                      <button
                        type="button"
                        className="w-full h-8 px-3 rounded-[6px] bg-[#faf9f6] hover:bg-[#2d2d34] text-[#2d2d34] hover:text-white font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition-all flex items-center justify-between group/btn cursor-pointer"
                      >
                        <span>{isLead || canManage ? "Manage Track" : "Explore Track"}</span>
                        <ArrowRight
                          size={12}
                          className="transition-transform group-hover/btn:translate-x-0.5 text-[#f26430]"
                        />
                      </button>
                    </Link>

                    {canManage || isLead ? (
                      <Link href={`/chapter/${slug}/clusters/${cluster.id}?addMember=true`}>
                        <button
                          type="button"
                          className="h-8 px-2.5 rounded-[6px] bg-white hover:bg-[#faf9f6] text-[#f26430] font-mono text-[10px] font-bold uppercase tracking-wider border border-[#2d2d34]/30 shadow-[1px_1px_0px_#2d2d34] transition flex items-center gap-1 cursor-pointer shrink-0"
                          title="Add students to cluster"
                        >
                          <UserPlus size={12} />
                          <span className="hidden sm:inline">Add</span>
                        </button>
                      </Link>
                    ) : null}

                    {!isMember && mode === "open" ? (
                      <button
                        type="button"
                        onClick={() => handleQuickJoin(cluster)}
                        className={cn(
                          "h-8 px-3 rounded-[6px] font-mono text-[10.5px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition shrink-0 cursor-pointer",
                          !isDiscordConnected
                            ? "bg-white hover:bg-[#faf9f6] text-[#5865F2]"
                            : "bg-[#f26430] hover:bg-[#d85322] text-white",
                        )}
                      >
                        {!isDiscordConnected ? (
                          <span className="flex items-center gap-1.5">
                            <DiscordIcon className="w-3.5 h-3.5" />
                            <span>Link</span>
                          </span>
                        ) : (
                          "Join"
                        )}
                      </button>
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
