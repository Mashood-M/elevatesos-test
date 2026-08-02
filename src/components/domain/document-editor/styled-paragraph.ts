import Paragraph from "@tiptap/extension-paragraph";
import { mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

function numAttr(el: HTMLElement, name: string, fallback: number) {
  const raw = el.getAttribute(name);
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Paragraph with Layout indent / spacing (stored as data-* + combined style). */
export const StyledParagraph = Paragraph.extend({
  addAttributes() {
    return {
      indentLeft: {
        default: 0,
        parseHTML: (el) => numAttr(el, "data-indent-left", 0),
        renderHTML: (attrs) => {
          const v = Number(attrs.indentLeft) || 0;
          return v ? { "data-indent-left": String(v) } : {};
        },
      },
      indentRight: {
        default: 0,
        parseHTML: (el) => numAttr(el, "data-indent-right", 0),
        renderHTML: (attrs) => {
          const v = Number(attrs.indentRight) || 0;
          return v ? { "data-indent-right": String(v) } : {};
        },
      },
      spaceBefore: {
        default: 0,
        parseHTML: (el) => numAttr(el, "data-space-before", 0),
        renderHTML: (attrs) => {
          const v = Number(attrs.spaceBefore) || 0;
          return v ? { "data-space-before": String(v) } : {};
        },
      },
      spaceAfter: {
        default: 8,
        parseHTML: (el) => numAttr(el, "data-space-after", 8),
        renderHTML: (attrs) => {
          const v = attrs.spaceAfter == null ? 8 : Number(attrs.spaceAfter);
          return { "data-space-after": String(v) };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const styles: string[] = [];
    const il = Number(node.attrs.indentLeft) || 0;
    const ir = Number(node.attrs.indentRight) || 0;
    const sb = Number(node.attrs.spaceBefore) || 0;
    const sa =
      node.attrs.spaceAfter == null ? 8 : Number(node.attrs.spaceAfter);

    if (il) styles.push(`padding-left: ${il}in`);
    if (ir) styles.push(`padding-right: ${ir}in`);
    if (sb) styles.push(`margin-top: ${sb}pt`);
    styles.push(`margin-bottom: ${sa}pt`);

    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        style: styles.join("; "),
      }),
      0,
    ];
  },
});

export type ParagraphLayoutAttrs = {
  indentLeft: number;
  indentRight: number;
  spaceBefore: number;
  spaceAfter: number;
};

export function getParagraphLayout(editor: Editor): ParagraphLayoutAttrs {
  const attrs = editor.getAttributes("paragraph");
  return {
    indentLeft: Number(attrs.indentLeft) || 0,
    indentRight: Number(attrs.indentRight) || 0,
    spaceBefore: Number(attrs.spaceBefore) || 0,
    spaceAfter: attrs.spaceAfter == null ? 8 : Number(attrs.spaceAfter),
  };
}

export function setParagraphLayout(
  editor: Editor,
  patch: Partial<ParagraphLayoutAttrs>,
) {
  editor.chain().focus().updateAttributes("paragraph", patch).run();
}
