"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, Link2, Copy, CheckCheck, Search, GitBranch, Clock, CircleDot, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Input, FieldLabel } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";

function msUntil(iso?: string): number {
  if (!iso) return Infinity;
  return new Date(iso).getTime() - Date.now();
}

function expiryBadge(token: { usedBy?: string; isActive: boolean; expiresAt?: string }) {
  if (token.usedBy) return { label: "Used", tone: "green" as const };
  if (!token.isActive) return { label: "Deactivated", tone: "mute" as const };
  const ms = msUntil(token.expiresAt);
  if (ms <= 0) return { label: "Expired", tone: "mute" as const };
  const h = ms / (1000 * 60 * 60);
  if (h < 24) return { label: `${Math.round(h)}h left`, tone: "orange" as const };
  const d = Math.floor(h / 24);
  return { label: `${d}d left`, tone: "cyan" as const };
}

export default function HqReferralsPage() {
  const { store } = useStore();
  const { session } = useCurrentUser();
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "used" | "unused">("all");

  const tokens = store.inviteTokens ?? [];
  const profiles = store.profiles;

  // Build referral tree entries
  const referralRows = useMemo(() => {
    return tokens
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
  }, [tokens, profiles, store.chapters, q, filterStatus]);

  // Stats
  const totalInvites = tokens.length;
  const usedInvites = tokens.filter((t) => t.usedBy).length;
  const expiredInvites = tokens.filter((t) => !t.usedBy && msUntil(t.expiresAt) <= 0).length;
  const pendingInvites = tokens.filter((t) => !t.usedBy && msUntil(t.expiresAt) > 0).length;

  // Top referrers
  const topReferrers = useMemo(() => {
    const counts: Record<string, number> = {};
    tokens.forEach((t) => {
      if (t.usedBy) counts[t.createdBy] = (counts[t.createdBy] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([userId, count]) => ({
        profile: profiles.find((p) => p.id === userId),
        count,
      }))
      .filter((e) => e.profile)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [tokens, profiles]);

  return (
    <div>
      <PageHeader
        eyebrow="Network"
        title="Referrals"
        description="View the full invite tree — who invited whom across the entire Elevates network."
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: "Total invites sent", value: totalInvites, icon: Link2, accent: "cyan" },
          { label: "Invites used", value: usedInvites, icon: Users, accent: "green" },
          { label: "Active (pending)", value: pendingInvites, icon: Clock, accent: "orange" },
          { label: "Expired", value: expiredInvites, icon: AlertTriangle, accent: "mute" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-border bg-bg-panel p-4 shadow-[var(--shadow-sm)]"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${accent}/10`}>
              <Icon size={16} className={`text-${accent}`} />
            </div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold tabular-nums">
              {value}
            </p>
            <p className="text-[11px] text-text-mute">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Main referral table */}
        <div className="xl:col-span-2">
          <TerminalPanel title="invite.tree" meta={`${referralRows.length} entries`}>
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <FieldLabel>Search</FieldLabel>
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute" />
                  <Input
                    placeholder="Name, email, or token…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
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

            {referralRows.length === 0 ? (
              <div className="py-10 text-center">
                <GitBranch size={32} className="mx-auto mb-3 text-text-mute opacity-40" />
                <p className="text-sm text-text-dim">No invite records match.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {referralRows.map(({ token: t, referrer, invited, chapter, expired }) => (
                  <li key={t.id} className="py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Referrer → Invited */}
                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                          <Link
                            href={referrer ? `/profile/${referrer.id}` : "#"}
                            className="font-semibold text-cyan hover:text-green"
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
                            <span className="text-text-mute italic">Not used yet</span>
                          )}
                        </div>
                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-mute">
                          <span className="font-mono">{t.token}</span>
                          {chapter && <span>· {chapter.name}</span>}
                          <span>· Created {formatDateTime(t.createdAt)}</span>
                          {t.usedAt && <span>· Used {formatDateTime(t.usedAt)}</span>}
                          {!t.usedBy && t.expiresAt && (
                            <span className={`flex items-center gap-1 font-semibold ${
                              expired ? "text-red-400" : msUntil(t.expiresAt) < 24 * 3600 * 1000 ? "text-amber-500" : "text-green-500"
                            }`}>
                              <Clock size={10} />
                              {expired
                                ? `Expired ${formatDateTime(t.expiresAt)}`
                                : `Expires ${formatDateTime(t.expiresAt)}`}
                            </span>
                          )}
                        </div>
                      </div>
                      {(() => {
                        const { label, tone } = expiryBadge(t);
                        return <Badge tone={tone}>{label}</Badge>;
                      })()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TerminalPanel>
        </div>

        {/* Top referrers sidebar */}
        <div className="space-y-6">
          <TerminalPanel title="top.referrers" accent="cyan">
            {topReferrers.length === 0 ? (
              <p className="text-[12px] text-text-dim">No successful referrals yet.</p>
            ) : (
              <ol className="space-y-3">
                {topReferrers.map(({ profile, count }, i) => (
                  <li key={profile!.id} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 font-mono text-[11px] font-bold text-[var(--accent)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/profile/${profile!.id}`}
                        className="truncate block text-[13px] font-semibold hover:text-cyan"
                      >
                        {profile!.fullName}
                      </Link>
                      {profile?.elevatesId && (
                        <p className="font-mono text-[10px] text-text-mute">{profile.elevatesId}</p>
                      )}
                    </div>
                    <Badge tone="green">{count} joined</Badge>
                  </li>
                ))}
              </ol>
            )}
          </TerminalPanel>

          <TerminalPanel title="about.referrals" accent="orange">
            <div className="space-y-2 text-[12px] text-text-dim leading-relaxed">
              <div className="flex items-start gap-2">
                <CircleDot size={12} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <p>Every user can share their personal invite link from their profile page.</p>
              </div>
              <div className="flex items-start gap-2">
                <CircleDot size={12} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <p>Each invite link is single-use — it expires once a new account is created.</p>
              </div>
              <div className="flex items-start gap-2">
                <CircleDot size={12} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <p>All new sign-ups get Student access. HQ can elevate roles afterward.</p>
              </div>
            </div>
          </TerminalPanel>
        </div>
      </div>
    </div>
  );
}
