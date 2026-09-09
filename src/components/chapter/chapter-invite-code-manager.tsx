"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/context/store-context";
import { Button } from "@/components/ui/button";
import { TypeConfirmModal } from "@/components/ui/type-confirm-modal";
import { deriveChapterShortCode } from "@/lib/chapters";
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
      text: `🎉 Generated invite code "${created.code}" with prefix ${shortCode}! Valid for 3 days.`,
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
      return { label: "Revoked", color: "bg-red-500/10 text-red-400 border-red-500/30" };
    }
    const isExpired = new Date() > new Date(c.expiresAt);
    if (isExpired) {
      return { label: "Expired", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" };
    }
    return { label: "Active", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
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
      <div className="rounded-[var(--radius)] border border-border bg-bg-panel p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                Chapter Invite Codes
              </h2>
              <span className="inline-flex items-center font-mono font-bold text-xs bg-white/10 px-2 py-0.5 rounded text-[var(--accent)] border border-white/10">
                Prefix: {shortCode}-
              </span>
            </div>
            <p className="mt-1.5 text-xs text-text-mute max-w-xl">
              Invite codes start with the 3-letter chapter shortcode (
              <span className="font-mono font-semibold text-white">{shortCode}</span>) followed by 6
              random characters. Every code is <strong className="text-white">strictly valid for 3 days</strong> and tracks all students who join.
            </p>
          </div>

          <Button
            type="button"
            variant="orange"
            onClick={handleGenerate}
            className="flex items-center gap-2 whitespace-nowrap font-bold px-4 py-2 text-sm shadow-sm"
          >
            <Sparkles size={16} />
            <span>Generate {shortCode}-XXXXXX Code</span>
          </Button>
        </div>

        {msg && (
          <div
            className={`mt-4 rounded-md border p-3 text-xs font-semibold ${
              msg.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {msg.text}
          </div>
        )}
      </div>

      {/* Codes List Table */}
      <div className="rounded-[var(--radius)] border border-border bg-bg-panel p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <span>Generated Codes & Join History</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-normal text-text-mute">
              {inviteCodes.length} total
            </span>
          </h3>
        </div>

        {inviteCodes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-text-mute text-xs">
            No invite codes generated yet. Click &quot;Generate {shortCode}-XXXXXX Code&quot; above to create your first code!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-text-mute">
                  <th className="py-2.5 px-3">Invite Code</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Validity</th>
                  <th className="py-2.5 px-3">Students Joined</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inviteCodes.map((codeObj) => {
                  const status = getStatus(codeObj);
                  const isCopied = copiedId === codeObj.id;
                  const isExpired = new Date() > new Date(codeObj.expiresAt);
                  const isExpanded = expandedCodeId === codeObj.id;
                  const joinedCount = codeObj.usesCount || (codeObj.joinedUsers?.length ?? 0);

                  return (
                    <tr key={codeObj.id} className="group">
                      <td colSpan={5} className="p-0">
                        <div className="flex items-center justify-between p-3 hover:bg-white/[0.02] transition">
                          {/* Code + Copy */}
                          <div className="w-1/4 min-w-[150px] flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-text bg-black/20 px-2 py-1 rounded border border-white/5">
                              {codeObj.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(codeObj.code, codeObj.id)}
                              className="p-1 rounded text-text-mute hover:text-white hover:bg-white/10 transition"
                              title="Copy Code"
                            >
                              {isCopied ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>

                          {/* Status Badge */}
                          <div className="w-1/6 min-w-[90px]">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.color}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          {/* Validity Time */}
                          <div className="w-1/5 min-w-[120px] text-text-mute flex items-center gap-1.5">
                            <Clock size={12} className="opacity-60" />
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
                                className="inline-flex items-center gap-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-emerald-300 hover:bg-emerald-500/20 transition font-medium"
                              >
                                <Users size={12} />
                                <span className="font-bold">{joinedCount}</span>
                                <span>joined</span>
                                {isExpanded ? (
                                  <ChevronUp size={12} />
                                ) : (
                                  <ChevronDown size={12} />
                                )}
                              </button>
                            ) : (
                              <span className="text-text-mute opacity-60">0 joined</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="w-1/6 min-w-[90px] text-right">
                            {!codeObj.isRevoked && !isExpired ? (
                              <button
                                type="button"
                                onClick={() => setRevokeTarget(codeObj)}
                                className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition"
                              >
                                <Ban size={12} />
                                <span>Revoke</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-text-mute opacity-50">—</span>
                            )}
                          </div>
                        </div>

                        {/* Expandable Joined Students Table */}
                        {isExpanded && (
                          <div className="bg-black/30 border-t border-b border-border/80 p-4 pl-8 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-text-mute mb-2">
                              <span>Students Registered via Code: {codeObj.code}</span>
                              <span>{codeObj.joinedUsers?.length ?? 0} recorded</span>
                            </div>

                            {codeObj.joinedUsers && codeObj.joinedUsers.length > 0 ? (
                              <div className="overflow-x-auto rounded border border-border/60 bg-bg-panel">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="border-b border-border bg-white/[0.02] text-text-mute">
                                      <th className="py-2 px-3">Student Name</th>
                                      <th className="py-2 px-3">Unique ID</th>
                                      <th className="py-2 px-3">Email</th>
                                      <th className="py-2 px-3">Department & Year</th>
                                      <th className="py-2 px-3 text-right">Joined At</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/40">
                                    {codeObj.joinedUsers.map((u, i) => (
                                      <tr key={u.id || i} className="hover:bg-white/[0.02]">
                                        <td className="py-2 px-3 font-medium text-text">
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
                                        <td className="py-2 px-3 text-right text-text-mute font-mono text-[10px]">
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
                              <p className="text-xs text-text-mute py-1">
                                {joinedCount} student(s) joined using this code. Profile details are synchronized in Supabase.
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

      <TypeConfirmModal
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        title="Revoke Chapter Invite Code"
        description={`Are you sure you want to revoke invite code "${revokeTarget?.code}"? Students will no longer be able to use this code to join.`}
        confirmWord="REVOKE"
        actionLabel="Revoke Code"
        onConfirm={() => {
          if (revokeTarget) {
            revokeChapterInviteCode(revokeTarget.id, revokeTarget.code);
            setMsg({ text: `Revoked invite code "${revokeTarget.code}".`, type: "error" });
          }
        }}
      />
    </div>
  );
}
