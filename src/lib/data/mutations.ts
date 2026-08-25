import type { Chapter, EventItem, FormDefinition, FormResponse } from "@/types";
import { isDemoMode } from "@/lib/mode";
import { createServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/lib/public/http";
import { revalidateWeb } from "@/lib/public/catalog";

export async function persistChapter(chapter: Chapter) {
  if (isDemoMode()) return;
  if (typeof window !== "undefined") {
    try {
      await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chapter", data: chapter }),
      });
    } catch (e) {
      console.error("Failed to persist chapter via API:", e);
    }
    return;
  }
  const admin = createServiceClient();
  if (!admin) return;
  await admin.from("chapters").upsert({
    id: chapter.id.startsWith("ch-") ? undefined : chapter.id,
    organization_id: chapter.organizationId,
    name: chapter.name,
    slug: chapter.slug,
    college: chapter.college,
    city: chapter.city,
    status: chapter.status,
    health_score: chapter.healthScore,
    published: chapter.published ?? false,
    district: chapter.district,
    logo_url: chapter.logoUrl,
  });
}

export async function persistEvent(event: EventItem) {
  if (isDemoMode()) return;
  if (typeof window !== "undefined") {
    try {
      await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "event", data: event }),
      });
    } catch (e) {
      console.error("Failed to persist event via API:", e);
    }
    return;
  }
  const admin = createServiceClient();
  if (!admin) return;
  const slug = event.slug ?? slugify(event.title);
  await admin.from("events").upsert({
    id: event.id.startsWith("ev-") ? undefined : event.id,
    chapter_id: event.chapterId,
    cluster_id: event.clusterId,
    title: event.title,
    description: event.description,
    venue: event.venue,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    faculty_id: event.facultyId,
    organizer_id: event.organizerId?.startsWith("usr-") ? "d1000000-0000-4000-8000-000000000001" : event.organizerId,
    capacity: event.capacity,
    waitlist_capacity: event.waitlistCapacity,
    visibility: event.visibility,
    registration_start: event.registrationStart,
    registration_end: event.registrationEnd,
    status: event.status,
    certificate_enabled: event.certificateEnabled,
    ticket_no: event.ticketNo,
    category: event.category,
    slug,
    published_at: event.publishedAt ?? (event.visibility === "public" ? new Date().toISOString() : null),
    summary: event.summary ?? event.description,
    banner_url: event.bannerUrl,
    mode: event.mode ?? "in_person",
  });
  if (event.visibility === "public" || event.publishedAt) {
    await revalidateWeb(["events", `event:${slug}`, `chapter:${event.chapterId}`]);
  }
}

export async function persistForm(form: FormDefinition) {
  if (isDemoMode()) return;
  const admin = createServiceClient();
  if (!admin) return;
  await admin.from("forms").upsert({
    id: form.id.startsWith("form-") ? undefined : form.id,
    chapter_id: form.chapterId,
    event_id: form.eventId,
    slug: slugify(form.title) + "-" + form.id.slice(0, 6),
    title: form.title,
    description: form.description,
    purpose: form.purpose,
    schema: form.questions,
    status: form.status,
    is_public: form.status === "open",
  });
}

export async function persistFormResponse(response: FormResponse) {
  if (isDemoMode()) return;
  const admin = createServiceClient();
  if (!admin) return;
  await admin.from("form_responses").insert({
    form_id: response.formId,
    respondent_id: response.userId,
    answers: response.answers,
  });
}

export async function persistAttendance(attendance: {
  id?: string;
  eventId: string;
  registrationId: string;
  userId: string;
  status: string;
  method: string;
  checkedInBy: string;
}) {
  if (isDemoMode()) return;
  const admin = createServiceClient();
  if (!admin) return;
  try {
    await admin.from("attendance").insert({
      event_id: attendance.eventId,
      registration_id: attendance.registrationId.startsWith("reg-") ? undefined : attendance.registrationId,
      user_id: attendance.userId.startsWith("usr-") ? undefined : attendance.userId,
      status: attendance.status,
      method: attendance.method === "qr" ? "qr_scan" : attendance.method,
      checked_in_by: attendance.checkedInBy.startsWith("usr-") ? undefined : attendance.checkedInBy,
    });
  } catch (err) {
    console.error("Failed to persist attendance to Supabase:", err);
  }
}

export async function persistReport(report: {
  chapterId: string;
  eventId?: string;
  type: string;
  title: string;
  status: string;
  submittedBy: string;
  hqComment?: string;
  approvedBy?: string;
}) {
  if (isDemoMode()) return;
  const admin = createServiceClient();
  if (!admin) return;
  try {
    await admin.from("reports").insert({
      chapter_id: report.chapterId,
      type: report.type,
      title: report.title,
      status: report.status,
      submitted_by: report.submittedBy.startsWith("usr-") ? undefined : report.submittedBy,
      hq_comment: report.hqComment,
      approved_by: report.approvedBy ? (report.approvedBy.startsWith("usr-") ? undefined : report.approvedBy) : undefined,
    });
  } catch (err) {
    console.error("Failed to persist report to Supabase:", err);
  }
}

export async function persistTask(task: {
  chapterId: string;
  eventId?: string;
  title: string;
  category: string;
  assigneeId: string;
  status: string;
  dueDate?: string;
}) {
  if (isDemoMode()) return;
  const admin = createServiceClient();
  if (!admin) return;
  try {
    await admin.from("tasks").insert({
      chapter_id: task.chapterId,
      event_id: task.eventId,
      title: task.title,
      category: task.category,
      assignee_id: task.assigneeId.startsWith("usr-") ? undefined : task.assigneeId,
      status: task.status,
      due_date: task.dueDate,
    });
  } catch (err) {
    console.error("Failed to persist task to Supabase:", err);
  }
}

