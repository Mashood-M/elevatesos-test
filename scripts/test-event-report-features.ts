import { extractEventReportAnalytics } from "../src/lib/reports/feedback-analytics";
import { buildStudentEventReportHtml } from "../src/lib/reports/templates";
import {
  isUserAppointedVolunteerForEvent,
  canUserManageEventReport,
} from "../src/lib/volunteers";
import type { ElevatesStore, EventItem, FormResponse } from "../src/types";

// Create test mock store
const mockEvent: EventItem = {
  id: "evt-ai-workshop",
  chapterId: "ch-ekc",
  title: "Fullstack AI Workshop",
  bannerEmoji: "🤖",
  description: "Comprehensive 4-hour hands-on workshop on LLMs, agent architectures, and vector databases conducted by our campus technical mentors.",
  summary: "Comprehensive 4-hour hands-on workshop on LLMs",
  venue: "CS Seminar Hall",
  startsAt: "2026-09-22T09:00:00Z",
  endsAt: "2026-09-22T13:00:00Z",
  organizerId: "usr-lead",
  capacity: 60,
  waitlistCapacity: 20,
  visibility: "public",
  registrationStart: "2026-09-01T00:00:00Z",
  registrationEnd: "2026-09-21T23:59:59Z",
  status: "published",
  certificateEnabled: true,
  ticketNo: "TKT-001",
  category: "workshop",
  volunteerStudentIds: ["usr-volunteer-1"],
};

const mockResponses: FormResponse[] = [
  {
    id: "resp-1",
    formId: "form-feedback-1",
    userId: "usr-attendee-1",
    eventId: "evt-ai-workshop",
    answers: {
      "fb-rating": 5,
      "fb-learned": "The hands-on coding exercises were amazing and practical!",
    },
    submittedAt: "2026-09-22T14:00:00Z",
  },
  {
    id: "resp-2",
    formId: "form-feedback-1",
    userId: "usr-attendee-2",
    eventId: "evt-ai-workshop",
    answers: {
      "fb-rating": 2,
      "fb-learned": "Venue wifi had unexpected delay and disconnects during setup.",
    },
    submittedAt: "2026-09-22T14:05:00Z",
  },
];

const mockStore: ElevatesStore = {
  events: [mockEvent],
  registrations: [
    { id: "r1", eventId: "evt-ai-workshop", userId: "u1", status: "approved", answers: {}, qrCode: "Q1", createdAt: "" },
    { id: "r2", eventId: "evt-ai-workshop", userId: "u2", status: "approved", answers: {}, qrCode: "Q2", createdAt: "" },
    { id: "r3", eventId: "evt-ai-workshop", userId: "u3", status: "approved", answers: {}, qrCode: "Q3", createdAt: "" },
    { id: "r4", eventId: "evt-ai-workshop", userId: "u4", status: "approved", answers: {}, qrCode: "Q4", createdAt: "" },
    { id: "r5", eventId: "evt-ai-workshop", userId: "u5", status: "pending", answers: {}, qrCode: "Q5", createdAt: "" },
  ],
  attendance: [
    { id: "a1", eventId: "evt-ai-workshop", registrationId: "r1", verifiedBy: "u-lead", verifiedAt: "", status: "present" },
    { id: "a2", eventId: "evt-ai-workshop", registrationId: "r2", verifiedBy: "u-lead", verifiedAt: "", status: "present" },
    { id: "a3", eventId: "evt-ai-workshop", registrationId: "r3", verifiedBy: "u-lead", verifiedAt: "", status: "present" },
  ],
  formResponses: mockResponses,
  userRoles: [
    { id: "ur-lead", userId: "usr-lead", roleKey: "campus_lead", createdAt: "" },
    { id: "ur-vol1", userId: "usr-volunteer-1", roleKey: "student", createdAt: "" },
    { id: "ur-vol2", userId: "usr-volunteer-2", roleKey: "student", createdAt: "" },
    { id: "ur-stranger", userId: "usr-stranger", roleKey: "student", createdAt: "" },
  ],
  volunteerAssignments: [
    {
      id: "va-1",
      userId: "usr-volunteer-2",
      eventId: "evt-ai-workshop",
      status: "active",
      createdAt: "",
    },
  ],
  volunteerGroups: [],
  reports: [],
  chapters: [{ id: "ch-ekc", name: "EKC Chapter", slug: "ekc", status: "active", createdAt: "", updatedAt: "" }],
  profiles: [],
  eventForms: [],
  forms: [{ id: "form-feedback-1", chapterId: "ch-ekc", eventId: "evt-ai-workshop", title: "Feedback", purpose: "feedback", status: "open", questions: [], createdAt: "", updatedAt: "" }],
} as unknown as ElevatesStore;

console.log("=== Testing Event Report Analytics Extraction ===");
const analytics = extractEventReportAnalytics(mockStore, mockEvent);
console.log("Attendance Ratio:", JSON.stringify(analytics.attendanceRatio, null, 2));
console.log("Campus Lead Description:", analytics.campusLeadDescription);
console.log("Good Comments:", analytics.feedback.goodComments);
console.log("Bad Reviews:", analytics.feedback.badReviews);

if (analytics.attendanceRatio.present !== 3) {
  throw new Error(`Expected 3 attendees present, got ${analytics.attendanceRatio.present}`);
}
if (analytics.attendanceRatio.approved !== 4) {
  throw new Error(`Expected 4 approved, got ${analytics.attendanceRatio.approved}`);
}
if (!analytics.campusLeadDescription.includes("Comprehensive 4-hour hands-on workshop")) {
  throw new Error("Campus lead description not matched");
}
if (!analytics.feedback.goodComments.some((c) => c.includes("hands-on") || c.includes("Rated 5/5"))) {
  throw new Error("Expected good comment from attendee feedback");
}
if (!analytics.feedback.badReviews.some((c) => c.includes("wifi") || c.includes("Rated 2/5"))) {
  throw new Error("Expected bad review from attendee feedback");
}
console.log("✓ extractEventReportAnalytics passed successfully!\n");

console.log("=== Testing Report HTML Generation ===");
const reportBuilt = buildStudentEventReportHtml(mockStore, mockEvent, {
  outcomes: "Participants created working RAG agent prototypes.",
  attendanceNote: "High enthusiasm throughout the session.",
  authorName: "Aditya Prakash",
  chapterName: "EKC Campus Chapter",
  images: [],
  isVolunteer: true,
});

console.log("Report Title:", reportBuilt.title);
console.log("Report Summary:", reportBuilt.summary);
console.log("Report HTML Snippet:\n", reportBuilt.bodyHtml.slice(0, 500), "\n...");

if (!reportBuilt.bodyHtml.includes("Event Overview & Campus Lead Description")) {
  throw new Error("Report HTML missing Campus Lead Description section");
}
if (!reportBuilt.bodyHtml.includes("Attendance & Turnout Ratio")) {
  throw new Error("Report HTML missing Attendance Ratio section");
}
if (!reportBuilt.bodyHtml.includes("Good Comments & Positive Praises")) {
  throw new Error("Report HTML missing Good Comments section");
}
if (!reportBuilt.bodyHtml.includes("Critical Feedback & Areas for Improvement (Bad Reviews)")) {
  throw new Error("Report HTML missing Bad Reviews section");
}
if (!reportBuilt.bodyHtml.includes("Appointed Event Volunteer")) {
  throw new Error("Report HTML missing Appointed Volunteer badge/attribution");
}
console.log("✓ buildStudentEventReportHtml passed successfully!\n");

console.log("=== Testing Volunteer Appointment & Report Permissions ===");
const isVol1 = isUserAppointedVolunteerForEvent(mockStore, "usr-volunteer-1", "evt-ai-workshop");
const isVol2 = isUserAppointedVolunteerForEvent(mockStore, "usr-volunteer-2", "evt-ai-workshop");
const isStranger = isUserAppointedVolunteerForEvent(mockStore, "usr-stranger", "evt-ai-workshop");
const isLead = isUserAppointedVolunteerForEvent(mockStore, "usr-lead", "evt-ai-workshop");

console.log("usr-volunteer-1 (in volunteerStudentIds):", isVol1);
console.log("usr-volunteer-2 (in volunteerAssignments):", isVol2);
console.log("usr-stranger (unappointed student):", isStranger);
console.log("usr-lead (campus lead):", isLead);

if (!isVol1) throw new Error("Expected usr-volunteer-1 to be appointed volunteer");
if (!isVol2) throw new Error("Expected usr-volunteer-2 to be appointed volunteer");
if (isStranger) throw new Error("Expected usr-stranger to NOT be appointed volunteer");
if (!isLead) throw new Error("Expected campus lead to have volunteer governance");

const canVol1Manage = canUserManageEventReport(mockStore, "usr-volunteer-1", "student", "evt-ai-workshop");
const canStrangerManage = canUserManageEventReport(mockStore, "usr-stranger", "student", "evt-ai-workshop");

console.log("canVol1Manage:", canVol1Manage);
console.log("canStrangerManage:", canStrangerManage);

if (!canVol1Manage) throw new Error("usr-volunteer-1 should be allowed to manage report");
if (canStrangerManage) throw new Error("usr-stranger should NOT be allowed to manage report");

console.log("✓ All volunteer permission tests passed successfully!\n");
console.log("ALL TESTS COMPLETED SUCCESSFULLY! 🎉");
