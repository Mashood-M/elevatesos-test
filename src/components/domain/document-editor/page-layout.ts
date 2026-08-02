import type { Editor } from "@tiptap/react";
import { PAGE_SIZES } from "./page-geometry";

export const LETTER_HEIGHT = PAGE_SIZES.letter.h;

/**
 * Pad each page segment to the current page height using offset geometry inside
 * ProseMirror (zoom-safe; avoids getBoundingClientRect + CSS transform skew).
 */
export function applyPageMinHeights(
  editor: Editor | null,
  pageHeight: number = LETTER_HEIGHT,
) {
  if (!editor?.view?.dom) return;
  const pm = editor.view.dom as HTMLElement;
  if (!pm.classList.contains("doc-page")) return;

  const breaks = Array.from(
    pm.querySelectorAll<HTMLElement>(".doc-page-break-view"),
  );

  pm.style.removeProperty("padding-bottom");
  pm.removeAttribute("data-last-page");

  if (!breaks.length) {
    pm.style.minHeight = `${pageHeight}px`;
    return;
  }

  pm.style.minHeight = "0px";

  for (const br of breaks) {
    const pad = br.querySelector<HTMLElement>("[data-page-pad]");
    if (pad) pad.style.minHeight = "0px";
  }

  void pm.offsetHeight;

  let cursor = 0;
  for (const br of breaks) {
    const pad = br.querySelector<HTMLElement>("[data-page-pad]");
    const host =
      (br.closest(".react-renderer.node-pageBreak") as HTMLElement | null) ??
      br;
    const brTop = host.offsetTop;
    const segmentH = Math.max(0, brTop - cursor);
    const needed = Math.max(0, pageHeight - segmentH);
    if (pad) pad.style.minHeight = `${needed}px`;
    void host.offsetHeight;
    cursor = host.offsetTop + host.offsetHeight;
  }

  const marginRaw = getComputedStyle(pm)
    .getPropertyValue("--doc-margin")
    .trim();
  const marginPx = Number.parseFloat(marginRaw) || 96;
  const lastH = Math.max(0, pm.scrollHeight - cursor);
  const lastPad = Math.max(0, pageHeight - lastH);
  pm.style.paddingBottom = `${marginPx + lastPad}px`;
  pm.setAttribute("data-last-page", String(breaks.length + 1));
}
