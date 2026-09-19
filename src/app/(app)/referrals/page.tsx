"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  GitBranch,
  Link2,
  MessageCircle,
  Phone,
  Plus,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { Dialog } from "@/components/ui/dialog";
import { useCurrentUser, useStore } from "@/context/store-context";
import { createInviteToken, revokeInviteToken } from "@/lib/data/supabase-bootstrap";
import { formatDateTime, cn } from "@/lib/utils";
import { isHqRole } from "@/lib/permissions";
import type { InviteToken } from "@/types";

/** ms remaining until expiry (negative = expired) */
function msUntil(iso?: string): number {
  if (!iso) return Infinity;
  return new Date(iso).getTime() - Date.now();
}

function expiryLabel(iso?: string): string {
  if (!iso) return "";
  const ms = msUntil(iso);
  if (ms <= 0) return "Expired";
  const h = ms / (1000 * 60 * 60);
  if (h < 1) return "< 1h left";
  if (h < 24) return `${Math.round(h)}h left`;
  const d = Math.floor(h / 24);
  return `${d}d left`;
}

function expiryTone(iso?: string): "green" | "orange" | "mute" {
  if (!iso) return "green";
  const h = msUntil(iso) / (1000 * 60 * 60);
  if (h <= 0) return "mute";
  if (h < 24) return "orange";
  return "green";
}

export default function UnifiedReferralsPage() {
  const { store, revokeChapterInviteCode } = useStore();
  const { session, profile } = useCurrentUser();

  // Tab control: "my-links" | "leaderboard" | "network-tree"
  const isHqOrLead = isHqRole(session.roleKey) || session.roleKey === "campus_lead";
  const [activeTab, setActiveTab] = useState<"my-links" | "leaderboard" | "network-tree">("my-links");

  // Invite generation state
  const [generatingToken, setGeneratingToken] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const [localTokens, setLocalTokens] = useState<InviteToken[]>([]);

  // Directory filter within Tab 1
  const [directoryFilter, setDirectoryFilter] = useState<"all" | "joined" | "pending" | "expired">("all");
  const [isExpanded, setIsExpanded] = useState(false);
  const INITIAL_DIRECTORY_LIMIT = 4;

  // Modals
  const [revokeTokenTarget, setRevokeTokenTarget] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);

  // Search & Filters for Network tab
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "used" | "unused">("all");

  const userId = session.userId;

  // All tokens merged
  const allTokens = useMemo(() => {
    const existing = store.inviteTokens ?? [];
    const merged = existing.map((t) => (revokedIds.has(t.id) ? { ...t, isActive: false } : t));
    const newLocals = localTokens
      .filter((lt) => !existing.some((e) => e.id === lt.id))
      .map((t) => (revokedIds.has(t.id) ? { ...t, isActive: false } : t));
    return [...newLocals, ...merged];
  }, [store.inviteTokens, localTokens, revokedIds]);

  const profiles = store.profiles;

  // User's own tokens
  const myTokens = allTokens.filter(
    (t) => t.createdBy === userId || (session.authUserId && t.createdBy === session.authUserId),
  );
  const myActiveTokens = myTokens.filter(
    (t) =>
      !t.usedBy &&
      t.isActive &&
      !revokedIds.has(t.id) &&
      msUntil(t.expiresAt) > 0,
  );
  const myUsedTokens = myTokens.filter((t) => !!t.usedBy);
  const myExpiredTokens = myTokens.filter(
    (t) => !t.usedBy && (msUntil(t.expiresAt) <= 0 || !t.isActive),
  );

  // Filtered tokens for directory
  const filteredMyTokens = useMemo(() => {
    return myTokens.filter((t) => {
      const isRevoked = revokedIds.has(t.id) || !t.isActive;
      const expired = !t.usedBy && (msUntil(t.expiresAt) <= 0 || isRevoked);
      if (directoryFilter === "joined") return !!t.usedBy;
      if (directoryFilter === "pending") return !t.usedBy && !expired;
      if (directoryFilter === "expired") return expired;
      return true;
    });
  }, [myTokens, directoryFilter, revokedIds]);

  // Displayed tokens with Read More pagination
  const displayedMyTokens = useMemo(() => {
    if (isExpanded) return filteredMyTokens;
    return filteredMyTokens.slice(0, INITIAL_DIRECTORY_LIMIT);
  }, [filteredMyTokens, isExpanded]);

  function buildInviteUrl(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/invite/${token}`;
  }

  async function handleGenerateLink() {
    setError("");
    setGeneratingToken(true);
    const created = await createInviteToken(userId);
    if (!created) {
      setError("Could not generate invite link. Please check your connection.");
      setGeneratingToken(false);
      return;
    }
    setNewToken(created.token);
    setLocalTokens((prev) => [
      {
        id: created.id,
        token: created.token,
        createdBy: userId,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
        isActive: true,
      },
      ...prev,
    ]);
    setGeneratingToken(false);
  }

  async function handleCopyLink(token: string) {
    const url = buildInviteUrl(token);
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function handleShareWhatsApp(token: string) {
    const url = buildInviteUrl(token);
    const text = `Join me on Elevates OS! Here is your exclusive 24-hour invite link to register your student account:\n\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function handleRevoke(tokenId: string) {
    setRevokingId(tokenId);
    const tok = allTokens.find((t) => t.id === tokenId);
    const tokenStr = tok?.token;
    await revokeChapterInviteCode(tokenId, tokenStr);
    const ok = await revokeInviteToken(tokenId, tokenStr);
    if (ok) {
      setRevokedIds((prev) => new Set([...prev, tokenId, ...(tokenStr ? [tokenStr] : [])]));
      setLocalTokens((prev) =>
        prev.map((t) =>
          t.id === tokenId || (tokenStr && t.token === tokenStr) ? { ...t, isActive: false } : t,
        ),
      );
    }
    setRevokingId(null);
  }

  const latestActiveTokenObj = myActiveTokens[0] ?? (newToken ? { token: newToken, expiresAt: undefined } : null);
  const latestPendingToken = latestActiveTokenObj?.token ?? null;
  const latestExpiresAt =
    latestActiveTokenObj && "expiresAt" in latestActiveTokenObj
      ? (latestActiveTokenObj as { expiresAt?: string }).expiresAt
      : undefined;

  // Top Referrers Leaderboard
  const topReferrers = useMemo(() => {
    const counts: Record<string, number> = {};
    allTokens.forEach((t) => {
      if (t.usedBy) counts[t.createdBy] = (counts[t.createdBy] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([uId, count]) => ({
        profile: profiles.find((p) => p.id === uId),
        count,
      }))
      .filter((e) => e.profile)
      .sort((a, b) => b.count - a.count);
  }, [allTokens, profiles]);

  // Network Tree Filtered Rows (for HQ/Admin view)
  const networkRows = useMemo(() => {
    return allTokens
      .map((t) => {
        const referrer = profiles.find((p) => p.id === t.createdBy);
        const invited = t.usedBy ? profiles.find((p) => p.id === t.usedBy) : null;
        const chapter = t.chapterId ? store.chapters.find((c) => c.id === t.chapterId) : null;
        const expired = !t.usedBy && msUntil(t.expiresAt) <= 0;
        return { token: t, referrer, invited, chapter, expired };
      })
      .filter((row) => {
        if (filterStatus === "used" && !row.token.usedBy) return false;
        if (filterStatus === "unused" && (row.token.usedBy || row.expired)) return false;
        if (!q.trim()) return true;
        const needle = q.trim().toLowerCase();
        return (
          row.referrer?.fullName.toLowerCase().includes(needle) ||
          row.referrer?.email.toLowerCase().includes(needle) ||
          row.invited?.fullName.toLowerCase().includes(needle) ||
          row.invited?.email.toLowerCase().includes(needle) ||
          row.token.token.toLowerCase().includes(needle)
        );
      });
  }, [allTokens, profiles, store.chapters, q, filterStatus]);

  // User's rank in top referrers
  const myRank = useMemo(() => {
    const idx = topReferrers.findIndex((r) => r.profile?.id === userId);
    return idx >= 0 ? idx + 1 : null;
  }, [topReferrers, userId]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Network & Growth"
        title="Referrals & Invites"
        description="Invite fellow students with single-use links, track who registered, and expand your campus network."
      />

      {/* 2. Global Overview Stats Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Your Referrals"
          value={myUsedTokens.length}
          hint="Enrolled student members"
          accent="orange"
        />
        <Stat
          label="Active Pending Links"
          value={myActiveTokens.length}
          hint={myActiveTokens.length > 0 ? "Ready to share (24h valid)" : "No active link generated"}
        />
        <Stat
          label="Campus Rank"
          value={myRank ? `#${myRank}` : "Unranked"}
          hint={myRank ? `Out of ${topReferrers.length} referrers` : "Share a link to enter rank"}
        />
        <Stat
          label="Total Network Growth"
          value={allTokens.filter((t) => t.usedBy).length}
          hint="Community-wide members joined"
        />
      </div>

      {/* 3. Modern Segmented Tab Bar */}
      <div className="flex border-b border-border/80 gap-1 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("my-links")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap",
            activeTab === "my-links"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]/50 rounded-t-lg font-bold"
              : "border-transparent text-text-dim hover:text-text hover:bg-bg/60 rounded-t-lg",
          )}
        >
          <Link2 size={14} />
          <span>My Invites & Referrals</span>
          {myTokens.length > 0 && (
            <span className="rounded-full bg-bg px-1.5 py-0.2 text-[10px] font-mono font-bold text-text-muted border border-border/60">
              {myTokens.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("leaderboard")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap",
            activeTab === "leaderboard"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]/50 rounded-t-lg font-bold"
              : "border-transparent text-text-dim hover:text-text hover:bg-bg/60 rounded-t-lg",
          )}
        >
          <Trophy size={14} />
          <span>Campus Leaderboard</span>
          {topReferrers.length > 0 && (
            <span className="rounded-full bg-bg px-1.5 py-0.2 text-[10px] font-mono font-bold text-text-muted border border-border/60">
              {topReferrers.length}
            </span>
          )}
        </button>

        {isHqOrLead && (
          <button
            type="button"
            onClick={() => setActiveTab("network-tree")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 cursor-pointer whitespace-nowrap",
              activeTab === "network-tree"
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]/50 rounded-t-lg font-bold"
                : "border-transparent text-text-dim hover:text-text hover:bg-bg/60 rounded-t-lg",
            )}
          >
            <GitBranch size={14} />
            <span>Network Audit (Admin)</span>
            <span className="rounded-full bg-bg px-1.5 py-0.2 text-[10px] font-mono font-bold text-text-muted border border-border/60">
              {networkRows.length}
            </span>
          </button>
        )}
      </div>

      {/* ── TAB 1: MY INVITES & REFERRALS ────────────────────────────── */}
      {activeTab === "my-links" && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.3fr]">
          {/* Left Column: Generator & Active Link Hub */}
          <div className="space-y-6">
            <TerminalPanel
              title="Invite Link Hub"
              meta="Single-use 24-hour links"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateLink}
                  disabled={generatingToken}
                  className="gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{generatingToken ? "Generating..." : "New Link"}</span>
                </Button>
              }
            >
              <p className="text-[13px] text-text-dim leading-relaxed mb-4">
                Elevates OS membership is invite-only. Each link is single-use, expires in 24 hours, and automatically links the new student profile to your referral profile.
              </p>

              {/* Active / last generated link showcase */}
              {latestPendingToken ? (
                <div className="rounded-xl border border-[var(--accent)]/40 bg-gradient-to-b from-[var(--accent-soft)]/30 to-bg-panel p-4.5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                        Active Single-Use Link
                      </span>
                    </div>
                    {latestExpiresAt && (
                      <span className="flex items-center gap-1 rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-mono font-bold text-text-dim border border-border/70">
                        <Clock size={11} className="text-[var(--accent)]" />
                        {expiryLabel(latestExpiresAt)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-bg px-3 py-2">
                      <Link2 size={14} className="text-text-mute shrink-0" />
                      <code className="flex-1 font-mono text-[12px] text-text truncate select-all">
                        {buildInviteUrl(latestPendingToken)}
                      </code>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      <Button
                        variant="orange"
                        size="sm"
                        onClick={() => handleCopyLink(latestPendingToken)}
                        className="gap-1.5 text-xs font-bold justify-center cursor-pointer shadow-xs"
                      >
                        {copiedToken === latestPendingToken ? (
                          <>
                            <CheckCheck size={14} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Link</span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleShareWhatsApp(latestPendingToken)}
                        className="gap-1.5 text-xs font-bold justify-center cursor-pointer bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30"
                      >
                        <MessageCircle size={14} />
                        <span>WhatsApp</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQrToken(latestPendingToken)}
                        className="gap-1.5 text-xs font-medium justify-center cursor-pointer border border-border/80 text-text-dim hover:text-text col-span-2 sm:col-span-1"
                      >
                        <QrCode size={13} />
                        <span>Show QR</span>
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-text-mute">
                    <a
                      href={buildInviteUrl(latestPendingToken)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
                    >
                      <span>Preview invite page</span>
                      <ExternalLink size={10} />
                    </a>
                    {latestActiveTokenObj && "id" in latestActiveTokenObj && (
                      <button
                        type="button"
                        onClick={() => setRevokeTokenTarget((latestActiveTokenObj as { id: string }).id)}
                        className="text-red-500 hover:underline cursor-pointer font-medium"
                      >
                        Revoke link
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3 bg-bg/50">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-text">No active invite link ready</p>
                    <p className="mt-1 text-[12px] text-text-dim max-w-sm mx-auto">
                      Click below to generate an exclusive 24-hour invite link you can share directly or send on WhatsApp.
                    </p>
                  </div>
                  <Button
                    variant="orange"
                    size="sm"
                    onClick={handleGenerateLink}
                    disabled={generatingToken}
                    className="gap-1.5 font-bold shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>{generatingToken ? "Generating Link..." : "Generate 24-Hour Link"}</span>
                  </Button>
                </div>
              )}

              {error ? (
                <p className="mt-3 text-[12px] font-medium text-red-500">{error}</p>
              ) : null}
            </TerminalPanel>

            {/* How It Works Doctrine Card */}
            <TerminalPanel title="How Referrals Work">
              <div className="space-y-3.5 text-[12px]">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-[11px] font-bold text-[var(--accent)]">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-text">Generate & Share Your Link</p>
                    <p className="mt-0.5 text-text-dim leading-relaxed">
                      Send your link to classmates, project collaborators, or students looking to join your campus chapter.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-[11px] font-bold text-[var(--accent)]">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-text">Exclusive 24-Hour Validity</p>
                    <p className="mt-0.5 text-text-dim leading-relaxed">
                      Each link can only be claimed once to maintain campus verification integrity. Expired links can be regenerated anytime.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-[11px] font-bold text-[var(--accent)]">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-text">Earn Recognition & Climb Ranks</p>
                    <p className="mt-0.5 text-text-dim leading-relaxed">
                      Every student who joins is attributed to your profile, increasing your campus standing on the global leaderboard.
                    </p>
                  </div>
                </div>
              </div>
            </TerminalPanel>
          </div>

          {/* Right Column: Personal Referrals Directory */}
          <div className="space-y-6">
            <TerminalPanel
              title="My Referral Directory"
              meta={`${myTokens.length} total invitations created`}
            >
              {/* Directory Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 border-b border-border/60">
                {(
                  [
                    { key: "all", label: "All", count: myTokens.length },
                    { key: "joined", label: "Joined", count: myUsedTokens.length },
                    { key: "pending", label: "Pending", count: myActiveTokens.length },
                    { key: "expired", label: "Expired", count: myExpiredTokens.length },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setDirectoryFilter(f.key);
                      setIsExpanded(false);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                      directoryFilter === f.key
                        ? "bg-[var(--accent)] text-white shadow-xs"
                        : "bg-bg text-text-dim hover:text-text border border-border/60 hover:bg-bg/80",
                    )}
                  >
                    <span>{f.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold",
                        directoryFilter === f.key ? "bg-white/20 text-white" : "bg-bg-panel text-text-muted",
                      )}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              {filteredMyTokens.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Users size={32} className="mx-auto text-text-mute opacity-40" />
                  <p className="text-[13px] font-bold text-text">No invitations match this view</p>
                  <p className="text-[12px] text-text-dim max-w-xs mx-auto">
                    {directoryFilter === "joined"
                      ? "None of your invited classmates have registered yet."
                      : directoryFilter === "pending"
                        ? "You have no pending active links right now."
                        : "Share your invite link to start building your campus network roster."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60 text-[12px]">
                  {displayedMyTokens.map((t) => {
                    const invited = t.usedBy ? profiles.find((p) => p.id === t.usedBy) : null;
                    const isRevoked = revokedIds.has(t.id) || !t.isActive;
                    const expired = !t.usedBy && (msUntil(t.expiresAt) <= 0 || isRevoked);
                    const canRevoke = !t.usedBy && !expired && !isRevoked;

                    return (
                      <li key={t.id} className="py-3.5 first:pt-1 last:pb-0 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          {invited ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-[11px] font-bold text-[var(--accent)]">
                                  {invited.fullName.slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <Link
                                    href={`/profile/${invited.elevatesId || invited.id}`}
                                    className="font-bold text-[13px] text-text hover:text-[var(--accent)] truncate block transition-colors"
                                  >
                                    {invited.fullName}
                                  </Link>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-dim">
                                    {invited.elevatesId && (
                                      <span className="font-mono font-bold text-[var(--accent)]">
                                        {invited.elevatesId}
                                      </span>
                                    )}
                                    {invited.phone && (
                                      <span className="flex items-center gap-1 font-mono text-text-mute">
                                        <Phone size={10} />
                                        {invited.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <Link2 size={13} className="text-text-mute shrink-0" />
                                <span className="font-mono text-[12px] font-semibold text-text select-all truncate">
                                  {t.token}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(t.token)}
                                  title="Copy invite URL"
                                  className="text-text-mute hover:text-text cursor-pointer p-0.5 rounded transition-colors"
                                >
                                  {copiedToken === t.token ? (
                                    <Check size={12} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                              <p
                                className={cn(
                                  "text-[11px] font-medium",
                                  isRevoked
                                    ? "text-orange-500"
                                    : expired
                                      ? "text-red-400"
                                      : "text-emerald-600 dark:text-emerald-400",
                                )}
                              >
                                {isRevoked
                                  ? "Revoked by user"
                                  : expired
                                    ? "Expired link"
                                    : "Active — awaiting student registration"}
                              </p>
                            </div>
                          )}

                          <p className="font-mono text-[10px] text-text-mute">
                            {t.usedAt
                              ? `Joined ${formatDateTime(t.usedAt)}`
                              : t.expiresAt
                                ? `Expires ${formatDateTime(t.expiresAt)}`
                                : `Created ${formatDateTime(t.createdAt)}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            tone={
                              t.usedBy
                                ? "green"
                                : isRevoked
                                  ? "orange"
                                  : expired
                                    ? "mute"
                                    : expiryTone(t.expiresAt)
                            }
                          >
                            {t.usedBy
                              ? "Joined"
                              : isRevoked
                                ? "Revoked"
                                : expired
                                  ? "Expired"
                                  : expiryLabel(t.expiresAt) || "Pending"}
                          </Badge>

                          {canRevoke && (
                            <button
                              type="button"
                              onClick={() => setRevokeTokenTarget(t.id)}
                              disabled={revokingId === t.id}
                              title="Revoke this invite link"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 text-text-mute transition-colors hover:border-red-400 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40 cursor-pointer"
                            >
                              {revokingId === t.id ? (
                                <span className="animate-spin text-[10px]">⟳</span>
                              ) : (
                                <Trash2 size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Read more pagination toggle */}
              {filteredMyTokens.length > INITIAL_DIRECTORY_LIMIT && (
                <div className="pt-3 border-t border-border/60 text-center">
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={13} />
                        <span>Show less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={13} />
                        <span>Read more ({filteredMyTokens.length - INITIAL_DIRECTORY_LIMIT} more referrals)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </TerminalPanel>
          </div>
        </div>
      )}

      {/* ── TAB 2: REFERRAL LEADERBOARD ──────────────────────────────────── */}
      {activeTab === "leaderboard" && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <TerminalPanel
            title="Top Referrers Leaderboard"
            meta="Student growth ambassadors across chapters"
          >
            {topReferrers.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-text-mute">
                No successful student referrals recorded yet across chapters.
              </p>
            ) : (
              <ol className="divide-y divide-border/60 text-[12px]">
                {topReferrers.map(({ profile: p, count }, idx) => {
                  const isMe = p?.id === userId;
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  return (
                    <li
                      key={p!.id}
                      className={cn(
                        "flex items-center justify-between gap-4 py-3.5 px-3 rounded-xl transition-all",
                        isMe
                          ? "bg-[var(--accent-soft)]/40 border border-[var(--accent)]/30 font-semibold"
                          : "hover:bg-bg/60",
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Podium Rank Badges */}
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-extrabold shadow-2xs",
                            isTop1
                              ? "bg-amber-400 text-black border border-amber-500/40"
                              : isTop2
                                ? "bg-slate-300 text-slate-900 border border-slate-400/40"
                                : isTop3
                                  ? "bg-amber-700 text-white border border-amber-800/40"
                                  : "bg-bg-panel text-text-mute border border-border",
                          )}
                        >
                          {idx + 1}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/profile/${p!.elevatesId || p!.id}`}
                              className="font-bold text-[13px] text-text hover:text-[var(--accent)] truncate transition-colors"
                            >
                              {p!.fullName}
                            </Link>
                            {isMe && <Badge tone="cyan">You</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-text-mute mt-0.5">
                            {p?.elevatesId && (
                              <span className="font-mono font-bold text-[var(--accent)]">
                                {p.elevatesId}
                              </span>
                            )}
                            {p?.email && <span className="truncate">· {p.email}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-[family-name:var(--font-display)] text-base font-extrabold text-text tabular-nums">
                          {count}
                        </span>
                        <span className="text-xs text-text-mute">joined</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </TerminalPanel>

          {/* Rewards & Doctrine */}
          <div className="space-y-6">
            <TerminalPanel title="Referral Rewards & Perks">
              <div className="space-y-4 text-[13px] text-text-dim leading-relaxed">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <Trophy size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-text">Campus Reputation Points</p>
                    <p className="text-[12px] text-text-mute mt-0.5">
                      Each verified registration adds direct points to your student profile and elevates your rank.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-text">Automatic Elevates ID</p>
                    <p className="text-[12px] text-text-mute mt-0.5">
                      Every invited member automatically receives an official collegiate identifier code (<code className="font-mono text-[11px]">ELV-XXX-0001</code>).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-text">Chapter Ambassador Status</p>
                    <p className="text-[12px] text-text-mute mt-0.5">
                      Top referrers are prioritized for chapter executive terms, summits, and open source grants.
                    </p>
                  </div>
                </div>
              </div>
            </TerminalPanel>

            <div className="rounded-[var(--radius)] border border-border/80 bg-bg-panel p-4 shadow-[var(--shadow-sm)] space-y-2">
              <p className="text-xs font-bold text-text">Your Referral Standing</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-dim">Current Rank:</span>
                <span className="font-bold text-text font-mono">
                  {myRank ? `#${myRank}` : "Unranked"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-dim">Members Enrolled:</span>
                <span className="font-bold text-[var(--accent)] font-mono">
                  {myUsedTokens.length} students
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: NETWORK TREE (HQ / ADMIN VIEW) ────────────────────────── */}
      {activeTab === "network-tree" && isHqOrLead && (
        <TerminalPanel
          title="Network Invite & Referral Audit"
          meta={`${networkRows.length} network records`}
        >
          {/* Search & Filters */}
          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[240px]">
              <FieldLabel>Search network invites</FieldLabel>
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-mute"
                />
                <Input
                  placeholder="Referrer name, invited student, or token…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-8 text-xs"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Status Filter</FieldLabel>
              <div className="flex gap-1.5">
                {(["all", "used", "unused"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer",
                      filterStatus === s
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-border/80 bg-bg text-text-dim hover:text-text",
                    )}
                  >
                    {s === "all" ? "All" : s === "used" ? "Joined" : "Pending"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {networkRows.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <GitBranch size={32} className="mx-auto text-text-mute opacity-40" />
              <p className="text-[13px] font-bold text-text">No matching invite records</p>
              <p className="text-[12px] text-text-dim">Try adjusting your search query or status filter.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60 text-[12px]">
              {networkRows.map(({ token: t, referrer, invited, chapter, expired }) => (
                <li key={t.id} className="py-3.5 first:pt-1 last:pb-0 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Referrer → Invitee Relationship */}
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <Link
                        href={referrer ? `/profile/${referrer.elevatesId || referrer.id}` : "#"}
                        className="font-bold text-text hover:text-[var(--accent)] transition-colors"
                      >
                        {referrer?.fullName ?? "Unknown"}
                      </Link>
                      <span className="text-text-mute">→</span>
                      {invited ? (
                        <Link
                          href={`/profile/${invited.elevatesId || invited.id}`}
                          className="font-bold text-[var(--accent)] hover:underline"
                        >
                          {invited.fullName}
                        </Link>
                      ) : (
                        <span className="text-text-mute italic text-xs">Awaiting registration</span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-mute">
                      <code className="font-mono text-text-dim font-bold">{t.token}</code>
                      {chapter && <span>· {chapter.name}</span>}
                      <span>· Created {formatDateTime(t.createdAt)}</span>
                      {t.usedAt && <span>· Joined {formatDateTime(t.usedAt)}</span>}
                      {!t.usedBy && t.expiresAt && (
                        <span
                          className={cn(
                            "flex items-center gap-1 font-semibold",
                            expired ? "text-red-400" : "text-amber-500",
                          )}
                        >
                          <Clock size={10} />
                          {expired
                            ? `Expired ${formatDateTime(t.expiresAt)}`
                            : `Expires ${formatDateTime(t.expiresAt)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge tone={t.usedBy ? "green" : expired ? "mute" : expiryTone(t.expiresAt)}>
                    {t.usedBy ? "Joined" : expired ? "Expired" : expiryLabel(t.expiresAt) || "Pending"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </TerminalPanel>
      )}

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={Boolean(revokeTokenTarget)}
        onClose={() => setRevokeTokenTarget(null)}
        title="Revoke Invite Link"
        description="Are you sure you want to revoke this invite link? The student will no longer be able to use it to register."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevokeTokenTarget(null)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              size="sm"
              onClick={() => {
                if (revokeTokenTarget) {
                  handleRevoke(revokeTokenTarget);
                  setRevokeTokenTarget(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
            >
              Revoke Link
            </Button>
          </div>
        }
      >
        <div className="py-2 text-xs text-text-dim">
          This single-use invite code will immediately become invalid. You can generate a fresh link anytime.
        </div>
      </Dialog>

      {/* QR Code Popover Dialog */}
      <Dialog
        open={Boolean(qrToken)}
        onClose={() => setQrToken(null)}
        title="Scan Student Invite QR"
        description="Have your friend scan this QR code on their camera to immediately open the Elevates registration page."
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQrToken(null)}
              className="cursor-pointer"
            >
              Close
            </Button>
            {qrToken && (
              <Button
                variant="orange"
                size="sm"
                onClick={() => handleCopyLink(qrToken)}
                className="gap-1.5 font-bold shadow-xs cursor-pointer"
              >
                {copiedToken === qrToken ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedToken === qrToken ? "Copied!" : "Copy Link"}</span>
              </Button>
            )}
          </div>
        }
      >
        {qrToken && (
          <div className="flex flex-col items-center justify-center p-4">
            <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-sm">
              <QRCode
                value={buildInviteUrl(qrToken)}
                size={180}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
            <p className="mt-3 font-mono text-[11px] text-text-muted select-all text-center">
              {buildInviteUrl(qrToken)}
            </p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
