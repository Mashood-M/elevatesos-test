"use client";

import { EventManagerCreateDialog } from "@/components/domain/event-manager-dialog";

type Props = {
  dateKey: string;
  /** Fixed chapter (chapter calendar) or initial choice (HQ). */
  chapterId: string;
  /** When true, show chapter picker (HQ global calendar). */
  allowChapterPick?: boolean;
  open?: boolean;
  onClose: () => void;
  onCreated?: (eventId: string) => void;
};

export function CalendarQuickCreate({
  dateKey,
  chapterId,
  open = true,
  onClose,
  onCreated,
}: Props) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const safeDateKey = dateKey && dateKey >= todayKey ? dateKey : todayKey;

  return (
    <EventManagerCreateDialog
      open={open}
      onClose={onClose}
      chapterId={chapterId}
      initialDateKey={safeDateKey}
      onCreated={(eventId) => {
        onCreated?.(eventId);
      }}
    />
  );
}
