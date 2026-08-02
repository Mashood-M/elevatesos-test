"use client";

import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

type SlashItem = {
  title: string;
  keywords: string;
  run: (editor: Editor, range: { from: number; to: number }) => void;
};

function deleteSlashRange(
  editor: Editor,
  range: { from: number; to: number },
) {
  editor.chain().focus().deleteRange(range).run();
}

const ITEMS: SlashItem[] = [
  {
    title: "Title",
    keywords: "title h1",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 1",
    keywords: "h1",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    keywords: "h2",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    keywords: "h3",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "Heading 4",
    keywords: "h4",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleHeading({ level: 4 }).run();
    },
  },
  {
    title: "Heading 5",
    keywords: "h5",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleHeading({ level: 5 }).run();
    },
  },
  {
    title: "Heading 6",
    keywords: "h6",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleHeading({ level: 6 }).run();
    },
  },
  {
    title: "Bullet list",
    keywords: "ul bullets",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleBulletList().run();
    },
  },
  {
    title: "Numbered list",
    keywords: "ol numbered ordered",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleOrderedList().run();
    },
  },
  {
    title: "Checklist",
    keywords: "todo task checkbox",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleTaskList().run();
    },
  },
  {
    title: "Quote",
    keywords: "blockquote",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleBlockquote().run();
    },
  },
  {
    title: "Callout",
    keywords: "info callout note",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain()
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
        .run();
    },
  },
  {
    title: "Code block",
    keywords: "code pre",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    title: "Divider",
    keywords: "hr horizontal rule line",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().setHorizontalRule().run();
    },
  },
  {
    title: "Page break",
    keywords: "page break",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain().focus().setPageBreak().run();
    },
  },
  {
    title: "Table",
    keywords: "grid",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      ed.chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: "Image",
    keywords: "picture photo",
    run: (ed, range) => {
      deleteSlashRange(ed, range);
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            ed.chain().focus().setImage({ src: reader.result }).run();
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    },
  },
];

type SlashState = {
  query: string;
  range: { from: number; to: number };
  left: number;
  top: number;
};

export function SlashCommandMenu({
  editor,
  editable,
}: {
  editor: Editor | null;
  editable: boolean;
}) {
  const [state, setState] = useState<SlashState | null>(null);
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    if (!state) return [];
    const q = state.query.toLowerCase();
    return ITEMS.filter(
      (item) =>
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.keywords.includes(q),
    ).slice(0, 10);
  }, [state]);

  useEffect(() => {
    if (!editor || !editable) {
      setState(null);
      return;
    }

    const sync = () => {
      const { selection, doc } = editor.state;
      if (!selection.empty) {
        setState(null);
        return;
      }
      const { $from } = selection;
      const textBefore = $from.parent.textBetween(
        0,
        $from.parentOffset,
        undefined,
        "\ufffc",
      );
      const match = /(?:^|\s)\/([^\s/]*)$/.exec(textBefore);
      if (!match) {
        setState(null);
        return;
      }
      const query = match[1] ?? "";
      const from = $from.pos - query.length - 1;
      const to = $from.pos;
      if (from < $from.start() || from < 0) {
        setState(null);
        return;
      }
      const coords = editor.view.coordsAtPos($from.pos);
      setState({
        query,
        range: { from, to },
        left: coords.left,
        top: coords.bottom + 6,
      });
      setActive(0);
      void doc;
    };

    editor.on("update", sync);
    editor.on("selectionUpdate", sync);
    return () => {
      editor.off("update", sync);
      editor.off("selectionUpdate", sync);
    };
  }, [editor, editable]);

  useEffect(() => {
    if (!state || !editor) return;

    const onKey = (event: KeyboardEvent) => {
      if (!filtered.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => (i + 1) % filtered.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        filtered[active]?.run(editor, state.range);
        setState(null);
      } else if (event.key === "Escape") {
        setState(null);
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [state, filtered, active, editor]);

  if (!state || !filtered.length || !editor) return null;

  return (
    <div
      className="pointer-events-auto fixed z-[90] min-w-[220px] overflow-hidden rounded-[12px] border border-border bg-bg-panel py-1 shadow-[var(--shadow)]"
      style={{ left: state.left, top: state.top }}
    >
      {filtered.map((item, i) => (
        <button
          key={item.title}
          type="button"
          className={cn(
            "block w-full px-3 py-1.5 text-left text-[12px] text-text",
            i === active ? "bg-[var(--secondary-soft)] text-[var(--secondary)]" : "hover:bg-bg-hover",
          )}
          onMouseEnter={() => setActive(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            item.run(editor, state.range);
            setState(null);
          }}
        >
          {item.title}
        </button>
      ))}
    </div>
  );
}
