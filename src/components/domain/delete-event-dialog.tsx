"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteEventDialog({
  open,
  onClose,
  onConfirm,
  eventTitle,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  eventTitle: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    if (isDeleting) return;
    onClose();
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text">
              Delete Event
            </h3>
            <p className="text-xs text-text-dim mt-0.5">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/5 p-3.5 text-xs text-text-dim space-y-1.5">
          <p className="text-text">
            Are you sure you want to delete{" "}
            <span className="font-bold text-text uppercase font-mono">
              "{eventTitle}"
            </span>
            ?
          </p>
          <p className="text-[11px] text-text-mute">
            All associated registrations, attendance checkpoints, and event forms will be permanently removed.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isDeleting}
            onClick={handleDelete}
            className="flex items-center gap-1.5"
            autoFocus
          >
            <Trash2 size={13} />
            {isDeleting ? "Deleting..." : "Delete Event"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
