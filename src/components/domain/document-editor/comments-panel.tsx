"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/input";

export function CommentsPanel({
  hqComment,
  showApprove,
  approveComment,
  onApproveCommentChange,
  onApprove,
}: {
  hqComment?: string;
  showApprove?: boolean;
  approveComment: string;
  onApproveCommentChange: (v: string) => void;
  onApprove?: () => void;
}) {
  const [notes, setNotes] = useState<{ id: string; text: string }[]>([]);
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-4">
      {hqComment ? (
        <div className="rounded-[10px] border border-green/30 bg-green/5 p-2.5">
          <p className="text-[10px] font-semibold uppercase text-green">
            HQ comment
          </p>
          <p className="mt-1 text-[12px] text-text-dim">{hqComment}</p>
        </div>
      ) : null}

      {showApprove ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase text-text-mute">
            Approve with comment
          </p>
          <TextArea
            rows={3}
            value={approveComment}
            onChange={(e) => onApproveCommentChange(e.target.value)}
            placeholder="Feedback for the chapter…"
          />
          <Button variant="green" className="h-8 w-full text-[12px]" onClick={onApprove}>
            Approve report
          </Button>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase text-text-mute">
          Sticky notes
        </p>
        <ul className="mb-2 space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-[8px] bg-[#fff6d6] px-2 py-1.5 text-[12px] text-text"
            >
              {n.text}
            </li>
          ))}
          {!notes.length ? (
            <li className="text-[11px] text-text-mute">No notes yet.</li>
          ) : null}
        </ul>
        <TextArea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
        />
        <Button
          variant="ghost"
          className="mt-1 h-8 text-[12px]"
          onClick={() => {
            if (!draft.trim()) return;
            setNotes((prev) => [
              ...prev,
              { id: `n-${Date.now()}`, text: draft.trim() },
            ]);
            setDraft("");
          }}
        >
          Add note
        </Button>
      </div>
    </div>
  );
}
