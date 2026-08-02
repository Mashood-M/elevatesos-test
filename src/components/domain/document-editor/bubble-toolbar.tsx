"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Baseline,
  Bold,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { ColorPickerButton } from "./color-picker";
import { DOCUMENT_FONT_GROUPS, fontStackForName } from "./fonts";

const SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px"];

function currentStyleValue(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "p";
}

function currentFontName(editor: Editor): string {
  const family = String(editor.getAttributes("textStyle").fontFamily || "");
  if (!family) return "Plus Jakarta Sans";
  for (const group of DOCUMENT_FONT_GROUPS) {
    for (const f of group.fonts) {
      if (family.includes(f.name) || family === f.stack) return f.name;
    }
  }
  return "Plus Jakarta Sans";
}

function currentFontSize(editor: Editor): string {
  const size = String(editor.getAttributes("textStyle").fontSize || "16px");
  return SIZES.includes(size) ? size : "16px";
}

function currentTextColor(editor: Editor): string {
  return String(editor.getAttributes("textStyle").color || "#1f1f1f");
}

/** Nearest overflow scroll ancestor (canvas pane), else window. */
function scrollTargetFor(editor: Editor): HTMLElement | Window {
  let el: HTMLElement | null = editor.view.dom.parentElement;
  while (el) {
    const { overflow, overflowY } = getComputedStyle(el);
    if (
      /(auto|scroll)/.test(overflow) ||
      /(auto|scroll)/.test(overflowY)
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return window;
}

/** Word Online–style selection toolbar (icons + compact font controls). */
export function BubbleToolbar({
  editor,
  editable,
}: {
  editor: Editor | null;
  editable: boolean;
}) {
  const { prompt } = useAppDialogs();

  if (!editor || !editable) return null;

  return (
    <BubbleMenu
      editor={editor}
      appendTo={() => document.body}
      options={{
        strategy: "fixed",
        placement: "top",
        offset: 8,
        flip: true,
        shift: { padding: 12 },
        scrollTarget: scrollTargetFor(editor),
      }}
      className="z-[200] flex max-w-[min(100vw-2rem,560px)] flex-wrap items-center gap-0.5 rounded-lg border border-border bg-bg-panel p-1 shadow-[var(--shadow)]"
    >
      <select
        className="h-8 max-w-[88px] rounded-md border border-border bg-bg px-1 text-[11px] text-text"
        title="Styles"
        value={currentStyleValue(editor)}
        onChange={(e) => {
          const v = e.target.value;
          const chain = editor.chain().focus();
          if (v === "p") chain.setParagraph().run();
          else if (v === "h1") chain.toggleHeading({ level: 1 }).run();
          else if (v === "h2") chain.toggleHeading({ level: 2 }).run();
          else if (v === "h3") chain.toggleHeading({ level: 3 }).run();
        }}
      >
        <option value="p">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <select
        className="h-8 max-w-[120px] rounded-md border border-border bg-bg px-1 text-[11px] text-text"
        title="Font"
        value={currentFontName(editor)}
        onChange={(e) =>
          editor
            .chain()
            .focus()
            .setFontFamily(fontStackForName(e.target.value))
            .run()
        }
      >
        {DOCUMENT_FONT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.fonts.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <select
        className="h-8 w-14 rounded-md border border-border bg-bg px-1 text-[11px] text-text"
        title="Font size"
        value={currentFontSize(editor)}
        onChange={(e) =>
          editor.chain().focus().setFontSize(e.target.value).run()
        }
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s.replace("px", "")}
          </option>
        ))}
      </select>

      <Sep />

      <IconBtn
        icon={Bold}
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <IconBtn
        icon={Italic}
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <IconBtn
        icon={Underline}
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />

      <ColorPickerButton
        label="Highlight"
        mode="background"
        icon={Highlighter}
        active={editor.isActive("highlight")}
        swatch="#fef08a"
        onPick={(value) => {
          if (!value) editor.chain().focus().unsetHighlight().run();
          else
            editor
              .chain()
              .focus()
              .setHighlight({ color: value })
              .run();
        }}
      />

      <ColorPickerButton
        label="Font Color"
        mode="text"
        icon={Baseline}
        active={Boolean(editor.getAttributes("textStyle").color)}
        swatch={currentTextColor(editor)}
        onPick={(value) => {
          if (!value) editor.chain().focus().unsetColor().run();
          else editor.chain().focus().setColor(value).run();
        }}
      />

      <Sep />

      <IconBtn
        icon={List}
        title="Bullets"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <IconBtn
        icon={ListOrdered}
        title="Numbering"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <IconBtn
        icon={Link2}
        title="Link"
        active={editor.isActive("link")}
        onClick={() => {
          void (async () => {
            const prev = editor.getAttributes("link").href as
              | string
              | undefined;
            const url = await prompt({
              title: "Insert link",
              label: "URL",
              defaultValue: prev || "https://",
              confirmLabel: "Insert",
            });
            if (url === null) return;
            if (!url.trim()) {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url.trim() })
              .run();
          })();
        }}
      />
    </BubbleMenu>
  );
}

function Sep() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden />;
}

function IconBtn({
  icon: Icon,
  title,
  onClick,
  active,
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-text-dim hover:bg-bg-hover hover:text-text",
        active && "bg-[var(--secondary-soft)] text-[var(--secondary)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
