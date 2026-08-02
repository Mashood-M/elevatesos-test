import { formatDate } from "@/lib/datetime";
import type { ElevatesStore, EventItem, ReportImage } from "@/types";

export type StudentReportDetails = {
  outcomes: string;
  attendanceNote?: string;
  authorName: string;
  chapterName: string;
  images: ReportImage[];
};

/** Build TipTap-friendly HTML for a student auto-generated event report. */
export function buildStudentEventReportHtml(
  store: ElevatesStore,
  event: EventItem,
  details: StudentReportDetails,
): { title: string; summary: string; bodyHtml: string } {
  const title = `${event.title} — Activity Report`;
  const regs = store.registrations.filter((r) => r.eventId === event.id);
  const approved = regs.filter((r) => r.status === "approved").length;
  const attendance = store.attendance.filter((a) => a.eventId === event.id);
  const present = attendance.filter(
    (a) =>
      a.status === "present" ||
      a.status === "late" ||
      a.status === "volunteer" ||
      a.status === "speaker",
  ).length;

  const summary =
    details.outcomes.trim() ||
    `Activity report for ${event.title} at ${details.chapterName}.`;

  const imageBlocks = details.images
    .map(
      (img) =>
        `<figure><img src="${img.dataUrl}" alt="${escapeHtml(img.name)}" /><figcaption>${escapeHtml(img.name)}</figcaption></figure>`,
    )
    .join("");

  const bodyHtml = `
<h1>${escapeHtml(title)}</h1>
<p><strong>Chapter:</strong> ${escapeHtml(details.chapterName)} · <strong>Date:</strong> ${formatDate(event.startsAt)} · <strong>Venue:</strong> ${escapeHtml(event.venue || "TBD")}</p>
<p><strong>Category:</strong> ${escapeHtml(event.category)} · <strong>Status:</strong> ${escapeHtml(event.status.replaceAll("_", " "))}</p>
<h2>Summary</h2>
<p>${escapeHtml(summary)}</p>
<h2>Participation</h2>
<p>Registrations: ${regs.length} (approved ${approved}). Attendance marked: ${present}${details.attendanceNote ? ` — ${escapeHtml(details.attendanceNote)}` : ""}.</p>
${
  imageBlocks
    ? `<h2>Photos</h2>${imageBlocks}`
    : "<h2>Photos</h2><p><em>No photos attached.</em></p>"
}
<h2>Outcomes</h2>
<p>${escapeHtml(details.outcomes.trim() || "Add key outcomes, learnings, and next steps.")}</p>
<p><em>Prepared by ${escapeHtml(details.authorName)} · Elevates OS</em></p>
`.trim();

  return { title, summary, bodyHtml };
}

export function emptyManualReportHtml(title: string) {
  return `
<h1>${escapeHtml(title)}</h1>
<p>Start writing your chapter report here. Use headings, lists, and images — then download as a Word document when ready.</p>
<h2>Highlights</h2>
<ul><li>Key win 1</li><li>Key win 2</li></ul>
<h2>Next steps</h2>
<p></p>
`.trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
