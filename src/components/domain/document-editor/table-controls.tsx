"use client";

import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

export function TableControls({
  editor,
  editable,
}: {
  editor: Editor | null;
  editable: boolean;
}) {
  if (!editor || !editor.isActive("table")) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 border-b border-border bg-[#f3f0ea] px-2 py-1",
        !editable && "pointer-events-none opacity-50",
      )}
    >
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-text-mute">
        Table
      </span>
      <Mini
        label="+ Row"
        onClick={() => editor.chain().focus().addRowAfter().run()}
      />
      <Mini
        label="− Row"
        onClick={() => editor.chain().focus().deleteRow().run()}
      />
      <Mini
        label="+ Col"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      />
      <Mini
        label="− Col"
        onClick={() => editor.chain().focus().deleteColumn().run()}
      />
      <Mini
        label="Header row"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      />
      <Mini
        label="Delete table"
        onClick={() => editor.chain().focus().deleteTable().run()}
      />
    </div>
  );
}

function Mini({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="h-7 rounded-md px-2 text-[11px] font-medium text-text-dim hover:bg-white hover:text-text"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
