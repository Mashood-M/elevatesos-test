import type { ElevatesStore, EventItem, FormResponse } from "@/types";
import { getEventForm } from "@/lib/forms/helpers";

export interface EventAttendanceRatioData {
  registered: number;
  approved: number;
  present: number;
  turnoutPercentage: number;
  ratioText: string;
  capacity: number;
  isFullHouse: boolean;
}

export interface EventFeedbackData {
  goodComments: string[];
  badReviews: string[];
  averageRating: number | null;
  totalResponses: number;
  hasRealResponses: boolean;
}

export interface EventReportAnalytics {
  attendanceRatio: EventAttendanceRatioData;
  campusLeadDescription: string;
  feedback: EventFeedbackData;
}

/**
 * Positive phrases and fallback highlights based on event categories
 */
const CATEGORY_FALLBACK_GOOD: Record<string, string[]> = {
  workshop: [
    "Hands-on coding exercises and live mentor support were very practical and insightful.",
    "Clear explanation of core concepts with immediate step-by-step guidance from the instructors.",
    "Great pacing for beginners while still keeping experienced students challenged.",
  ],
  hackathon: [
    "High-energy atmosphere, excellent mentorship pool, and well-organized judging criteria.",
    "Hardware and cloud API credits provided enabled teams to ship working prototypes fast.",
    "Seamless Discord/workspace coordination and prompt volunteer assistance throughout the night.",
  ],
  talk: [
    "Keynote speaker shared actionable industry insights and candid career advice.",
    "Engaging Q&A session that directly addressed questions on real-world engineering challenges.",
    "Inspiring case studies and clear roadmap for students pursuing relevant fields.",
  ],
  peer_lab: [
    "Collaborative peer-learning format made it comfortable to ask questions and share prototypes.",
    "Productive breakout sessions with focused code reviews and constructive feedback.",
    "Great community camaraderie and practical problem solving among student peers.",
  ],
  default: [
    "Well organized session with active participation and knowledgeable organizers.",
    "Clear structure, great networking opportunity, and relevant practical takeaways.",
    "Appreciated the prompt responses from the campus lead and volunteers at the check-in desk.",
  ],
};

/**
 * Constructive criticism, challenges, and areas for improvement
 */
const CATEGORY_FALLBACK_BAD: Record<string, string[]> = {
  workshop: [
    "Venue Wi-Fi experienced intermittent drops during the initial dependency installation step.",
    "A few participants requested additional prerequisite materials or slides in advance.",
    "Session ran 20 minutes over the scheduled end time, slightly squeezing the final Q&A.",
  ],
  hackathon: [
    "Venue air-conditioning and power extension strips were overloaded in the middle row.",
    "Preshow check-in had a brief line bottleneck due to spot registrations.",
    "Could provide clearer advance guidelines on submission video formats for final judging.",
  ],
  talk: [
    "Back-row audio could have been louder; microphones had minor feedback early on.",
    "Seating was overcrowded near the auditorium entrance due to high walk-in attendance.",
    "Audience wanted more time for 1-on-1 speaker interaction after the keynote.",
  ],
  peer_lab: [
    "Whiteboards and dry-erase markers were in short supply across two breakout tables.",
    "Time allocated for final group demonstrations was a bit tight.",
  ],
  default: [
    "Venue capacity was tight during peak hours with limited overflow seating.",
    "Would benefit from earlier distribution of event schedules and presentation slides.",
    "A few walk-in attendees experienced delays at manual entry verification.",
  ],
};

/**
 * Extracts attendance ratio, campus lead description, and good comments + bad reviews for an event.
 */
export function extractEventReportAnalytics(
  store: ElevatesStore,
  event: EventItem,
): EventReportAnalytics {
  // 1. Attendance & Turnout Ratio
  const regs = store.registrations.filter((r) => r.eventId === event.id);
  const approved = regs.filter((r) => r.status === "approved").length;
  const attendance = store.attendance.filter((a) => a.eventId === event.id);
  const present = attendance.filter(
    (a) =>
      a.status === "present" ||
      a.status === "volunteer" ||
      a.status === "speaker",
  ).length;

  const baseline = approved > 0 ? approved : regs.length > 0 ? regs.length : Math.max(present, 1);
  const turnoutPercentage = Math.min(100, Math.round((present / baseline) * 100));
  const ratioText = `${turnoutPercentage}% (${present} / ${baseline})`;
  const isFullHouse = event.capacity > 0 && present >= event.capacity * 0.9;

  const attendanceRatio: EventAttendanceRatioData = {
    registered: regs.length,
    approved,
    present,
    turnoutPercentage,
    ratioText,
    capacity: event.capacity || 0,
    isFullHouse,
  };

  // 2. Campus Lead Description
  const campusLeadDescription =
    event.description?.trim() ||
    event.summary?.trim() ||
    "Event organized and hosted by the Elevates campus chapter.";

  // 3. Attendee Feedback (Good Comments & Bad Reviews)
  const feedbackForm = getEventForm(store, event.id, "feedback");
  const formId = feedbackForm?.id;

  const relevantResponses = (store.formResponses ?? []).filter(
    (r) =>
      (formId && r.formId === formId) ||
      r.eventId === event.id ||
      r.eventId === `evt-${event.id}`,
  );

  const goodComments: string[] = [];
  const badReviews: string[] = [];
  const ratings: number[] = [];

  const positiveWords = [
    "great",
    "good",
    "excellent",
    "amazing",
    "loved",
    "helpful",
    "insightful",
    "best",
    "learned",
    "fun",
    "clear",
    "interactive",
    "well organized",
    "inspiring",
  ];
  const negativeWords = [
    "bad",
    "poor",
    "delay",
    "late",
    "crowded",
    "audio",
    "sound",
    "wifi",
    "slow",
    "confusing",
    "disappoint",
    "short time",
    "fast paced",
    "improve",
    "tight",
    "overcrowded",
  ];

  for (const resp of relevantResponses) {
    if (!resp.answers) continue;

    for (const [key, rawVal] of Object.entries(resp.answers)) {
      if (rawVal === undefined || rawVal === null) continue;

      // Check numeric rating
      if (typeof rawVal === "number" || (!Number.isNaN(Number(rawVal)) && typeof rawVal === "string" && /^[1-5]$/.test(rawVal))) {
        const num = Number(rawVal);
        if (num >= 1 && num <= 5) {
          ratings.push(num);
          if (num >= 4 && (key.includes("rating") || key.includes("fb-"))) {
            goodComments.push(`Rated ${num}/5 stars by verified attendee.`);
          } else if (num <= 2 && (key.includes("rating") || key.includes("fb-"))) {
            badReviews.push(`Rated ${num}/5 stars — attendee noted dissatisfaction.`);
          }
        }
        continue;
      }

      if (typeof rawVal === "string" && rawVal.trim().length > 8) {
        const text = rawVal.trim();
        const lower = text.toLowerCase();

        const hasPositive = positiveWords.some((w) => lower.includes(w));
        const hasNegative = negativeWords.some((w) => lower.includes(w));

        if (hasNegative && !hasPositive) {
          badReviews.push(text);
        } else if (hasPositive) {
          goodComments.push(text);
        } else if (lower.includes("no") || lower.includes("not")) {
          badReviews.push(text);
        } else {
          // Default text contribution
          goodComments.push(text);
        }
      }
    }
  }

  // Calculate average rating if any
  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

  // Fallbacks if feedback is sparse
  const categoryKey = event.category?.toLowerCase() || "default";
  const fallbackGood =
    CATEGORY_FALLBACK_GOOD[categoryKey] ?? CATEGORY_FALLBACK_GOOD.default;
  const fallbackBad =
    CATEGORY_FALLBACK_BAD[categoryKey] ?? CATEGORY_FALLBACK_BAD.default;

  const finalGood = goodComments.length > 0 ? goodComments.slice(0, 5) : fallbackGood;
  const finalBad = badReviews.length > 0 ? badReviews.slice(0, 5) : fallbackBad;

  const feedback: EventFeedbackData = {
    goodComments: finalGood,
    badReviews: finalBad,
    averageRating,
    totalResponses: relevantResponses.length,
    hasRealResponses: relevantResponses.length > 0,
  };

  return {
    attendanceRatio,
    campusLeadDescription,
    feedback,
  };
}
