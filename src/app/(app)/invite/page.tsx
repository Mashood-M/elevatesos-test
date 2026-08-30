"use client";

import { useMemo, useState } from "react";
import { Copy, CheckCheck, GitBranch, Link2, Users, Clock, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useStore } from "@/context/store-context";
import { createInviteToken } from "@/lib/data/supabase-bootstrap";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

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

export default function MyInvitePage() {
  const { store } = useStore();
  const { session, profile } = useCurrentUser();

  const [generatingToken, setGeneratingToken] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const userId = session.userId;
  const chapterId = profile?.chapterId;

  // All tokens the current user has created
  const myTokens = useMemo(
    () => (store.inviteTokens ?? []).filter((t) => t.createdBy === userId),
    [store.inviteTokens, userId],
  );

  const usedCount = myTokens.filter((t) => t.usedBy).length;
  // A link is active only if not used AND not expired
  const activeTokens = myTokens.filter(
    (t) => !t.usedBy && t.isActive && msUntil(t.expiresAt) > 0,
  );
  const pendingCount = activeTokens.length;
  const expiredCount = myTokens.filter(
    (t) => !t.usedBy && (msUntil(t.expiresAt) <= 0 || !t.isActive),
  ).length;

  function buildInviteUrl(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/invite/${token}`;
  }

  async function generateLink() {
    setError("");
    setGeneratingToken(true);
    const token = await createInviteToken(userId, chapterId);
    if (!token) {
      setError("Could not generate invite link. Make sure you are signed in.");
      setGeneratingToken(false);
      return;
    }
    setNewToken(token);
    setGeneratingToken(false);
  }

  async function copyLink(token: string) {
    const url = buildInviteUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const latestActiveToken = activeTokens[0] ?? (newToken ? { token: newToken, expiresAt: undefined } : null);
  const latestPendingToken = latestActiveToken?.token ?? null;
  const latestExpiresAt = latestActiveToken && 'expiresAt' in latestActiveToken
    ? (latestActiveToken as any).expiresAt
    : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Network"
        title="Invite Friends"
        description="Share your personal invite link — anyone who signs up through it will be added to the Elevates network."
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Total invites sent", value: myTokens.length, icon: Link2 },
          { label: "Successfully joined", value: usedCount, icon: Users },
          { label: "Pending links", value: pendingCount, icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-border bg-bg-panel p-4 shadow-[var(--shadow-sm)]"
          >
            <Icon size={16} className="text-[var(--accent)]" />
            <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold tabular-nums">
              {value}
            </p>
            <p className="text-[11px] text-text-mute">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Generate & share */}
        <div className="xl:col-span-3">
          <TerminalPanel title="invite.link" accent="cyan">
            <p className="mb-4 text-[13px] text-text-dim">
              Each invite link is single-use. New members who sign up through
              your link get a Student account and you'll appear as their referrer.
              Generate as many as you need.
            </p>

            {/* Active / last generated link */}
            {latestPendingToken ? (
              <div className="mb-4 rounded-[var(--radius)] border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Active invite link
                  </p>
                  {latestExpiresAt && (
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      msUntil(latestExpiresAt) < 24 * 60 * 60 * 1000
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      <Clock size={10} />
                      {expiryLabel(latestExpiresAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-bg px-3 py-2 font-mono text-[12px] text-text">
                    {buildInviteUrl(latestPendingToken)}
                  </code>
                  <button
                    onClick={() => copyLink(latestPendingToken)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]/10"
                    title="Copy link"
                  >
                    {copied ? (
                      <CheckCheck size={15} className="text-green" />
                    ) : (
                      <Copy size={15} className="text-text-mute" />
                    )}
                  </button>
                  <a
                    href={buildInviteUrl(latestPendingToken)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg text-text-mute transition-colors hover:border-border-hover hover:text-text"
                    title="Open link"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-[var(--radius)] border border-dashed border-border p-4 text-center text-[13px] text-text-mute">
                No active invite link yet. Generate one below.
              </div>
            )}

            {error && (
              <p className="mb-3 text-[12px] text-[var(--accent)]">{error}</p>
            )}

            <Button
              variant="primary"
              onClick={generateLink}
              disabled={generatingToken}
              className="flex items-center gap-2"
              id="generate-invite-btn"
            >
              <Link2 size={14} />
              {generatingToken ? "Generating…" : "Generate new invite link"}
            </Button>

            <p className="mt-3 text-[11px] text-text-mute">
              Tip: Each link is single-use and expires in <strong className="text-text">7 days</strong>. Generate a new one any time.
            </p>
          </TerminalPanel>
        </div>

        {/* My referral history */}
        <div className="xl:col-span-2">
          <TerminalPanel title="my.referrals" meta={`${myTokens.length}`}>
            {myTokens.length === 0 ? (
              <div className="py-6 text-center">
                <GitBranch size={28} className="mx-auto mb-2 text-text-mute opacity-40" />
                <p className="text-[12px] text-text-dim">
                  No invites generated yet. Share your link to grow the network!
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {myTokens.map((t) => {
                  const invited = t.usedBy
                    ? store.profiles.find((p) => p.id === t.usedBy)
                    : null;
                  const expired = !t.usedBy && msUntil(t.expiresAt) <= 0;
                  return (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        {invited ? (
                          <Link
                            href={`/profile/${invited.id}`}
                            className="block truncate text-[13px] font-semibold text-text hover:text-cyan"
                          >
                            {invited.fullName}
                          </Link>
                        ) : (
                          <p className={`text-[12px] italic ${
                            expired ? "text-red-400" : "text-text-mute"
                          }`}>
                            {expired ? "Expired" : "Pending…"}
                          </p>
                        )}
                        <p className="mt-0.5 font-mono text-[10px] text-text-mute">
                          {t.usedAt
                            ? `Joined ${formatDateTime(t.usedAt)}`
                            : t.expiresAt
                            ? `Expires ${formatDateTime(t.expiresAt)}`
                            : `Sent ${formatDateTime(t.createdAt)}`}
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
    </div>
  );
}
