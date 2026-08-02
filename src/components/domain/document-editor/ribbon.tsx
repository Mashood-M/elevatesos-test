"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ClipboardPaste,
  Cloud,
  Code2,
  Columns2,
  Copy,
  Eraser,
  FileDown,
  FilePlus,
  FileText,
  Frame,
  Hash,
  Highlighter,
  ImageIcon,
  Indent,
  Info,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  MessageSquare,
  Minus,
  Outdent,
  Palette,
  PanelLeft,
  Printer,
  Quote,
  RectangleHorizontal,
  RectangleVertical,
  Redo2,
  Ruler,
  Save,
  Scissors,
  Search,
  Sparkles,
  Strikethrough,
  Type,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/lib/reports/docx-export";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { ColorPickerButton } from "./color-picker";
import { DOCUMENT_FONT_GROUPS, fontStackForName } from "./fonts";
import type {
  PageBorder,
  PageColumns,
  PageOrientation,
  PageSizeId,
} from "./page-geometry";
import type { MarginPreset } from "./page-ruler";
import { printDocument } from "./print-document";
import {
  getParagraphLayout,
  setParagraphLayout,
} from "./styled-paragraph";
import { TablePicker } from "./table-picker";
import type { DocumentMeta, SaveState } from "./types";

const PAGE_COLORS = [
  "#ffffff",
  "#fffbeb",
  "#f0fdf4",
  "#eff6ff",
  "#fdf2f8",
  "#f5f5f4",
  "#fef3c7",
  "#e0e7ff",
];

const SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px"];

export type RibbonTab =
  | "file"
  | "home"
  | "insert"
  | "layout"
  | "review"
  | "view";

const TABS: { id: RibbonTab; label: string }[] = [
  { id: "file", label: "File" },
  { id: "home", label: "Home" },
  { id: "insert", label: "Insert" },
  { id: "layout", label: "Layout" },
  { id: "review", label: "Review" },
  { id: "view", label: "View" },
];

export function Ribbon({
  editor,
  editable,
  tab,
  onTabChange,
  toolQuery,
  libraryHref,
  libraryLabel = "Library",
  onSave,
  onExportDocx,
  marginPreset,
  onMarginChange,
  orientation,
  onOrientationChange,
  pageSize,
  onPageSizeChange,
  columns,
  onColumnsChange,
  lineNumbers,
  onLineNumbersChange,
  pageBg,
  onPageBgChange,
  pageBorder,
  onPageBorderChange,
  outlineOpen,
  onToggleOutline,
  rulerVisible,
  onToggleRuler,
  rightOpen,
  onToggleRight,
  onOpenComments,
  onOpenAi,
  focusMode,
  onToggleFocus,
  zoom,
  onZoomChange,
  meta,
  documentTitle,
  marginPx,
  saveState = "saved",
}: {
  editor: Editor | null;
  editable: boolean;
  tab: RibbonTab;
  onTabChange: (t: RibbonTab) => void;
  toolQuery: string;
  libraryHref: string;
  libraryLabel?: string;
  onSave?: () => void;
  onExportDocx?: () => void;
  marginPreset: MarginPreset;
  onMarginChange: (m: MarginPreset) => void;
  orientation: PageOrientation;
  onOrientationChange: (o: PageOrientation) => void;
  pageSize: PageSizeId;
  onPageSizeChange: (s: PageSizeId) => void;
  columns: PageColumns;
  onColumnsChange: (c: PageColumns) => void;
  lineNumbers: boolean;
  onLineNumbersChange: (v: boolean) => void;
  pageBg: string;
  onPageBgChange: (c: string) => void;
  pageBorder: PageBorder;
  onPageBorderChange: (b: PageBorder) => void;
  outlineOpen: boolean;
  onToggleOutline: () => void;
  rulerVisible: boolean;
  onToggleRuler: () => void;
  rightOpen: boolean;
  onToggleRight: () => void;
  onOpenComments: () => void;
  onOpenAi: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  meta?: DocumentMeta;
  documentTitle?: string;
  marginPx?: number;
  saveState?: SaveState;
}) {
  const { prompt } = useAppDialogs();
  const fileRef = useRef<HTMLInputElement>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [stylesOpen, setStylesOpen] = useState(false);
  const [marginsOpen, setMarginsOpen] = useState(false);
  const [orientOpen, setOrientOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [borderOpen, setBorderOpen] = useState(false);
  const q = toolQuery.trim().toLowerCase();
  const match = (label: string) => !q || label.toLowerCase().includes(q);

  async function insertImage(file: File | null) {
    if (!file || !editor) return;
    try {
      const img = await compressImageFile(file);
      editor.chain().focus().setImage({ src: img.dataUrl }).run();
    } catch {
      /* ignore */
    }
  }

  function findNext() {
    if (!editor || !findQuery.trim()) return;
    const { doc, selection } = editor.state;
    const needle = findQuery.toLowerCase();
    const start = selection.to;
    let found: { from: number; to: number } | null = null;

    doc.descendants((node, pos) => {
      if (found || !node.isText || !node.text) return;
      const lower = node.text.toLowerCase();
      let idx = lower.indexOf(needle);
      while (idx !== -1) {
        const from = pos + idx;
        const to = from + needle.length;
        if (from >= start) {
          found = { from, to };
          return false;
        }
        idx = lower.indexOf(needle, idx + 1);
      }
    });

    if (!found) {
      doc.descendants((node, pos) => {
        if (found || !node.isText || !node.text) return;
        const idx = node.text.toLowerCase().indexOf(needle);
        if (idx !== -1) {
          found = { from: pos + idx, to: pos + idx + needle.length };
          return false;
        }
      });
    }

    if (found) {
      editor.chain().focus().setTextSelection(found).scrollIntoView().run();
    }
  }

  async function pasteClipboard() {
    if (!editor) return;
    try {
      const html = await navigator.clipboard.readText();
      if (html) editor.chain().focus().insertContent(html).run();
    } catch {
      document.execCommand("paste");
    }
  }

  if (!editor) return null;

  const inList =
    editor.isActive("bulletList") ||
    editor.isActive("orderedList") ||
    editor.isActive("taskList");

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "dirty"
        ? "Unsaved changes"
        : "Saved";

  return (
    <div className="shrink-0 border-b border-border bg-[#f7f5f1]">
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
      <div className="flex items-end gap-0.5 px-2 pt-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              "rounded-t-md px-3 py-1.5 text-[12px] font-medium text-text-dim hover:bg-white/80",
              tab === t.id &&
                "bg-bg-panel text-text shadow-[0_-1px_0_var(--border)_inset]",
            )}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!focusMode ? (
        <div
          className={cn(
            "flex min-h-[88px] flex-wrap items-stretch gap-0 border-t border-border bg-bg-panel px-1 py-1",
            !editable && tab !== "view" && tab !== "review" && "opacity-60",
          )}
        >
          {tab === "file" ? (
            <div className="flex w-full min-h-[88px]">
              <div className="flex w-[220px] flex-col border-r border-border bg-[#faf8f5] py-1">
                <div className="mb-1 flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-[10px] text-text-mute">
                  <Cloud
                    className={cn(
                      "h-3.5 w-3.5",
                      saveState === "saved" ? "text-green" : "text-orange",
                    )}
                  />
                  {saveLabel}
                </div>
                <FileRow
                  icon={Save}
                  label="Save"
                  onClick={() => onSave?.()}
                  disabled={!editable || !onSave}
                  show={match("Save")}
                />
                <FileRow
                  icon={FileDown}
                  label="Export .docx"
                  onClick={() => onExportDocx?.()}
                  disabled={!onExportDocx}
                  show={match("Export")}
                />
                <FileRow
                  icon={Printer}
                  label="Print"
                  onClick={() =>
                    printDocument(editor, {
                      title: documentTitle,
                      marginPx,
                      pageSize,
                      orientation,
                      pageBg,
                    })
                  }
                  show={match("Print")}
                />
                <FileRow
                  icon={FilePlus}
                  label="New page"
                  onClick={() => editor.chain().focus().setPageBreak().run()}
                  disabled={!editable}
                  show={match("New") || match("Page")}
                />
                <FileRow
                  icon={Info}
                  label="Info"
                  onClick={() => {}}
                  show={match("Info")}
                  meta
                />
                <Link
                  href={libraryHref}
                  className="mx-1 mt-auto flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-text-dim hover:bg-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
                </Link>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 text-[12px] text-text-dim">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-mute">
                  Document info
                </p>
                <p className="truncate font-semibold text-text">
                  {documentTitle || "Untitled"}
                </p>
                {meta?.status ? <p>Status: {meta.status}</p> : null}
                {meta?.chapterName ? (
                  <p className="truncate">Chapter: {meta.chapterName}</p>
                ) : null}
                {meta?.authorName ? (
                  <p className="truncate">Author: {meta.authorName}</p>
                ) : null}
                {meta?.eventTitle ? (
                  <p className="truncate">Event: {meta.eventTitle}</p>
                ) : null}
                <p className="text-[11px] text-text-mute">
                  Library: {libraryLabel}
                </p>
              </div>
            </div>
          ) : null}

          {tab === "home" ? (
            <>
              <Group label="Clipboard">
                <div className="flex flex-col gap-0.5">
                  <div className="flex gap-0.5">
                    {match("Undo") ? (
                      <Mini
                        icon={Undo2}
                        title="Undo"
                        onClick={() => editor.chain().focus().undo().run()}
                      />
                    ) : null}
                    {match("Redo") ? (
                      <Mini
                        icon={Redo2}
                        title="Redo"
                        onClick={() => editor.chain().focus().redo().run()}
                      />
                    ) : null}
                  </div>
                  <div className="flex gap-0.5">
                    {match("Cut") ? (
                      <Mini
                        icon={Scissors}
                        title="Cut"
                        onClick={() => document.execCommand("cut")}
                      />
                    ) : null}
                    {match("Copy") ? (
                      <Mini
                        icon={Copy}
                        title="Copy"
                        onClick={() => document.execCommand("copy")}
                      />
                    ) : null}
                    {match("Paste") ? (
                      <Mini
                        icon={ClipboardPaste}
                        title="Paste"
                        onClick={() => void pasteClipboard()}
                      />
                    ) : null}
                  </div>
                </div>
              </Group>
              <Group label="Font">
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    {match("Font") ? (
                      <select
                        className="h-7 min-w-[120px] rounded-md border border-border bg-bg px-1.5 text-[11px]"
                        defaultValue="Plus Jakarta Sans"
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
                    ) : null}
                    {match("Size") ? (
                      <select
                        className="h-7 rounded-md border border-border bg-bg px-1.5 text-[11px]"
                        defaultValue="16px"
                        onChange={(e) =>
                          editor
                            .chain()
                            .focus()
                            .setFontSize(e.target.value)
                            .run()
                        }
                      >
                        {SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("px", "")}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-0.5">
                    {match("Bold") ? (
                      <Mini
                        icon={Bold}
                        title="Bold"
                        active={editor.isActive("bold")}
                        onClick={() =>
                          editor.chain().focus().toggleBold().run()
                        }
                      />
                    ) : null}
                    {match("Italic") ? (
                      <Mini
                        icon={Italic}
                        title="Italic"
                        active={editor.isActive("italic")}
                        onClick={() =>
                          editor.chain().focus().toggleItalic().run()
                        }
                      />
                    ) : null}
                    {match("Underline") ? (
                      <Mini
                        icon={Underline}
                        title="Underline"
                        active={editor.isActive("underline")}
                        onClick={() =>
                          editor.chain().focus().toggleUnderline().run()
                        }
                      />
                    ) : null}
                    {match("Strike") ? (
                      <Mini
                        icon={Strikethrough}
                        title="Strikethrough"
                        active={editor.isActive("strike")}
                        onClick={() =>
                          editor.chain().focus().toggleStrike().run()
                        }
                      />
                    ) : null}
                    {match("Highlight") ? (
                      <Mini
                        icon={Highlighter}
                        title="Highlight"
                        active={editor.isActive("highlight")}
                        onClick={() =>
                          editor.chain().focus().toggleHighlight().run()
                        }
                      />
                    ) : null}
                    {match("Color") || match("Text") ? (
                      <ColorPickerButton
                        label="A"
                        mode="text"
                        onPick={(value) => {
                          if (!value)
                            editor.chain().focus().unsetColor().run();
                          else editor.chain().focus().setColor(value).run();
                        }}
                      />
                    ) : null}
                    {match("Clear") ? (
                      <Mini
                        icon={Eraser}
                        title="Clear formatting"
                        onClick={() =>
                          editor.chain().focus().unsetAllMarks().run()
                        }
                      />
                    ) : null}
                  </div>
                </div>
              </Group>
              <Group label="Paragraph">
                <div className="flex flex-col gap-0.5">
                  <div className="flex gap-0.5">
                    {match("Bullet") ? (
                      <Mini
                        icon={List}
                        title="Bullets"
                        active={editor.isActive("bulletList")}
                        onClick={() =>
                          editor.chain().focus().toggleBulletList().run()
                        }
                      />
                    ) : null}
                    {match("Number") ? (
                      <Mini
                        icon={ListOrdered}
                        title="Numbering"
                        active={editor.isActive("orderedList")}
                        onClick={() =>
                          editor.chain().focus().toggleOrderedList().run()
                        }
                      />
                    ) : null}
                    {match("Check") || match("Task") ? (
                      <Mini
                        icon={ListChecks}
                        title="Checklist"
                        active={editor.isActive("taskList")}
                        onClick={() =>
                          editor.chain().focus().toggleTaskList().run()
                        }
                      />
                    ) : null}
                    {match("Indent") ? (
                      <Mini
                        icon={Indent}
                        title="Increase indent"
                        disabled={!inList}
                        onClick={() => {
                          if (editor.isActive("taskList"))
                            editor
                              .chain()
                              .focus()
                              .sinkListItem("taskItem")
                              .run();
                          else
                            editor
                              .chain()
                              .focus()
                              .sinkListItem("listItem")
                              .run();
                        }}
                      />
                    ) : null}
                    {match("Outdent") || match("Indent") ? (
                      <Mini
                        icon={Outdent}
                        title="Decrease indent"
                        disabled={!inList}
                        onClick={() => {
                          if (editor.isActive("taskList"))
                            editor
                              .chain()
                              .focus()
                              .liftListItem("taskItem")
                              .run();
                          else
                            editor
                              .chain()
                              .focus()
                              .liftListItem("listItem")
                              .run();
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="flex gap-0.5">
                    <Mini
                      icon={AlignLeft}
                      title="Align left"
                      active={editor.isActive({ textAlign: "left" })}
                      onClick={() =>
                        editor.chain().focus().setTextAlign("left").run()
                      }
                    />
                    <Mini
                      icon={AlignCenter}
                      title="Center"
                      active={editor.isActive({ textAlign: "center" })}
                      onClick={() =>
                        editor.chain().focus().setTextAlign("center").run()
                      }
                    />
                    <Mini
                      icon={AlignRight}
                      title="Align right"
                      active={editor.isActive({ textAlign: "right" })}
                      onClick={() =>
                        editor.chain().focus().setTextAlign("right").run()
                      }
                    />
                    <Mini
                      icon={AlignJustify}
                      title="Justify"
                      active={editor.isActive({ textAlign: "justify" })}
                      onClick={() =>
                        editor.chain().focus().setTextAlign("justify").run()
                      }
                    />
                  </div>
                </div>
              </Group>
              <Group label="Styles">
                <div className="relative flex items-stretch gap-1">
                  <button
                    type="button"
                    className={cn(
                      "flex h-[64px] w-[88px] flex-col items-start justify-center rounded-md border border-border px-2 text-left hover:bg-bg-hover",
                      !editor.isActive("heading") &&
                        "border-[var(--secondary)] bg-[var(--secondary-soft)]",
                    )}
                    onClick={() => editor.chain().focus().setParagraph().run()}
                  >
                    <span className="text-[13px] font-semibold text-text">
                      Normal
                    </span>
                    <span className="text-[10px] text-text-mute">
                      Plus Jakarta, 16
                    </span>
                  </button>
                  {(
                    [
                      ["H1", 1],
                      ["H2", 2],
                      ["H3", 3],
                    ] as const
                  ).map(([label, level]) => (
                    <button
                      key={label}
                      type="button"
                      className={cn(
                        "flex h-[64px] w-10 items-center justify-center rounded-md border border-border text-[12px] font-bold text-text-dim hover:bg-bg-hover",
                        editor.isActive("heading", { level }) &&
                          "border-[var(--secondary)] bg-[var(--secondary-soft)] text-[var(--secondary)]",
                      )}
                      onClick={() =>
                        editor
                          .chain()
                          .focus()
                          .toggleHeading({ level })
                          .run()
                      }
                    >
                      {label}
                    </button>
                  ))}
                  <div className="relative">
                    <button
                      type="button"
                      className="flex h-[64px] w-8 items-center justify-center rounded-md border border-border text-[11px] text-text-mute hover:bg-bg-hover"
                      onClick={() => setStylesOpen((v) => !v)}
                      title="More styles"
                    >
                      ▾
                    </button>
                    {stylesOpen ? (
                      <div className="absolute left-0 top-full z-40 mt-1 min-w-[100px] rounded-[10px] border border-border bg-bg-panel py-1 shadow-[var(--shadow)]">
                        {([4, 5, 6] as const).map((level) => (
                          <button
                            key={level}
                            type="button"
                            className="block w-full px-3 py-1.5 text-left text-[12px] hover:bg-bg-hover"
                            onClick={() => {
                              editor
                                .chain()
                                .focus()
                                .toggleHeading({ level })
                                .run();
                              setStylesOpen(false);
                            }}
                          >
                            Heading {level}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Group>
              <Group label="Editing">
                <div className="relative flex gap-0.5">
                  {match("Find") ? (
                    <>
                      <IconBtn
                        icon={Search}
                        label="Find"
                        active={findOpen}
                        onClick={() => setFindOpen((v) => !v)}
                      />
                      {findOpen ? (
                        <div className="absolute left-0 top-full z-40 mt-1 flex w-[220px] items-center gap-1 rounded-[10px] border border-border bg-bg-panel p-1.5 shadow-[var(--shadow)]">
                          <input
                            value={findQuery}
                            onChange={(e) => setFindQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                findNext();
                              }
                            }}
                            placeholder="Find in document…"
                            className="h-7 flex-1 rounded-md border border-border bg-bg px-2 text-[11px] outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            className="h-7 rounded-md bg-[var(--secondary-soft)] px-2 text-[10px] font-semibold text-[var(--secondary)]"
                            onClick={findNext}
                          >
                            Next
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {match("Select") ? (
                    <IconBtn
                      icon={Type}
                      label="Select"
                      onClick={() =>
                        editor.chain().focus().selectAll().run()
                      }
                    />
                  ) : null}
                  {match("AI") ? (
                    <IconBtn icon={Sparkles} label="AI" onClick={onOpenAi} />
                  ) : null}
                </div>
              </Group>
            </>
          ) : null}

          {tab === "insert" ? (
            <>
              <Group label="Pages">
                <IconBtn
                  icon={FilePlus}
                  label="Page Break"
                  title="Page break (Ctrl+Enter)"
                  onClick={() => editor.chain().focus().setPageBreak().run()}
                  disabled={!editable}
                />
              </Group>
              <Group label="Tables">
                {match("Table") ? (
                  <TablePicker
                    onPick={(rows, cols) =>
                      editor
                        .chain()
                        .focus()
                        .insertTable({
                          rows,
                          cols,
                          withHeaderRow: true,
                        })
                        .run()
                    }
                  />
                ) : null}
              </Group>
              <Group label="Illustrations">
                <IconBtn
                  icon={ImageIcon}
                  label="Picture"
                  onClick={() => fileRef.current?.click()}
                />
              </Group>
              <Group label="Links">
                <IconBtn
                  icon={Link2}
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
              </Group>
              <Group label="Text">
                <IconBtn
                  icon={Quote}
                  label="Quote"
                  active={editor.isActive("blockquote")}
                  onClick={() =>
                    editor.chain().focus().toggleBlockquote().run()
                  }
                />
                <IconBtn
                  icon={Info}
                  label="Callout"
                  onClick={() =>
                    editor
                      .chain()
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
                      .run()
                  }
                />
                <IconBtn
                  icon={Code2}
                  label="Code"
                  active={editor.isActive("codeBlock")}
                  onClick={() =>
                    editor.chain().focus().toggleCodeBlock().run()
                  }
                />
                <IconBtn
                  icon={Minus}
                  label="Divider"
                  onClick={() =>
                    editor.chain().focus().setHorizontalRule().run()
                  }
                />
              </Group>
              <Group label="Comments">
                <IconBtn
                  icon={MessageSquare}
                  label="Comment"
                  onClick={onOpenComments}
                />
              </Group>
            </>
          ) : null}

          {tab === "layout" ? (
            <>
              <Group label="Page Setup">
                {match("Margin") ? (
                  <RibbonMenu
                    open={marginsOpen}
                    onOpenChange={setMarginsOpen}
                    icon={Ruler}
                    label="Margins"
                    active={marginPreset !== "normal"}
                    disabled={!editable}
                  >
                    {(
                      [
                        ["narrow", "Narrow"],
                        ["normal", "Normal"],
                        ["wide", "Wide"],
                      ] as const
                    ).map(([id, label]) => (
                      <MenuItem
                        key={id}
                        active={marginPreset === id}
                        onClick={() => {
                          onMarginChange(id);
                          setMarginsOpen(false);
                        }}
                      >
                        {label}
                      </MenuItem>
                    ))}
                  </RibbonMenu>
                ) : null}
                {match("Orientation") ? (
                  <RibbonMenu
                    open={orientOpen}
                    onOpenChange={setOrientOpen}
                    icon={
                      orientation === "landscape"
                        ? RectangleHorizontal
                        : RectangleVertical
                    }
                    label="Orientation"
                    disabled={!editable}
                  >
                    <MenuItem
                      active={orientation === "portrait"}
                      onClick={() => {
                        onOrientationChange("portrait");
                        setOrientOpen(false);
                      }}
                    >
                      Portrait
                    </MenuItem>
                    <MenuItem
                      active={orientation === "landscape"}
                      onClick={() => {
                        onOrientationChange("landscape");
                        setOrientOpen(false);
                      }}
                    >
                      Landscape
                    </MenuItem>
                  </RibbonMenu>
                ) : null}
                {match("Size") ? (
                  <RibbonMenu
                    open={sizeOpen}
                    onOpenChange={setSizeOpen}
                    icon={FileText}
                    label="Size"
                    disabled={!editable}
                  >
                    <MenuItem
                      active={pageSize === "letter"}
                      onClick={() => {
                        onPageSizeChange("letter");
                        setSizeOpen(false);
                      }}
                    >
                      Letter (8.5″ × 11″)
                    </MenuItem>
                    <MenuItem
                      active={pageSize === "a4"}
                      onClick={() => {
                        onPageSizeChange("a4");
                        setSizeOpen(false);
                      }}
                    >
                      A4 (210 × 297 mm)
                    </MenuItem>
                  </RibbonMenu>
                ) : null}
                {match("Column") ? (
                  <RibbonMenu
                    open={colsOpen}
                    onOpenChange={setColsOpen}
                    icon={Columns2}
                    label="Columns"
                    active={columns === 2}
                    disabled={!editable}
                  >
                    <MenuItem
                      active={columns === 1}
                      onClick={() => {
                        onColumnsChange(1);
                        setColsOpen(false);
                      }}
                    >
                      One
                    </MenuItem>
                    <MenuItem
                      active={columns === 2}
                      onClick={() => {
                        onColumnsChange(2);
                        setColsOpen(false);
                      }}
                    >
                      Two
                    </MenuItem>
                  </RibbonMenu>
                ) : null}
                {match("Break") ? (
                  <IconBtn
                    icon={FilePlus}
                    label="Breaks"
                    title="Insert page break"
                    onClick={() => editor.chain().focus().setPageBreak().run()}
                    disabled={!editable}
                  />
                ) : null}
                {match("Line") ? (
                  <IconBtn
                    icon={Hash}
                    label="Line Numbers"
                    title="Toggle line numbers"
                    active={lineNumbers}
                    onClick={() => onLineNumbersChange(!lineNumbers)}
                    disabled={!editable}
                  />
                ) : null}
              </Group>
              <Group label="Paragraph">
                {(() => {
                  const layout = getParagraphLayout(editor);
                  const inPara = editor.isActive("paragraph");
                  return (
                    <div className="flex flex-wrap items-end gap-2 px-1 py-0.5">
                      <LayoutNum
                        label="Indent Left"
                        unit='"'
                        value={layout.indentLeft}
                        step={0.1}
                        min={0}
                        max={4}
                        disabled={!editable || !inPara}
                        onChange={(v) =>
                          setParagraphLayout(editor, { indentLeft: v })
                        }
                      />
                      <LayoutNum
                        label="Indent Right"
                        unit='"'
                        value={layout.indentRight}
                        step={0.1}
                        min={0}
                        max={4}
                        disabled={!editable || !inPara}
                        onChange={(v) =>
                          setParagraphLayout(editor, { indentRight: v })
                        }
                      />
                      <LayoutNum
                        label="Before"
                        unit="pt"
                        value={layout.spaceBefore}
                        step={1}
                        min={0}
                        max={72}
                        disabled={!editable || !inPara}
                        onChange={(v) =>
                          setParagraphLayout(editor, { spaceBefore: v })
                        }
                      />
                      <LayoutNum
                        label="After"
                        unit="pt"
                        value={layout.spaceAfter}
                        step={1}
                        min={0}
                        max={72}
                        disabled={!editable || !inPara}
                        onChange={(v) =>
                          setParagraphLayout(editor, { spaceAfter: v })
                        }
                      />
                    </div>
                  );
                })()}
              </Group>
              <Group label="Page Background">
                {match("Color") || match("Page") ? (
                  <RibbonMenu
                    open={colorOpen}
                    onOpenChange={setColorOpen}
                    icon={Palette}
                    label="Page Color"
                    disabled={!editable}
                  >
                    <div className="grid grid-cols-4 gap-1.5 px-2 py-1.5">
                      {PAGE_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          className={cn(
                            "h-7 w-7 rounded-md border border-border",
                            pageBg === c &&
                              "ring-2 ring-[var(--secondary)] ring-offset-1",
                          )}
                          style={{ background: c }}
                          onClick={() => {
                            onPageBgChange(c);
                            setColorOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  </RibbonMenu>
                ) : null}
                {match("Border") ? (
                  <RibbonMenu
                    open={borderOpen}
                    onOpenChange={setBorderOpen}
                    icon={Frame}
                    label="Page Borders"
                    active={pageBorder !== "none"}
                    disabled={!editable}
                  >
                    {(
                      [
                        ["none", "None"],
                        ["thin", "Thin"],
                        ["thick", "Thick"],
                      ] as const
                    ).map(([id, label]) => (
                      <MenuItem
                        key={id}
                        active={pageBorder === id}
                        onClick={() => {
                          onPageBorderChange(id);
                          setBorderOpen(false);
                        }}
                      >
                        {label}
                      </MenuItem>
                    ))}
                  </RibbonMenu>
                ) : null}
              </Group>
            </>
          ) : null}

          {tab === "review" ? (
            <Group label="Comments">
              <IconBtn
                icon={MessageSquare}
                label="Comments"
                onClick={onOpenComments}
              />
              <IconBtn
                icon={PanelLeft}
                label={rightOpen ? "Hide" : "Panel"}
                active={rightOpen}
                onClick={onToggleRight}
              />
            </Group>
          ) : null}

          {tab === "view" ? (
            <>
              <Group label="Document Views">
                <IconBtn
                  icon={FileText}
                  label="Separate Pages"
                  active
                  onClick={() => {}}
                  title="Separate Pages (active)"
                />
              </Group>
              <Group label="Show">
                <IconBtn
                  icon={PanelLeft}
                  label="Navigation"
                  active={outlineOpen}
                  onClick={onToggleOutline}
                />
                <IconBtn
                  icon={Ruler}
                  label="Ruler"
                  active={rulerVisible}
                  onClick={onToggleRuler}
                />
              </Group>
              <Group label="Zoom">
                {[75, 100, 125].map((z) => (
                  <button
                    key={z}
                    type="button"
                    className={cn(
                      "h-8 rounded-md px-2 text-[11px] font-medium text-text-dim hover:bg-bg-hover",
                      zoom === z &&
                        "bg-[var(--secondary-soft)] text-[var(--secondary)]",
                    )}
                    onClick={() => onZoomChange(z)}
                  >
                    {z}%
                  </button>
                ))}
              </Group>
              <Group label="Focus">
                <IconBtn
                  icon={Type}
                  label={focusMode ? "Exit" : "Focus"}
                  active={focusMode}
                  onClick={onToggleFocus}
                />
              </Group>
            </>
          ) : null}
        </div>
      ) : (
        <div className="flex h-9 items-center gap-2 border-t border-border bg-bg-panel px-3 text-[11px] text-text-mute">
          Focus mode
          <button
            type="button"
            className="rounded px-2 py-0.5 text-text-dim hover:bg-bg-hover"
            onClick={onToggleFocus}
          >
            Exit
          </button>
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col border-r border-border px-1.5 last:border-r-0">
      <div className="flex flex-wrap items-center gap-0.5">{children}</div>
      <span className="mt-auto pt-1 text-center text-[9px] uppercase tracking-wide text-text-mute">
        {label}
      </span>
    </div>
  );
}

function FileRow({
  icon: Icon,
  label,
  onClick,
  disabled,
  show = true,
  meta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  show?: boolean;
  meta?: boolean;
}) {
  if (!show) return null;
  if (meta) {
    return (
      <div className="mx-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-text-mute">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mx-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-text-dim hover:bg-white hover:text-text disabled:opacity-40"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-[64px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-md px-1.5 text-text-dim hover:bg-bg-hover hover:text-text disabled:opacity-30",
        active && "bg-[var(--secondary-soft)] text-[var(--secondary)] ring-1 ring-[var(--secondary)]/30",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="max-w-[64px] text-center text-[10px] font-medium leading-tight">
        {label}
      </span>
    </button>
  );
}

function RibbonMenu({
  open,
  onOpenChange,
  icon: Icon,
  label,
  children,
  active,
  disabled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        title={label}
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex h-[64px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-md px-1.5 text-text-dim hover:bg-bg-hover hover:text-text disabled:opacity-30",
          (active || open) &&
            "bg-[var(--secondary-soft)] text-[var(--secondary)] ring-1 ring-[var(--secondary)]/30",
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="max-w-[64px] text-center text-[10px] font-medium leading-tight">
          {label}
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[140px] rounded-[10px] border border-border bg-bg-panel py-1 shadow-[var(--shadow)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "block w-full px-3 py-1.5 text-left text-[12px] hover:bg-bg-hover",
        active && "bg-[var(--secondary-soft)] text-[var(--secondary)]",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LayoutNum({
  label,
  unit,
  value,
  step,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  step: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5 text-[9px] text-text-mute">
      {label}
      <span className="flex items-center gap-0.5">
        <input
          type="number"
          className="h-7 w-14 rounded-md border border-border bg-bg px-1.5 text-[11px] text-text disabled:opacity-40"
          value={Number.isInteger(step) ? value : value.toFixed(1)}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            onChange(Math.min(max, Math.max(min, n)));
          }}
        />
        <span className="text-[10px]">{unit}</span>
      </span>
    </label>
  );
}

function Mini({
  icon: Icon,
  title,
  onClick,
  active,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-text-dim hover:bg-bg-hover hover:text-text disabled:opacity-30",
        active && "bg-[var(--secondary-soft)] text-[var(--secondary)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
