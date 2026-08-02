"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { cn } from "@/lib/utils";

/** Word-like gap between two paper sheets on the desk. */
export function PageBreakView({ getPos, editor, selected }: NodeViewProps) {
  let pageAfter = 2;
  try {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (typeof pos === "number" && editor) {
      let breaksBefore = 0;
      editor.state.doc.nodesBetween(0, pos, (node) => {
        if (node.type.name === "pageBreak") breaksBefore += 1;
      });
      pageAfter = breaksBefore + 2;
    }
  } catch {
    /* ignore */
  }

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        "doc-page-break-view",
        selected && "doc-page-break-view-selected",
      )}
      data-type="page-break"
      contentEditable={false}
      draggable={false}
    >
      <div className="doc-page-pad" data-page-pad aria-hidden />
      <div className="doc-page-sheet-end" aria-hidden>
        <span className="doc-page-num">{pageAfter - 1}</span>
      </div>
      <div className="doc-page-gap">
        <span className="doc-page-break-label">Page break</span>
      </div>
      <div className="doc-page-sheet-start" aria-hidden>
        <span className="doc-page-num doc-page-num-start">{pageAfter}</span>
      </div>
    </NodeViewWrapper>
  );
}
