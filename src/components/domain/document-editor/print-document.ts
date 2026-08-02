import type { Editor } from "@tiptap/react";
import {
  printPageSize,
  type PageOrientation,
  type PageSizeId,
} from "./page-geometry";

/** Print only TipTap document HTML (iframe), not the immersive Word chrome. */
export function printDocument(
  editor: Editor,
  options?: {
    title?: string;
    marginPx?: number;
    pageSize?: PageSizeId;
    orientation?: PageOrientation;
    pageBg?: string;
  },
) {
  const html = editor.getHTML();
  const title = options?.title?.trim() || "Document";
  const marginIn = ((options?.marginPx ?? 96) / 96).toFixed(2);
  const pageSizeCss = printPageSize(
    options?.pageSize ?? "letter",
    options?.orientation ?? "portrait",
  );
  const pageBg = options?.pageBg ?? "#ffffff";

  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden",
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Syne:wght@700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    @page { size: ${pageSizeCss}; margin: ${marginIn}in; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: ${pageBg};
      color: #1f1f1f;
      font-family: "Plus Jakarta Sans", system-ui, sans-serif;
      font-size: 15px;
      line-height: 1.7;
    }
    h1 {
      font-family: Syne, system-ui, sans-serif;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin: 0 0 1rem;
    }
    h2 { font-size: 20px; font-weight: 700; margin: 1.5rem 0 0.75rem; }
    h3 { font-size: 16px; font-weight: 600; margin: 1.25rem 0 0.5rem; }
    h4, h5, h6 { font-size: 14px; font-weight: 600; margin: 1rem 0 0.4rem; }
    p { margin: 0 0 0.75rem; }
    ul { list-style: disc; padding-left: 1.5rem; margin: 0 0 0.75rem; }
    ol { list-style: decimal; padding-left: 1.5rem; margin: 0 0 0.75rem; }
    li { margin: 0.15rem 0; }
    ul[data-type="taskList"] { list-style: none; padding-left: 0.25rem; }
    ul[data-type="taskList"] li { display: flex; gap: 0.5rem; align-items: flex-start; }
    blockquote {
      margin: 0.75rem 0;
      padding: 0.5rem 0 0.5rem 1rem;
      border-left: 3px solid #f26430;
      color: #4b5563;
    }
    pre {
      background: #2d2d34;
      color: #f3f4f6;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 13px;
      overflow-x: auto;
    }
    code {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.9em;
      background: #f3f0ea;
      padding: 0.1em 0.35em;
      border-radius: 4px;
    }
    pre code { background: transparent; color: inherit; padding: 0; }
    img { max-width: 100%; height: auto; }
    a { color: #f26430; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    td, th { border: 1px solid #d4d0c8; padding: 0.35rem 0.5rem; vertical-align: top; }
    th { background: #f3f0ea; text-align: left; }
    mark { background: #fde68a; }
    hr { border: none; border-top: 1px solid #d4d0c8; margin: 1.5rem 0; }
    .doc-page-break,
    div[data-type="page-break"] {
      break-before: page;
      page-break-before: always;
      border: none !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden;
    }
    .doc-page-break-label { display: none !important; }
  </style>
</head>
<body>${html}</body>
</html>`);
  doc.close();

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  const runPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(cleanup, 500);
    }
  };

  if (iframe.contentDocument?.readyState === "complete") {
    window.setTimeout(runPrint, 50);
  } else {
    iframe.addEventListener("load", () => window.setTimeout(runPrint, 50), {
      once: true,
    });
    window.setTimeout(runPrint, 300);
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
