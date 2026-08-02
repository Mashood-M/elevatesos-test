"use client";

/**
 * @deprecated Prefer Ribbon in document-editor.tsx — kept as command reference only.
 */

import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/lib/reports/docx-export";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { ColorPickerButton } from "./color-picker";
import { DOCUMENT_FONT_GROUPS, fontStackForName } from "./fonts";

const SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px"];

export function FormattingToolbar({
  editor,
  editable,
  onOpenAi,
}: {
  editor: Editor | null;
  editable: boolean;
  onOpenAi?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { prompt } = useAppDialogs();

  if (!editor) return null;

  async function insertImage(file: File | null) {
    if (!file || !editor) return;
    try {
      const img = await compressImageFile(file);
      editor.chain().focus().setImage({ src: img.dataUrl }).run();
    } catch {
      /* ignore */
    }
  }

  const inList =
    editor.isActive("bulletList") ||
    editor.isActive("orderedList") ||
    editor.isActive("taskList");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 border-b border-border bg-bg-panel px-2 py-1.5",
        !editable && "pointer-events-none opacity-50",
      )}
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
      <Tool
        label="↶"
        title="Undo"
        onClick={() => editor.chain().focus().undo().run()}
      />
      <Tool
        label="↷"
        title="Redo"
        onClick={() => editor.chain().focus().redo().run()}
      />
      <Sep />
      <select
        className="h-8 min-w-[140px] rounded-md border border-border bg-bg px-2 text-[11px]"
        defaultValue="Plus Jakarta Sans"
        onChange={(e) =>
          editor
            .chain()
            .focus()
            .setFontFamily(fontStackForName(e.target.value))
            .run()
        }
        aria-label="Font"
      >
        {DOCUMENT_FONT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.fonts.map((f) => (
              <option key={f.name} value={f.name} style={{ fontFamily: f.stack }}>
                {f.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select
        className="h-8 rounded-md border border-border bg-bg px-2 text-[11px]"
        defaultValue="16px"
        onChange={(e) =>
          editor.chain().focus().setFontSize(e.target.value).run()
        }
        aria-label="Font size"
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s.replace("px", "")}
          </option>
        ))}
      </select>
      <Sep />
      <Tool
        label="B"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="font-bold"
      />
      <Tool
        label="I"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="italic"
      />
      <Tool
        label="U"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className="underline"
      />
      <Tool
        label="S"
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className="line-through"
      />
      <Tool
        label="H"
        title="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      />
      <ColorPickerButton
        label="A"
        mode="text"
        onPick={(value) => {
          if (!value) editor.chain().focus().unsetColor().run();
          else editor.chain().focus().setColor(value).run();
        }}
      />
      <ColorPickerButton
        label="BG"
        mode="background"
        onPick={(value) => {
          if (!value) editor.chain().focus().unsetBackgroundColor().run();
          else editor.chain().focus().setBackgroundColor(value).run();
        }}
      />
      <Sep />
      <Tool
        label="⟸"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Align left"
      />
      <Tool
        label="≡"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Align center"
      />
      <Tool
        label="⟹"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Align right"
      />
      <Sep />
      <select
        className="h-8 rounded-md border border-border bg-bg px-2 text-[11px]"
        value={
          editor.isActive("heading", { level: 1 })
            ? "1"
            : editor.isActive("heading", { level: 2 })
              ? "2"
              : editor.isActive("heading", { level: 3 })
                ? "3"
                : editor.isActive("heading", { level: 4 })
                  ? "4"
                  : editor.isActive("heading", { level: 5 })
                    ? "5"
                    : editor.isActive("heading", { level: 6 })
                      ? "6"
                      : "p"
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") {
            editor.chain().focus().setParagraph().run();
            return;
          }
          editor
            .chain()
            .focus()
            .toggleHeading({ level: Number(v) as 1 | 2 | 3 | 4 | 5 | 6 })
            .run();
        }}
        aria-label="Heading"
      >
        <option value="p">Paragraph</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
        <option value="5">Heading 5</option>
        <option value="6">Heading 6</option>
      </select>
      <Tool
        label="•"
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <Tool
        label="1."
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <Tool
        label="☑"
        title="Checklist"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />
      <Tool
        label="→"
        title="Indent"
        onClick={() => {
          if (editor.isActive("taskList")) {
            editor.chain().focus().sinkListItem("taskItem").run();
          } else {
            editor.chain().focus().sinkListItem("listItem").run();
          }
        }}
        disabled={!inList}
      />
      <Tool
        label="←"
        title="Outdent"
        onClick={() => {
          if (editor.isActive("taskList")) {
            editor.chain().focus().liftListItem("taskItem").run();
          } else {
            editor.chain().focus().liftListItem("listItem").run();
          }
        }}
        disabled={!inList}
      />
      <Sep />
      <Tool
        label="❝"
        title="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <Tool
        label="<>"
        title="Inline code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <Tool
        label="{ }"
        title="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <Tool
        label="—"
        title="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
      <Sep />
      <Tool
        label="Table"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />
      <Tool label="Image" onClick={() => fileRef.current?.click()} />
      <Tool
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          void (async () => {
            const url = await prompt({
              title: "Insert link",
              label: "URL",
              defaultValue: "https://",
              confirmLabel: "Insert",
            });
            if (!url?.trim()) return;
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url.trim() })
              .run();
          })();
        }}
      />
      <Sep />
      <Tool label="AI" onClick={() => onOpenAi?.()} title="AI Assistant" />
    </div>
  );
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px bg-border" />;
}

function Tool({
  label,
  onClick,
  active,
  className,
  title,
  disabled,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 rounded-md px-2 text-[11px] font-medium text-text-dim hover:bg-bg-hover hover:text-text disabled:opacity-30",
        active && "bg-[var(--secondary-soft)] text-[var(--secondary)]",
        className,
      )}
    >
      {label}
    </button>
  );
}
