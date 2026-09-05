import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/lib/public/http";
import { revalidateWeb } from "@/lib/public/catalog";
import { isUuid, genUuid } from "@/lib/uuid";

// Default Root Organization UUID seeded in database migration 001/002
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: Request) {
  try {
    const admin = createServiceClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase service client not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { type, data } = body;

    // 1. EVENT MUTATIONS
    if (type === "event") {
      const event = data;
      if (!isUuid(event.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const organizerId = isUuid(event.organizerId)
        ? event.organizerId
        : "11111111-1111-1111-1111-111111111111";

      const slug = event.slug ?? slugify(event.title || "event");
      const eventId = isUuid(event.id) ? event.id : (event._dbId && isUuid(event._dbId) ? event._dbId : genUuid());
      const { error } = await admin.from("events").upsert({
        id: eventId,
        chapter_id: event.chapterId,
        cluster_id: isUuid(event.clusterId) ? event.clusterId : null,
        title: event.title,
        description: event.description,
        venue: event.venue || "Main Campus Auditorium",
        starts_at: event.startsAt,
        ends_at: event.endsAt,
        faculty_id: isUuid(event.facultyId) ? event.facultyId : null,
        organizer_id: organizerId,
        capacity: event.capacity ?? 100,
        waitlist_capacity: event.waitlistCapacity ?? 20,
        visibility: event.visibility ?? "chapter_only",
        registration_start: event.registrationStart ?? event.startsAt,
        registration_end: event.registrationEnd ?? event.endsAt,
        status: event.status ?? "draft",
        certificate_enabled: event.certificateEnabled ?? true,
        ticket_no: event.ticketNo,
        category: event.category?.toLowerCase(),
        slug,
        published_at: event.publishedAt ?? (event.visibility === "public" ? new Date().toISOString() : null),
        summary: event.summary ?? event.description,
        banner_url: event.bannerUrl,
        banner_emoji: event.bannerEmoji ?? "◆",
        mode: event.mode ?? "in_person",
      });

      if (error) {
        console.error("Mutation error (event):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      await revalidateWeb(["events", `event:${slug}`, `chapter:${event.chapterId}`]);
      return NextResponse.json({ ok: true, id: eventId });
    }

    if (type === "delete_event") {
      const { id, slug } = data;
      const { error } = await admin.from("events").delete().match(isUuid(id) ? { id } : { slug: slug || id });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["events", `event:${slug}`]);
      return NextResponse.json({ ok: true });
    }

    // 2. PROJECT MUTATIONS
    if (type === "project") {
      const p = data;
      if (!isUuid(p.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const slug = p.slug ?? slugify(p.title || "project");
      const projId = isUuid(p.id) ? p.id : genUuid();
      const { error } = await admin.from("projects").upsert({
        id: projId,
        chapter_id: p.chapterId,
        cluster_id: isUuid(p.clusterId) ? p.clusterId : null,
        title: p.title,
        slug,
        description: p.description ?? p.tagline,
        stage: p.stage ?? (p.status === "live" ? "production" : "active"),
        project_type: p.projectType ?? p.type ?? "internal",
        repository_url: p.repositoryUrl ?? p.repo,
        progress: p.progress ?? 100,
        demo_url: p.demoUrl ?? p.live,
        is_showcased: p.isShowcased ?? true,
      });

      if (error) {
        console.error("Mutation error (project):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["projects", `project:${slug}`]);
      return NextResponse.json({ ok: true, id: projId });
    }

    if (type === "delete_project") {
      const { id, slug } = data;
      const { error } = await admin.from("projects").delete().match(isUuid(id) ? { id } : { slug: slug || id });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["projects", `project:${slug}`]);
      return NextResponse.json({ ok: true });
    }

    // 3. CLUSTER MUTATIONS
    if (type === "cluster") {
      const c = data;
      if (!isUuid(c.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const slug = c.slug ?? slugify(c.title || c.name || "cluster");
      const clusterId = isUuid(c.id) ? c.id : genUuid();
      const { error } = await admin.from("clusters").upsert({
        id: clusterId,
        chapter_id: c.chapterId,
        name: c.name ?? c.title,
        slug,
        description: c.description ?? c.subtitle,
        access_mode: c.accessMode ?? "open",
        roadmap: c.roadmap || [],
      });

      if (error) {
        console.error("Mutation error (cluster):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["peer-labs", `cluster:${slug}`]);
      return NextResponse.json({ ok: true, id: clusterId });
    }

    if (type === "delete_cluster") {
      const { id, slug } = data;
      const { error } = await admin.from("clusters").delete().match(isUuid(id) ? { id } : { slug: slug || id });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["peer-labs", `cluster:${slug}`]);
      return NextResponse.json({ ok: true });
    }

    // 3.5. ORGANIZATION MUTATIONS
    if (type === "organization") {
      const org = data;
      const orgId = isUuid(org.id) ? org.id : DEFAULT_ORG_ID;
      const { error } = await admin.from("organizations").upsert({
        id: orgId,
        name: org.name,
        slug: org.slug ?? "elevates",
        tagline: org.tagline,
        brand_kit: org.brandKit,
      });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // 4. CHAPTER MUTATIONS
    if (type === "chapter") {
      const chapter = data;
      const chapterId = isUuid(chapter.id) ? chapter.id : genUuid();
      const { error } = await admin.from("chapters").upsert({
        id: chapterId,
        organization_id: isUuid(chapter.organizationId) ? chapter.organizationId : DEFAULT_ORG_ID,
        name: chapter.name,
        slug: chapter.slug,
        college: chapter.college,
        city: chapter.city,
        status: chapter.status,
        health_score: chapter.healthScore ?? 0,
        published: chapter.published ?? false,
        district: chapter.district,
        logo_url: chapter.logoUrl,
        member_count: chapter.memberCount ?? 0,
        event_count: chapter.eventCount ?? 0,
        project_count: chapter.projectCount ?? 0,
      });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["chapters", `chapter:${chapter.slug}`]);
      return NextResponse.json({ ok: true, id: chapterId });
    }

    if (type === "delete_chapter") {
      const { id, slug } = data;
      const { error } = await admin.from("chapters").delete().match(isUuid(id) ? { id } : { slug: slug || id });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["chapters", `chapter:${slug}`]);
      return NextResponse.json({ ok: true });
    }

    // 5. REGISTRATION MUTATIONS
    if (type === "registration") {
      const reg = data;
      const regId = isUuid(reg.id) ? reg.id : genUuid();
      let validUserId = null;
      if (isUuid(reg.userId)) {
        const { data: prof } = await admin.from("profiles").select("id").eq("id", reg.userId).maybeSingle();
        if (prof) validUserId = prof.id;
      }
      const { error } = await admin.from("event_registrations").upsert({
        id: regId,
        event_id: isUuid(reg.eventId) ? reg.eventId : null,
        user_id: validUserId,
        guest_email: reg.guestEmail || null,
        guest_name: reg.guestName || null,
        status: reg.status ?? "pending",
        representative_id: isUuid(reg.representativeId) ? reg.representativeId : null,
        answers: reg.answers || {},
        qr_code: reg.qrCode || "",
        reviewed_by: isUuid(reg.reviewedBy) ? reg.reviewedBy : null,
        approved_by: isUuid(reg.approvedBy) ? reg.approvedBy : null,
      });

      if (error) {
        console.error("Mutation error (registration):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: regId });
    }

    if (type === "delete_registration") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("event_registrations").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 6. ATTENDANCE MUTATIONS
    if (type === "attendance") {
      const att = data;
      const attId = isUuid(att.id) ? att.id : genUuid();
      let validUserId = null;
      if (isUuid(att.userId)) {
        const { data: prof } = await admin.from("profiles").select("id").eq("id", att.userId).maybeSingle();
        if (prof) validUserId = prof.id;
      }
      const rec = {
        id: attId,
        event_id: isUuid(att.eventId) ? att.eventId : null,
        registration_id: isUuid(att.registrationId) ? att.registrationId : null,
        user_id: validUserId,
        status: att.status ?? "present",
        method: att.method ?? "qr",
        checked_in_at: att.checkedInAt ?? new Date().toISOString(),
        checked_in_by: isUuid(att.checkedInBy) ? att.checkedInBy : null,
      };

      await Promise.allSettled([
        admin.from("attendance").upsert(rec),
        admin.from("attendance_records").upsert({
          ...rec,
          session_id: att.sessionId || att.session || "single",
          session_name: att.sessionName || "Event Check-In",
        }),
      ]);

      return NextResponse.json({ ok: true, id: attId });
    }

    if (type === "bulk_attendance") {
      const { records } = data;
      if (Array.isArray(records) && records.length > 0) {
        const rows = await Promise.all(records.map(async (att: any) => {
          let validUserId = null;
          if (isUuid(att.userId)) {
            const { data: prof } = await admin.from("profiles").select("id").eq("id", att.userId).maybeSingle();
            if (prof) validUserId = prof.id;
          }
          return {
            id: isUuid(att.id) ? att.id : genUuid(),
            event_id: isUuid(att.eventId) ? att.eventId : null,
            registration_id: isUuid(att.registrationId) ? att.registrationId : null,
            user_id: validUserId,
            status: att.status ?? "present",
            method: att.method ?? "bulk",
            checked_in_at: att.checkedInAt ?? new Date().toISOString(),
            checked_in_by: isUuid(att.checkedInBy) ? att.checkedInBy : null,
          };
        }));
        await admin.from("attendance").upsert(rows);
      }
      return NextResponse.json({ ok: true });
    }

    // 7. CERTIFICATE MUTATIONS
    if (type === "certificate") {
      const cert = data;
      const certId = isUuid(cert.id) ? cert.id : genUuid();
      let validUserId = null;
      if (isUuid(cert.userId)) {
        const { data: prof } = await admin.from("profiles").select("id").eq("id", cert.userId).maybeSingle();
        if (prof) validUserId = prof.id;
      }
      if (!validUserId) {
        // Certificates table requires non-null user_id referencing profiles(id)
        console.warn("Certificate user_id does not reference an existing profile, skipping DB sync:", cert.userId);
        return NextResponse.json({ ok: true, id: certId, skipped: true });
      }

      const { error } = await admin.from("certificates").upsert({
        id: certId,
        certificate_id: cert.certificateId,
        event_id: isUuid(cert.eventId) ? cert.eventId : null,
        user_id: validUserId,
        issued_at: cert.issuedAt ?? new Date().toISOString(),
        verification_qr: cert.verificationQr ?? "",
        digital_signature: cert.digitalSignature ?? "",
      }, { onConflict: "certificate_id" });

      if (error) {
        console.error("Mutation error (certificate):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: certId });
    }

    // 8. FORM MUTATIONS
    if (type === "form") {
      const form = data;
      if (!isUuid(form.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const formId = isUuid(form.id) ? form.id : genUuid();
      const { error } = await admin.from("forms").upsert({
        id: formId,
        chapter_id: form.chapterId,
        event_id: isUuid(form.eventId) ? form.eventId : null,
        title: form.title,
        description: form.description,
        purpose: form.purpose ?? "custom",
        schema: form.questions ?? [],
        status: form.status ?? "draft",
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Mutation error (form):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: formId });
    }

    if (type === "delete_form") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("forms").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 9. FORM RESPONSE MUTATIONS
    if (type === "form_response") {
      const resp = data;
      const respId = isUuid(resp.id) ? resp.id : genUuid();
      let validUserId = null;
      if (isUuid(resp.userId)) {
        const { data: prof } = await admin.from("profiles").select("id").eq("id", resp.userId).maybeSingle();
        if (prof) validUserId = prof.id;
      }
      const { error } = await admin.from("form_responses").upsert({
        id: respId,
        form_id: isUuid(resp.formId) ? resp.formId : null,
        user_id: validUserId,
        event_id: isUuid(resp.eventId) ? resp.eventId : null,
        answers: resp.answers ?? {},
        submitted_at: resp.submittedAt ?? new Date().toISOString(),
      });

      if (error) {
        console.error("Mutation error (form_response):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: respId });
    }

    if (type === "delete_form_response") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("form_responses").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 10. REPORT MUTATIONS
    if (type === "report") {
      const rep = data;
      if (!isUuid(rep.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const reportId = isUuid(rep.id) ? rep.id : genUuid();
      const { error } = await admin.from("reports").upsert({
        id: reportId,
        chapter_id: rep.chapterId,
        event_id: isUuid(rep.eventId) ? rep.eventId : null,
        type: rep.type ?? "event",
        title: rep.title,
        summary: rep.summary,
        body_html: rep.bodyHtml,
        body_json: typeof rep.bodyJson === "string" ? (() => { try { return JSON.parse(rep.bodyJson); } catch { return null; } })() : rep.bodyJson,
        images: rep.images ?? [],
        source: rep.source ?? "manual",
        status: rep.status ?? "draft",
        submitted_by: isUuid(rep.submittedBy) ? rep.submittedBy : null,
        submitted_at: rep.submittedAt,
        hq_comment: rep.hqComment,
        approved_by: isUuid(rep.approvedBy) ? rep.approvedBy : null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Mutation error (report):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: reportId });
    }

    if (type === "delete_report") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("reports").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 11. TASK MUTATIONS
    if (type === "task") {
      const task = data;
      if (!isUuid(task.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const taskId = isUuid(task.id) ? task.id : genUuid();
      const { error } = await admin.from("tasks").upsert({
        id: taskId,
        chapter_id: task.chapterId,
        event_id: isUuid(task.eventId) ? task.eventId : null,
        title: task.title,
        category: task.category ?? "documentation",
        assignee_id: isUuid(task.assigneeId) ? task.assigneeId : null,
        status: task.status ?? "pending",
        due_date: task.dueDate,
      });

      if (error) {
        console.error("Mutation error (task):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: taskId });
    }

    if (type === "delete_task") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("tasks").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 12. GUIDELINE MUTATIONS
    if (type === "guideline") {
      const g = data;
      const guidelineId = isUuid(g.id) ? g.id : genUuid();
      const { error } = await admin.from("guidelines").upsert({
        id: guidelineId,
        organization_id: isUuid(g.organizationId) ? g.organizationId : DEFAULT_ORG_ID,
        title: g.title,
        category: g.category ?? "General",
        version: g.version ?? "1.0",
        summary: g.summary,
        sections: g.sections ?? [],
        body: g.body,
        status: g.status ?? "published",
        related_href: g.relatedHref,
        updated_by: isUuid(g.updatedBy) ? g.updatedBy : null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Mutation error (guideline):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: guidelineId });
    }

    if (type === "delete_guideline") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("guidelines").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 13. RESOURCE MUTATIONS
    if (type === "resource") {
      const res = data;
      const resourceId = isUuid(res.id) ? res.id : genUuid();
      const { error } = await admin.from("resources").upsert({
        id: resourceId,
        organization_id: isUuid(res.organizationId) ? res.organizationId : DEFAULT_ORG_ID,
        title: res.title,
        category: res.category ?? "General",
        description: res.description,
        uploaded_by: isUuid(res.uploadedBy) ? res.uploadedBy : null,
        url: res.url,
      });

      if (error) {
        console.error("Mutation error (resource):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: resourceId });
    }

    if (type === "delete_resource") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("resources").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 14. DEPARTMENT MUTATIONS
    if (type === "department") {
      const dept = data;
      if (!isUuid(dept.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const deptId = isUuid(dept.id) ? dept.id : genUuid();
      const { error } = await admin.from("departments").upsert({
        id: deptId,
        chapter_id: dept.chapterId,
        name: dept.name,
      });

      if (error) {
        console.error("Mutation error (department):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: deptId });
    }

    if (type === "delete_department") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("departments").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 15. CLASS COHORT MUTATIONS
    if (type === "class_cohort") {
      const cohort = data;
      if (!isUuid(cohort.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const cohortId = isUuid(cohort.id) ? cohort.id : genUuid();
      const repId = Array.isArray(cohort.repIds) && cohort.repIds.length > 0 && isUuid(cohort.repIds[0]) ? cohort.repIds[0] : (isUuid(cohort.representativeId) ? cohort.representativeId : null);
      const { error } = await admin.from("class_cohorts").upsert({
        id: cohortId,
        chapter_id: cohort.chapterId,
        department: cohort.department,
        year: cohort.year,
        section: cohort.section,
        rep_ids: repId ? [repId] : [],
      });

      if (error) {
        console.error("Mutation error (class_cohort):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: cohortId });
    }

    if (type === "delete_class_cohort") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("class_cohorts").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 16. LEADERSHIP TERM & ASSIGNMENT MUTATIONS
    if (type === "leadership_term") {
      const term = data;
      if (!isUuid(term.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const termId = isUuid(term.id) ? term.id : genUuid();
      const { error } = await admin.from("leadership_terms").upsert({
        id: termId,
        chapter_id: term.chapterId,
        academic_year: term.academicYear,
        title: term.title,
        start_date: term.startDate,
        end_date: term.endDate,
        status: term.status ?? "active",
        handover_notes: term.handoverNotes,
      });

      if (error) {
        console.error("Mutation error (leadership_term):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: termId });
    }

    if (type === "leadership_assignment") {
      const la = data;
      const laId = isUuid(la.id) ? la.id : genUuid();
      const { error } = await admin.from("leadership_assignments").upsert({
        id: laId,
        term_id: isUuid(la.termId) ? la.termId : null,
        user_id: isUuid(la.userId) ? la.userId : null,
        role_key: la.roleKey,
        title: la.title,
      });

      if (error) {
        console.error("Mutation error (leadership_assignment):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: laId });
    }

    if (type === "delete_leadership_assignment") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("leadership_assignments").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 17. ACTIVITY LOG MUTATIONS
    if (type === "activity_log") {
      const logItem = data;
      const logId = isUuid(logItem.id) ? logItem.id : genUuid();
      const actorId = isUuid(logItem.actorId) ? logItem.actorId : (isUuid(logItem.userId) ? logItem.userId : null);
      await admin.from("activity_logs").insert({
        id: logId,
        actor_id: actorId,
        action: logItem.action,
        entity: logItem.entity,
        entity_id: logItem.entityId || logItem.id || "",
        meta: typeof logItem.meta === "object" ? JSON.stringify(logItem.meta) : logItem.meta,
        created_at: logItem.createdAt ?? new Date().toISOString(),
      });
      return NextResponse.json({ ok: true, id: logId });
    }

    // 18. NOTIFICATION MUTATIONS
    if (type === "notification") {
      const notif = data;
      const notifId = isUuid(notif.id) ? notif.id : genUuid();
      if (isUuid(notif.userId)) {
        await admin.from("notifications").upsert({
          id: notifId,
          user_id: notif.userId,
          title: notif.title,
          body: notif.body,
          read: Boolean(notif.read),
          href: notif.href,
        });
      }
      return NextResponse.json({ ok: true, id: notifId });
    }

    if (type === "mark_notification_read") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("notifications").update({ read: true }).eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 19. ANNOUNCEMENT MUTATIONS
    if (type === "announcement") {
      const ann = data;
      const annId = isUuid(ann.id) ? ann.id : genUuid();
      const { error } = await admin.from("announcements").upsert({
        id: annId,
        audience: ann.audience ?? "global",
        chapter_id: isUuid(ann.chapterId) ? ann.chapterId : null,
        cluster_id: isUuid(ann.clusterId) ? ann.clusterId : null,
        title: ann.title,
        body: ann.body,
        author_id: isUuid(ann.authorId) ? ann.authorId : null,
      });

      if (error) {
        console.error("Mutation error (announcement):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: annId });
    }

    // 20. EVENT PERMISSION MUTATIONS
    if (type === "event_permission") {
      const ep = data;
      const epId = isUuid(ep.id) ? ep.id : genUuid();
      const { error } = await admin.from("event_permissions").upsert({
        id: epId,
        event_id: isUuid(ep.eventId) ? ep.eventId : null,
        user_id: isUuid(ep.userId) ? ep.userId : null,
        permission_type: ep.permissionType,
        is_temporary: Boolean(ep.isTemporary),
        granted_by: isUuid(ep.grantedBy) ? ep.grantedBy : null,
        granted_at: ep.grantedAt ?? new Date().toISOString(),
        expires_at: ep.expiresAt,
      });

      if (error) {
        console.error("Mutation error (event_permission):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: epId });
    }

    if (type === "delete_event_permission") {
      const { id } = data;
      if (isUuid(id)) {
        await admin.from("event_permissions").delete().eq("id", id);
      }
      return NextResponse.json({ ok: true });
    }

    // 21. PROFILE & USER ROLES MUTATIONS
    if (type === "profile") {
      const p = data;
      if (isUuid(p.id)) {
        await admin.from("profiles").upsert({
          id: p.id,
          full_name: p.fullName,
          email: p.email,
          avatar_url: p.avatarUrl,
          phone: p.phone,
          department: p.department,
          year: p.year,
          section: p.section,
          chapter_id: isUuid(p.chapterId) ? p.chapterId : null,
          status: p.status ?? "active",
          is_public: Boolean(p.isPublic),
          bio: p.bio,
          skills: p.skills ?? [],
          interests: p.interests ?? [],
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "user_roles") {
      const { userId, assignments, organizationId } = data;
      if (!isUuid(userId) || !Array.isArray(assignments)) {
        return NextResponse.json({ ok: false, error: "Invalid user_roles parameters" }, { status: 400 });
      }

      // 1. Fetch all roles from database to map role_key -> role_id
      const { data: dbRoles } = await admin.from("roles").select("id, key");
      const roleIdMap = new Map<string, string>();
      if (dbRoles) {
        for (const r of dbRoles) {
          if (r.key && r.id) roleIdMap.set(r.key, r.id);
        }
      }

      // 2. Delete existing non-leadership user_roles for this user
      const { error: delError } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .is("leadership_term_id", null);

      if (delError) {
        console.error("Error deleting old user_roles:", delError);
        return NextResponse.json({ ok: false, error: delError.message }, { status: 400 });
      }

      let primaryChapterId: string | null = null;

      const rows = assignments.map((a: any) => {
        const chapId = isUuid(a.chapterId) ? a.chapterId : null;
        if (chapId && !primaryChapterId) {
          primaryChapterId = chapId;
        }

        let roleId = roleIdMap.get(a.roleKey) || null;
        if (!roleId && a.roleKey === "campus_lead") {
          roleId = roleIdMap.get("chairman") || null;
        } else if (!roleId && a.roleKey === "chairman") {
          roleId = roleIdMap.get("campus_lead") || null;
        }

        return {
          user_id: userId,
          role_key: a.roleKey,
          role_id: roleId,
          chapter_id: chapId,
          organization_id: isUuid(a.organizationId)
            ? a.organizationId
            : isUuid(organizationId)
            ? organizationId
            : DEFAULT_ORG_ID,
          is_permanent: true,
        };
      });

      if (rows.length > 0) {
        const { error: insError } = await admin.from("user_roles").insert(rows);
        if (insError) {
          console.error("Error inserting user_roles into Supabase:", insError);
          return NextResponse.json({ ok: false, error: insError.message }, { status: 400 });
        }
      }

      // 3. Keep profiles.chapter_id synchronized if chapter assigned
      if (primaryChapterId) {
        await admin
          .from("profiles")
          .update({ chapter_id: primaryChapterId })
          .eq("id", userId);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `Unknown mutation type: ${type}` }, { status: 400 });
  } catch (err: any) {
    console.error("Mutation handler exception:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
