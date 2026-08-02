"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyleKit } from "@tiptap/extension-text-style";
import CharacterCount from "@tiptap/extension-character-count";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { cn } from "@/lib/utils";
import { AiAssistantPanel } from "./ai-assistant-panel";
import { BubbleToolbar } from "./bubble-toolbar";
import { CommentsPanel } from "./comments-panel";
import { DocumentFonts } from "./document-fonts";
import { DocumentHeader } from "./document-header";
import { DocumentOutline } from "./document-outline";
import { CalloutBlockquote } from "./callout-blockquote";
import { DocumentListKeymap } from "./list-keymap";
import { PageBreak } from "./page-break";
import {
  pageBox,
  type PageBorder,
  type PageColumns,
  type PageOrientation,
  type PageSizeId,
} from "./page-geometry";
import { applyPageMinHeights } from "./page-layout";
import { MARGIN_PRESETS, PageRulers, type MarginPreset } from "./page-ruler";
import { PropertiesPanel } from "./properties-panel";
import { Ribbon, type RibbonTab } from "./ribbon";
import { SlashCommandMenu } from "./slash-command";
import { StatusBar } from "./status-bar";
import { StyledParagraph } from "./styled-paragraph";
import { TableControls } from "./table-controls";
import type { DocumentEditorProps, SaveState } from "./types";
import "./document-editor.css";

export function DocumentEditor({
  initialHtml,
  initialJson,
  editable = true,
  title,
  onTitleChange,
  meta,
  libraryHref,
  libraryLabel,
  saveState: saveStateProp,
  onChange,
  onSave,
  onExportDocx,
  onSubmit,
  showSubmit,
  onApprove,
  showApprove,
  exportLabel,
  className,
  immersive = true,
}: DocumentEditorProps) {
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"properties" | "comments" | "ai">(
    showApprove ? "comments" : "properties",
  );
  const [zoom, setZoom] = useState(100);
  const [localSave, setLocalSave] = useState<SaveState>("saved");
  const [approveComment, setApproveComment] = useState("");
  const [ribbonTab, setRibbonTab] = useState<RibbonTab>("home");
  const [toolQuery, setToolQuery] = useState("");
  const [rulerVisible, setRulerVisible] = useState(true);
  const [marginPreset, setMarginPreset] = useState<MarginPreset>("normal");
  const [orientation, setOrientation] = useState<PageOrientation>("portrait");
  const [pageSize, setPageSize] = useState<PageSizeId>("letter");
  const [columns, setColumns] = useState<PageColumns>(1);
  const [lineNumbers, setLineNumbers] = useState(false);
  const [pageBg, setPageBg] = useState("#ffffff");
  const [pageBorder, setPageBorder] = useState<PageBorder>("none");
  const [focusMode, setFocusMode] = useState(false);
  const [, setTick] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const prevOverflowRef = useRef<string | null>(null);

  const saveState = saveStateProp ?? localSave;
  const marginPx = MARGIN_PRESETS[marginPreset];
  const { width: pageWidth, height: pageHeight } = pageBox(
    pageSize,
    orientation,
  );

  useEffect(() => {
    if (!immersive) return;
    prevOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    shellRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflowRef.current ?? "";
    };
  }, [immersive]);

  useEffect(() => {
    if (!toolQuery.trim()) return;
    const q = toolQuery.toLowerCase();
    if (["table", "picture", "image", "link", "quote", "code", "callout", "divider", "page"].some((k) => q.includes(k))) {
      setRibbonTab("insert");
    } else if (["margin", "layout", "orientation", "size"].some((k) => q.includes(k))) {
      setRibbonTab("layout");
    } else if (["comment", "review"].some((k) => q.includes(k))) {
      setRibbonTab("review");
    } else if (["ruler", "navigation", "zoom", "focus", "view"].some((k) => q.includes(k))) {
      setRibbonTab("view");
    } else if (["save", "export", "print", "file"].some((k) => q.includes(k))) {
      setRibbonTab("file");
    } else {
      setRibbonTab("home");
    }
  }, [toolQuery]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: { openOnClick: false },
        blockquote: false,
        paragraph: false,
      }),
      StyledParagraph,
      CalloutBlockquote,
      PageBreak,
      Highlight.configure({ multicolor: true }),
      TextStyleKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      DocumentListKeymap,
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({
        placeholder: "Start typing, or press / for blocks…",
      }),
      CharacterCount,
    ],
    content: initialJson
      ? (() => {
          try {
            return JSON.parse(initialJson);
          } catch {
            return initialHtml || "<p></p>";
          }
        })()
      : initialHtml || "<p></p>",
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      setLocalSave("dirty");
      setTick((t) => t + 1);
      onChange?.({
        html: ed.getHTML(),
        json: JSON.stringify(ed.getJSON()),
      });
    },
    onSelectionUpdate: () => setTick((t) => t + 1),
    editorProps: {
      attributes: {
        class: "doc-page",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const run = () => {
      window.requestAnimationFrame(() =>
        applyPageMinHeights(editor, pageHeight),
      );
    };
    run();
    editor.on("update", run);
    editor.on("selectionUpdate", run);
    window.addEventListener("resize", run);
    return () => {
      editor.off("update", run);
      editor.off("selectionUpdate", run);
      window.removeEventListener("resize", run);
    };
  }, [editor, marginPx, zoom, pageHeight]);

  useEffect(() => {
    if (!editor?.view?.dom) return;
    const el = editor.view.dom as HTMLElement;
    el.classList.toggle("doc-columns-2", columns === 2);
    el.classList.toggle("doc-line-numbers", lineNumbers);
    el.classList.toggle("doc-border-thin", pageBorder === "thin");
    el.classList.toggle("doc-border-thick", pageBorder === "thick");
  }, [editor, columns, lineNumbers, pageBorder]);

  const handleSave = useCallback(() => {
    setLocalSave("saving");
    onSave?.();
    window.setTimeout(() => setLocalSave("saved"), 400);
  }, [onSave]);

  const openComments = useCallback(() => {
    setRightOpen(true);
    setRightTab("comments");
    setRibbonTab("review");
  }, []);

  const words = editor?.storage.characterCount?.words?.() ?? 0;

  let pageCount = 1;
  let currentPage = 1;
  if (editor) {
    const breaks: number[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "pageBreak") breaks.push(pos);
    });
    pageCount = breaks.length + 1;
    const sel = editor.state.selection.from;
    currentPage = 1;
    for (const b of breaks) {
      if (sel > b) currentPage += 1;
      else break;
    }
  }

  if (!editor) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-bg-panel text-sm text-text-dim",
          immersive
            ? "fixed inset-0 z-[var(--z-modal)]"
            : "h-[70vh] rounded-[var(--radius)] shadow-[var(--shadow)]",
        )}
      >
        Loading document editor…
      </div>
    );
  }

  return (
    <>
      <DocumentFonts />
      <div
        ref={shellRef}
        tabIndex={-1}
        className={cn(
          "document-editor flex flex-col overflow-hidden bg-bg-panel outline-none",
          immersive
            ? "fixed inset-0 z-[var(--z-modal)] h-dvh min-h-0"
            : "h-[calc(100dvh-7.5rem)] min-h-[640px] rounded-[var(--radius)] border border-border shadow-[var(--shadow)]",
          className,
        )}
        style={
          {
            "--doc-margin": `${marginPx}px`,
            "--doc-page-w": `${pageWidth}px`,
            "--doc-page-h": `${pageHeight}px`,
            "--doc-page-bg": pageBg,
          } as CSSProperties
        }
      >
        <DocumentHeader
          title={title}
          onTitleChange={onTitleChange}
          meta={meta}
          editable={editable}
          libraryHref={libraryHref}
          libraryLabel={libraryLabel}
          onExportDocx={onExportDocx}
          exportLabel={exportLabel}
          onSave={editable ? handleSave : undefined}
          onSubmit={onSubmit}
          showSubmit={showSubmit}
          saveState={saveState}
          toolQuery={toolQuery}
          onToolQueryChange={setToolQuery}
          onOpenComments={openComments}
        />
        <Ribbon
          editor={editor}
          editable={editable}
          tab={ribbonTab}
          onTabChange={setRibbonTab}
          toolQuery={toolQuery}
          libraryHref={libraryHref}
          libraryLabel={libraryLabel}
          onSave={editable ? handleSave : undefined}
          onExportDocx={onExportDocx}
          marginPreset={marginPreset}
          onMarginChange={setMarginPreset}
          orientation={orientation}
          onOrientationChange={setOrientation}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          columns={columns}
          onColumnsChange={setColumns}
          lineNumbers={lineNumbers}
          onLineNumbersChange={setLineNumbers}
          pageBg={pageBg}
          onPageBgChange={setPageBg}
          pageBorder={pageBorder}
          onPageBorderChange={setPageBorder}
          outlineOpen={outlineOpen}
          onToggleOutline={() => setOutlineOpen((v) => !v)}
          rulerVisible={rulerVisible}
          onToggleRuler={() => setRulerVisible((v) => !v)}
          rightOpen={rightOpen}
          onToggleRight={() => setRightOpen((v) => !v)}
          onOpenComments={openComments}
          onOpenAi={() => {
            setRightOpen(true);
            setRightTab("ai");
          }}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode((v) => !v)}
          zoom={zoom}
          onZoomChange={setZoom}
          meta={meta}
          documentTitle={title}
          marginPx={marginPx}
          saveState={saveState}
        />
        <TableControls editor={editor} editable={editable} />

        <div className="flex min-h-0 flex-1">
          {!focusMode ? (
            <DocumentOutline
              editor={editor}
              open={outlineOpen}
              onToggle={() => setOutlineOpen((v) => !v)}
            />
          ) : null}

          <div className="relative min-w-0 flex-1 overflow-auto bg-[#d8d4cc]">
            <BubbleToolbar editor={editor} editable={editable} />

            <div className="relative flex justify-center px-6 py-8">
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                }}
              >
                <div className="relative pl-6 pt-6">
                  <PageRulers
                    marginPx={marginPx}
                    show={rulerVisible && !focusMode}
                    pageWidth={pageWidth}
                    pageHeight={pageHeight}
                  />
                  <div className="doc-canvas-column relative">
                    <EditorContent editor={editor} />
                    <SlashCommandMenu editor={editor} editable={editable} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <PropertiesPanel
            meta={meta}
            open={rightOpen && !focusMode}
            tab={rightTab}
            onTabChange={setRightTab}
          >
            {rightTab === "comments" ? (
              <CommentsPanel
                hqComment={meta.hqComment}
                showApprove={showApprove}
                approveComment={approveComment}
                onApproveCommentChange={setApproveComment}
                onApprove={() => onApprove?.(approveComment)}
              />
            ) : null}
            {rightTab === "ai" ? (
              <AiAssistantPanel editor={editor} editable={editable} />
            ) : null}
          </PropertiesPanel>
        </div>

        <StatusBar
          words={words}
          zoom={zoom}
          onZoomChange={setZoom}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode((v) => !v)}
          page={currentPage}
          pageCount={pageCount}
        />
      </div>
    </>
  );
}

