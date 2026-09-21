import { formatDate } from "@/lib/datetime";
import { escapeHtml } from "@/lib/utils";
import { extractEventReportAnalytics } from "@/lib/reports/feedback-analytics";
import type { ElevatesStore, EventItem, ReportImage } from "@/types";

export type StudentReportDetails = {
  outcomes: string;
  attendanceNote?: string;
  authorName: string;
  chapterName: string;
  images: ReportImage[];
  leadDescription?: string;
  goodComments?: string[];
  badReviews?: string[];
  isVolunteer?: boolean;
};

/** Build TipTap-friendly HTML for an event report with attendance ratio, campus lead description, and good/bad reviews. */
export function buildStudentEventReportHtml(
  store: ElevatesStore,
  event: EventItem,
  details: StudentReportDetails,
): { title: string; summary: string; bodyHtml: string } {
  const title = `${event.title} — Activity Report`;

  // Extract real event analytics or use provided overrides
  const analytics = extractEventReportAnalytics(store, event);

  const leadDescription =
    details.leadDescription?.trim() ||
    analytics.campusLeadDescription;

  const goodComments =
    details.goodComments && details.goodComments.length > 0
      ? details.goodComments
      : analytics.feedback.goodComments;

  const badReviews =
    details.badReviews && details.badReviews.length > 0
      ? details.badReviews
      : analytics.feedback.badReviews;

  const summary =
    details.outcomes.trim() ||
    `Activity report for ${event.title} at ${details.chapterName}.`;

  const imageBlocks = details.images
    .map(
      (img) =>
        `<figure><img src="${img.dataUrl}" alt="${escapeHtml(img.name)}" /><figcaption>${escapeHtml(img.name)}</figcaption></figure>`,
    )
    .join("");

  const goodItemsHtml = goodComments
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("");

  const badItemsHtml = badReviews
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("");

  const authorRoleSuffix = details.isVolunteer
    ? " (Appointed Event Volunteer)"
    : "";

  const bodyHtml = `
<h1>${escapeHtml(title)}</h1>
<p><strong>Chapter:</strong> ${escapeHtml(details.chapterName)} · <strong>Date:</strong> ${formatDate(event.startsAt)} · <strong>Venue:</strong> ${escapeHtml(event.venue || "TBD")}</p>
<p><strong>Category:</strong> ${escapeHtml(event.category)} · <strong>Status:</strong> ${escapeHtml(event.status.replaceAll("_", " "))}</p>

<h2>Event Overview & Campus Lead Description</h2>
<blockquote><p>${escapeHtml(leadDescription)}</p></blockquote>

<h2>Attendance & Turnout Ratio</h2>
<p><strong>Attendance Turnout:</strong> ${analytics.attendanceRatio.turnoutPercentage}% (${analytics.attendanceRatio.present} verified attendees out of ${analytics.attendanceRatio.approved || analytics.attendanceRatio.registered || 1} registered)${details.attendanceNote ? ` — <em>${escapeHtml(details.attendanceNote)}</em>` : ""}.</p>
<p>Total Registered: ${analytics.attendanceRatio.registered} · Approved: ${analytics.attendanceRatio.approved} · Attendance Marked: ${analytics.attendanceRatio.present} · Capacity: ${event.capacity || "Open"}${analytics.attendanceRatio.isFullHouse ? " (Full House Reached)" : ""}.</p>

<h2>Participant Feedback & Reviews</h2>
<h3>Good Comments & Positive Praises</h3>
<ul>${goodItemsHtml || "<li>Positive feedback received from attendees.</li>"}</ul>

<h3>Critical Feedback & Areas for Improvement (Bad Reviews)</h3>
<ul>${badItemsHtml || "<li>Constructive feedback noted for future iterations.</li>"}</ul>

<h2>Key Outcomes & Highlights</h2>
<p>${escapeHtml(details.outcomes.trim() || "Key outcomes, learnings, and next steps.")}</p>

<h2>Photos</h2>
${
  imageBlocks || "<p><em>No photos attached.</em></p>"
}

<p><em>Prepared by ${escapeHtml(details.authorName)}${authorRoleSuffix} · Elevates OS</em></p>
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
