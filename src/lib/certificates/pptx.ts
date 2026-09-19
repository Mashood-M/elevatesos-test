import JSZip from "jszip";
import { CertificateTemplate } from "@/types";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case "\"": return "&quot;";
      default: return c;
    }
  });
}

/**
 * Splits description text across up to 3 balanced lines to fit PPTX paragraph shapes.
 */
function splitDescriptionIntoLines(text: string): [string, string, string] {
  if (!text) return ["", "", ""];

  // If text already has line breaks, respect them
  const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (rawLines.length >= 3) {
    return [rawLines[0], rawLines[1], rawLines.slice(2).join(" ")];
  }
  if (rawLines.length === 2) {
    return [rawLines[0], rawLines[1], ""];
  }

  // Otherwise, split on word boundaries
  const words = text.split(/\s+/);
  if (words.length <= 8) {
    return [text, "", ""];
  }

  const chunk1Count = Math.ceil(words.length / 3);
  const chunk2Count = Math.ceil((words.length - chunk1Count) / 2);

  const l1 = words.slice(0, chunk1Count).join(" ");
  const l2 = words.slice(chunk1Count, chunk1Count + chunk2Count).join(" ");
  const l3 = words.slice(chunk1Count + chunk2Count).join(" ");

  return [l1, l2, l3];
}

export interface PptxExportOptions {
  recipientName?: string;
  eventTitle?: string;
  chapterName?: string;
  institutionName?: string;
  certificateId?: string;
  filename?: string;
  autoDownload?: boolean;
}

/**
 * Exports a certificate template as an official editable PowerPoint (.pptx) file.
 */
export async function exportCertificateAsPptx(
  template: CertificateTemplate,
  options: PptxExportOptions = {}
): Promise<{ blob: Blob; filename: string }> {
  const basePptxUrl = "/certificates/ELEVATES_Certificate.pptx";
  const response = await fetch(basePptxUrl);
  if (!response.ok) {
    throw new Error(`Failed to load base certificate PPTX template: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideFile = zip.file("ppt/slides/slide1.xml");
  if (!slideFile) {
    throw new Error("Invalid PPTX template: ppt/slides/slide1.xml not found.");
  }

  let slideXml = await slideFile.async("text");

  // Determine description
  const descriptionText =
    template.description ||
    (options.eventTitle
      ? `has actively participated and successfully completed the "${options.eventTitle}" hosted by ${options.chapterName || "Elevates"}, demonstrating dedication, curiosity, and a commitment to learning, building, and creating a higher tomorrow.`
      : "has been an active member of Elevates and has demonstrated dedication, curiosity, and a commitment to learning, building, and creating a better tomorrow.");

  const [desc1, desc2, desc3] = splitDescriptionIntoLines(descriptionText);

  // Recipient
  const recipient = options.recipientName || "{recipient_name}";
  const instName =
    template.signatory1Org ||
    options.institutionName ||
    options.chapterName ||
    "Elevates Student Community";

  // The 15 paragraph replacements matching slide1.xml structure
  const replacements = [
    template.mainTitle || "CERTIFICATE",
    template.subTitle || "O F   R E C O G N I T I O N",
    template.preamble || "T H I S   I S   T O   C E R T I F Y   T H A T",
    recipient,
    desc1,
    desc2,
    desc3,
    template.signatory1Name || "Dr. K. S. Radhakrishnan",
    template.signatory1Role || "P R I N C I P A L",
    instName,
    template.signatory2Name || "Prof. Ananya Sen",
    template.signatory2Role || "F A C U L T Y   A D V I S O R",
    template.signatory2Org || instName,
    template.bottomLeftText || "I D E A S   I N T O   I M P A C T",
    template.bottomRightText || "A   H I G H E R   T O M O R R O W",
  ];

  let pIndex = 0;
  slideXml = slideXml.replace(/<a:p[\s>][\s\S]*?<\/a:p>/g, (pMatch) => {
    if (pIndex < replacements.length) {
      const replacement = replacements[pIndex];
      pIndex++;

      if (/<a:t[^>]*>[\s\S]*?<\/a:t>/.test(pMatch)) {
        let tCount = 0;
        return pMatch.replace(/<a:t([^>]*)>([\s\S]*?)<\/a:t>/g, (tMatch, attrs) => {
          if (tCount === 0) {
            tCount++;
            return `<a:t${attrs}>${escapeXml(replacement)}</a:t>`;
          } else {
            return `<a:t${attrs}></a:t>`;
          }
        });
      }
    }
    return pMatch;
  });

  zip.file("ppt/slides/slide1.xml", slideXml);

  // If custom signature data URL is provided for Signatory 1, replace ppt/media/image8.jpeg
  if (template.signatory1SignatureUrl && template.signatory1SignatureUrl.startsWith("data:image/")) {
    try {
      const base64Data = template.signatory1SignatureUrl.split(",")[1];
      if (base64Data) {
        zip.file("ppt/media/image8.jpeg", base64Data, { base64: true });
      }
    } catch (e) {
      console.warn("Could not embed signature into PPTX:", e);
    }
  }

  const generatedBlob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });

  const rawFilename =
    options.filename ||
    (options.recipientName && options.recipientName !== "{recipient_name}"
      ? `${options.recipientName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Certificate.pptx`
      : `${(template.name || "Elevates_Certificate").replace(/[^a-zA-Z0-9_-]/g, "_")}.pptx`);

  const filename = rawFilename.endsWith(".pptx") ? rawFilename : `${rawFilename}.pptx`;

  if (options.autoDownload !== false && typeof window !== "undefined") {
    downloadBlob(generatedBlob, filename);
  }

  return { blob: generatedBlob, filename };
}

/**
 * Decodes XML entities into standard text.
 */
function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x20;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Triggers a browser download of a given blob.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parses an uploaded .pptx file and reconstructs a CertificateTemplate.
 * Supports File, Blob, and ArrayBuffer inputs with XML entity decoding and signature extraction.
 */
export async function importCertificateFromPptx(
  file: File | Blob | ArrayBuffer,
  chapterId?: string
): Promise<CertificateTemplate> {
  let arrayBuffer: ArrayBuffer;
  if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
  } else if (file && typeof (file as any).arrayBuffer === "function") {
    arrayBuffer = await (file as any).arrayBuffer();
  } else {
    throw new Error("Invalid file format: Unable to read presentation data buffer.");
  }

  const zip = await JSZip.loadAsync(arrayBuffer);

  // Robust case-insensitive slide search
  const slideEntries = Object.keys(zip.files).filter((path) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(path)
  );
  const slidePath = slideEntries[0] || "ppt/slides/slide1.xml";
  const slideFile = zip.file(slidePath);
  if (!slideFile) {
    throw new Error("Invalid PowerPoint file: Missing slide content (ppt/slides/slide1.xml).");
  }

  const slideXml = await slideFile.async("text");
  const paragraphs = [...slideXml.matchAll(/<a:p[\s>]([\s\S]*?)<\/a:p>/g)];

  const textLines: string[] = [];
  paragraphs.forEach((p) => {
    const runs = [...p[1].matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((t) =>
      unescapeXml(t[1]).trim()
    );
    const fullText = runs.join(" ").trim();
    if (fullText) {
      textLines.push(fullText);
    }
  });

  // Fallback: extract any text runs if paragraphs were empty
  if (textLines.length === 0) {
    const allRuns = [...slideXml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
      .map((t) => unescapeXml(t[1]).trim())
      .filter(Boolean);
    if (allRuns.length > 0) {
      textLines.push(...allRuns);
    }
  }

  if (textLines.length === 0) {
    throw new Error("No readable text found in the uploaded PowerPoint presentation.");
  }

  // Base template name from filename
  const filename = (file as any).name || "Imported_Certificate.pptx";
  const baseName = filename.replace(/\.pptx$/i, "").replace(/[-_]/g, " ").trim();
  const templateName = baseName.length > 0 ? `${baseName} (Imported)` : "Imported PPTX Template";

  // Check for custom signature media in the presentation
  let customSig1Url: string | undefined = undefined;
  const sigFile =
    zip.file("ppt/media/image8.jpeg") ||
    zip.file("ppt/media/image8.png") ||
    zip.file("ppt/media/image8.jpg");
  if (sigFile) {
    const base64 = await sigFile.async("base64");
    if (base64) {
      customSig1Url = `data:image/png;base64,${base64}`;
    }
  }

  // Default values matching official template
  let mainTitle = "CERTIFICATE";
  let subTitle = "O F   R E C O G N I T I O N";
  let preamble = "T H I S   I S   T O   C E R T I F Y   T H A T";
  let achievement = "Participation";
  let descLines: string[] = [];
  let signatory1Name = "Dr. K. S. Radhakrishnan";
  let signatory1Role = "P R I N C I P A L";
  let signatory1Org = "";
  let signatory2Name = "Prof. Ananya Sen";
  let signatory2Role = "F A C U L T Y   A D V I S O R";
  let signatory2Org = "";
  let bottomLeftText = "I D E A S   I N T O   I M P A C T";
  let bottomRightText = "A   H I G H E R   T O M O R R O W";

  if (textLines.length >= 15) {
    mainTitle = textLines[0];
    subTitle = textLines[1];
    preamble = textLines[2];
    descLines = [textLines[4], textLines[5], textLines[6]].filter(Boolean);
    signatory1Name = textLines[7];
    signatory1Role = textLines[8];
    signatory1Org = textLines[9];
    signatory2Name = textLines[10];
    signatory2Role = textLines[11];
    signatory2Org = textLines[12];
    bottomLeftText = textLines[13];
    bottomRightText = textLines[14];
  } else {
    // Intelligent semantic mapping if fewer or differently structured paragraphs exist
    textLines.forEach((line) => {
      const upper = line.toUpperCase();
      if (upper.includes("CERTIFICATE") || upper.includes("DIPLOMA")) {
        mainTitle = line;
      } else if (upper.includes("OF RECOGNITION") || upper.includes("OF MERIT") || upper.includes("OF APPRECIATION") || upper.includes("O F")) {
        subTitle = line;
      } else if (upper.includes("CERTIFY THAT") || upper.includes("PRESENTED TO")) {
        preamble = line;
      } else if (upper.includes("PRINCIPAL") || upper.includes("DIRECTOR")) {
        signatory1Role = line;
      } else if (upper.includes("ADVISOR") || upper.includes("FACULTY")) {
        signatory2Role = line;
      } else if (upper.includes("IDEAS INTO IMPACT")) {
        bottomLeftText = line;
      } else if (upper.includes("HIGHER TOMORROW")) {
        bottomRightText = line;
      } else if (line.length > 50) {
        descLines.push(line);
      }
    });

    if (textLines[0] && mainTitle === "CERTIFICATE") mainTitle = textLines[0];
    if (textLines[1] && subTitle.startsWith("O F")) subTitle = textLines[1];
  }

  // Infer achievement from subtitle
  if (subTitle.toLowerCase().includes("merit") || subTitle.toLowerCase().includes("excellence")) {
    achievement = "Merit & Excellence";
  } else if (subTitle.toLowerCase().includes("appreciation") || subTitle.toLowerCase().includes("lead")) {
    achievement = "Lead & Appreciation";
  } else if (subTitle.toLowerCase().includes("achievement") || subTitle.toLowerCase().includes("winner")) {
    achievement = "Hackathon Winner";
  }

  const description =
    descLines.join(" ").trim() ||
    "has been an active member of Elevates and has demonstrated dedication, curiosity, and a commitment to learning, building, and creating a better tomorrow.";

  const importedTemplate: CertificateTemplate = {
    id: `tpl-pptx-${Date.now()}`,
    name: templateName,
    chapterId,
    isDefault: false,
    mainTitle,
    subTitle,
    preamble,
    achievement,
    description,
    signatory1Name,
    signatory1Role,
    signatory1Org: signatory1Org || undefined,
    signatory1SignatureUrl: customSig1Url,
    signatory2Name,
    signatory2Role,
    signatory2Org: signatory2Org || undefined,
    bottomLeftText,
    bottomRightText,
    showGridPattern: true,
    createdAt: new Date().toISOString(),
  };

  return importedTemplate;
}

