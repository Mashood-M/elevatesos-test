import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { Report } from "@/types";

function stripTags(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function dataUrlToUint8Array(dataUrl: string): {
  data: Uint8Array;
  type: "png" | "jpg";
} | null {
  const match = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const raw = match[2];
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const type = match[1].toLowerCase() === "png" ? "png" : "jpg";
  return { data: bytes, type };
}

function htmlToParagraphs(html: string): Paragraph[] {
  const blocks = html
    .replace(/\n+/g, "")
    .split(/<(?:h1|h2|h3|p|li|figcaption)[^>]*>/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  // Simpler walk: regex over tags
  const parts: Paragraph[] = [];
  const re =
    /<(h1|h2|h3|p|li|figcaption)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    const text = stripTags(m[2]);
    if (!text) continue;
    if (tag === "h1") {
      parts.push(
        new Paragraph({
          text,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        }),
      );
    } else if (tag === "h2") {
      parts.push(
        new Paragraph({
          text,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 120 },
        }),
      );
    } else if (tag === "h3") {
      parts.push(
        new Paragraph({
          text,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 100 },
        }),
      );
    } else if (tag === "li") {
      parts.push(
        new Paragraph({
          text: `• ${text}`,
          spacing: { after: 80 },
        }),
      );
    } else {
      parts.push(
        new Paragraph({
          children: [new TextRun(text)],
          spacing: { after: 120 },
        }),
      );
    }
  }

  if (!parts.length) {
    const fallback = stripTags(html) || "Empty report";
    parts.push(new Paragraph({ children: [new TextRun(fallback)] }));
  }

  // Images from img tags
  const imgRe = /<img[^>]+src="(data:image\/[^"]+)"[^>]*>/gi;
  let im: RegExpExecArray | null;
  while ((im = imgRe.exec(html)) !== null) {
    const decoded = dataUrlToUint8Array(im[1]);
    if (!decoded) continue;
    parts.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: decoded.type,
            data: decoded.data,
            transformation: { width: 480, height: 320 },
          }),
        ],
        spacing: { before: 120, after: 120 },
      }),
    );
  }

  void blocks;
  return parts;
}

export async function downloadReportDocx(options: {
  report: Report;
  chapterName: string;
  forCollege?: boolean;
  approverName?: string;
}) {
  const { report, chapterName, forCollege, approverName } = options;
  const header: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: "Elevates OS",
          bold: true,
          size: 28,
          color: "F26430",
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: chapterName,
          size: 22,
          color: "414066",
        }),
      ],
      spacing: { after: 200 },
    }),
  ];

  if (forCollege) {
    header.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Official chapter report — for college head / management submission",
            italics: true,
            size: 20,
          }),
        ],
        spacing: { after: 200 },
      }),
    );
  }

  const body = htmlToParagraphs(report.bodyHtml || `<p>${report.summary || report.title}</p>`);

  const footer: Paragraph[] = [];
  if (report.status === "approved") {
    footer.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Approved by HQ${approverName ? ` (${approverName})` : ""}`,
            bold: true,
          }),
        ],
        spacing: { before: 300 },
      }),
    );
    if (report.hqComment) {
      footer.push(
        new Paragraph({
          children: [
            new TextRun({ text: "HQ comment: ", bold: true }),
            new TextRun(report.hqComment),
          ],
        }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [...header, ...body, ...footer],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = report.title.replace(/[^\w\-]+/g, "_").slice(0, 60);
  const filename = `Elevates-${chapterName.replace(/\s+/g, "_")}-${safeTitle}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Compress an image File to a small JPEG data URL for demo storage. */
export function compressImageFile(
  file: File,
  maxEdge = 1200,
  quality = 0.72,
): Promise<{ id: string; name: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          dataUrl,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
