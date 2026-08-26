import { z } from "zod";
import { createSeedStore } from "@/lib/demo/seed";
import { isDemoMode } from "@/lib/mode";
import { createServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/lib/public/http";

const demoRsvps: {
  id: string;
  slug: string;
  email: string;
  name: string;
  createdAt: string;
}[] = [];

const demoLeads: Record<string, unknown>[] = [];
const demoFormResponses: Record<string, unknown>[] = [];

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

function seed() {
  return createSeedStore();
}

function eventSlug(title: string, id: string) {
  return slugify(title) || slugify(id);
}

export async function listPublicChapters() {
  const admin = createServiceClient();
  if (admin && !isDemoMode()) {
    const { data } = await admin
      .from("chapters")
      .select("*")
      .eq("published", true)
      .eq("status", "active")
      .order("name");
    if (data?.length) {
      return data.map((c) => ({
        slug: c.slug,
        name: c.name,
        college: c.college,
        city: c.city,
        district: c.district,
        logoUrl: c.logo_url,
        memberCount: c.member_count,
        eventCount: c.event_count,
        projectCount: c.project_count,
        foundedAt: c.founded_at,
      }));
    }
  }
  return seed()
    .chapters.filter((c) => c.status === "active")
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      college: c.college,
      city: c.city,
      district: c.district ?? c.city,
      logoUrl: c.logoUrl,
      memberCount: c.memberCount,
      eventCount: c.eventCount,
      projectCount: c.projectCount,
      foundedAt: c.foundedAt,
    }));
}

export async function getPublicChapter(slug: string) {
  const chapters = await listPublicChapters();
  const chapter = chapters.find((c) => c.slug === slug);
  if (!chapter) return null;
  const store = seed();
  const full = store.chapters.find((c) => c.slug === slug);
  const roster = store.leadershipAssignments
    .filter((a) => {
      const term = store.leadershipTerms.find((t) => t.id === a.termId);
      return term?.chapterId === full?.id && term?.status === "active";
    })
    .map((a) => {
      const profile = store.profiles.find((p) => p.id === a.userId);
      return {
        name: profile?.fullName ?? a.title,
        role: a.title,
        roleKey: a.roleKey,
      };
    });
  return { ...chapter, roster };
}

export async function listPublicEvents(status?: string, chapter?: string) {
  const admin = createServiceClient();
  if (admin && !isDemoMode()) {
    let q = admin.from("events").select("*, chapters(slug, name)").not("published_at", "is", null);
    if (chapter) q = q.eq("chapters.slug", chapter);
    const { data } = await q.order("starts_at", { ascending: false });
    if (data) {
      const now = Date.now();
      return data
        .map((e) => mapEventRow(e))
        .filter((e) => matchEventStatus(e, status, now));
    }
  }
  const store = seed();
  const now = Date.now();
  return store.events
    .filter((e) => !chapter || store.chapters.find((c) => c.id === e.chapterId)?.slug === chapter)
    .map((e) => {
      const ch = store.chapters.find((c) => c.id === e.chapterId);
      const seats = Math.max(
        0,
        e.capacity - store.registrations.filter((r) => r.eventId === e.id && r.status === "approved").length,
      );
      return {
        slug: e.slug ?? eventSlug(e.title, e.id),
        title: e.title,
        summary: e.summary ?? e.description,
        description: e.description,
        venue: e.venue,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        mode: e.mode ?? "in_person",
        bannerUrl: e.bannerUrl,
        chapterSlug: ch?.slug ?? "ekc",
        chapterName: ch?.name,
        seatsLeft: seats,
        capacity: e.capacity,
        status: e.status,
        category: e.category,
        registrationOpen:
          e.status === "registration_open" || e.status === "approved",
      };
    })
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
  if (admin && !isDemoMode()) {
    const { data } = await admin
      .from("projects")
      .select("*, chapters(slug)")
      .eq("is_showcased", true);
    if (data?.length) {
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
  }
  return seed()
    .projects.filter((p) => p.isShowcased || p.stage === "showcase" || p.stage === "demo")
    .map((p) => ({
      slug: p.slug ?? eventSlug(p.title, p.id),
      title: p.title,
      description: p.description,
      stage: p.stage,
      demoUrl: p.demoUrl,
      repositoryUrl: p.repositoryUrl,
    }));
}

export async function getPublicProject(slug: string) {
  const projects = await listPublicProjects();
  return projects.find((p) => p.slug === slug) ?? null;
}

export async function listPublicPeerLabs() {
  const admin = createServiceClient();
  if (admin) {
    const { data } = await admin.from("peer_labs").select("*");
    if (data) {
      return data.map((p) => ({
        slug: p.slug,
        title: p.title,
        track: p.track,
        syllabus: p.syllabus,
        status: p.status,
        applicationsOpen: p.applications_open,
      }));
    }
  }
  return [];
}

export async function getPublicPeerLab(slug: string) {
  const labs = await listPublicPeerLabs();
  return labs.find((l) => l.slug === slug) ?? null;
}

export async function listPublicTeam() {
  const admin = createServiceClient();
  if (admin && !isDemoMode()) {
    const { data } = await admin
      .from("profiles")
      .select("*")
      .eq("is_public", true);
    if (data?.length) {
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
  }
  const store = seed();
  return store.profiles
    .filter((p) => p.isPublic || !p.chapterId || p.badges.includes("Founder"))
    .map((p) => ({
      id: p.id,
      name: p.fullName,
      role: p.badges[0] ?? p.department,
      bio: p.bio,
      avatarUrl: p.avatarUrl,
      linkedinUrl: p.linkedinUrl,
      githubUrl: p.githubUrl,
      chapterId: p.chapterId,
    }));
}

export async function publicStats() {
  const store = seed();
  const admin = createServiceClient();
  if (admin && !isDemoMode()) {
    const [{ count: chapters }, { count: events }, { count: profiles }] =
      await Promise.all([
        admin.from("chapters").select("*", { count: "exact", head: true }).eq("published", true),
        admin.from("events").select("*", { count: "exact", head: true }).not("published_at", "is", null),
        admin.from("profiles").select("*", { count: "exact", head: true }),
      ]);
    return {
      chapters: chapters ?? store.chapters.length,
      events: events ?? store.events.length,
      students: profiles ?? store.profiles.length,
    };
  }
  return {
    chapters: store.chapters.filter((c) => c.status === "active").length,
    events: store.events.length,
    students: store.profiles.length,
  };
}

export async function verifyCertificate(id: string) {
  const admin = createServiceClient();
  if (admin && !isDemoMode()) {
    const { data, error } = await admin.rpc("verify_certificate", { cert_id: id });
    if (!error && data?.[0]) return data[0];
  }
  const store = seed();
  const cert = store.certificates.find((c) => c.certificateId === id || c.id === id);
  if (!cert) return null;
  const holder = store.profiles.find((p) => p.id === cert.userId);
  const event = store.events.find((e) => e.id === cert.eventId);
  return {
    certificate_id: cert.certificateId,
    holder: holder?.fullName,
    event_title: event?.title,
    issued_at: cert.issuedAt,
  };
}

export async function registerForEvent(slug: string, input: z.infer<typeof registerSchema>) {
  const event = await getPublicEvent(slug);
  if (!event) return { ok: false as const, error: "Event not found", status: 404 };
  const admin = createServiceClient();
  if (admin && !isDemoMode()) {
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
  demoRsvps.push({
    id: `rsvp-${Date.now()}`,
    slug,
    email: input.email,
    name: input.name,
    createdAt: new Date().toISOString(),
  });
  return { ok: true as const, status: "pending", demo: true };
}

export async function submitPublicForm(formId: string, input: z.infer<typeof formSubmitSchema>) {
  const admin = createServiceClient();
  if (admin && !isDemoMode()) {
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
  const form = seed().forms.find((f) => f.id === formId);
  if (!form || form.status !== "open") {
    return { ok: false as const, error: "Form is not open", status: 404 };
  }
  demoFormResponses.push({ formId, ...input, submittedAt: new Date().toISOString() });
  return { ok: true as const, demo: true };
}

export async function createCollegeLead(input: z.infer<typeof collegeLeadSchema>) {
  const admin = createServiceClient();
  if (admin && !isDemoMode()) {
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
  demoLeads.push({ ...input, source: "web", createdAt: new Date().toISOString() });
  return { ok: true as const, demo: true };
}

export async function createJoinLead(input: z.infer<typeof joinSchema>) {
  const admin = createServiceClient();
  if (admin && !isDemoMode()) {
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
  demoLeads.push({ ...input, source: "join", createdAt: new Date().toISOString() });
  return { ok: true as const, demo: true };
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
