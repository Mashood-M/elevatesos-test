import fs from "fs";
import path from "path";
import JSZip from "jszip";

// Test unescapeXml logic
function unescapeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x20;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function testImportEngine() {
  console.log("=== Testing PPTX Import Engine ===");
  const filePath = path.resolve("public/certificates/ELEVATES_Certificate.pptx");
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideEntries = Object.keys(zip.files).filter((path) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(path)
  );
  console.log("Detected Slide Entries:", slideEntries);

  const slideFile = zip.file(slideEntries[0]);
  const slideXml = await slideFile.async("text");
  const paragraphs = [...slideXml.matchAll(/<a:p[\s>]([\s\S]*?)<\/a:p>/g)];

  const textLines = [];
  paragraphs.forEach((p) => {
    const runs = [...p[1].matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((t) =>
      unescapeXml(t[1]).trim()
    );
    const fullText = runs.join(" ").trim();
    if (fullText) textLines.push(fullText);
  });

  console.log("Extracted Lines Count:", textLines.length);
  console.log("Line 0 (Main Title):", textLines[0]);
  console.log("Line 1 (Subtitle):", textLines[1]);
  console.log("Line 2 (Preamble):", textLines[2]);
  console.log("Line 3 (Recipient):", textLines[3]);
  console.log("Line 7 (Signatory 1):", textLines[7]);
  console.log("Line 10 (Signatory 2):", textLines[10]);

  // Check signatures extraction
  const sigFile = zip.file("ppt/media/image8.jpeg") || zip.file("ppt/media/image8.png");
  if (sigFile) {
    const b64 = await sigFile.async("base64");
    console.log("Signature extracted successfully, length:", b64.length);
  }

  console.log("Import Engine Test Passed Successfully!\n");
}

testImportEngine().catch((err) => {
  console.error("Test Failed:", err);
  process.exit(1);
});
