"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/context/store-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { deriveChapterShortCode } from "@/lib/chapters";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  KeyRound,
  Clock,
  Ban,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

export function ChapterInviteCodeManager({
  chapterId,
  chapterSlug,
}: {
  chapterId: string;
  chapterSlug: string;
}) {
  const { store, generateChapterInviteCode, revokeChapterInviteCode } = useStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<import("@/types").ChapterInviteCode | null>(null);
  const [expandedCodeId, setExpandedCodeId] = useState<string | null>(null);

  const chapter = useMemo(() => {
    return (
      store.chapters.find((c) => c.id === chapterId || c.slug === chapterSlug) ??
      null
    );
  }, [store.chapters, chapterId, chapterSlug]);

  const shortCode = useMemo(() => {
    if (chapter?.shortCode) return chapter.shortCode.trim().toUpperCase();
    if (chapter?.name) return deriveChapterShortCode(chapter.name);
    return "ELV";
  }, [chapter]);

  const inviteCodes = useMemo(() => {
    const all = store.chapterInviteCodes ?? [];
    return all
      .filter((c) => c.chapterId === chapterId || (chapter && c.chapterId === chapter.id))
      .map((c) => {
        const tokenUpper = c.code.toUpperCase();
        const matchingLogs = (store.activityLogs ?? []).filter(
          (al) =>
            al.action === "chapter_invite_used" &&
            (al.entityId?.toUpperCase() === tokenUpper ||
              (typeof al.meta === "string" && al.meta.toUpperCase().includes(tokenUpper)))
        );

        // Build list of joined users if not already present
        let joinedUsers = c.joinedUsers ? [...c.joinedUsers] : [];
        if (joinedUsers.length === 0 && matchingLogs.length > 0) {
          const userMap = new Map<string, import("@/types").ChapterInviteJoinedUser>();
          for (const al of matchingLogs) {
            let metaObj: any = {};
            if (typeof al.meta === "string") {
              try {
                metaObj = JSON.parse(al.meta);
              } catch {}
            } else if (al.meta && typeof al.meta === "object") {
              metaObj = al.meta;
            }
            const uid = al.actorId || metaObj.userId;
            if (uid && !userMap.has(uid)) {
              const prof = store.profiles.find((p) => p.id === uid);
              userMap.set(uid, {
                id: uid,
                elevatesId: prof?.elevatesId,
                fullName: prof?.fullName || metaObj.fullName || "Student",
                email: prof?.email || metaObj.email || "",
                department: prof?.department || metaObj.department,
                year: prof?.year || metaObj.year,
                joinedAt: al.createdAt || metaObj.joinedAt || c.createdAt,
              });
            }
          }
          joinedUsers = Array.from(userMap.values());
        }

        return {
          ...c,
          usesCount: Math.max(c.usesCount ?? 0, matchingLogs.length, joinedUsers.length),
          joinedUsers,
        };
      });
  }, [store.chapterInviteCodes, store.activityLogs, store.profiles, chapterId, chapter]);

  function handleGenerate() {
    setMsg(null);
    const created = generateChapterInviteCode(chapter?.id || chapterId);
    setMsg({
      text: `Generated invite code "${created.code}" with prefix ${shortCode}! Valid for 3 days.`,
      type: "success",
    });
  }

  function handleCopy(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getStatus(c: import("@/types").ChapterInviteCode) {
    if (c.isRevoked) {
      return { label: "Revoked", tone: "mute" as const };
    }
    const isExpired = new Date() > new Date(c.expiresAt);
    if (isExpired) {
      return { label: "Expired", tone: "mute" as const };
    }
    return { label: "Active", tone: "green" as const };
  }

  function formatTimeLeft(expiresAtStr: string) {
    const diff = new Date(expiresAtStr).getTime() - new Date().getTime();
    if (diff <= 0) return "Expired (3d ended)";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (days > 0) return `${days}d ${remHours}h left`;
    return `${hours}h left`;
  }

  return (
    <div className="space-y-6">
      {/* Generator Header Card */}
      <div className="rounded-[var(--radius)] border border-border/80 bg-bg-panel p-5 sm:p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-[family-name:var(--font-display)] text-base sm:text-lg font-bold text-text">
                Chapter Invite Codes
              </h2>
              <span className="inline-flex items-center font-mono font-bold text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-0.5 rounded border border-[var(--accent)]/20">
                Prefix: {shortCode}-
              </span>
            </div>
            <p className="mt-1.5 text-xs text-text-dim max-w-xl leading-relaxed">
              Invite codes start with the 3-letter chapter shortcode (
              <span className="font-mono font-bold text-text">{shortCode}</span>) followed by 6
              random characters. Every code is strictly valid for <strong className="text-text font-semibold">3 days</strong> and automatically provisions chapter membership to students.
            </p>
          </div>

          <Button
            type="button"
            variant="orange"
            onClick={handleGenerate}
            className="flex items-center gap-2 whitespace-nowrap font-bold px-4 py-2 text-xs sm:text-sm shadow-sm shrink-0"
          >
            <Sparkles size={15} />
            <span>Generate {shortCode}-XXXXXX Code</span>
          </Button>
        </div>

        {msg && (
          <div
            className={cn(
              "mt-4 rounded-[var(--radius-sm)] border p-3 text-xs font-semibold flex items-center gap-2",
              msg.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-500",
            )}
          >
            {msg.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
            <span>{msg.text}</span>
          </div>
        )}
      </div>

      {/* Codes List Table */}
      <div className="rounded-[var(--radius)] border border-border/80 bg-bg-panel p-5 sm:p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <span>Generated Codes & Join History</span>
            <span className="rounded-full bg-border/60 px-2 py-0.5 text-[11px] font-semibold text-text-dim tabular-nums">
              {inviteCodes.length} total
            </span>
          </h3>
        </div>

        {inviteCodes.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-border py-12 text-center text-text-dim text-xs">
            No invite codes generated yet. Click &quot;Generate {shortCode}-XXXXXX Code&quot; above to create your first campus join code!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-border/70">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-bg text-text-dim">
                  <th className="py-2.5 px-4 font-semibold">Invite Code</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Validity</th>
                  <th className="py-2.5 px-4 font-semibold">Students Joined</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-bg-panel">
                {inviteCodes.map((codeObj) => {
                  const status = getStatus(codeObj);
                  const isCopied = copiedId === codeObj.id;
                  const isExpired = new Date() > new Date(codeObj.expiresAt);
                  const isExpanded = expandedCodeId === codeObj.id;
                  const joinedCount = codeObj.usesCount || (codeObj.joinedUsers?.length ?? 0);

                  return (
                    <tr key={codeObj.id} className="group">
                      <td colSpan={5} className="p-0">
                        <div className="flex items-center justify-between p-3.5 hover:bg-bg/60 transition">
                          {/* Code + Copy */}
                          <div className="w-1/4 min-w-[160px] flex items-center gap-2">
                            <span className="font-mono font-bold text-xs sm:text-sm text-text bg-bg px-2.5 py-1 rounded border border-border/80">
                              {codeObj.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(codeObj.code, codeObj.id)}
                              className="p-1 rounded text-text-dim hover:text-text hover:bg-bg transition"
                              title="Copy Code"
                            >
                              {isCopied ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                                  <Check size={13} />
                                  <span>Copied</span>
                                </span>
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>

                          {/* Status Badge */}
                          <div className="w-1/6 min-w-[90px]">
                            <Badge tone={status.tone} className="text-[10px] font-semibold">
                              {status.label}
                            </Badge>
                          </div>

                          {/* Validity Time */}
                          <div className="w-1/5 min-w-[130px] text-text-dim flex items-center gap-1.5 font-medium">
                            <Clock size={12} className="text-text-dim shrink-0" />
                            <span>{formatTimeLeft(codeObj.expiresAt)}</span>
                          </div>

                          {/* Joined Count & Expansion */}
                          <div className="w-1/5 min-w-[140px]">
                            {joinedCount > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCodeId(isExpanded ? null : codeObj.id)
                                }
                                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition font-semibold text-[11px]"
                              >
                                <Users size={12} />
                                <span>{joinedCount} joined</span>
                                {isExpanded ? (
                                  <ChevronUp size={12} />
                                ) : (
                                  <ChevronDown size={12} />
                                )}
                              </button>
                            ) : (
                              <span className="text-text-dim opacity-70">0 joined</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="w-1/6 min-w-[90px] text-right">
                            {!codeObj.isRevoked && !isExpired ? (
                              <button
                                type="button"
                                onClick={() => setRevokeTarget(codeObj)}
                                className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-500/10 transition border border-red-200 dark:border-red-900/50"
                              >
                                <Ban size={11} />
                                <span>Revoke</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-text-dim opacity-50">—</span>
                            )}
                          </div>
                        </div>

                        {/* Expandable Joined Students Table */}
                        {isExpanded && (
                          <div className="bg-bg/80 border-t border-b border-border/80 p-4 pl-8 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-text-dim mb-2">
                              <span>Students Registered via Code: {codeObj.code}</span>
                              <span>{codeObj.joinedUsers?.length ?? 0} recorded</span>
                            </div>

                            {codeObj.joinedUsers && codeObj.joinedUsers.length > 0 ? (
                              <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-border bg-bg-panel">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="border-b border-border/70 bg-bg text-text-dim">
                                      <th className="py-2 px-3">Student Name</th>
                                      <th className="py-2 px-3">Unique ID</th>
                                      <th className="py-2 px-3">Email</th>
                                      <th className="py-2 px-3">Department & Year</th>
                                      <th className="py-2 px-3 text-right">Joined At</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/50">
                                    {codeObj.joinedUsers.map((u, i) => (
                                      <tr key={u.id || i} className="hover:bg-bg/40">
                                        <td className="py-2 px-3 font-semibold text-text">
                                          {u.fullName}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-[10px] text-[var(--accent)] font-semibold">
                                          {u.elevatesId || "—"}
                                        </td>
                                        <td className="py-2 px-3 text-text-dim">
                                          {u.email || "—"}
                                        </td>
                                        <td className="py-2 px-3 text-text-dim">
                                          {[u.department, u.year].filter(Boolean).join(" · ") || "—"}
                                        </td>
                                        <td className="py-2 px-3 text-right text-text-dim font-mono text-[10px]">
                                          {u.joinedAt
                                            ? new Date(u.joinedAt).toLocaleString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })
                                            : "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-text-dim py-1">
                                {joinedCount} student(s) joined using this code. Profile details are synchronized in the directory.
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        title="Revoke Chapter Invite Code"
        description={`Are you sure you want to revoke invite code "${revokeTarget?.code}"? Students will no longer be able to use this code to join.`}
        className="max-w-md"
      >
        <div className="mt-5 flex justify-end gap-2 border-t border-border/80 pt-4">
          <Button variant="ghost" onClick={() => setRevokeTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (revokeTarget) {
                await revokeChapterInviteCode(revokeTarget.id, revokeTarget.code);
                setMsg({ text: `Revoked invite code "${revokeTarget.code}".`, type: "error" });
                setRevokeTarget(null);
              }
            }}
          >
            Revoke Code
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
