"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ListTree } from "lucide-react";
import { cn } from "@/lib/utils";

type HeadingItem = {
  id: string;
  level: number;
  text: string;
  pos: number;
};

export function DocumentOutline({
  editor,
  open,
  onToggle,
}: {
  editor: Editor | null;
  open: boolean;
  onToggle?: () => void;
}) {
  const [items, setItems] = useState<HeadingItem[]>([]);

  useEffect(() => {
    if (!editor) return;
    function collect() {
      if (!editor) return;
      const next: HeadingItem[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          next.push({
            id: `h-${pos}`,
            level: node.attrs.level as number,
            text: node.textContent || "Untitled",
            pos,
          });
        }
      });
      setItems(next);
    }
    collect();
    editor.on("update", collect);
    editor.on("selectionUpdate", collect);
    return () => {
      editor.off("update", collect);
      editor.off("selectionUpdate", collect);
    };
  }, [editor]);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-[#faf8f5] lg:flex",
        open ? "w-[200px]" : "w-10",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-1.5 py-1.5">
        {open ? (
          <p className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-mute">
            Navigation
          </p>
        ) : null}
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-dim hover:bg-white"
          onClick={onToggle}
          title={open ? "Collapse navigation" : "Expand navigation"}
        >
          <ListTree className="h-4 w-4" />
        </button>
      </div>
      {open ? (
        <div className="scrollbar-thin flex-1 overflow-y-auto py-2">
          {!items.length ? (
            <p className="px-3 text-[11px] text-text-mute">
              Headings appear here as you write.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "block w-full truncate px-3 py-1.5 text-left text-[12px] text-text-dim hover:bg-white hover:text-text",
                      item.level === 1 && "font-semibold",
                      item.level === 2 && "pl-5",
                      item.level >= 3 && "pl-7 text-[11px]",
                    )}
                    onClick={() => {
                      editor
                        ?.chain()
                        .focus()
                        .setTextSelection(item.pos + 1)
                        .scrollIntoView()
                        .run();
                    }}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </aside>
  );
}
