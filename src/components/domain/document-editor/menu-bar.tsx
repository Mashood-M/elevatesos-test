"use client";

/**
 * @deprecated Prefer Ribbon in document-editor.tsx — kept as command reference only.
 */

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/lib/reports/docx-export";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { printDocument } from "./print-document";

type MenuBarProps = {
  editor: Editor | null;
  editable: boolean;
  onSave?: () => void;
  onExportDocx?: () => void;
  onToggleOutline?: () => void;
  onToggleRight?: () => void;
  onOpenAi?: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

export function MenuBar({
  editor,
  editable,
  onSave,
  onExportDocx,
  onToggleOutline,
  onToggleRight,
  onOpenAi,
  fullscreen,
  onToggleFullscreen,
}: MenuBarProps) {
  const { prompt } = useAppDialogs();
  const [open, setOpen] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function insertImage(file: File | null) {
    if (!file || !editor) return;
    try {
      const img = await compressImageFile(file);
      editor.chain().focus().setImage({ src: img.dataUrl }).run();
    } catch {
      /* ignore */
    }
  }

  const menus: {
    key: string;
    label: string;
    items: { label: string; action: () => void; disabled?: boolean }[];
  }[] = [
    {
      key: "file",
      label: "File",
      items: [
        { label: "Save", action: () => onSave?.(), disabled: !editable || !onSave },
        {
          label: "Export .docx",
          action: () => onExportDocx?.(),
          disabled: !onExportDocx,
        },
        {
          label: "Print…",
          action: () => {
            if (editor) printDocument(editor);
          },
          disabled: !editor,
        },
      ],
    },
    {
      key: "edit",
      label: "Edit",
      items: [
        {
          label: "Undo",
          action: () => editor?.chain().focus().undo().run(),
          disabled: !editable || !editor?.can().undo(),
        },
        {
          label: "Redo",
          action: () => editor?.chain().focus().redo().run(),
          disabled: !editable || !editor?.can().redo(),
        },
        {
          label: "Select all",
          action: () => editor?.chain().focus().selectAll().run(),
          disabled: !editable,
        },
      ],
    },
    {
      key: "insert",
      label: "Insert",
      items: [
        {
          label: "Image…",
          action: () => fileRef.current?.click(),
          disabled: !editable,
        },
        {
          label: "Table",
          action: () =>
            editor
              ?.chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run(),
          disabled: !editable,
        },
        {
          label: "Link…",
          action: () => {
            void (async () => {
              const url = await prompt({
                title: "Insert link",
                label: "URL",
                defaultValue: "https://",
                confirmLabel: "Insert",
              });
              if (!url?.trim() || !editor) return;
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url.trim() })
                .run();
            })();
          },
          disabled: !editable,
        },
        {
          label: "Horizontal rule",
          action: () => editor?.chain().focus().setHorizontalRule().run(),
          disabled: !editable,
        },
        {
          label: "Code block",
          action: () => editor?.chain().focus().toggleCodeBlock().run(),
          disabled: !editable,
        },
        {
          label: "Quote",
          action: () => editor?.chain().focus().toggleBlockquote().run(),
          disabled: !editable,
        },
        {
          label: "Callout",
          action: () =>
            editor
              ?.chain()
              .focus()
              .insertContent({
                type: "blockquote",
                attrs: { callout: "info" },
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        marks: [{ type: "bold" }],
                        text: "Info",
                      },
                      { type: "text", text: " — " },
                    ],
                  },
                ],
              })
              .run(),
          disabled: !editable,
        },
        {
          label: "Checklist",
          action: () => editor?.chain().focus().toggleTaskList().run(),
          disabled: !editable,
        },
      ],
    },
    {
      key: "format",
      label: "Format",
      items: [
        {
          label: "Bold",
          action: () => editor?.chain().focus().toggleBold().run(),
          disabled: !editable,
        },
        {
          label: "Italic",
          action: () => editor?.chain().focus().toggleItalic().run(),
          disabled: !editable,
        },
        {
          label: "Underline",
          action: () => editor?.chain().focus().toggleUnderline().run(),
          disabled: !editable,
        },
        {
          label: "Strikethrough",
          action: () => editor?.chain().focus().toggleStrike().run(),
          disabled: !editable,
        },
        {
          label: "Highlight",
          action: () => editor?.chain().focus().toggleHighlight().run(),
          disabled: !editable,
        },
        {
          label: "Inline code",
          action: () => editor?.chain().focus().toggleCode().run(),
          disabled: !editable,
        },
        {
          label: "Heading 1",
          action: () =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run(),
          disabled: !editable,
        },
        {
          label: "Heading 2",
          action: () =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run(),
          disabled: !editable,
        },
        {
          label: "Heading 3",
          action: () =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run(),
          disabled: !editable,
        },
        {
          label: "Heading 4",
          action: () =>
            editor?.chain().focus().toggleHeading({ level: 4 }).run(),
          disabled: !editable,
        },
        {
          label: "Bullet list",
          action: () => editor?.chain().focus().toggleBulletList().run(),
          disabled: !editable,
        },
        {
          label: "Numbered list",
          action: () => editor?.chain().focus().toggleOrderedList().run(),
          disabled: !editable,
        },
        {
          label: "Checklist",
          action: () => editor?.chain().focus().toggleTaskList().run(),
          disabled: !editable,
        },
        {
          label: "Indent",
          action: () => {
            if (!editor) return;
            if (editor.isActive("taskList")) {
              editor.chain().focus().sinkListItem("taskItem").run();
            } else {
              editor.chain().focus().sinkListItem("listItem").run();
            }
          },
          disabled: !editable,
        },
        {
          label: "Outdent",
          action: () => {
            if (!editor) return;
            if (editor.isActive("taskList")) {
              editor.chain().focus().liftListItem("taskItem").run();
            } else {
              editor.chain().focus().liftListItem("listItem").run();
            }
          },
          disabled: !editable,
        },
      ],
    },
    {
      key: "view",
      label: "View",
      items: [
        {
          label: "Toggle outline",
          action: () => onToggleOutline?.(),
        },
        {
          label: "Toggle properties",
          action: () => onToggleRight?.(),
        },
        {
          label: fullscreen ? "Exit fullscreen" : "Fullscreen",
          action: () => onToggleFullscreen?.(),
        },
      ],
    },
    {
      key: "export",
      label: "Export",
      items: [
        {
          label: "Download Word (.docx)",
          action: () => onExportDocx?.(),
          disabled: !onExportDocx,
        },
      ],
    },
    {
      key: "ai",
      label: "AI",
      items: [
        {
          label: "Open AI Assistant",
          action: () => onOpenAi?.(),
        },
      ],
    },
  ];

  return (
    <div
      ref={rootRef}
      className="relative flex flex-wrap items-center gap-0.5 border-b border-border bg-[#f7f5f1] px-2 py-1"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void insertImage(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {menus.map((menu) => (
        <div key={menu.key} className="relative">
          <button
            type="button"
            className={cn(
              "rounded px-2.5 py-1 text-[12px] font-medium text-text-dim hover:bg-white hover:text-text",
              open === menu.key && "bg-white text-text shadow-sm",
            )}
            onClick={() => setOpen(open === menu.key ? null : menu.key)}
          >
            {menu.label}
          </button>
          {open === menu.key ? (
            <div className="absolute left-0 top-full z-20 mt-0.5 min-w-[180px] rounded-[10px] border border-border bg-bg-panel py-1 shadow-[var(--shadow)]">
              {menu.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  className="block w-full px-3 py-1.5 text-left text-[12px] text-text hover:bg-bg-hover disabled:opacity-40"
                  onClick={() => {
                    item.action();
                    setOpen(null);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
