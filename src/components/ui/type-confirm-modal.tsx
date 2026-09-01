"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { AlertTriangle, Trash2, Ban } from "lucide-react";

export type TypeConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description: string;
  confirmWord?: string; // Word user must type, e.g. "DELETE" or "REVOKE"
  actionLabel?: string; // e.g. "Delete User", "Revoke Code"
  variant?: "danger" | "warning";
};

export function TypeConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Confirm Dangerous Action",
  description,
  confirmWord = "DELETE",
  actionLabel = "Delete",
  variant = "danger",
}: TypeConfirmModalProps) {
  const [typedInput, setTypedInput] = useState("");

  useEffect(() => {
    if (!open) {
      setTypedInput("");
    }
  }, [open]);

  const targetWord = confirmWord.trim().toUpperCase();
  const isMatch = typedInput.trim().toUpperCase() === targetWord;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isMatch) {
      onConfirm();
      setTypedInput("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">
          <div className="shrink-0 p-1">
            {targetWord === "REVOKE" ? <Ban size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-red-200">{title}</p>
            <p className="mt-0.5 opacity-90">{description}</p>
          </div>
        </div>

        <div>
          <FieldLabel>
            Type <span className="font-mono font-bold text-red-400 select-all">{targetWord}</span> to confirm:
          </FieldLabel>
          <Input
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder={`Type ${targetWord} here…`}
            className="font-mono text-sm uppercase"
            autoFocus
          />
          <p className="mt-1 text-[11px] text-text-mute">
            The action button will unlock once you type <span className="font-mono font-semibold text-white">{targetWord}</span> exactly.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={variant === "danger" ? "danger" : "orange"}
            disabled={!isMatch}
            className="font-bold whitespace-nowrap"
          >
            {isMatch ? `Confirm & ${actionLabel}` : actionLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
