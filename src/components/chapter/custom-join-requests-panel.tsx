"use client";

import { useState } from "react";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/context/store-context";
import { Check, X, Users, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Props {
  chapterId: string;
  chapterName: string;
}

export function CustomJoinRequestsPanel({ chapterId, chapterName }: Props) {
  const { store, batchReviewCustomJoinRequests } = useStore();

  const requests = (store.customJoinRequests ?? []).filter(
    (r) => r.chapterId === chapterId && r.status === "pending"
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchAccept = async () => {
    if (!selectedIds.length) return;
    const ok = await batchReviewCustomJoinRequests(selectedIds, "approved", chapterId);
    if (ok) {
      setMsg(`✓ Accepted and onboarded ${selectedIds.length} student(s) into ${chapterName}!`);
      setSelectedIds([]);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const handleBatchDeny = async () => {
    if (!selectedIds.length) return;
    const ok = await batchReviewCustomJoinRequests(selectedIds, "rejected", chapterId);
    if (ok) {
      setMsg(`Denied ${selectedIds.length} join request(s).`);
      setSelectedIds([]);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  if (requests.length === 0) {
    return (
      <TerminalPanel title="Pending Chapter Join Requests" meta="0 pending">
        <p className="text-xs text-text-dim py-4 text-center">
          No pending custom join requests for {chapterName}.
        </p>
      </TerminalPanel>
    );
  }

  return (
    <TerminalPanel
      title="Pending Custom Chapter Join Requests"
      meta={`${requests.length} pending`}
      accent="orange"
      className="mb-6"
    >
      <div className="space-y-4">
        {msg ? (
          <div className="rounded-[10px] bg-orange-500/10 border border-orange-500/30 p-3 text-xs font-semibold text-orange-300">
            {msg}
          </div>
        ) : null}

        {/* Multi-Select Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-bg p-3 border border-border">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text">
              <input
                type="checkbox"
                checked={selectedIds.length === requests.length && requests.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-700 bg-black text-orange-500"
              />
              <span>
                Select All ({selectedIds.length} / {requests.length} selected)
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="orange"
              disabled={!selectedIds.length}
              onClick={handleBatchAccept}
              className="text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Check size={14} /> Accept Selected ({selectedIds.length})
            </Button>
            <Button
              variant="secondary"
              disabled={!selectedIds.length}
              onClick={handleBatchDeny}
              className="text-xs py-1.5 px-3 flex items-center gap-1.5 text-red-400 hover:text-red-300"
            >
              <X size={14} /> Deny Selected ({selectedIds.length})
            </Button>
          </div>
        </div>

        {/* Requests Table */}
        <div className="divide-y divide-border border border-border rounded-[14px] bg-bg overflow-hidden">
          {requests.map((req) => {
            const isSelected = selectedIds.includes(req.id);
            const isExpanded = expandedId === req.id;
            const answerEntries = Object.entries(req.answers || {});

            return (
              <div key={req.id} className="p-3.5 transition-colors hover:bg-bg-hover">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(req.id)}
                      className="rounded border-gray-700 bg-black text-orange-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-text">{req.userName}</span>
                        <Badge tone="cyan" className="text-[10px] font-mono uppercase">
                          Code: {req.inviteCodeUsed}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-dim">{req.userEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-mute font-mono">
                      {formatDate(req.submittedAt)}
                    </span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="text-xs text-orange-400 hover:underline flex items-center gap-1"
                    >
                      {answerEntries.length} Form Answer(s) {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <div className="flex gap-1.5 ml-2">
                      <Button
                        variant="orange"
                        onClick={() => batchReviewCustomJoinRequests([req.id], "approved", chapterId)}
                        className="text-xs py-1 px-2.5 h-auto flex items-center gap-1"
                      >
                        <Check size={13} /> Accept
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => batchReviewCustomJoinRequests([req.id], "rejected", chapterId)}
                        className="text-xs py-1 px-2.5 h-auto text-red-400 hover:text-red-300"
                      >
                        <X size={13} /> Deny
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Form Answers Preview */}
                {isExpanded && answerEntries.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/80 grid gap-2 sm:grid-cols-2 text-xs bg-bg-panel p-3 rounded-[10px]">
                    {answerEntries.map(([k, v]) => (
                      <div key={k} className="space-y-0.5">
                        <span className="text-text-mute font-medium uppercase text-[10px] block">{k}</span>
                        <span className="text-text font-semibold">{v || "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TerminalPanel>
  );
}
