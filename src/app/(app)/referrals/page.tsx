"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCheck,
  CircleDot,
  Clock,
  Copy,
  ExternalLink,
  GitBranch,
  Link2,
  MessageCircle,
  Search,
  Share2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { createInviteToken } from "@/lib/data/supabase-bootstrap";
import { formatDateTime } from "@/lib/utils";
import { isHqRole } from "@/lib/permissions";

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
  const { store } = useStore();
  const { session, profile } = useCurrentUser();

  // Tab control: "my-links" | "leaderboard" | "network-tree"
  const isHqOrLead = isHqRole(session.roleKey) || session.roleKey === "campus_lead";
  const [activeTab, setActiveTab] = useState<"my-links" | "leaderboard" | "network-tree">("my-links");

  // Invite generation state
  const [generatingToken, setGeneratingToken] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Search & Filters for HQ/Network tab
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "used" | "unused">("all");

  const userId = session.userId;
  const chapterId = profile?.chapterId;

  // All tokens
  const allTokens = store.inviteTokens ?? [];
  const profiles = store.profiles;

  // Tokens created by current user
  const myTokens = useMemo(
    () => allTokens.filter((t) => t.createdBy === userId),
    [allTokens, userId],
  );

  const myUsedTokens = myTokens.filter((t) => t.usedBy);
  const myActiveTokens = myTokens.filter(
    (t) => !t.usedBy && t.isActive && msUntil(t.expiresAt) > 0,
  );
  const myExpiredTokens = myTokens.filter(
    (t) => !t.usedBy && (msUntil(t.expiresAt) <= 0 || !t.isActive),
  );

  function buildInviteUrl(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/invite/${token}`;
  }

  async function handleGenerateLink() {
    setError("");
    setGeneratingToken(true);
    const token = await createInviteToken(userId, chapterId);
    if (!token) {
      setError("Could not generate invite link. Please check your connection.");
      setGeneratingToken(false);
      return;
    }
    setNewToken(token);
    setGeneratingToken(false);
  }

  async function handleCopyLink(token: string) {
    const url = buildInviteUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareWhatsApp(token: string) {
    const url = buildInviteUrl(token);
    const text = `Join me on Elevates OS! Here is your exclusive 7-day invite link to register your student account:\n\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  }

  const latestActiveTokenObj = myActiveTokens[0] ?? (newToken ? { token: newToken, expiresAt: undefined } : null);
  const latestPendingToken = latestActiveTokenObj?.token ?? null;
  const latestExpiresAt = latestActiveTokenObj && "expiresAt" in latestActiveTokenObj
    ? (latestActiveTokenObj as any).expiresAt
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
    <div>
      <PageHeader
        eyebrow="Network & Growth"
        title="Referrals & Invites"
        description="Invite fellow students, share your personal invite link, and track your referral network across Elevates OS."
      />

      {/* Global Overview Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-border bg-bg-panel p-4 shadow-[var(--shadow-sm)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10">
            <Users size={16} className="text-[var(--accent)]" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold tabular-nums">
            {myUsedTokens.length}
          </p>
          <p className="text-[11px] text-text-mute">Your Referrals</p>
        </div>

        <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-border bg-bg-panel p-4 shadow-[var(--shadow-sm)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange/10">
            <Clock size={16} className="text-orange" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold tabular-nums">
            {myActiveTokens.length}
          </p>
          <p className="text-[11px] text-text-mute">Active Pending Links</p>
        </div>

        <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-border bg-bg-panel p-4 shadow-[var(--shadow-sm)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10">
            <Trophy size={16} className="text-yellow-500" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold tabular-nums">
            {myRank ? `#${myRank}` : "Unranked"}
          </p>
          <p className="text-[11px] text-text-mute">Referral Rank</p>
        </div>

        <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-border bg-bg-panel p-4 shadow-[var(--shadow-sm)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green/10">
            <GitBranch size={16} className="text-green" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold tabular-nums">
            {allTokens.filter((t) => t.usedBy).length}
          </p>
          <p className="text-[11px] text-text-mute">Network Total Joined</p>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="mb-6 flex flex-wrap items-center border-b border-border gap-2 pb-3">
        <button
          onClick={() => setActiveTab("my-links")}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
            activeTab === "my-links"
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-text-mute hover:bg-bg-panel hover:text-text"
          }`}
        >
          <Link2 size={14} />
          My Invite Link & Referrals
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
            activeTab === "leaderboard"
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-text-mute hover:bg-bg-panel hover:text-text"
          }`}
        >
          <Trophy size={14} />
          Referral Leaderboard ({topReferrers.length})
        </button>
        {isHqOrLead && (
          <button
            onClick={() => setActiveTab("network-tree")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              activeTab === "network-tree"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-text-mute hover:bg-bg-panel hover:text-text"
            }`}
          >
            <GitBranch size={14} />
            Network Tree (Admin View)
          </button>
        )}
      </div>

      {/* ── TAB 1: MY INVITE LINK & REFERRALS ────────────────────────────── */}
      {activeTab === "my-links" && (
        <div className="grid gap-6 xl:grid-cols-5">
          {/* Main generator card */}
          <div className="xl:col-span-3 space-y-6">
            <TerminalPanel title="invite.generator" accent="cyan">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-text">Generate Invite Link</h3>
                  <p className="mt-1 text-[13px] text-text-dim leading-relaxed">
                    Elevates OS registration is invite-only. Generate a single-use
                    link below to invite a student. Each link remains valid for <strong>7 days</strong>.
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Sparkles size={20} />
                </div>
              </div>

              {/* Active / last generated link display */}
              {latestPendingToken ? (
                <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                      Active single-use invite link
                    </span>
                    {latestExpiresAt && (
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        msUntil(latestExpiresAt) < 24 * 60 * 60 * 1000
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        <Clock size={11} />
                        {expiryLabel(latestExpiresAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <code className="flex-1 min-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-bg px-3 py-2 font-mono text-[12px] text-text border border-border">
                      {buildInviteUrl(latestPendingToken)}
                    </code>
                    <Button
                      variant="secondary"
                      onClick={() => handleCopyLink(latestPendingToken)}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {copied ? <CheckCheck size={14} className="text-green" /> : <Copy size={14} />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button
                      variant="orange"
                      onClick={() => handleShareWhatsApp(latestPendingToken)}
                      className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mb-5 rounded-[var(--radius)] border border-dashed border-border p-5 text-center text-[13px] text-text-mute">
                  No active invite link generated yet. Click the button below to generate one.
                </div>
              )}

              {error && <p className="mb-3 text-[12px] text-red-500">{error}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  onClick={handleGenerateLink}
                  disabled={generatingToken}
                  className="flex items-center gap-2"
                >
                  <Link2 size={15} />
                  {generatingToken ? "Generating Link…" : "Generate New 7-Day Link"}
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-[11px] text-text-mute">
                <CircleDot size={12} className="text-[var(--accent)]" />
                <span>When your invitee registers, they automatically join your referral roster.</span>
              </div>
            </TerminalPanel>
          </div>

          {/* Personal Referrals Roster */}
          <div className="xl:col-span-2 space-y-6">
            <TerminalPanel title="my.referral_roster" meta={`${myTokens.length} invites total`}>
              {myTokens.length === 0 ? (
                <div className="py-8 text-center">
                  <Users size={32} className="mx-auto mb-2 text-text-mute opacity-40" />
                  <p className="text-[13px] font-medium text-text-dim">No referrals yet</p>
                  <p className="mt-1 text-[11px] text-text-mute">
                    Share your invite link with classmates to start building your referral roster.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {myTokens.map((t) => {
                    const invited = t.usedBy ? profiles.find((p) => p.id === t.usedBy) : null;
                    const expired = !t.usedBy && msUntil(t.expiresAt) <= 0;
                    return (
                      <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {invited ? (
                            <div>
                              <Link
                                href={`/profile/${invited.id}`}
                                className="font-semibold text-[13px] text-text hover:text-cyan block truncate"
                              >
                                {invited.fullName}
                              </Link>
                              {invited.elevatesId && (
                                <span className="font-mono text-[10px] text-[var(--accent)] font-semibold">
                                  {invited.elevatesId}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className={`text-[12px] italic ${expired ? "text-red-400" : "text-text-mute"}`}>
                              {expired ? "Expired Link" : "Pending registration…"}
                            </p>
                          )}
                          <p className="font-mono text-[10px] text-text-mute mt-0.5">
                            {t.usedAt
                              ? `Joined ${formatDateTime(t.usedAt)}`
                              : t.expiresAt
                              ? `Expires ${formatDateTime(t.expiresAt)}`
                              : `Created ${formatDateTime(t.createdAt)}`}
                          </p>
                        </div>
                        <Badge tone={t.usedBy ? "green" : expired ? "mute" : expiryTone(t.expiresAt)}>
                          {t.usedBy ? "Joined" : expired ? "Expired" : expiryLabel(t.expiresAt) || "Pending"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TerminalPanel>
          </div>
        </div>
      )}

      {/* ── TAB 2: REFERRAL LEADERBOARD ──────────────────────────────────── */}
      {activeTab === "leaderboard" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TerminalPanel title="referral.leaderboard" accent="orange">
              {topReferrers.length === 0 ? (
                <p className="text-[13px] text-text-dim py-6 text-center">
                  No successful referrals recorded yet in the network.
                </p>
              ) : (
                <ol className="divide-y divide-border">
                  {topReferrers.map(({ profile: p, count }, idx) => {
                    const isMe = p?.id === userId;
                    return (
                      <li
                        key={p!.id}
                        className={`flex items-center justify-between gap-4 py-3.5 px-2 rounded-md ${
                          isMe ? "bg-[var(--accent)]/10 border border-[var(--accent)]/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-extrabold ${
                              idx === 0
                                ? "bg-amber-400 text-black shadow-sm"
                                : idx === 1
                                ? "bg-slate-300 text-black"
                                : idx === 2
                                ? "bg-amber-700 text-white"
                                : "bg-bg-panel text-text-mute border border-border"
                            }`}
                          >
                            {idx + 1}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/profile/${p!.id}`}
                                className="font-semibold text-sm hover:text-cyan truncate"
                              >
                                {p!.fullName}
                              </Link>
                              {isMe && <Badge tone="cyan">You</Badge>}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-text-mute mt-0.5">
                              {p?.elevatesId && (
                                <span className="font-mono text-[var(--accent)] font-semibold">
                                  {p.elevatesId}
                                </span>
                              )}
                              <span>· {p?.email}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-base font-extrabold text-text">
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
          </div>

          <div>
            <TerminalPanel title="referral.rewards" accent="cyan">
              <div className="space-y-4 text-[13px] text-text-dim leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <Trophy size={16} className="mt-0.5 shrink-0 text-yellow-500" />
                  <div>
                    <p className="font-semibold text-text">Earn Community Points</p>
                    <p className="text-[12px] text-text-mute">
                      Each student who registers via your link earns you recognition on the campus leaderboards.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Sparkles size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  <div>
                    <p className="font-semibold text-text">Unique Elevates ID</p>
                    <p className="text-[12px] text-text-mute">
                      Every invited member gets automatically assigned an <code>ELV-XXXXXX</code> identifier.
                    </p>
                  </div>
                </div>
              </div>
            </TerminalPanel>
          </div>
        </div>
      )}

      {/* ── TAB 3: NETWORK TREE (HQ / ADMIN VIEW) ────────────────────────── */}
      {activeTab === "network-tree" && isHqOrLead && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-3">
            <TerminalPanel title="network.invite_tree" meta={`${networkRows.length} records`}>
              {/* Search & filters */}
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="flex-1 min-w-[220px]">
                  <FieldLabel>Search network invites</FieldLabel>
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute"
                    />
                    <Input
                      placeholder="Referrer name, invited name, or token…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Status Filter</FieldLabel>
                  <div className="flex gap-1.5">
                    {(["all", "used", "unused"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`rounded-[var(--radius-sm)] border px-3 py-1.5 text-[11px] font-semibold capitalize transition-colors ${
                          filterStatus === s
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                            : "border-border bg-bg-panel text-text-mute hover:border-border-hover hover:text-text"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {networkRows.length === 0 ? (
                <div className="py-10 text-center">
                  <GitBranch size={32} className="mx-auto mb-3 text-text-mute opacity-40" />
                  <p className="text-sm text-text-dim">No invite records match search filter.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {networkRows.map(({ token: t, referrer, invited, chapter, expired }) => (
                    <li key={t.id} className="py-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Referrer → Invited */}
                          <div className="flex flex-wrap items-center gap-2 text-[13px]">
                            <Link
                              href={referrer ? `/profile/${referrer.id}` : "#"}
                              className="font-semibold text-cyan hover:underline"
                            >
                              {referrer?.fullName ?? "Unknown"}
                            </Link>
                            <span className="text-text-mute">→</span>
                            {invited ? (
                              <Link
                                href={`/profile/${invited.id}`}
                                className="font-semibold text-text hover:text-cyan"
                              >
                                {invited.fullName}
                              </Link>
                            ) : (
                              <span className="text-text-mute italic">Pending registration</span>
                            )}
                          </div>

                          {/* Meta line */}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-mute">
                            <span className="font-mono">{t.token}</span>
                            {chapter && <span>· {chapter.name}</span>}
                            <span>· Created {formatDateTime(t.createdAt)}</span>
                            {t.usedAt && <span>· Used {formatDateTime(t.usedAt)}</span>}
                            {!t.usedBy && t.expiresAt && (
                              <span
                                className={`flex items-center gap-1 font-semibold ${
                                  expired ? "text-red-400" : "text-amber-500"
                                }`}
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
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TerminalPanel>
          </div>
        </div>
      )}
    </div>
  );
}
