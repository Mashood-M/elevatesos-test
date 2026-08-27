import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/lib/public/http";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(32).optional(),
  chapter: z.string().optional(),
  answers: z.record(z.string(), z.unknown()).optional(),
  turnstileToken: z.string().optional(),
});

export const formSubmitSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  email: z.string().email().optional(),
  name: z.string().max(120).optional(),
  turnstileToken: z.string().optional(),
});

export const collegeLeadSchema = z.object({
  college: z.string().min(2),
  contactName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.string().optional(),
  message: z.string().optional(),
  turnstileToken: z.string().optional(),
});

export const joinSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  college: z.string().min(2),
  role: z.string().optional(),
  message: z.string().optional(),
  turnstileToken: z.string().optional(),
});

function eventSlug(title: string, id: string) {
  return slugify(title) || slugify(id);
}

export async function listPublicChapters() {
  const admin = createServiceClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("chapters")
    .select("*")
    .eq("published", true)
    .eq("status", "active")
    .order("name");

  if (error || !data) return [];
  return data.map((c) => ({
    slug: c.slug,
    name: c.name,
    college: c.college,
    city: c.city,
    district: c.district ?? c.city,
    logoUrl: c.logo_url,
    memberCount: c.member_count,
    eventCount: c.event_count,
    projectCount: c.project_count,
    foundedAt: c.founded_at,
  }));
}

export async function getPublicChapter(slug: string) {
  const admin = createServiceClient();
  if (!admin) return null;
  const { data: chapter, error } = await admin
    .from("chapters")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .eq("status", "active")
    .maybeSingle();

  if (error || !chapter) return null;

  const { data: terms } = await admin
    .from("leadership_terms")
    .select("id")
    .eq("chapter_id", chapter.id)
    .eq("status", "active")
    .limit(1);

  let roster: Array<{ name: string; role: string; roleKey: string }> = [];
  if (terms?.[0]) {
    const { data: assignments } = await admin
      .from("leadership_assignments")
      .select("title, role_key, profiles(full_name)")
      .eq("term_id", terms[0].id);

    roster = (assignments ?? []).map((a) => {
      const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
      return {
        name: profile?.full_name ?? a.title,
        role: a.title,
        roleKey: a.role_key,
      };
    });
  }

  return {
    slug: chapter.slug,
    name: chapter.name,
    college: chapter.college,
    city: chapter.city,
    district: chapter.district ?? chapter.city,
    logoUrl: chapter.logo_url,
    memberCount: chapter.member_count,
    eventCount: chapter.event_count,
    projectCount: chapter.project_count,
    foundedAt: chapter.founded_at,
    roster,
  };
}

export async function listPublicEvents(status?: string, chapter?: string) {
  const admin = createServiceClient();
  if (!admin) return [];
  let q = admin.from("events").select("*, chapters(slug, name)").not("published_at", "is", null);
  if (chapter) q = q.eq("chapters.slug", chapter);
  const { data, error } = await q.order("starts_at", { ascending: false });
  if (error || !data) return [];
  const now = Date.now();
  return data
    .map((e) => mapEventRow(e))
    .filter((e) => matchEventStatus(e, status, now));
}

function mapEventRow(e: Record<string, unknown>) {
  const chapters = e.chapters as { slug?: string; name?: string } | null;
  return {
    slug: (e.slug as string) || eventSlug(String(e.title ?? ""), String(e.id ?? "")),
    title: String(e.title ?? ""),
    summary: String(e.summary ?? e.description ?? ""),
    description: String(e.description ?? ""),
    venue: String(e.venue ?? ""),
    startsAt: String(e.starts_at ?? ""),
    endsAt: String(e.ends_at ?? ""),
    mode: String(e.mode ?? "in_person"),
    bannerUrl: e.banner_url ? String(e.banner_url) : undefined,
    chapterSlug: chapters?.slug,
    chapterName: chapters?.name,
    seatsLeft: typeof e.capacity === "number" ? e.capacity : undefined,
    capacity: typeof e.capacity === "number" ? e.capacity : undefined,
    status: String(e.status ?? ""),
    category: e.category ? String(e.category) : undefined,
    registrationOpen: e.status === "registration_open",
  };
}

function matchEventStatus(
  e: { startsAt: string; status: string },
  status: string | undefined,
  now: number,
) {
  if (!status) return true;
  const start = new Date(e.startsAt).getTime();
  if (status === "upcoming") return start >= now || e.status === "registration_open";
  if (status === "past") return start < now || e.status === "completed";
  return true;
}

export async function getPublicEvent(slug: string) {
  const events = await listPublicEvents();
  return events.find((e) => e.slug === slug) ?? null;
}

export async function listPublicProjects() {
  const admin = createServiceClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("projects")
    .select("*, chapters(slug)")
    .eq("is_showcased", true);
  if (error || !data) return [];
  return data.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    stage: p.stage,
    demoUrl: p.demo_url,
    repositoryUrl: p.repository_url,
    chapterSlug: p.chapters?.slug,
  }));
}

export async function getPublicProject(slug: string) {
  const projects = await listPublicProjects();
  return projects.find((p) => p.slug === slug) ?? null;
}

export async function listPublicPeerLabs() {
  const admin = createServiceClient();
  if (!admin) return [];
  const { data, error } = await admin.from("peer_labs").select("*");
  if (error || !data) return [];
  return data.map((p) => ({
    slug: p.slug,
    title: p.title,
    track: p.track,
    syllabus: p.syllabus,
    status: p.status,
    applicationsOpen: p.applications_open,
  }));
}

export async function getPublicPeerLab(slug: string) {
  const labs = await listPublicPeerLabs();
  return labs.find((l) => l.slug === slug) ?? null;
}

export async function listPublicTeam() {
  const admin = createServiceClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("is_public", true);
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.department || "Core Team",
    bio: p.bio,
    avatarUrl: p.avatar_url,
    linkedinUrl: p.linkedin_url,
    githubUrl: p.github_url,
    chapterId: p.chapter_id,
  }));
}

export async function publicStats() {
  const admin = createServiceClient();
  if (!admin) return { chapters: 0, events: 0, students: 0 };
  const [{ count: chapters }, { count: events }, { count: profiles }] =
    await Promise.all([
      admin.from("chapters").select("*", { count: "exact", head: true }).eq("published", true),
      admin.from("events").select("*", { count: "exact", head: true }).not("published_at", "is", null),
      admin.from("profiles").select("*", { count: "exact", head: true }),
    ]);
  return {
    chapters: chapters ?? 0,
    events: events ?? 0,
    students: profiles ?? 0,
  };
}

export async function verifyCertificate(id: string) {
  const admin = createServiceClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("verify_certificate", { cert_id: id });
  if (error || !data?.[0]) return null;
  return data[0];
}

export async function registerForEvent(slug: string, input: z.infer<typeof registerSchema>) {
  const admin = createServiceClient();
  if (!admin) return { ok: false as const, error: "Database connection unavailable", status: 503 };
  const { data: row } = await admin
    .from("events")
    .select("id, capacity")
    .eq("slug", slug)
    .maybeSingle();
  if (!row) return { ok: false as const, error: "Event not found", status: 404 };
  const { error } = await admin.from("event_registrations").insert({
    event_id: row.id,
    status: "pending",
    guest_email: input.email,
    guest_name: input.name,
    answers: input.answers ?? {},
    qr_code: `pending:${slug}:${input.email}`,
  });
  if (error) return { ok: false as const, error: error.message, status: 409 };
  await revalidateWeb(["events", `event:${slug}`]);
  return { ok: true as const, status: "pending" };
}

export async function submitPublicForm(formId: string, input: z.infer<typeof formSubmitSchema>) {
  const admin = createServiceClient();
  if (!admin) return { ok: false as const, error: "Database connection unavailable", status: 503 };
  const { data: form } = await admin
    .from("forms")
    .select("id, status, is_public")
    .eq("id", formId)
    .maybeSingle();
  if (!form || form.status !== "open" || !form.is_public) {
    return { ok: false as const, error: "Form is not open", status: 404 };
  }
  const { error } = await admin.from("form_responses").insert({
    form_id: formId,
    guest_email: input.email,
    answers: input.answers,
  });
  if (error) return { ok: false as const, error: error.message, status: 400 };
  return { ok: true as const };
}

export async function createCollegeLead(input: z.infer<typeof collegeLeadSchema>) {
  const admin = createServiceClient();
  if (!admin) return { ok: false as const, error: "Database connection unavailable" };
  const { error } = await admin.from("college_leads").insert({
    college: input.college,
    contact_name: input.contactName,
    email: input.email,
    phone: input.phone,
    role: input.role,
    message: input.message,
    source: "web",
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function createJoinLead(input: z.infer<typeof joinSchema>) {
  const admin = createServiceClient();
  if (!admin) return { ok: false as const, error: "Database connection unavailable" };
  const { error } = await admin.from("college_leads").insert({
    college: input.college,
    contact_name: input.name,
    email: input.email,
    role: input.role ?? "student",
    message: input.message,
    source: "join",
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function revalidateWeb(tags: string[]) {
  const url = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.WEB_REVALIDATE_SECRET;
  if (!url || !secret) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags, secret }),
  }).catch(() => undefined);
}
