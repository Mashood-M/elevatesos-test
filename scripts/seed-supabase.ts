import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createSeedStore } from "../src/lib/demo/seed";

// Load .env file variables manually
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const ORG_ID = "e1000000-0000-4000-8000-000000000001";
const CHAPTER_ID = "c1000000-0000-4000-8000-000000000001";

function toUuid(id: string | undefined | null): string | null {
  if (!id) return null;
  if (id === "org-1") return ORG_ID;
  if (id === "ch-ekc") return CHAPTER_ID;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash("md5").update(String(id)).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function seed() {
  console.log("Starting Supabase database seeding...");
  const seedStore = createSeedStore();

  // 1. Organization
  const org = seedStore.organization;
  console.log("Seeding Organization:", org.name, `(${ORG_ID})`);
  const { error: orgErr } = await supabase.from("organizations").upsert(
    {
      id: ORG_ID,
      name: org.name,
      slug: org.slug,
      tagline: org.tagline,
      brand_kit: org.brandKit,
    },
    { onConflict: "slug" },
  );
  if (orgErr) console.error("Org seed error:", orgErr);

  // 2. Chapters
  for (const c of seedStore.chapters) {
    console.log("Seeding Chapter:", c.name, `(${CHAPTER_ID})`);
    const { error: chErr } = await supabase.from("chapters").upsert(
      {
        id: CHAPTER_ID,
        organization_id: ORG_ID,
        name: c.name,
        slug: c.slug,
        college: c.college,
        city: c.city,
        district: c.district,
        status: c.status,
        health_score: c.healthScore,
        member_count: c.memberCount,
        event_count: c.eventCount,
        project_count: c.projectCount,
        founded_at: c.foundedAt.slice(0, 10),
        published: c.published ?? true,
        notes: c.notes,
      },
      { onConflict: "id" },
    );
    if (chErr) console.error("Chapter seed error:", chErr);
  }

  // 3. Permissions
  console.log("Seeding Permissions:", seedStore.permissions.length);
  const permPayload = seedStore.permissions.map((p) => ({
    id: toUuid(p.id)!,
    key: p.key,
    name: p.name,
    description: p.description,
  }));
  const { error: permErr } = await supabase
    .from("permissions")
    .upsert(permPayload, { onConflict: "key" });
  if (permErr) console.error("Permissions seed error:", permErr);

  const { data: dbPerms } = await supabase.from("permissions").select("id, key");
  const permKeyToIdMap = new Map<string, string>();
  dbPerms?.forEach((p) => permKeyToIdMap.set(p.key, p.id));

  // 4. Roles
  console.log("Seeding Roles:", seedStore.roles.length);
  const rolePayload = seedStore.roles.map((r) => ({
    id: toUuid(r.id)!,
    key: r.key,
    name: r.name,
    scope: r.scope,
    description: r.description,
  }));
  const { error: roleErr } = await supabase
    .from("roles")
    .upsert(rolePayload, { onConflict: "key" });
  if (roleErr) console.error("Roles seed error:", roleErr);

  const { data: dbRoles } = await supabase.from("roles").select("id, key");
  const roleKeyToIdMap = new Map<string, string>();
  dbRoles?.forEach((r) => roleKeyToIdMap.set(r.key, r.id));

  // 5. Role Permissions
  console.log("Seeding Role Permissions...");
  const permIdToKeyMap = new Map<string, string>();
  seedStore.permissions.forEach((p) => permIdToKeyMap.set(p.id, p.key));
  const roleIdToKeyMap = new Map<string, string>();
  seedStore.roles.forEach((r) => roleIdToKeyMap.set(r.id, r.key));

  const rpPayload: { role_id: string; permission_id: string; allowed: boolean }[] = [];
  for (const rp of seedStore.rolePermissions) {
    const roleKey = roleIdToKeyMap.get(rp.roleId);
    const permKey = permIdToKeyMap.get(rp.permissionId);
    if (roleKey && permKey) {
      const realRoleId = roleKeyToIdMap.get(roleKey);
      const realPermId = permKeyToIdMap.get(permKey);
      if (realRoleId && realPermId) {
        rpPayload.push({
          role_id: realRoleId,
          permission_id: realPermId,
          allowed: rp.allowed,
        });
      }
    }
  }

  for (let i = 0; i < rpPayload.length; i += 100) {
    const chunk = rpPayload.slice(i, i + 100);
    const { error: rpErr } = await supabase
      .from("role_permissions")
      .upsert(chunk, { onConflict: "role_id,permission_id" });
    if (rpErr) console.error("Role Permissions chunk error:", rpErr);
  }

  // 6. Profiles
  console.log("Seeding Profiles:", seedStore.profiles.length);
  const profileIdMap = new Map<string, string>();
  const { data: dbProfiles } = await supabase.from("profiles").select("id, email");
  dbProfiles?.forEach((p) => profileIdMap.set(p.email, p.id));

  const profilesPayload = seedStore.profiles.map((p) => {
    let uuid = profileIdMap.get(p.email);
    if (!uuid) {
      uuid = toUuid(p.id)!;
      profileIdMap.set(p.email, uuid);
    }
    profileIdMap.set(p.id, uuid);

    return {
      id: uuid,
      email: p.email,
      full_name: p.fullName,
      avatar_url: p.avatarUrl,
      department: p.department,
      year: p.year,
      section: p.section,
      chapter_id: CHAPTER_ID,
      status: p.status || "active",
      is_public: p.isPublic ?? true,
      skills: p.skills || [],
      interests: p.interests || [],
      points: p.points || 0,
      badges: p.badges || [],
      bio: p.bio,
    };
  });

  const { error: profErr } = await supabase
    .from("profiles")
    .upsert(profilesPayload, { onConflict: "id" });
  if (profErr) console.error("Profiles seed error:", profErr);

  // 7. Leadership Terms
  console.log("Seeding Leadership Terms:", seedStore.leadershipTerms.length);
  for (const lt of seedStore.leadershipTerms) {
    const { error: ltErr } = await supabase.from("leadership_terms").upsert(
      {
        id: toUuid(lt.id)!,
        chapter_id: CHAPTER_ID,
        academic_year: lt.academicYear,
        title: lt.title,
        start_date: lt.startDate,
        end_date: lt.endDate,
        status: lt.status,
        handover_notes: lt.handoverNotes,
      },
      { onConflict: "id" },
    );
    if (ltErr) console.error("Leadership Terms error:", ltErr);
  }

  // 8. User Roles
  console.log("Seeding User Roles:", seedStore.userRoles.length);
  const urPayload = seedStore.userRoles.map((ur) => {
    const seedRole = seedStore.roles.find((r) => r.id === ur.roleId);
    const realRoleId = seedRole ? roleKeyToIdMap.get(seedRole.key) || toUuid(ur.roleId)! : toUuid(ur.roleId)!;
    const realUserId = profileIdMap.get(ur.userId) || toUuid(ur.userId)!;

    return {
      id: toUuid(ur.id)!,
      user_id: realUserId,
      role_id: realRoleId,
      chapter_id: CHAPTER_ID,
      organization_id: ORG_ID,
    };
  });
  const { error: urErr } = await supabase
    .from("user_roles")
    .upsert(urPayload, { onConflict: "id" });
  if (urErr) console.error("User Roles seed error:", urErr);

  // 9. Leadership Assignments
  console.log("Seeding Leadership Assignments:", seedStore.leadershipAssignments.length);
  const laPayload = seedStore.leadershipAssignments.map((la) => ({
    id: toUuid(la.id)!,
    term_id: toUuid(la.termId)!,
    user_id: profileIdMap.get(la.userId) || toUuid(la.userId)!,
    role_key: la.roleKey,
    title: la.title,
  }));
  const { error: laErr } = await supabase
    .from("leadership_assignments")
    .upsert(laPayload, { onConflict: "id" });
  if (laErr) console.error("Leadership Assignments seed error:", laErr);

  // 10. Clusters
  console.log("Seeding Clusters:", seedStore.clusters.length);
  for (const cl of seedStore.clusters) {
    const { error: clErr } = await supabase.from("clusters").upsert(
      {
        id: toUuid(cl.id)!,
        chapter_id: CHAPTER_ID,
        name: cl.name,
        slug: cl.slug,
        description: cl.description,
        access_mode: cl.accessMode || "open",
        roadmap: cl.roadmap || [],
      },
      { onConflict: "chapter_id,slug" },
    );
    if (clErr) console.error("Clusters seed error:", clErr);
  }

  // 11. Events
  console.log("Seeding Events:", seedStore.events.length);
  const eventSlugMap = new Map<string, string>();
  const { data: dbEvents } = await supabase.from("events").select("id, slug");
  dbEvents?.forEach((e) => {
    if (e.slug) eventSlugMap.set(e.slug, e.id);
  });

  for (const e of seedStore.events) {
    const realOrganizerId = profileIdMap.get(e.organizerId) || toUuid(e.organizerId)!;
    let eventUuid = (e.slug ? eventSlugMap.get(e.slug) : null) || toUuid(e.id)!;

    const { error: evErr } = await supabase.from("events").upsert(
      {
        id: eventUuid,
        chapter_id: CHAPTER_ID,
        title: e.title,
        banner_emoji: e.bannerEmoji,
        description: e.description,
        venue: e.venue,
        starts_at: e.startsAt,
        ends_at: e.endsAt,
        organizer_id: realOrganizerId,
        capacity: e.capacity,
        waitlist_capacity: e.waitlistCapacity,
        visibility: e.visibility,
        registration_start: e.registrationStart,
        registration_end: e.registrationEnd,
        status: e.status,
        certificate_enabled: e.certificateEnabled,
        ticket_no: e.ticketNo,
        category: e.category,
        slug: e.slug,
        banner_url: e.bannerUrl,
      },
      { onConflict: "id" },
    );
    if (evErr) console.error("Events seed error for:", e.title, evErr);
  }

  // 12. Projects
  console.log("Seeding Projects:", seedStore.projects.length);
  for (const p of seedStore.projects) {
    const { error: prErr } = await supabase.from("projects").upsert(
      {
        id: toUuid(p.id)!,
        chapter_id: CHAPTER_ID,
        title: p.title,
        stage: p.stage,
        project_type: p.projectType,
        description: p.description,
        progress: p.progress,
        awards: p.awards || [],
      },
      { onConflict: "id" },
    );
    if (prErr) console.error("Projects seed error for:", p.title, prErr);
  }

  // 13. Reports
  console.log("Seeding Reports:", seedStore.reports.length);
  for (const r of seedStore.reports) {
    const { error: repErr } = await supabase.from("reports").upsert(
      {
        id: toUuid(r.id)!,
        chapter_id: CHAPTER_ID,
        type: r.type,
        title: r.title,
        summary: r.summary,
        body_html: r.bodyHtml,
        status: r.status,
        submitted_by: profileIdMap.get(r.submittedBy) || toUuid(r.submittedBy)!,
        submitted_at: r.submittedAt,
      },
      { onConflict: "id" },
    );
    if (repErr) console.error("Reports seed error for:", r.title, repErr);
  }

  // 14. Forms
  console.log("Seeding Forms:", seedStore.forms.length);
  for (const f of seedStore.forms) {
    const { error: fErr } = await supabase.from("forms").upsert(
      {
        id: toUuid(f.id)!,
        chapter_id: CHAPTER_ID,
        purpose: f.purpose,
        title: f.title,
        description: f.description,
        status: f.status,
        schema: f.questions || [],
      },
      { onConflict: "id" },
    );
    if (fErr) console.error("Forms seed error for:", f.title, fErr);
  }

  // 15. Certificates
  console.log("Seeding Certificates:", seedStore.certificates.length);
  for (const cert of seedStore.certificates) {
    const { error: certErr } = await supabase.from("certificates").upsert(
      {
        id: toUuid(cert.id)!,
        certificate_id: cert.certificateId,
        event_id: (cert.eventId ? eventSlugMap.get(cert.eventId) : null) || toUuid(cert.eventId)!,
        user_id: profileIdMap.get(cert.userId) || toUuid(cert.userId)!,
        issued_at: cert.issuedAt,
        verification_qr: cert.verificationQr,
        digital_signature: cert.digitalSignature,
      },
      { onConflict: "certificate_id" },
    );
    if (certErr) console.error("Certificates seed error for:", cert.certificateId, certErr);
  }

  console.log("Successfully completed seeding ALL 100% hardcoded data into Supabase!");
}

seed().catch(console.error);
