"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/context/store-context";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { TypeConfirmModal } from "@/components/ui/type-confirm-modal";
import { Copy, Check, ShieldAlert, KeyRound, Clock, Ban } from "lucide-react";

export function ChapterInviteCodeManager({
  chapterId,
  chapterSlug,
}: {
  chapterId: string;
  chapterSlug: string;
}) {
  const { store, generateChapterInviteCode, revokeChapterInviteCode } = useStore();
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<import("@/types").ChapterInviteCode | null>(null);

  const inviteCodes = useMemo(() => {
    const all = store.chapterInviteCodes ?? [];
    return all
      .filter((c) => c.chapterId === chapterId)
      .map((c) => {
        const tokenUpper = c.code.toUpperCase();
        const logCount = (store.activityLogs ?? []).filter(
          (al) =>
            al.action === "chapter_invite_used" &&
            (al.entityId?.toUpperCase() === tokenUpper ||
              (typeof al.meta === "string" && al.meta.toUpperCase().includes(tokenUpper)))
        ).length;
        return {
          ...c,
          usesCount: Math.max(c.usesCount ?? 0, logCount),
        };
      });
  }, [store.chapterInviteCodes, store.activityLogs, chapterId]);

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const cleanInput = customCodeInput.trim().toUpperCase();
    if (cleanInput) {
      // Check uniqueness
      const exists = (store.chapterInviteCodes ?? []).some(
        (c) => c.code === cleanInput && !c.isRevoked
      );
      if (exists) {
        setMsg({ text: `Code "${cleanInput}" is already in use. Please enter a unique code.`, type: "error" });
        return;
      }
    }

    const created = generateChapterInviteCode(chapterId, cleanInput || undefined);
    setCustomCodeInput("");
    setMsg({ text: `🎉 Invite code "${created.code}" created! Valid for 3 days.`, type: "success" });
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
      return { label: "Expired (3 Days Passed)", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" };
    }
    return { label: "Active", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
  }

  function formatTimeLeft(expiresAtStr: string) {
    const diff = new Date(expiresAtStr).getTime() - new Date().getTime();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (days > 0) return `${days}d ${remHours}h remaining`;
    return `${hours}h remaining`;
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-[var(--radius)] border border-border bg-bg-panel p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                Chapter Invite Codes
              </h2>
            </div>
            <p className="mt-1 text-xs text-text-mute max-w-xl">
              Generate unique invite codes for students to join your college chapter directly.
              Each generated code is <strong className="text-white">strictly valid for 3 days</strong> from creation. You can revoke active codes at any time.
            </p>
          </div>
        </div>

        {/* Code Generator Form */}
        <form onSubmit={handleGenerate} className="mt-6 flex flex-col sm:flex-row items-end gap-3 border-t border-border pt-5">
          <div className="flex-1 w-full">
            <FieldLabel>Custom Unique Code (Optional)</FieldLabel>
            <Input
              placeholder={`e.g. ${chapterSlug.toUpperCase().substring(0, 4)}-WELCOME`}
              value={customCodeInput}
              onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
              className="font-mono text-sm uppercase"
            />
            <p className="mt-1 text-[11px] text-text-mute">
              Leave blank to auto-generate a random unique 6-character code.
            </p>
          </div>

          <Button type="submit" variant="orange" className="whitespace-nowrap font-bold">
            ➕ Generate 3-Day Code
          </Button>
        </form>

        {msg && (
          <div className={`mt-4 rounded-md border p-3 text-xs font-semibold ${msg.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Codes List */}
      <div className="rounded-[var(--radius)] border border-border bg-bg-panel p-6 shadow-sm">
        <h3 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
          <span>Generated Invite Codes</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-normal text-text-mute">
            {inviteCodes.length} total
          </span>
        </h3>

        {inviteCodes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-text-mute text-xs">
            No invite codes generated yet. Use the form above to generate your first 3-day code!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-text-mute">
                  <th className="py-2.5 px-3">Invite Code</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Validity</th>
                  <th className="py-2.5 px-3">Usage</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inviteCodes.map((codeObj) => {
                  const status = getStatus(codeObj);
                  const isCopied = copiedId === codeObj.id;
                  const isExpired = new Date() > new Date(codeObj.expiresAt);

                  return (
                    <tr key={codeObj.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 font-mono font-bold text-sm text-text">
                        <div className="flex items-center gap-2">
                          <span>{codeObj.code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(codeObj.code, codeObj.id)}
                            className="p-1 rounded text-text-mute hover:text-white hover:bg-white/10 transition"
                            title="Copy Code"
                          >
                            {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text-mute">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="opacity-60" />
                          <span>{formatTimeLeft(codeObj.expiresAt)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-text">
                        <span className="font-semibold text-emerald-400">{codeObj.usesCount}</span> students joined
                      </td>
                      <td className="py-3 px-3 text-right">
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
            revokeChapterInviteCode(revokeTarget.id);
            setMsg({ text: `Revoked invite code "${revokeTarget.code}".`, type: "error" });
          }
        }}
      />
    </div>
  );
}
