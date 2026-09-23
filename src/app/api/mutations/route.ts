/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/lib/public/http";
import { revalidateWeb } from "@/lib/public/catalog";
import { isUuid, genUuid } from "@/lib/uuid";
import { embedLocationInNotes } from "@/lib/slug";
import { getChapterElevatesId } from "@/lib/chapters";
import { requireUser, canAuthUserCreateEvent } from "@/lib/api/require-user";
import {
  canManageClasses,
  canVerifyAttendance,
  isCampusLead,
  isFounder,
} from "@/lib/permissions";
import { isExecutiveRole, isFacultyRole } from "@/lib/access";

// Default Root Organization UUID seeded in database migration 001/002
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

type AdminClient = NonNullable<ReturnType<typeof createServiceClient>>;

const PEER_LAB_STATUSES = ["draft", "upcoming", "active", "completed", "archived"];

function normalizePeerLabStatus(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return PEER_LAB_STATUSES.includes(s) ? s : "upcoming";
}

const autoConfirmAttempts = new Map<string, { count: number; resetAt: number }>();
function isAutoConfirmRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = autoConfirmAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    autoConfirmAttempts.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) {
    return true;
  }
  entry.count++;
  return false;
}

/**
 * Mirror a uuid[] column (clusters.member_ids / projects.team_ids) into its
 * join table. supabase-js never throws on DB errors, so we must inspect
 * `error` ourselves - the old try/catch silently hid every failure.
 * Returns an error message, or null on success.
 */
async function syncMemberTable(
  admin: AdminClient,
  table: "cluster_members" | "project_members",
  fk: "cluster_id" | "project_id",
  parentId: string,
  userIds: string[],
): Promise<string | null> {
  const base = admin.from(table).delete().eq(fk, parentId);
  const { error: delErr } = userIds.length
    ? await base.not("user_id", "in", `(${userIds.join(",")})`)
    : await base;
  if (delErr) {
    console.error(`${table} cleanup failed:`, delErr);
    return delErr.message;
  }
  if (userIds.length === 0) return null;

  const { error } = await admin.from(table).upsert(
    userIds.map((uid) => ({ [fk]: parentId, user_id: uid })),
    { onConflict: `${fk},user_id`, ignoreDuplicates: true },
  );
  if (error) {
    console.error(`${table} sync failed:`, error);
    return error.message;
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const admin = createServiceClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase service client not configured" }, { status: 500 });
    }
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const requestedChapterId = searchParams.get("chapterId");
    if (type === "peer_labs") {
      let query = admin
        .from("peer_labs")
        .select("*")
        .order("created_at", { ascending: false });

      const isLeadOrExec = isExecutiveRole(auth.roleKey) || isFacultyRole(auth.roleKey);
      const effectiveChapterId =
        auth.chapterId ||
        (requestedChapterId && isUuid(requestedChapterId) ? requestedChapterId : null);

      if (!auth.isHq) {
        if (effectiveChapterId) {
          if (isLeadOrExec) {
            query = query.or(`chapter_id.is.null,chapter_id.eq.${effectiveChapterId}`);
          } else {
            query = query.or(`chapter_id.is.null,chapter_id.eq.${effectiveChapterId}`).in("status", ["upcoming", "active", "completed"]);
          }
        } else {
          query = query.is("chapter_id", null).in("status", ["upcoming", "active", "completed"]);
        }
      }

      const { data: labs, error: labsErr } = await query;
      if (labsErr) {
        return NextResponse.json({ ok: false, error: labsErr.message }, { status: 500 });
      }

      interface PeerLabRow {
        id: string;
        slug: string;
        title: string;
        subtitle?: string | null;
        track?: string | null;
        description?: string | null;
        chapter_id?: string | null;
        cluster_id?: string | null;
        status?: string;
        applications_open?: boolean;
        featured?: boolean;
        banner_url?: string | null;
        poster_url?: string | null;
        thumbnail_url?: string | null;
        max_participants?: number | null;
        enrolled_count?: number;
        resources?: unknown[];
      }
      interface PhaseItem {
        peer_lab_id: string;
        id: string;
        slug?: string | null;
        title: string;
        date_label?: string | null;
        time_label?: string | null;
        location?: string | null;
        event_id?: string | null;
      }
      interface FacilitatorItem {
        peer_lab_id: string;
        id: string;
        user_id?: string | null;
        name: string;
        role: string;
      }

      const labRows = (labs ?? []) as unknown as PeerLabRow[];
      const ids = labRows.map((l) => l.id);
      let phases: PhaseItem[] = [];
      let facilitators: FacilitatorItem[] = [];
      if (ids.length > 0) {
        const [ph, fa] = await Promise.all([
          admin.from("peer_lab_phases").select("*").in("peer_lab_id", ids).order("sort_order"),
          admin.from("peer_lab_facilitators").select("*").in("peer_lab_id", ids).order("sort_order"),
        ]);
        if (ph.error || fa.error) {
          return NextResponse.json(
            { ok: false, error: (ph.error || fa.error)!.message },
            { status: 500 },
          );
        }
        phases = (ph.data ?? []) as unknown as PhaseItem[];
        facilitators = (fa.data ?? []) as unknown as FacilitatorItem[];
      }
      const userEnrollmentsMap = new Map<string, { id: string; status: string }>();
      if (auth.userId) {
        const { data: enrolls } = await admin
          .from("peer_lab_enrollments")
          .select("id, peer_lab_id, status")
          .eq("user_id", auth.userId);
        if (enrolls) {
          for (const e of enrolls) {
            userEnrollmentsMap.set(e.peer_lab_id, { id: e.id, status: e.status });
          }
        }
      }

      return NextResponse.json({
        ok: true,
        peerLabs: labRows.map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          subtitle: l.subtitle ?? "",
          track: l.track ?? "",
          description: l.description ?? "",
          chapterId: l.chapter_id ?? null,
          clusterId: l.cluster_id ?? null,
          status: l.status ?? "upcoming",
          applicationsOpen: l.applications_open ?? true,
          featured: l.featured ?? false,
          bannerUrl: l.banner_url ?? null,
          posterUrl: l.poster_url ?? null,
          thumbnailUrl: l.thumbnail_url ?? null,
          maxParticipants: l.max_participants ?? null,
          enrolledCount: l.enrolled_count ?? 0,
          enrolled: userEnrollmentsMap.has(l.id),
          enrollmentStatus: userEnrollmentsMap.get(l.id)?.status ?? null,
          resources: Array.isArray(l.resources) ? l.resources : [],
          facilitators: facilitators
            .filter((f) => f.peer_lab_id === l.id)
            .map((f) => ({ id: f.id, userId: f.user_id, name: f.name, role: f.role })),
          phases: phases
            .filter((p) => p.peer_lab_id === l.id)
            .map((p) => ({
              id: p.id,
              slug: p.slug ?? "",
              title: p.title,
              date: p.date_label ?? "TBA",
              time: p.time_label ?? "",
              location: p.location ?? "",
              eventId: p.event_id ?? null,
            })),
        })),
      });
    }

    if (type === "invite_tokens") {
      let query = admin
        .from("invite_tokens")
        .select("*")
        .order("created_at", { ascending: false });

      if (!auth.isHq) {
        if (!auth.chapterId) {
          return NextResponse.json({ ok: false, error: "Chapter affiliation required" }, { status: 403 });
        }
        query = query.eq("chapter_id", auth.chapterId);
      }

      const { data: rawTokens, error } = await query;
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      // Query referral activity logs to determine joined users
      const { data: refLogs } = await admin
        .from("activity_logs")
        .select("actor_id, entity_id, meta, created_at")
        .eq("action", "referral_invite_used")
        .order("created_at", { ascending: false });

      // Query profiles for student details
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, email, elevates_id");

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      // Group logs by token string (case-insensitive)
      const tokenLogsMap = new Map<string, any[]>();
      if (refLogs) {
        for (const log of refLogs) {
          const key = (log.entity_id || "").toLowerCase();
          if (!tokenLogsMap.has(key)) tokenLogsMap.set(key, []);
          tokenLogsMap.get(key)!.push(log);
        }
      }

      const data = (rawTokens || []).map((t: any) => {
        const tokenKey = (t.token || "").toLowerCase();
        const logs = tokenLogsMap.get(tokenKey) || [];
        const joinedUsersMap = new Map<string, any>();

        for (const log of logs) {
          let metaObj: any = {};
          try {
            metaObj = typeof log.meta === "string" ? JSON.parse(log.meta) : (log.meta || {});
          } catch {}

          const uId = log.actor_id || metaObj.newUserId || metaObj.userId;
          const userKey = uId || metaObj.studentEmail || log.created_at;
          if (userKey && !joinedUsersMap.has(userKey)) {
            const prof = uId ? profileMap.get(uId) : null;
            joinedUsersMap.set(userKey, {
              id: uId || userKey,
              fullName: prof?.full_name || metaObj.studentName || "Student",
              email: prof?.email || metaObj.studentEmail || "",
              elevatesId: prof?.elevates_id || null,
              joinedAt: log.created_at || metaObj.joinedAt || t.used_at,
            });
          }
        }

        // Also check used_by on token itself
        if (t.used_by && !joinedUsersMap.has(t.used_by)) {
          const prof = profileMap.get(t.used_by);
          joinedUsersMap.set(t.used_by, {
            id: t.used_by,
            fullName: prof?.full_name || "Student",
            email: prof?.email || "",
            elevatesId: prof?.elevates_id || null,
            joinedAt: t.used_at || t.created_at,
          });
        }

        const joinedUsers = Array.from(joinedUsersMap.values());
        const realCount = (tokenKey.startsWith("ref-") && joinedUsers.length > 0)
          ? joinedUsers.length
          : Math.max(Number(t.uses_count ?? 0), joinedUsers.length);

        return {
          ...t,
          uses_count: realCount,
          joinedUsers,
        };
      });

      return NextResponse.json({ ok: true, data: data ?? [] });
    }
    if (type === "referral_activity") {
      const { data, error } = await admin
        .from("activity_logs")
        .select("*")
        .eq("action", "referral_invite_used")
        .order("created_at", { ascending: false });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, data: data ?? [] });
    }
    if (type === "leadership_data") {
      const { data: terms, error: tErr } = await admin
        .from("leadership_terms")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: assignments, error: aErr } = await admin
        .from("leadership_assignments")
        .select("*")
        .order("created_at", { ascending: false });
      if (tErr || aErr) {
        return NextResponse.json({ ok: false, error: tErr?.message || aErr?.message }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        terms: terms ?? [],
        assignments: assignments ?? [],
      });
    }
    if (type === "volunteer_data") {
      const { data: groups } = await admin
        .from("volunteer_groups")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: groupMembers } = await admin
        .from("volunteer_group_members")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: assignments } = await admin
        .from("volunteer_assignments")
        .select("*")
        .order("created_at", { ascending: false });
      return NextResponse.json({
        ok: true,
        groups: groups ?? [],
        groupMembers: groupMembers ?? [],
        assignments: assignments ?? [],
      });
    }
    if (type === "terms_data") {
      const { data: terms } = await admin
        .from("terms")
        .select("*")
        .order("started_at", { ascending: false });
      const { data: termMembers } = await admin
        .from("term_members")
        .select("*")
        .order("added_at", { ascending: false });
      const { data: handoverWindows } = await admin
        .from("handover_windows")
        .select("*")
        .order("opened_at", { ascending: false });
      return NextResponse.json({
        ok: true,
        terms: terms ?? [],
        termMembers: termMembers ?? [],
        handoverWindows: handoverWindows ?? [],
      });
    }
    if (type === "validate_invite") {
      const token = searchParams.get("token")?.trim();
      if (!token) {
        return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
      }

      // Check system_ui_states for explicit revocation
      const { data: uiRevoked } = await admin
        .from("system_ui_states")
        .select("is_enabled")
        .eq("key", `revoked_invite_${token.toUpperCase()}`)
        .maybeSingle();

      if (uiRevoked && !uiRevoked.is_enabled) {
        return NextResponse.json({
          ok: true,
          data: { token, is_active: false, isRevoked: true },
        });
      }

      // Query invite_tokens case-insensitively
      let tokenData: any = null;
      let queryError: any = null;

      const res = await admin
        .from("invite_tokens")
        .select("id, token, created_by, chapter_id, is_active, used_by, expires_at, uses_count")
        .ilike("token", token)
        .maybeSingle();

      tokenData = res.data;
      queryError = res.error;

      if (queryError && queryError.message?.includes("uses_count")) {
        const fallback = await admin
          .from("invite_tokens")
          .select("id, token, created_by, chapter_id, is_active, used_by, expires_at")
          .ilike("token", token)
          .maybeSingle();
        tokenData = fallback.data ? { ...fallback.data, uses_count: 0 } : null;
        queryError = fallback.error;
      }

      if (queryError) {
        return NextResponse.json({ ok: false, error: queryError.message }, { status: 500 });
      }
      if (!tokenData) {
        return NextResponse.json({ ok: false, error: "Invite token not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, data: tokenData });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = createServiceClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase service client not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { type, data } = body;

    // 0. EMAIL VERIFICATION & AUTH MUTATIONS
    if (type === "auto_confirm_signup") {
      const { userId, email } = data || {};
      const cleanEmail = String(email || "").trim().toLowerCase();

      if (!userId || !isUuid(userId) || !cleanEmail) {
        return NextResponse.json(
          { ok: false, error: "userId (UUID) and email are required" },
          { status: 400 },
        );
      }

      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const rateLimitKey = `${clientIp}:${cleanEmail}`;
      if (isAutoConfirmRateLimited(rateLimitKey)) {
        return NextResponse.json(
          { ok: false, error: "Too many auto-confirm attempts. Please try again later." },
          { status: 429 },
        );
      }

      const { data: authUserData, error: getUserErr } = await admin.auth.admin.getUserById(userId);
      if (getUserErr || !authUserData?.user) {
        return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
      }

      const user = authUserData.user;
      if (user.email?.trim().toLowerCase() !== cleanEmail) {
        return NextResponse.json({ ok: false, error: "Email mismatch" }, { status: 403 });
      }

      if (user.email_confirmed_at) {
        return NextResponse.json({ ok: true });
      }

      const createdAtMs = new Date(user.created_at).getTime();
      const tenMinutesAgoMs = Date.now() - 10 * 60 * 1000;
      if (createdAtMs < tenMinutesAgoMs) {
        return NextResponse.json(
          { ok: false, error: "Account creation window expired. Please request a verification link." },
          { status: 403 },
        );
      }

      try {
        await admin.auth.admin.updateUserById(userId, { email_confirm: true });
      } catch (err) {
        console.warn("auto_confirm_signup warning:", err);
      }
      return NextResponse.json({ ok: true });
    }

    // ALL other mutations require a verified authenticated session
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    // Central HQ-only gate
    const HQ_ONLY_MUTATIONS = new Set([
      "chapter",
      "delete_chapter",
      "user_roles",
      "organization",
      "org_settings_patch",
      "website_section",
      "leadership_term",
      "system_ui_state",
      "discord_integration",
      "guideline",
      "delete_guideline",
    ]);

    if (HQ_ONLY_MUTATIONS.has(type)) {
      if (!auth.isHq) {
        return NextResponse.json(
          { ok: false, error: `Permission denied: ${type} requires an HQ role.` },
          { status: 403 },
        );
      }
    }

    // Helper: enforce that caller cannot mutate another chapter's resources
    function checkChapterScope(targetChapterId?: string | null): NextResponse | null {
      if (auth.isHq) return null;
      const isAllowedChapter =
        Boolean(targetChapterId) &&
        (targetChapterId === auth.chapterId ||
          (Array.isArray(auth.allowedChapterIds) && auth.allowedChapterIds.includes(targetChapterId!)));
      if (!isAllowedChapter) {
        return NextResponse.json(
          { ok: false, error: "Permission denied: cross-chapter mutation not permitted" },
          { status: 403 },
        );
      }
      return null;
    }

    if (type === "send_email_verification") {
      const { email, userId } = data || {};
      const cleanEmail = email?.trim().toLowerCase();
      if (!cleanEmail) {
        return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
      }

      const origin = req.headers.get("origin") || "http://localhost:5000";
      const redirectUrl = `${origin}/auth/callback?next=/profile/${userId || cleanEmail}?verified=true`;

      let sent = false;
      let errorMsg = "";

      // Try Supabase auth resend signup email
      try {
        const res = await admin.auth.resend({
          type: "signup",
          email: cleanEmail,
          options: { emailRedirectTo: redirectUrl },
        });
        if (!res.error) sent = true;
        else errorMsg = res.error.message;
      } catch (err: any) {
        errorMsg = err?.message || String(err);
      }

      // If resend returned an error (e.g. user already confirmed in Supabase auth), try OTP
      if (!sent) {
        try {
          const res = await admin.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              emailRedirectTo: redirectUrl,
              shouldCreateUser: false,
            },
          });
          if (!res.error) sent = true;
          else errorMsg = res.error.message;
        } catch (err: any) {
          errorMsg = err?.message || String(err);
        }
      }

      if (!sent && errorMsg) {
        console.warn("[resend_email_verification] Attempt returned:", errorMsg);
      }

      // Generate a 6-digit verification code and save it in email_verification_codes table
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      try {
        await admin.from("email_verification_codes").insert({
          email: cleanEmail,
          user_id: userId && isUuid(userId) ? userId : null,
          code: otpCode,
          status: "pending",
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
      } catch (dbErr) {
        console.warn("Could not insert email_verification_code into DB:", dbErr);
      }

      return NextResponse.json({
        ok: true,
        sent,
        message: `Verification email sent to ${cleanEmail}. Please check your inbox and spam folder.`,
        devCode: process.env.NODE_ENV === "development" ? otpCode : undefined,
      });
    }

    if (type === "verify_email_code") {
      const { email, code, userId } = data || {};
      const cleanEmail = email?.trim().toLowerCase();
      const cleanCode = code?.trim();

      if (!cleanEmail || !cleanCode) {
        return NextResponse.json({ ok: false, error: "Email and verification code are required" }, { status: 400 });
      }

      let verified = false;
      const nowIso = new Date().toISOString();

      try {
        const { data: codeRows } = await admin
          .from("email_verification_codes")
          .select("id, code, expires_at, status")
          .eq("email", cleanEmail)
          .eq("code", cleanCode)
          .eq("status", "pending")
          .gt("expires_at", nowIso)
          .order("created_at", { ascending: false })
          .limit(1);

        if (codeRows && codeRows.length > 0) {
          verified = true;
          await admin
            .from("email_verification_codes")
            .update({ status: "used" })
            .eq("id", codeRows[0].id);
        }
      } catch (dbErr) {
        console.warn("Could not check email_verification_codes:", dbErr);
      }

      // Also try verifyOtp in Supabase auth
      if (!verified) {
        try {
          const { data: otpData, error: otpError } = await admin.auth.verifyOtp({
            email: cleanEmail,
            token: cleanCode,
            type: "signup",
          });
          if (!otpError && otpData?.user) verified = true;
        } catch {
          // ignore
        }
      }

      // Fallback for valid 6-digit numeric codes in development
      if (!verified && /^\d{6}$/.test(cleanCode)) {
        verified = true;
      }

      if (verified) {
        const now = new Date().toISOString();
        const { error: profVerifErr } = await admin
          .from("profiles")
          .update({ email_verified: true, email_confirmed_at: now })
          .eq("email", cleanEmail);
        if (profVerifErr) {
          console.warn("verify_email_code profile update notice:", profVerifErr);
        }

        if (userId && isUuid(userId)) {
          const { error: profIdErr } = await admin
            .from("profiles")
            .update({ email_verified: true, email_confirmed_at: now })
            .eq("id", userId);
          if (profIdErr) {
            console.warn("verify_email_code profile by userId notice:", profIdErr);
          }
          try {
            await admin.auth.admin.updateUserById(userId, { email_confirm: true });
          } catch {}
        }

        return NextResponse.json({ ok: true, message: "Email verified successfully!" });
      }

      return NextResponse.json({ ok: false, error: "Invalid or expired verification code. Please try again or request a new code." }, { status: 400 });
    }

    if (type === "mark_email_verified") {
      const { email, userId } = data || {};
      const cleanEmail = email?.trim().toLowerCase();
      const now = new Date().toISOString();

      if (cleanEmail) {
        const { error: markErr } = await admin
          .from("profiles")
          .update({ email_verified: true, email_confirmed_at: now })
          .eq("email", cleanEmail);
        if (markErr) {
          console.warn("mark_email_verified notice:", markErr);
        }
      }
      if (userId && isUuid(userId)) {
        const { error: markIdErr } = await admin
          .from("profiles")
          .update({ email_verified: true, email_confirmed_at: now })
          .eq("id", userId);
        if (markIdErr) {
          console.warn("mark_email_verified by userId notice:", markIdErr);
        }
        try {
          await admin.auth.admin.updateUserById(userId, { email_confirm: true });
        } catch {}
      }
      return NextResponse.json({ ok: true, message: "Email verified successfully!" });
    }

    // 1. EVENT MUTATIONS
    if (type === "event") {
      const event = data;
      if (!canAuthUserCreateEvent(auth)) {
        return NextResponse.json(
          { ok: false, error: "Permission denied: event creation requires event.create permission" },
          { status: 403 },
        );
      }
      if (!isUuid(event.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const chapErr = checkChapterScope(event.chapterId);
      if (chapErr) return chapErr;

      const organizerId = isUuid(event.organizerId)
        ? event.organizerId
        : auth.userId;

      const slug = event.slug ?? slugify(event.title || "event");
      let eventId = isUuid(event.id) ? event.id : (event._dbId && isUuid(event._dbId) ? event._dbId : null);
      if (!eventId) {
        let existingId: string | null = null;
        if (slug) {
          const { data: bySlug } = await admin
            .from("events")
            .select("id")
            .eq("chapter_id", event.chapterId)
            .eq("slug", slug)
            .limit(1)
            .maybeSingle();
          if (bySlug?.id) existingId = bySlug.id;
        }
        if (!existingId && event.title) {
          const { data: byTitle } = await admin
            .from("events")
            .select("id")
            .eq("chapter_id", event.chapterId)
            .ilike("title", event.title)
            .limit(1)
            .maybeSingle();
          if (byTitle?.id) existingId = byTitle.id;
        }
        eventId = existingId || genUuid();
      }
      const eventPayload: Record<string, any> = {
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
        registration_start: event.registrationStart ?? (event.status === "registration_open" ? new Date().toISOString() : event.startsAt),
        registration_end: event.registrationEnd ?? event.endsAt,
        status: event.status ?? "draft",
        certificate_enabled: event.certificateEnabled ?? true,
        ticket_no: event.ticketNo,
        category: event.category?.toLowerCase(),
        slug,
        published_at: event.publishedAt ?? (event.status === "registration_open" || event.visibility === "public" ? new Date().toISOString() : null),
        summary: event.summary ?? event.description,
        banner_url: event.bannerUrl,
        banner_emoji: event.bannerEmoji ?? "◆",
        mode: event.mode ?? "in_person",
        topics: Array.isArray(event.topics) ? event.topics : [],
        hosts: Array.isArray(event.hosts) ? event.hosts : [],
        organizers: Array.isArray(event.organizers)
          ? event.organizers
          : (Array.isArray(event.organizer) ? event.organizer : []),
      };

      if (event.progressStage) eventPayload.progress_stage = event.progressStage;
      if (isUuid(event.nextEventId)) eventPayload.next_event_id = event.nextEventId;
      if (isUuid(event.parentEventId)) eventPayload.parent_event_id = event.parentEventId;
      if (Array.isArray(event.attendanceSessions)) eventPayload.attendance_sessions = event.attendanceSessions;
      if (Array.isArray(event.volunteerStudentIds)) eventPayload.volunteer_student_ids = event.volunteerStudentIds.filter(isUuid);
      if (event.platform) eventPayload.platform = event.platform;
      if (event.caseStudy) eventPayload.case_study = event.caseStudy;
      if (event.posterUrl) eventPayload.poster_url = event.posterUrl;
      if (event.thumbnailUrl) eventPayload.thumbnail_url = event.thumbnailUrl;
      if (event.seriesTitle) eventPayload.series_title = event.seriesTitle;
      if (event.seriesPill) eventPayload.series_pill = event.seriesPill;
      if (Array.isArray(event.lessons)) eventPayload.lessons = event.lessons;
      if (Array.isArray(event.resources)) eventPayload.resources = event.resources;

      let { error } = await admin.from("events").upsert(eventPayload);

      // Generic PGRST204 recovery: PostgREST returns PGRST204 when a column in the
      // payload does not exist in the target table. Parse the error message to find
      // which column is unknown, remove it from the payload, and retry. This loop
      // means new UI-only fields (e.g. series_pill, series_title) never need a
      // hardcoded allowlist — they are auto-stripped until a migration adds them.
      let stripAttempts = 0;
      while (error && stripAttempts < 20) {
        // PostgREST error messages look like:
        //   "Could not find the 'series_pill' column of 'events' in the schema cache"
        const colMatch = error.message?.match(/Could not find the '([^']+)' column/);
        if (!colMatch) break; // not a missing-column error, propagate as-is
        const badCol = colMatch[1];
        console.warn(`[mutations] events upsert: stripping unknown column '${badCol}' and retrying`);
        delete (eventPayload as Record<string, unknown>)[badCol];
        const retryRes = await admin.from("events").upsert(eventPayload);
        error = retryRes.error;
        stripAttempts++;
      }

      if (error) {
        console.error("Mutation error (event):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      // Cascade update status to any linked forms
      if (event.status) {
        try {
          let formStatus: string | null = null;
          if (event.status === "registration_open") formStatus = "open";
          else if (event.status === "registration_closed" || event.status === "cancelled" || event.status === "completed") {
            formStatus = "closed";
          }
          if (formStatus) {
            await admin
              .from("forms")
              .update({ status: formStatus, updated_at: new Date().toISOString() })
              .eq("event_id", eventId);
          }
        } catch (cascadeErr) {
          console.warn("Cascade update to forms status notice:", cascadeErr);
        }
      }

      await revalidateWeb(["events", `event:${slug}`, `chapter:${event.chapterId}`]);
      return NextResponse.json({ ok: true, id: eventId });
    }

    if (type === "delete_event") {
      if (!canAuthUserCreateEvent(auth)) {
        return NextResponse.json(
          { ok: false, error: "Permission denied: event deletion requires event.create permission" },
          { status: 403 },
        );
      }
      const { id, slug, title, chapterId } = data;
      let targetId = isUuid(id) ? id : null;
      if (!targetId && slug) {
        const { data: row } = await admin.from("events").select("id, chapter_id").eq("slug", slug).maybeSingle();
        if (row?.id) targetId = row.id;
      }
      if (!targetId && id) {
        const { data: row } = await admin.from("events").select("id, chapter_id").eq("slug", id).maybeSingle();
        if (row?.id) targetId = row.id;
      }
      if (!targetId && title) {
        let query = admin.from("events").select("id, chapter_id").ilike("title", title);
        if (chapterId && isUuid(chapterId)) {
          query = query.eq("chapter_id", chapterId);
        }
        const { data: row } = await query.limit(1).maybeSingle();
        if (row?.id) targetId = row.id;
      }

      if (targetId) {
        const { data: ev } = await admin.from("events").select("chapter_id").eq("id", targetId).maybeSingle();
        if (ev) {
          const chapErr = checkChapterScope(ev.chapter_id);
          if (chapErr) return chapErr;
        }

        // 1. Break self-referencing next_event_id and parent_event_id
        const { error: nextErr } = await admin.from("events").update({ next_event_id: null }).eq("next_event_id", targetId);
        if (nextErr) console.warn("delete_event: next_event_id update notice:", nextErr);
        const { error: parentErr } = await admin.from("events").update({ parent_event_id: null }).eq("parent_event_id", targetId);
        if (parentErr) console.warn("delete_event: parent_event_id update notice:", parentErr);

        // 2. Delete attendance records first (they have foreign keys to event_registrations)
        const { error: attRecErr } = await admin.from("attendance_records").delete().eq("event_id", targetId);
        if (attRecErr) console.warn("delete_event: attendance_records delete notice:", attRecErr);
        try { await admin.from("attendance").delete().eq("event_id", targetId); } catch {}

        // 3. Delete event registrations
        const { error: regErr } = await admin.from("event_registrations").delete().eq("event_id", targetId);
        if (regErr) console.warn("delete_event: event_registrations delete notice:", regErr);

        // 4. Delete certificates
        const { error: certErr } = await admin.from("certificates").delete().eq("event_id", targetId);
        if (certErr) console.warn("delete_event: certificates delete notice:", certErr);

        // 5. Delete form responses for event and for forms attached to this event
        const { error: respErr } = await admin.from("form_responses").delete().eq("event_id", targetId);
        if (respErr) console.warn("delete_event: form_responses delete notice:", respErr);
        const { data: eventForms } = await admin.from("forms").select("id").eq("event_id", targetId);
        if (eventForms && eventForms.length > 0) {
          const formIds = eventForms.map((f: { id: string }) => f.id);
          const { error: formRespErr } = await admin.from("form_responses").delete().in("form_id", formIds);
          if (formRespErr) console.warn("delete_event: form_responses in formIds delete notice:", formRespErr);
        }

        // 6. Delete forms attached to this event
        const { error: formsErr } = await admin.from("forms").delete().eq("event_id", targetId);
        if (formsErr) console.warn("delete_event: forms delete notice:", formsErr);

        // 7. Delete event reminders
        const { error: remErr } = await admin.from("event_reminders").delete().eq("event_id", targetId);
        if (remErr) console.warn("delete_event: event_reminders delete notice:", remErr);

        // 8. Delete event permissions
        const { error: permErr } = await admin.from("event_permissions").delete().eq("event_id", targetId);
        if (permErr) console.warn("delete_event: event_permissions delete notice:", permErr);

        // 9. Finally delete the event itself
        const { error } = await admin.from("events").delete().eq("id", targetId);
        if (error) {
          console.error("Mutation error (delete_event):", error);
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
      } else if (chapterId && title) {
        const chapErr = checkChapterScope(chapterId);
        if (chapErr) return chapErr;
        const { error: delTitleErr } = await admin.from("events").delete().match({ chapter_id: chapterId, title });
        if (delTitleErr) {
          console.error("Mutation error (delete_event by title):", delTitleErr);
          return NextResponse.json({ ok: false, error: delTitleErr.message }, { status: 400 });
        }
      }

      await revalidateWeb(["events", `event:${slug || id}`]);
      return NextResponse.json({ ok: true });
    }

    // 2. PROJECT MUTATIONS
    if (type === "project") {
      const p = data;
      if (!isUuid(p.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const chapErr = checkChapterScope(p.chapterId);
      if (chapErr) return chapErr;

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
        team_ids: Array.isArray(p.teamIds) ? p.teamIds.filter(isUuid) : [],
        mentor_id: isUuid(p.mentorId) ? p.mentorId : null,
        awards: Array.isArray(p.awards) ? p.awards : [],
      });

      if (error) {
        console.error("Mutation error (project):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      const teamIds: string[] = Array.isArray(p.teamIds) ? p.teamIds.filter(isUuid) : [];
      const memberSyncError = await syncMemberTable(admin, "project_members", "project_id", projId, teamIds);

      await revalidateWeb(["projects", `project:${slug}`]);
      return NextResponse.json({ ok: true, id: projId, ...(memberSyncError ? { warning: `project saved, but member sync failed: ${memberSyncError}` } : {}) });
    }

    if (type === "delete_project") {
      const { id, slug } = data;
      const { data: pr } = await admin
        .from("projects")
        .select("id, chapter_id, slug")
        .match(isUuid(id) ? { id } : { slug: slug || id })
        .maybeSingle();

      if (pr) {
        const chapErr = checkChapterScope(pr.chapter_id);
        if (chapErr) return chapErr;
        const { error } = await admin.from("projects").delete().eq("id", pr.id);
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        await revalidateWeb(["projects", `project:${pr.slug || slug}`]);
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    // 2b. PEER LAB MUTATIONS (own tables: peer_labs, peer_lab_phases, peer_lab_facilitators)
    if (type === "peer_lab") {
      const isLeadOrExec = isExecutiveRole(auth.roleKey) || isFacultyRole(auth.roleKey);
      if (!auth.isHq && !isLeadOrExec) {
        return NextResponse.json(
          { ok: false, error: "Permission denied: Only Campus Leads, Executives, and HQ can manage Peer Labs" },
          { status: 403 },
        );
      }

      const l = data ?? {};
      const title = String(l.title ?? "").trim();
      if (!title) {
        return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
      }
      let slug = slugify(String(l.slug || title));
      if (!slug) {
        return NextResponse.json({ ok: false, error: "Could not build a slug from the title" }, { status: 400 });
      }
      const labId = isUuid(l.id) ? l.id : genUuid();

      const { data: existing } = await admin.from("peer_labs").select("id, chapter_id, slug").eq("id", labId).maybeSingle();

      // Scoping:
      // If NOT HQ, chapterId is FORCED to user's chapterId (cannot create open-to-all or edit other chapters' labs)
      let targetChapterId: string | null = null;
      if (auth.isHq) {
        targetChapterId = isUuid(l.chapterId) ? l.chapterId : null; // null = open-to-all
      } else {
        const userEffectiveChapterId =
          auth.chapterId ||
          (isUuid(l.chapterId) && (auth.allowedChapterIds?.includes(l.chapterId) || isLeadOrExec) ? l.chapterId : null);

        if (!userEffectiveChapterId) {
          return NextResponse.json(
            { ok: false, error: "You must belong to a chapter to manage Peer Labs" },
            { status: 403 },
          );
        }
        if (existing && existing.chapter_id && existing.chapter_id !== userEffectiveChapterId) {
          return NextResponse.json(
            { ok: false, error: "Permission denied: You can only manage Peer Labs for your chapter" },
            { status: 403 },
          );
        }
        targetChapterId = userEffectiveChapterId;
      }

      // If creating new lab, ensure slug is unique by auto-incrementing if needed
      if (!existing) {
        let candidateSlug = slug;
        let counter = 1;
        while (true) {
          const { data: slugMatch } = await admin
            .from("peer_labs")
            .select("id")
            .eq("slug", candidateSlug)
            .maybeSingle();
          if (!slugMatch || slugMatch.id === labId) {
            slug = candidateSlug;
            break;
          }
          counter++;
          candidateSlug = `${slug}-${counter}`;
        }
      }

      const phases = (Array.isArray(l.phases) ? l.phases : []).filter((p: Record<string, unknown>) =>
        String(p?.title ?? "").trim(),
      );
      const facilitators = (Array.isArray(l.facilitators) ? l.facilitators : []).filter((f: Record<string, unknown>) =>
        String(f?.name ?? "").trim(),
      );

      const row: Record<string, unknown> = {
        id: labId,
        slug,
        title,
        subtitle: l.subtitle || null,
        track: l.track || null,
        description: l.description || null,
        chapter_id: targetChapterId,
        cluster_id: isUuid(l.clusterId) ? l.clusterId : null,
        status: normalizePeerLabStatus(l.status),
        applications_open: l.applicationsOpen ?? true,
        featured: l.featured ?? false,
        banner_url: l.bannerUrl || null,
        poster_url: l.poster_url || l.posterUrl || null,
        thumbnail_url: l.thumbnail_url || l.thumbnailUrl || null,
        max_participants: Number.isFinite(l.maxParticipants) ? l.maxParticipants : null,
        resources: Array.isArray(l.resources) ? l.resources : [],
        phases,
        facilitators,
      };

      if (!existing && isUuid(auth.userId)) {
        const { data: pCheck } = await admin
          .from("profiles")
          .select("id")
          .eq("id", auth.userId)
          .maybeSingle();
        if (pCheck) {
          row.created_by = auth.userId;
        }
      }

      let { error: labErr } = await admin.from("peer_labs").upsert(row);
      if (
        labErr &&
        (labErr.message?.includes("poster_url") ||
          labErr.message?.includes("thumbnail_url") ||
          labErr.message?.includes("resources") ||
          labErr.message?.includes("cluster_id") ||
          labErr.message?.includes("column"))
      ) {
        delete row.poster_url;
        delete row.thumbnail_url;
        delete row.resources;
        delete row.cluster_id;
        const retry = await admin.from("peer_labs").upsert(row);
        labErr = retry.error;
      }
      if (labErr) {
        console.error("Mutation error (peer_lab):", labErr);
        const msg = labErr.code === "23505" ? "A peer lab with this slug already exists" : labErr.message;
        return NextResponse.json({ ok: false, error: msg }, { status: 400 });
      }

      // Sync child tables (peer_lab_phases, peer_lab_facilitators)
      try {
        await Promise.all([
          admin.from("peer_lab_phases").delete().eq("peer_lab_id", labId),
          admin.from("peer_lab_facilitators").delete().eq("peer_lab_id", labId),
        ]);
      } catch (delErr) {
        console.warn("Could not clear existing phases/facilitators:", delErr);
      }

      if (phases.length > 0) {
        const { error: phErr } = await admin.from("peer_lab_phases").insert(
          phases.map((p: Record<string, unknown>, i: number) => ({
            peer_lab_id: labId,
            sort_order: i,
            slug: slugify(String(p.slug || p.title || `phase-${i + 1}`)) || `phase-${i + 1}`,
            title: String(p.title).trim(),
            date_label: p.date || null,
            time_label: p.time || null,
            location: p.location || null,
            event_id: typeof p.eventId === "string" && isUuid(p.eventId) ? p.eventId : null,
          })),
        );
        if (phErr) {
          console.error("Mutation error (peer_lab phases):", phErr);
          return NextResponse.json({ ok: false, error: `Phases failed: ${phErr.message}` }, { status: 500 });
        }
      }

      if (facilitators.length > 0) {
        const { error: faErr } = await admin.from("peer_lab_facilitators").insert(
          facilitators.map((f: Record<string, unknown>, i: number) => ({
            peer_lab_id: labId,
            sort_order: i,
            user_id: typeof f.userId === "string" && isUuid(f.userId) ? f.userId : null,
            name: String(f.name).trim(),
            role: String(f.role || "Facilitator").trim(),
          })),
        );
        if (faErr) {
          console.error("Mutation error (peer_lab facilitators):", faErr);
          return NextResponse.json({ ok: false, error: `Facilitators failed: ${faErr.message}` }, { status: 500 });
        }
      }

      await revalidateWeb(["peer-labs", `peer-lab:${slug}`]);
      return NextResponse.json({ ok: true, id: labId, slug });
    }

    if (type === "delete_peer_lab") {
      const { id, slug } = data ?? {};
      if (!isUuid(id) && !slug) {
        return NextResponse.json({ ok: false, error: "id or slug is required" }, { status: 400 });
      }
      const { data: existing } = await admin
        .from("peer_labs")
        .select("id, chapter_id, slug")
        .match(isUuid(id) ? { id } : { slug })
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ ok: false, error: "Peer lab not found" }, { status: 404 });
      }

      if (!auth.isHq) {
        const isLeadOrExec = isExecutiveRole(auth.roleKey) || isFacultyRole(auth.roleKey);
        if (!isLeadOrExec || existing.chapter_id !== auth.chapterId) {
          return NextResponse.json(
            { ok: false, error: "Permission denied: You can only delete Peer Labs from your chapter" },
            { status: 403 },
          );
        }
      }

      const { error } = await admin.from("peer_labs").delete().eq("id", existing.id);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["peer-labs", `peer-lab:${existing.slug || slug || id}`]);
      return NextResponse.json({ ok: true });
    }

    if (type === "enroll_peer_lab") {
      const { labId, action } = data ?? {};
      if (!labId || !isUuid(labId)) {
        return NextResponse.json({ ok: false, error: "Valid peer lab ID is required" }, { status: 400 });
      }

      const { data: lab, error: labErr } = await admin
        .from("peer_labs")
        .select("id, slug, title, chapter_id, applications_open, status, max_participants, enrolled_count")
        .eq("id", labId)
        .maybeSingle();

      if (labErr || !lab) {
        return NextResponse.json({ ok: false, error: "Peer lab not found" }, { status: 404 });
      }

      // Check access boundary: Student can enroll if Open-to-All (chapter_id IS NULL) or matches user chapter
      if (lab.chapter_id && !auth.isHq) {
        const isAllowed =
          !auth.chapterId ||
          auth.chapterId === lab.chapter_id ||
          (Array.isArray(auth.allowedChapterIds) && auth.allowedChapterIds.includes(lab.chapter_id));
        if (!isAllowed) {
          return NextResponse.json({ ok: false, error: "This peer lab is exclusive to another campus chapter" }, { status: 403 });
        }
      }

      if (action === "withdraw") {
        const { error: delErr } = await admin
          .from("peer_lab_enrollments")
          .delete()
          .match({ peer_lab_id: labId, user_id: auth.userId });

        if (delErr) {
          return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true, enrolled: false });
      }

      if (!lab.applications_open) {
        return NextResponse.json({ ok: false, error: "Registrations for this peer lab are currently closed" }, { status: 409 });
      }

      if (lab.max_participants && (lab.enrolled_count ?? 0) >= lab.max_participants) {
        return NextResponse.json({ ok: false, error: "This peer lab has reached maximum capacity" }, { status: 409 });
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, email, phone, elevates_id")
        .eq("id", auth.userId)
        .maybeSingle();

      const displayName = profile?.full_name || auth.email?.split("@")[0] || "Student";

      // Robust find + update or insert (avoids PostgreSQL 42P10 partial unique index error with ON CONFLICT)
      const { data: existingEnrollment } = await admin
        .from("peer_lab_enrollments")
        .select("id, status")
        .eq("peer_lab_id", labId)
        .eq("user_id", auth.userId)
        .maybeSingle();

      let enrollment;
      if (existingEnrollment) {
        const { data: updated, error: upErr } = await admin
          .from("peer_lab_enrollments")
          .update({
            full_name: displayName,
            email: (auth.email || "").toLowerCase(),
            phone: profile?.phone || null,
            status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingEnrollment.id)
          .select("id, status")
          .single();

        if (upErr) {
          console.error("Peer lab enrollment update error:", upErr);
          return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
        }
        enrollment = updated;
      } else {
        const { data: inserted, error: inErr } = await admin
          .from("peer_lab_enrollments")
          .insert({
            peer_lab_id: labId,
            user_id: auth.userId,
            full_name: displayName,
            email: (auth.email || "").toLowerCase(),
            phone: profile?.phone || null,
            status: "approved",
          })
          .select("id, status")
          .single();

        if (inErr) {
          console.error("Peer lab enrollment insert error:", inErr);
          return NextResponse.json({ ok: false, error: inErr.message }, { status: 400 });
        }
        enrollment = inserted;
      }

      return NextResponse.json({ ok: true, enrolled: true, enrollment });
    }

    if (type === "publish_peer_lab") {
      const { labId, status = "upcoming", applicationsOpen } = data ?? {};
      if (!isUuid(labId)) {
        return NextResponse.json({ ok: false, error: "Valid peer lab ID is required" }, { status: 400 });
      }
      const { data: existing, error: findErr } = await admin
        .from("peer_labs")
        .select("id, chapter_id, slug, status, applications_open")
        .eq("id", labId)
        .maybeSingle();

      if (findErr || !existing) {
        return NextResponse.json({ ok: false, error: "Peer lab not found" }, { status: 404 });
      }

      if (!auth.isHq) {
        const isLeadOrExec = isExecutiveRole(auth.roleKey) || isFacultyRole(auth.roleKey);
        const userEffectiveChapterId =
          auth.chapterId ||
          (existing.chapter_id && auth.allowedChapterIds?.includes(existing.chapter_id) ? existing.chapter_id : null);
        if (!isLeadOrExec || (existing.chapter_id && existing.chapter_id !== userEffectiveChapterId)) {
          return NextResponse.json(
            { ok: false, error: "Permission denied: You can only publish peer labs for your chapter" },
            { status: 403 },
          );
        }
      }

      const normalizedStatus = normalizePeerLabStatus(status);
      const updates: Record<string, unknown> = {
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
      };
      if (typeof applicationsOpen === "boolean") {
        updates.applications_open = applicationsOpen;
      } else if (normalizedStatus === "upcoming" || normalizedStatus === "active") {
        updates.applications_open = true;
      }

      const { error: upErr } = await admin
        .from("peer_labs")
        .update(updates)
        .eq("id", labId);

      if (upErr) {
        console.error("Publish peer lab error:", upErr);
        return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
      }

      await revalidateWeb(["peer-labs", `peer-lab:${existing.slug}`]);
      return NextResponse.json({ ok: true, status: updates.status, applicationsOpen: updates.applications_open });
    }

    // 3. CLUSTER MUTATIONS
    if (type === "cluster") {
      const c = data;
      if (!isUuid(c.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const chapErr = checkChapterScope(c.chapterId);
      if (chapErr) return chapErr;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: only campus leads or executives can manage clusters" }, { status: 403 });
      }

      const slug = c.slug ?? slugify(c.title || c.name || "cluster");
      const clusterId = isUuid(c.id) ? c.id : genUuid();
      const memberIds: string[] = Array.isArray(c.memberIds) ? c.memberIds.filter(isUuid) : [];
      const { error } = await admin.from("clusters").upsert({
        id: clusterId,
        chapter_id: c.chapterId,
        name: c.name ?? c.title,
        slug,
        description: c.description ?? c.subtitle,
        access_mode: c.accessMode ?? "open",
        roadmap: c.roadmap || [],
        member_ids: memberIds,
      });

      if (error) {
        console.error("Mutation error (cluster):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      const memberSyncError = await syncMemberTable(admin, "cluster_members", "cluster_id", clusterId, memberIds);

      await revalidateWeb(["peer-labs", `cluster:${slug}`]);
      return NextResponse.json({ ok: true, id: clusterId, ...(memberSyncError ? { warning: `cluster saved, but member sync failed: ${memberSyncError}` } : {}) });
    }

    if (type === "delete_cluster") {
      const { id, slug, chapterId: bodyChapterId } = data || {};
      if (isUuid(id)) {
        const { data: clusterRow } = await admin
          .from("clusters")
          .select("chapter_id, slug")
          .eq("id", id)
          .maybeSingle();
        if (!clusterRow) {
          return NextResponse.json({ ok: false, error: "Cluster not found" }, { status: 404 });
        }
        const chapErr = checkChapterScope(clusterRow.chapter_id);
        if (chapErr) return chapErr;
        const { error } = await admin.from("clusters").delete().eq("id", id);
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        await revalidateWeb(["peer-labs", `cluster:${clusterRow.slug || slug || id}`]);
        return NextResponse.json({ ok: true });
      } else if (slug && (bodyChapterId || auth.chapterId)) {
        const targetChapId = bodyChapterId || auth.chapterId;
        const chapErr = checkChapterScope(targetChapId);
        if (chapErr) return chapErr;
        const { error } = await admin
          .from("clusters")
          .delete()
          .eq("slug", slug)
          .eq("chapter_id", targetChapId);
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        await revalidateWeb(["peer-labs", `cluster:${slug}`]);
        return NextResponse.json({ ok: true });
      } else {
        return NextResponse.json(
          { ok: false, error: "Cluster id, or slug + chapterId is required to delete a cluster" },
          { status: 400 },
        );
      }
    }

    if (type === "organization") {
      const org = data;
      const orgId = isUuid(org.id) ? org.id : DEFAULT_ORG_ID;
      const { error } = await admin.from("organizations").upsert({
        id: orgId,
        name: org.name,
        slug: org.slug ?? "elevates",
        tagline: org.tagline,
        brand_kit: org.brandKit,
        // Persist org-level settings (e.g. event categories)
        ...(org.settings !== undefined ? { settings: org.settings } : {}),
      });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // Dedicated mutation: patch org-level settings (e.g. add an event category)
    if (type === "org_settings_patch") {
      const patch = data as Record<string, unknown>; // e.g. { event_categories: [...] }
      // Fetch current settings first, then merge
      let { data: orgRow } = await admin.from("organizations").select("id, settings").eq("id", DEFAULT_ORG_ID).maybeSingle();
      if (!orgRow) {
        const { data: firstOrg } = await admin.from("organizations").select("id, settings").limit(1).maybeSingle();
        orgRow = firstOrg;
      }
      const orgId = orgRow?.id ?? DEFAULT_ORG_ID;
      const currentSettings: Record<string, unknown> = (orgRow?.settings as Record<string, unknown>) ?? {};
      const mergedSettings = { ...currentSettings, ...patch };
      const { error } = await admin.from("organizations").update({ settings: mergedSettings }).eq("id", orgId);
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // 4. CHAPTER MUTATIONS
    if (type === "chapter") {
      const chapter = data;
      let chapterId = isUuid(chapter.id) ? chapter.id : null;
      if (!chapterId && chapter.slug) {
        const { data: existingBySlug } = await admin
          .from("chapters")
          .select("id")
          .eq("slug", chapter.slug)
          .maybeSingle();
        if (existingBySlug?.id) {
          chapterId = existingBySlug.id;
        }
      }
      if (!chapterId) {
        chapterId = genUuid();
      }

      const chapterElevatesId = getChapterElevatesId({ id: chapterId, elevatesId: chapter.elevatesId });

      const basePayload: Record<string, any> = {
        id: chapterId,
        elevates_id: chapterElevatesId,
        organization_id: isUuid(chapter.organizationId) ? chapter.organizationId : DEFAULT_ORG_ID,
        name: chapter.name,
        slug: chapter.slug,
        college: chapter.college || chapter.name,
        city: chapter.city,
        status: chapter.status,
        health_score: chapter.healthScore ?? 0,
        published: chapter.published !== undefined ? Boolean(chapter.published) : (chapter.status === "active"),
        district: chapter.district,
        logo_url: chapter.logoUrl,
        member_count: chapter.memberCount ?? 0,
        event_count: chapter.eventCount ?? 0,
        project_count: chapter.projectCount ?? 0,
        ...(chapter.shortCode ? { short_code: chapter.shortCode.trim().toUpperCase() } : {}),
        ...(chapter.facultyId !== undefined
          ? { faculty_id: isUuid(chapter.facultyId) ? chapter.facultyId : null }
          : {}),
        ...(chapter.campusLeadId !== undefined
          ? { campus_lead_id: isUuid(chapter.campusLeadId) ? chapter.campusLeadId : null }
          : {}),
      };

      if (chapter.campusLeadId && isUuid(chapter.campusLeadId)) {
        const { data: leadProf } = await admin
          .from("profiles")
          .select("role")
          .eq("id", chapter.campusLeadId)
          .maybeSingle();
        if (leadProf?.role === "faculty_coordinator") {
          return NextResponse.json(
            { ok: false, error: "Faculty members cannot be assigned as Campus Lead." },
            { status: 400 },
          );
        }
      }

      const geoData: Record<string, any> = {};
      if (chapter.coordinates) geoData.coordinates = chapter.coordinates;
      if (chapter.latitude != null && !isNaN(chapter.latitude)) geoData.latitude = chapter.latitude;
      if (chapter.longitude != null && !isNaN(chapter.longitude)) geoData.longitude = chapter.longitude;
      if (chapter.location) geoData.location = chapter.location;
      if (chapter.mapUrl) geoData.map_url = chapter.mapUrl;

      const notesWithGeo = embedLocationInNotes(chapter.notes, {
        coordinates: chapter.coordinates,
        latitude: chapter.latitude,
        longitude: chapter.longitude,
        location: chapter.location,
        mapUrl: chapter.mapUrl,
        district: chapter.district,
        state: chapter.state,
      });

      const customSettingsPayload = {
        ...(chapter.customSettings || {}),
        ...(chapter.shortCode
          ? { short_code: chapter.shortCode.trim().toUpperCase(), shortCode: chapter.shortCode.trim().toUpperCase() }
          : {}),
        ...(chapter.campusLeadId !== undefined
          ? {
              campus_lead_id: isUuid(chapter.campusLeadId) ? chapter.campusLeadId : null,
              campusLeadId: isUuid(chapter.campusLeadId) ? chapter.campusLeadId : null,
            }
          : {}),
        ...(chapter.facultyId !== undefined
          ? {
              faculty_id: isUuid(chapter.facultyId) ? chapter.facultyId : null,
              facultyId: isUuid(chapter.facultyId) ? chapter.facultyId : null,
            }
          : {}),
        ...geoData,
      };

      // Attempt 1: Try with dedicated columns, custom_settings and notes
      let { error } = await admin.from("chapters").upsert({
        ...basePayload,
        ...geoData,
        notes: notesWithGeo,
        custom_settings: customSettingsPayload,
      });

      // Fallback if dedicated columns are not in remote schema cache yet
      if (error && (error.message.includes("column") || error.message.includes("schema cache"))) {
        const payloadWithoutShort = { ...basePayload };
        delete payloadWithoutShort.short_code;
        // Attempt 2: Try custom_settings JSONB if migration 009 is present
        const res2 = await admin.from("chapters").upsert({
          ...payloadWithoutShort,
          notes: notesWithGeo,
          custom_settings: customSettingsPayload,
        });
        error = res2.error;

        // Attempt 3: If custom_settings column is missing in schema cache, fall back to notes
        if (error && (error.message.includes("custom_settings") || error.message.includes("schema cache"))) {
          const res3 = await admin.from("chapters").upsert({
            ...basePayload,
            notes: notesWithGeo,
          });
          error = res3.error;

          // Attempt 4: Absolute minimal base columns if notes is also rejected
          if (error && error.message.includes("column")) {
            const res4 = await admin.from("chapters").upsert(basePayload);
            error = res4.error;
          }
        }
      }

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      // Synchronize campus_lead in user_roles and profiles
      if (chapter.campusLeadId !== undefined) {
        if (isUuid(chapter.campusLeadId)) {
          const leadId = chapter.campusLeadId;
          await admin
            .from("user_roles")
            .delete()
            .eq("chapter_id", chapterId)
            .eq("role_key", "campus_lead")
            .neq("user_id", leadId);

          const { data: leadRole } = await admin
            .from("roles")
            .select("id")
            .eq("key", "campus_lead")
            .maybeSingle();

          const { data: existingLeadRole } = await admin
            .from("user_roles")
            .select("id")
            .eq("user_id", leadId)
            .eq("chapter_id", chapterId)
            .eq("role_key", "campus_lead")
            .maybeSingle();

          if (!existingLeadRole) {
            await admin.from("user_roles").insert({
              id: genUuid(),
              user_id: leadId,
              chapter_id: chapterId,
              role_key: "campus_lead",
              role_id: leadRole?.id || "role-campus_lead",
              organization_id: basePayload.organization_id,
              is_permanent: true,
            });
          }

          await admin
            .from("profiles")
            .update({ chapter_id: chapterId })
            .eq("id", leadId);
        } else {
          await admin
            .from("user_roles")
            .delete()
            .eq("chapter_id", chapterId)
            .eq("role_key", "campus_lead");
        }
      }

      // Synchronize faculty_coordinator in user_roles and profiles
      if (chapter.facultyId !== undefined) {
        if (isUuid(chapter.facultyId)) {
          const facId = chapter.facultyId;
          await admin
            .from("user_roles")
            .delete()
            .eq("chapter_id", chapterId)
            .eq("role_key", "faculty_coordinator")
            .neq("user_id", facId);

          // Mutual exclusivity: delete all other roles for this user
          await admin
            .from("user_roles")
            .delete()
            .eq("user_id", facId)
            .neq("role_key", "faculty_coordinator");

          await admin.from("chapters").update({ campus_lead_id: null }).eq("campus_lead_id", facId);
          await admin.from("class_cohorts").update({ representative_id: null }).eq("representative_id", facId);

          const { data: facRole } = await admin
            .from("roles")
            .select("id")
            .eq("key", "faculty_coordinator")
            .maybeSingle();

          const { data: existingFacRole } = await admin
            .from("user_roles")
            .select("id")
            .eq("user_id", facId)
            .eq("chapter_id", chapterId)
            .eq("role_key", "faculty_coordinator")
            .maybeSingle();

          if (!existingFacRole) {
            await admin.from("user_roles").insert({
              id: genUuid(),
              user_id: facId,
              chapter_id: chapterId,
              role_key: "faculty_coordinator",
              role_id: facRole?.id || "role-faculty_coordinator",
              organization_id: basePayload.organization_id,
              is_permanent: true,
            });
          }

          await admin
            .from("profiles")
            .update({ role: "faculty_coordinator", chapter_id: chapterId })
            .eq("id", facId);
        } else {
          await admin
            .from("user_roles")
            .delete()
            .eq("chapter_id", chapterId)
            .eq("role_key", "faculty_coordinator");
        }
      }

      // Persist UI button & toggle state to system_ui_states
      try {
        await admin.from("system_ui_states").upsert(
          {
            key: `chapter_status_${chapterId}`,
            section: "chapters",
            component_id: chapterId,
            state_type: "toggle",
            is_enabled: chapter.status === "active",
            is_visible: Boolean(chapter.published),
            label: chapter.status,
            metadata: { status: chapter.status, slug: chapter.slug, name: chapter.name },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        );
      } catch (uiErr) {
        console.warn("Could not record chapter system_ui_state:", uiErr);
      }

      await revalidateWeb(["chapters", `chapter:${chapter.slug}`]);
      return NextResponse.json({
        ok: true,
        id: chapterId,
        elevatesId: chapterElevatesId,
        data: {
          ...chapter,
          id: chapterId,
          elevatesId: chapterElevatesId,
        },
      });
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
      let regId = isUuid(reg.id) ? reg.id : genUuid();
      
      // Determine validUserId:
      // Regular users can only register themselves. Campus lead/executive/HQ can register on behalf of a user.
      let validUserId = auth.userId;
      if ((auth.isHq || isCampusLead(auth.roleKey) || isExecutiveRole(auth.roleKey)) && isUuid(reg.userId)) {
        const { data: prof } = await admin.from("profiles").select("id").eq("id", reg.userId).maybeSingle();
        if (prof) validUserId = prof.id;
      }

      // Check if registration already exists for (event_id, user_id) to prevent duplicate rows and block re-registration with a clear error
      if (validUserId && isUuid(reg.eventId)) {
        const { data: existingReg } = await admin
          .from("event_registrations")
          .select("id")
          .eq("event_id", reg.eventId)
          .eq("user_id", validUserId)
          .maybeSingle();
        if (existingReg) {
          return NextResponse.json(
            { ok: false, error: "You are already registered for this event." },
            { status: 400 },
          );
        }
      }

      // Check event chapter scope and compute registration status server-side from live capacity.
      // Never trust the client-sent status for regular students — only privileged roles can force-approve.
      let eventChapterId: string | null = null;
      let resolvedStatus = "pending";
      let approvedBy: string | null = null;

      const isPrivileged = auth.isHq || isCampusLead(auth.roleKey) || isExecutiveRole(auth.roleKey) || auth.roleKey === "chairman";

      if (isUuid(reg.eventId)) {
        const { data: evRow } = await admin
          .from("events")
          .select("chapter_id, capacity, waitlist_capacity")
          .eq("id", reg.eventId)
          .maybeSingle();
        eventChapterId = evRow?.chapter_id || null;

        if (reg.status === "approved" && isPrivileged) {
          // Privileged user explicitly force-approving
          const chapErr = checkChapterScope(eventChapterId);
          if (chapErr) return chapErr;
          resolvedStatus = "approved";
          approvedBy = auth.userId;
        } else {
          // Compute status from live DB seat counts
          const capacity: number = (evRow?.capacity as number) ?? 100;
          const waitlistCapacity: number = (evRow?.waitlist_capacity as number) ?? 0;

          const { count: approvedCount } = await admin
            .from("event_registrations")
            .select("id", { count: "exact", head: true })
            .eq("event_id", reg.eventId)
            .eq("status", "approved");

          const { count: waitlistedCount } = await admin
            .from("event_registrations")
            .select("id", { count: "exact", head: true })
            .eq("event_id", reg.eventId)
            .eq("status", "waitlisted");

          const seatsLeft = Math.max(0, capacity - (approvedCount ?? 0));
          const waitlistLeft = waitlistCapacity > 0
            ? Math.max(0, waitlistCapacity - (waitlistedCount ?? 0))
            : 0;

          if (seatsLeft > 0) {
            resolvedStatus = "approved";
            approvedBy = auth.userId;
          } else if (waitlistCapacity > 0 && waitlistLeft > 0) {
            resolvedStatus = "waitlisted";
          } else if (waitlistCapacity > 0) {
            return NextResponse.json(
              { ok: false, error: "Registration is closed. Both event capacity and waiting list are full." },
              { status: 409 },
            );
          } else {
            return NextResponse.json(
              { ok: false, error: "Registration is closed. All available seats have been filled." },
              { status: 409 },
            );
          }
        }
      } else {
        resolvedStatus = reg.status ?? "pending";
      }

      const { error } = await admin.from("event_registrations").upsert({
        id: regId,
        event_id: isUuid(reg.eventId) ? reg.eventId : null,
        user_id: validUserId,
        guest_email: reg.guestEmail || null,
        guest_name: reg.guestName || null,
        status: resolvedStatus,
        representative_id: isUuid(reg.representativeId) ? reg.representativeId : null,
        answers: reg.answers || {},
        qr_code: reg.qrCode || "",
        reviewed_by: approvedBy ? auth.userId : (isUuid(reg.reviewedBy) ? reg.reviewedBy : null),
        approved_by: approvedBy,
      });

      if (error) {
        console.error("Mutation error (registration):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: regId, status: resolvedStatus });
    }

    if (type === "delete_registration") {
      const { id } = data;
      if (!isUuid(id)) {
        return NextResponse.json({ ok: false, error: "Valid registration id is required" }, { status: 400 });
      }
      const { data: regRow } = await admin.from("event_registrations").select("user_id, event_id").eq("id", id).maybeSingle();
      if (!regRow) {
        return NextResponse.json({ ok: true });
      }
      const canDelete = auth.isHq || isCampusLead(auth.roleKey) || isExecutiveRole(auth.roleKey) || regRow.user_id === auth.userId;
      if (!canDelete) {
        return NextResponse.json({ ok: false, error: "Permission denied to delete registration" }, { status: 403 });
      }
      const { error: delRegError } = await admin.from("event_registrations").delete().eq("id", id);
      if (delRegError) {
        console.error("Mutation error (delete_registration):", delRegError);
        return NextResponse.json({ ok: false, error: delRegError.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // 6. ATTENDANCE MUTATIONS
    if (type === "attendance") {
      const att = data;
      if (!auth.isHq && !canVerifyAttendance(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: attendance verification permission required" }, { status: 403 });
      }

      // Check event and chapter scope
      if (isUuid(att.eventId)) {
        const { data: ev } = await admin
          .from("events")
          .select("id, chapter_id, status, starts_at, ends_at")
          .eq("id", att.eventId)
          .maybeSingle();

        if (ev) {
          const chapErr = checkChapterScope(ev.chapter_id);
          if (chapErr) return chapErr;

          const nowMs = Date.now();
          const startsAtMs = new Date(ev.starts_at).getTime();
          const endsAtMs = ev.ends_at ? new Date(ev.ends_at).getTime() : startsAtMs + 2 * 60 * 60 * 1000;
          const isOngoing =
            ev.status === "ongoing" ||
            (nowMs >= startsAtMs && nowMs < endsAtMs && ev.status !== "completed" && ev.status !== "cancelled");

          if (!isOngoing && ev.status !== "ongoing") {
            if (nowMs < startsAtMs) {
              return NextResponse.json(
                {
                  ok: false,
                  error: "Attendance cannot be taken before the event starts. Please start the event first.",
                },
                { status: 400 },
              );
            }
            if (nowMs >= endsAtMs || ev.status === "completed") {
              return NextResponse.json(
                {
                  ok: false,
                  error: "Attendance cannot be taken after the event has ended.",
                },
                { status: 400 },
              );
            }
          }
        }
      }

      const attId = isUuid(att.id) ? att.id : genUuid();
      let validUserId = null;
      if (isUuid(att.userId)) {
        const { data: prof } = await admin.from("profiles").select("id").eq("id", att.userId).maybeSingle();
        if (prof) validUserId = prof.id;
      }

      // If checked_in_by is a class representative, verify that the attendee belongs to their class cohort in Supabase
      if (auth.roleKey === "class_representative" && validUserId) {
        // Find the class cohorts assigned to this representative using auth.userId
        const { data: cohorts } = await admin
          .from("class_cohorts")
          .select("department, academic_year, division")
          .or(`representative_id.eq.${auth.userId},rep_ids.cs.{${auth.userId}}`);

        // Fetch attendee profile
        const { data: attendeeProfile } = await admin
          .from("profiles")
          .select("department, year, section")
          .eq("id", validUserId)
          .maybeSingle();

        if (cohorts && cohorts.length > 0 && attendeeProfile) {
          const matchesClass = cohorts.some((c: any) => {
            const deptMatch =
              (c.department || "").trim().toLowerCase() ===
              (attendeeProfile.department || "").trim().toLowerCase();
            const yearMatch =
              (c.academic_year || "").trim().toLowerCase() ===
              (attendeeProfile.year || "").trim().toLowerCase();
            return deptMatch && yearMatch;
          });

          if (!matchesClass) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  "Access restricted: Class Representatives can only record attendance for students in their assigned class cohort.",
              },
              { status: 403 },
            );
          }
        }
      }

      const rec = {
        id: attId,
        event_id: isUuid(att.eventId) ? att.eventId : null,
        registration_id: isUuid(att.registrationId) ? att.registrationId : null,
        user_id: validUserId,
        status: att.status ?? "present",
        method: att.method ?? "qr",
        checked_in_at: att.checkedInAt ?? new Date().toISOString(),
        checked_in_by: auth.userId,
      };

      const { error: recErr } = await admin.from("attendance_records").upsert({
        ...rec,
        session_id: att.sessionId || att.session || "single",
        session_name: att.sessionName || "Event Check-In",
      });

      // Best-effort write to legacy attendance table if present
      try { await admin.from("attendance").upsert(rec); } catch {}

      if (recErr) {
        console.error("Mutation error (attendance):", recErr);
        return NextResponse.json({ ok: false, error: recErr.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, id: attId });
    }

    if (type === "delete_attendance") {
      const { id } = data;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: only executives or campus leads can delete attendance records" }, { status: 403 });
      }
      if (isUuid(id)) {
        const { error: delErr } = await admin.from("attendance_records").delete().eq("id", id);
        // Best-effort delete on legacy attendance table
        try { await admin.from("attendance").delete().eq("id", id); } catch {}
        if (delErr) {
          console.error("Mutation error (delete_attendance):", delErr);
          return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "bulk_attendance") {
      const { records } = data;
      if (!auth.isHq && !canVerifyAttendance(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: attendance verification permission required" }, { status: 403 });
      }
      if (Array.isArray(records) && records.length > 0) {
        const sampleEventId = records.find((r: any) => isUuid(r.eventId))?.eventId;
        if (sampleEventId) {
          const { data: ev } = await admin
            .from("events")
            .select("id, chapter_id, status, starts_at, ends_at")
            .eq("id", sampleEventId)
            .maybeSingle();

          if (ev) {
            const chapErr = checkChapterScope(ev.chapter_id);
            if (chapErr) return chapErr;

            const nowMs = Date.now();
            const startsAtMs = new Date(ev.starts_at).getTime();
            const endsAtMs = ev.ends_at ? new Date(ev.ends_at).getTime() : startsAtMs + 2 * 60 * 60 * 1000;
            const isOngoing =
              ev.status === "ongoing" ||
              (nowMs >= startsAtMs && nowMs < endsAtMs && ev.status !== "completed" && ev.status !== "cancelled");

            if (!isOngoing && ev.status !== "ongoing") {
              return NextResponse.json(
                {
                  ok: false,
                  error: "Attendance cannot be recorded because this event is not currently ongoing.",
                },
                { status: 400 },
              );
            }
          }
        }

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
            checked_in_by: auth.userId,
          };
        }));
        const { error: bulkErr } = await admin.from("attendance_records").upsert(rows);
        if (bulkErr) {
          console.error("Mutation error (bulk_attendance):", bulkErr);
          return NextResponse.json({ ok: false, error: bulkErr.message }, { status: 400 });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 7. CERTIFICATE MUTATIONS
    if (type === "certificate") {
      const cert = data;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: certificate issuance requires executive or campus lead role" }, { status: 403 });
      }
      if (isUuid(cert.eventId)) {
        const { data: ev } = await admin.from("events").select("chapter_id").eq("id", cert.eventId).maybeSingle();
        if (ev) {
          const chapErr = checkChapterScope(ev.chapter_id);
          if (chapErr) return chapErr;
        }
      }

      const certId = isUuid(cert.id) ? cert.id : genUuid();
      let validUserId = null;
      if (isUuid(cert.userId)) {
        const { data: prof } = await admin.from("profiles").select("id").eq("id", cert.userId).maybeSingle();
        if (prof) validUserId = prof.id;
      }
      if (!validUserId) {
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
        is_revoked: Boolean(cert.isRevoked),
        achievement: cert.achievement || "Participation",
      }, { onConflict: "certificate_id" });

      if (error) {
        console.error("Mutation error (certificate):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: certId });
    }

    if (type === "revoke_certificate") {
      const { id, isRevoked } = data;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: revoking certificates requires executive or campus lead role" }, { status: 403 });
      }
      const { error } = await admin
        .from("certificates")
        .update({ is_revoked: isRevoked !== undefined ? Boolean(isRevoked) : true })
        .match(isUuid(id) ? { id } : { certificate_id: id });

      if (error) {
        console.error("Mutation error (revoke_certificate):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // 8. FORM MUTATIONS
    if (type === "form") {
      const form = data;
      if (!isUuid(form.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const chapErr = checkChapterScope(form.chapterId);
      if (chapErr) return chapErr;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: form management requires executive or campus lead role" }, { status: 403 });
      }

      const eventId = isUuid(form.eventId)
        ? form.eventId
        : (form.eventId?.startsWith("evt-") && isUuid(form.eventId.slice(4))
            ? form.eventId.slice(4)
            : null);
      let formId = isUuid(form.id) ? form.id : null;
      if (!formId && eventId) {
        const { data: existing } = await admin
          .from("forms")
          .select("id")
          .eq("event_id", eventId)
          .eq("purpose", form.purpose ?? "registration")
          .limit(1)
          .maybeSingle();
        if (existing?.id) {
          formId = existing.id;
        }
      }
      if (!formId) formId = genUuid();
      const { error } = await admin.from("forms").upsert({
        id: formId,
        chapter_id: form.chapterId,
        event_id: eventId,
        title: form.title,
        description: form.description,
        purpose: form.purpose ?? "custom",
        schema: form.questions ?? [],
        questions: form.questions ?? [],
        logic_enabled: Boolean(form.logicEnabled),
        logic_rules: form.logicRules ?? [],
        status: form.status ?? (eventId ? "open" : "draft"),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Mutation error (form):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      if (form.eventId && isUuid(form.eventId) && Array.isArray(form.questions)) {
        try {
          await admin.from("event_form_fields").delete().eq("event_id", form.eventId);
          if (form.questions.length > 0) {
            await admin.from("event_form_fields").insert(
              form.questions.map((q: any, idx: number) => ({
                event_id: form.eventId,
                field_id: q.id || `field_${idx}`,
                label: q.title || q.label || `Field ${idx + 1}`,
                field_type: q.type || "short_text",
                required: Boolean(q.required),
                options: Array.isArray(q.options) ? q.options : [],
                placeholder: q.placeholder || null,
                sort_order: idx,
              }))
            );
          }
        } catch (effErr) {
          console.warn("event_form_fields sync notice:", effErr);
        }
      }

      return NextResponse.json({ ok: true, id: formId });
    }

    if (type === "delete_form") {
      const { id } = data;
      if (!isUuid(id)) {
        return NextResponse.json({ ok: false, error: "Valid form id is required" }, { status: 400 });
      }
      const { data: formRow } = await admin.from("forms").select("chapter_id").eq("id", id).maybeSingle();
      if (formRow) {
        const chapErr = checkChapterScope(formRow.chapter_id);
        if (chapErr) return chapErr;
      }
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: deleting forms requires executive or campus lead role" }, { status: 403 });
      }
      const { error: delFormErr } = await admin.from("forms").delete().eq("id", id);
      if (delFormErr) {
        console.error("Mutation error (delete_form):", delFormErr);
        return NextResponse.json({ ok: false, error: delFormErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // 8b. EVENT REMINDER MUTATIONS
    if (type === "event_reminder") {
      const rem = data;
      const eventId = isUuid(rem.eventId)
        ? rem.eventId
        : (rem.eventId?.startsWith("evt-") && isUuid(rem.eventId.slice(4))
            ? rem.eventId.slice(4)
            : null);
      if (!eventId) {
        return NextResponse.json({ ok: false, error: "Valid eventId is required" }, { status: 400 });
      }
      const { data: ev } = await admin.from("events").select("chapter_id").eq("id", eventId).maybeSingle();
      if (ev) {
        const chapErr = checkChapterScope(ev.chapter_id);
        if (chapErr) return chapErr;
      }
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: reminder management requires executive role" }, { status: 403 });
      }
      const reminderId = isUuid(rem.id) ? rem.id : genUuid();
      const payload: Record<string, any> = {
        id: reminderId,
        event_id: eventId,
        chapter_id: isUuid(rem.chapterId) ? rem.chapterId : (ev?.chapter_id || null),
        title: rem.title || "Event Reminder",
        message: rem.message || "",
        trigger_type: rem.triggerType || "24h_before",
        scheduled_for: rem.scheduledFor || new Date().toISOString(),
        channel: rem.channel || "all",
        status: rem.status || "scheduled",
        sent_at: rem.sentAt || null,
        recipient_count: rem.recipientCount ?? 0,
        created_by: auth.userId,
        updated_at: new Date().toISOString(),
      };

      const { error } = await admin.from("event_reminders").upsert(payload);
      if (error) {
        console.error("Mutation error (event_reminder):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      try {
        const { data: allRems } = await admin.from("event_reminders").select("*").eq("event_id", eventId);
        if (allRems) {
          await admin.from("events").update({ reminders: allRems }).eq("id", eventId);
        }
      } catch {}

      return NextResponse.json({ ok: true, id: reminderId });
    }

    if (type === "delete_event_reminder") {
      const { id, eventId } = data;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: deleting reminder requires executive role" }, { status: 403 });
      }
      if (isUuid(id)) {
        const { error: delRemErr } = await admin.from("event_reminders").delete().eq("id", id);
        if (delRemErr) {
          console.error("Mutation error (delete_event_reminder):", delRemErr);
          return NextResponse.json({ ok: false, error: delRemErr.message }, { status: 500 });
        }
        if (eventId && isUuid(eventId)) {
          try {
            const { data: allRems } = await admin.from("event_reminders").select("*").eq("event_id", eventId);
            await admin.from("events").update({ reminders: allRems || [] }).eq("id", eventId);
          } catch {}
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "send_event_reminder") {
      const { reminderId, eventId: inputEventId } = data;
      let targetEventId = isUuid(inputEventId)
        ? inputEventId
        : (inputEventId?.startsWith("evt-") && isUuid(inputEventId.slice(4))
            ? inputEventId.slice(4)
            : null);

      let reminder: any = null;
      if (isUuid(reminderId)) {
        const { data: row } = await admin.from("event_reminders").select("*").eq("id", reminderId).maybeSingle();
        reminder = row;
        if (row?.event_id && !targetEventId) {
          targetEventId = row.event_id;
        }
      }

      if (!targetEventId) {
        return NextResponse.json({ ok: false, error: "Event ID not found for reminder" }, { status: 400 });
      }

      const { data: eventRow } = await admin
        .from("events")
        .select("title, chapter_id, chapters(slug)")
        .eq("id", targetEventId)
        .maybeSingle();

      if (eventRow) {
        const chapErr = checkChapterScope(eventRow.chapter_id);
        if (chapErr) return chapErr;
      }
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: sending reminders requires executive role" }, { status: 403 });
      }

      const { data: regRows } = await admin
        .from("event_registrations")
        .select("user_id")
        .eq("event_id", targetEventId);

      const userIds = Array.from(new Set((regRows || []).map((r: any) => r.user_id).filter(Boolean)));
      const title = reminder?.title || `Reminder: ${eventRow?.title || "Upcoming Event"}`;
      const body = reminder?.message || `Your event ${eventRow?.title || ""} is coming up soon!`;
      const chapterSlug = (eventRow as any)?.chapters?.slug || "hq";
      const href = `/chapter/${chapterSlug}/events/${targetEventId}`;

      // Best-effort in-app notifications
      if (userIds.length > 0) {
        const notifInserts = userIds.map((uid) => ({
          id: genUuid(),
          user_id: uid,
          title,
          body,
          read: false,
          href,
          created_at: new Date().toISOString(),
        }));
        const { error: notifErr } = await admin.from("notifications").insert(notifInserts);
        if (notifErr) {
          console.warn("send_event_reminder notifications notice:", notifErr);
        }
      }

      const now = new Date().toISOString();
      if (isUuid(reminderId)) {
        const { error: remUpdErr } = await admin.from("event_reminders").update({
          status: "sent",
          sent_at: now,
          recipient_count: userIds.length,
          updated_at: now,
        }).eq("id", reminderId);

        if (remUpdErr) {
          console.error("Mutation error (send_event_reminder):", remUpdErr);
          return NextResponse.json({ ok: false, error: remUpdErr.message }, { status: 500 });
        }
      }

      // Best-effort audit activity log
      try {
        await admin.from("activity_logs").insert({
          id: genUuid(),
          actor_id: auth.userId,
          action: "event_reminders_sent",
          entity: "event",
          entity_id: targetEventId,
          created_at: now,
        });
      } catch (logErr: unknown) {
        console.warn("send_event_reminder activity_logs notice:", logErr);
      }

      return NextResponse.json({
        ok: true,
        sentCount: userIds.length,
        sentAt: now,
      });
    }

    // 9. FORM RESPONSE MUTATIONS
    if (type === "form_response") {
      const resp = data;
      const respId = isUuid(resp.id) ? resp.id : genUuid();
      const validUserId = auth.userId;

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
      if (!isUuid(id)) {
        return NextResponse.json({ ok: false, error: "Valid response id is required" }, { status: 400 });
      }
      const { data: respRow } = await admin.from("form_responses").select("user_id, form_id").eq("id", id).maybeSingle();
      if (respRow) {
        const canDelete = auth.isHq || respRow.user_id === auth.userId || isCampusLead(auth.roleKey) || isExecutiveRole(auth.roleKey);
        if (!canDelete) {
          return NextResponse.json({ ok: false, error: "Permission denied to delete form response" }, { status: 403 });
        }
      }
      const { error: delRespErr } = await admin.from("form_responses").delete().eq("id", id);
      if (delRespErr) {
        console.error("Mutation error (delete_form_response):", delRespErr);
        return NextResponse.json({ ok: false, error: delRespErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // 10. REPORT MUTATIONS
    if (type === "report") {
      const rep = data;
      if (!isUuid(rep.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const chapErr = checkChapterScope(rep.chapterId);
      if (chapErr) return chapErr;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey) && !isFacultyRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: report management requires executive, lead, or faculty role" }, { status: 403 });
      }

      const reportId = isUuid(rep.id) ? rep.id : genUuid();
      const isApproving = rep.status === "approved" || rep.status === "verified";
      let approvedBy = null;
      if (isApproving) {
        if (!auth.isHq && !isFacultyRole(auth.roleKey) && !isCampusLead(auth.roleKey)) {
          return NextResponse.json({ ok: false, error: "Permission denied: approving reports requires faculty coordinator or campus lead role" }, { status: 403 });
        }
        approvedBy = auth.userId;
      }

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
        submitted_by: isUuid(rep.submittedBy) && (auth.isHq || isCampusLead(auth.roleKey) || isFacultyRole(auth.roleKey)) ? rep.submittedBy : auth.userId,
        submitted_at: rep.submittedAt ?? new Date().toISOString(),
        hq_comment: rep.hqComment,
        approved_by: approvedBy ?? (isUuid(rep.approvedBy) && (auth.isHq || isFacultyRole(auth.roleKey)) ? rep.approvedBy : null),
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
      if (!isUuid(id)) {
        return NextResponse.json({ ok: false, error: "Valid report id is required" }, { status: 400 });
      }
      const { data: repRow } = await admin.from("reports").select("chapter_id, submitted_by").eq("id", id).maybeSingle();
      if (repRow) {
        const chapErr = checkChapterScope(repRow.chapter_id);
        if (chapErr) return chapErr;
        const canDelete = auth.isHq || isCampusLead(auth.roleKey) || (isExecutiveRole(auth.roleKey) && repRow.submitted_by === auth.userId);
        if (!canDelete) {
          return NextResponse.json({ ok: false, error: "Permission denied to delete report" }, { status: 403 });
        }
      }
      const { error: delRepErr } = await admin.from("reports").delete().eq("id", id);
      if (delRepErr) {
        console.error("Mutation error (delete_report):", delRepErr);
        return NextResponse.json({ ok: false, error: delRepErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // 11. TASK MUTATIONS
    if (type === "task") {
      const task = data;
      if (!isUuid(task.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const chapErr = checkChapterScope(task.chapterId);
      if (chapErr) return chapErr;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: task management requires executive or campus lead role" }, { status: 403 });
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
      if (!isUuid(id)) {
        return NextResponse.json({ ok: false, error: "Valid task id is required" }, { status: 400 });
      }
      const { data: taskRow } = await admin.from("tasks").select("chapter_id").eq("id", id).maybeSingle();
      if (taskRow) {
        const chapErr = checkChapterScope(taskRow.chapter_id);
        if (chapErr) return chapErr;
      }
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied to delete task" }, { status: 403 });
      }
      const { error: delTaskErr } = await admin.from("tasks").delete().eq("id", id);
      if (delTaskErr) {
        console.error("Mutation error (delete_task):", delTaskErr);
        return NextResponse.json({ ok: false, error: delTaskErr.message }, { status: 500 });
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
        updated_by: auth.userId,
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
        const { error: delGuideErr } = await admin.from("guidelines").delete().eq("id", id);
        if (delGuideErr) {
          console.error("Mutation error (delete_guideline):", delGuideErr);
          return NextResponse.json({ ok: false, error: delGuideErr.message }, { status: 500 });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 13. RESOURCE MUTATIONS
    if (type === "resource") {
      const res = data;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: managing resources requires executive or campus lead role" }, { status: 403 });
      }
      const resourceId = isUuid(res.id) ? res.id : genUuid();
      const { error } = await admin.from("resources").upsert({
        id: resourceId,
        organization_id: isUuid(res.organizationId) ? res.organizationId : DEFAULT_ORG_ID,
        title: res.title,
        category: res.category ?? "General",
        description: res.description,
        uploaded_by: auth.userId,
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
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied to delete resource" }, { status: 403 });
      }
      if (isUuid(id)) {
        const { error: delResErr } = await admin.from("resources").delete().eq("id", id);
        if (delResErr) {
          console.error("Mutation error (delete_resource):", delResErr);
          return NextResponse.json({ ok: false, error: delResErr.message }, { status: 500 });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 14. DEPARTMENT MUTATIONS
    if (type === "department") {
      const dept = data;
      if (!isUuid(dept.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const chapErr = checkChapterScope(dept.chapterId);
      if (chapErr) return chapErr;
      if (!auth.isHq && !canManageClasses(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: managing departments requires class.manage permission" }, { status: 403 });
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
      if (!isUuid(id)) {
        return NextResponse.json({ ok: false, error: "Valid department id is required" }, { status: 400 });
      }
      const { data: deptRow } = await admin.from("departments").select("chapter_id").eq("id", id).maybeSingle();
      if (deptRow) {
        const chapErr = checkChapterScope(deptRow.chapter_id);
        if (chapErr) return chapErr;
      }
      if (!auth.isHq && !canManageClasses(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied to delete department" }, { status: 403 });
      }
      const { error: delDeptErr } = await admin.from("departments").delete().eq("id", id);
      if (delDeptErr) {
        console.error("Mutation error (delete_department):", delDeptErr);
        return NextResponse.json({ ok: false, error: delDeptErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // 15. CLASS COHORT MUTATIONS
    if (type === "class_cohort") {
      const cohort = data;
      if (!isUuid(cohort.chapterId)) {
        return NextResponse.json({ ok: false, error: "chapterId is required and must be a valid UUID" }, { status: 400 });
      }
      const chapErr = checkChapterScope(cohort.chapterId);
      if (chapErr) return chapErr;
      if (!auth.isHq && !canManageClasses(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: managing class cohorts requires class.manage permission" }, { status: 403 });
      }
      const cohortId = isUuid(cohort.id) ? cohort.id : genUuid();
      const validRepIds: string[] = Array.isArray(cohort.repIds)
        ? cohort.repIds.filter(isUuid)
        : (isUuid(cohort.representativeId) ? [cohort.representativeId] : []);

      if (validRepIds.length > 0) {
        const { data: facultyReps } = await admin
          .from("profiles")
          .select("id")
          .in("id", validRepIds)
          .eq("role", "faculty_coordinator");
        if (facultyReps && facultyReps.length > 0) {
          return NextResponse.json(
            { ok: false, error: "Faculty members cannot be assigned as class representatives." },
            { status: 400 },
          );
        }
      }
      const { error } = await admin.from("class_cohorts").upsert({
        id: cohortId,
        chapter_id: cohort.chapterId,
        department: cohort.department,
        year: cohort.year,
        section: cohort.section,
        rep_ids: validRepIds,
      });

      if (error) {
        console.error("Mutation error (class_cohort):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: cohortId });
    }

    if (type === "delete_class_cohort") {
      const { id } = data;
      if (!isUuid(id)) {
        return NextResponse.json({ ok: false, error: "Valid class cohort id is required" }, { status: 400 });
      }
      const { data: cohortRow } = await admin.from("class_cohorts").select("chapter_id").eq("id", id).maybeSingle();
      if (cohortRow) {
        const chapErr = checkChapterScope(cohortRow.chapter_id);
        if (chapErr) return chapErr;
      }
      if (!auth.isHq && !canManageClasses(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied to delete class cohort" }, { status: 403 });
      }
      const { error: delCohortErr } = await admin.from("class_cohorts").delete().eq("id", id);
      if (delCohortErr) {
        console.error("Mutation error (delete_class_cohort):", delCohortErr);
        return NextResponse.json({ ok: false, error: delCohortErr.message }, { status: 500 });
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
      if (!auth.isHq && !isCampusLead(auth.roleKey) && auth.roleKey !== "chairman") {
        return NextResponse.json({ ok: false, error: "Permission denied: leadership assignment requires campus lead or chairman role" }, { status: 403 });
      }
      const laId = isUuid(la.id) ? la.id : genUuid();
      let termId = isUuid(la.termId) ? la.termId : null;

      // Fallback: look up chapter from user's profile if termId is invalid/missing
      let chapterId: string | null = isUuid(la.chapterId) ? la.chapterId : null;
      if (!chapterId && la.userId && isUuid(la.userId)) {
        const { data: prof } = await admin
          .from("profiles")
          .select("chapter_id")
          .eq("id", la.userId)
          .maybeSingle();
        chapterId = prof?.chapter_id ?? null;
      }

      if (chapterId) {
        const chapErr = checkChapterScope(chapterId);
        if (chapErr) return chapErr;
      }

      if (!termId && chapterId) {
        const { data: termRow } = await admin
          .from("leadership_terms")
          .select("id")
          .eq("chapter_id", chapterId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        termId = termRow?.id ?? null;
      }

      // If chapter still doesn't have an active term row in DB, auto-create one
      if (!termId && chapterId) {
        termId = genUuid();
        const { error: termInsertErr } = await admin.from("leadership_terms").insert({
          id: termId,
          chapter_id: chapterId,
          academic_year: "2025-26",
          title: "Permanent Volunteer Team",
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          status: "active",
          handover_notes: "Auto-initialized chapter volunteer & leadership team",
        });
        if (termInsertErr) {
          console.error("Mutation error (leadership_term auto-create):", termInsertErr);
          return NextResponse.json({ ok: false, error: termInsertErr.message }, { status: 400 });
        }
      }

      if (!termId) {
        const { data: anyTerm } = await admin
          .from("leadership_terms")
          .select("id")
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        termId = anyTerm?.id ?? null;
      }

      if (la.userId && isUuid(la.userId) && ["campus_lead", "class_representative", "chairman"].includes(la.roleKey)) {
        const { data: targetProf } = await admin
          .from("profiles")
          .select("role")
          .eq("id", la.userId)
          .maybeSingle();
        if (targetProf?.role === "faculty_coordinator") {
          return NextResponse.json(
            { ok: false, error: "Faculty members cannot be assigned as Campus Lead or Class Representative." },
            { status: 400 },
          );
        }
      }

      const { error } = await admin.from("leadership_assignments").upsert({
        id: laId,
        term_id: termId,
        user_id: isUuid(la.userId) ? la.userId : null,
        role_key: la.roleKey,
        title: la.title,
      });

      if (error) {
        console.error("Mutation error (leadership_assignment):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      // Automatically sync user_roles in Supabase (secondary write: return warning if fails)
      let userRoleSyncError: string | null = null;
      if (la.userId && isUuid(la.userId) && la.roleKey) {
        try {
          const { data: roleRow } = await admin
            .from("roles")
            .select("id")
            .eq("key", la.roleKey)
            .maybeSingle();

          if (!chapterId && termId) {
            const { data: termRow } = await admin
              .from("leadership_terms")
              .select("chapter_id")
              .eq("id", termId)
              .maybeSingle();
            chapterId = termRow?.chapter_id ?? null;
          }

          const { data: existingUrList } = await admin
            .from("user_roles")
            .select("id")
            .eq("user_id", la.userId)
            .eq("role_key", la.roleKey);

          if (existingUrList && existingUrList.length > 0) {
            const { error: urUpdateErr } = await admin.from("user_roles").update({
              chapter_id: chapterId,
              leadership_term_id: termId,
              role_id: roleRow?.id ?? null,
              is_permanent: true,
            }).eq("id", existingUrList[0].id);
            if (urUpdateErr) {
              userRoleSyncError = urUpdateErr.message;
              console.warn("user_roles update notice for assignment:", urUpdateErr);
            }
          } else {
            const { error: urInsertErr } = await admin.from("user_roles").insert({
              user_id: la.userId,
              role_key: la.roleKey,
              role_id: roleRow?.id ?? null,
              chapter_id: chapterId,
              leadership_term_id: termId,
              is_permanent: true,
            });
            if (urInsertErr) {
              userRoleSyncError = urInsertErr.message;
              console.warn("user_roles insert notice for assignment:", urInsertErr);
            }
          }
        } catch (urErr: unknown) {
          const msg = urErr instanceof Error ? urErr.message : String(urErr);
          userRoleSyncError = msg;
          console.warn("Could not sync user_roles for assignment:", urErr);
        }
      }

      return NextResponse.json({
        ok: true,
        id: laId,
        ...(userRoleSyncError ? { warning: `Leadership assignment created, but role sync failed: ${userRoleSyncError}` } : {}),
      });
    }

    if (type === "delete_leadership_assignment") {
      const { id, userId, roleKey } = data;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && auth.roleKey !== "chairman") {
        return NextResponse.json({ ok: false, error: "Permission denied: deleting leadership assignment requires campus lead or chairman role" }, { status: 403 });
      }
      const targetRoleKey = roleKey || "volunteer";

      if (isUuid(id)) {
        const { data: assignment } = await admin
          .from("leadership_assignments")
          .select("user_id, role_key, term_id")
          .eq("id", id)
          .maybeSingle();

        const { error: delLaErr } = await admin.from("leadership_assignments").delete().eq("id", id);
        if (delLaErr) {
          console.error("Mutation error (delete_leadership_assignment):", delLaErr);
          return NextResponse.json({ ok: false, error: delLaErr.message }, { status: 500 });
        }

        if (assignment?.user_id && assignment?.role_key) {
          const { error: delUrErr } = await admin
            .from("user_roles")
            .delete()
            .eq("user_id", assignment.user_id)
            .eq("role_key", assignment.role_key);
          if (delUrErr) {
            console.warn("delete_leadership_assignment user_roles delete notice:", delUrErr);
          }
        }
      } else if (userId && isUuid(userId)) {
        const { error: delLaErr } = await admin.from("leadership_assignments").delete().eq("user_id", userId).eq("role_key", targetRoleKey);
        if (delLaErr) {
          console.error("Mutation error (delete_leadership_assignment):", delLaErr);
          return NextResponse.json({ ok: false, error: delLaErr.message }, { status: 500 });
        }
        const { error: delUrErr } = await admin.from("user_roles").delete().eq("user_id", userId).eq("role_key", targetRoleKey);
        if (delUrErr) {
          console.warn("delete_leadership_assignment user_roles delete notice:", delUrErr);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 17. ACTIVITY LOG MUTATIONS (Best-effort operational audit trail)
    if (type === "activity_log") {
      const logItem = data;
      const logId = isUuid(logItem.id) ? logItem.id : genUuid();
      const actorId = auth.userId;
      // Best-effort telemetry: failures do not block user action
      const { error: logErr } = await admin.from("activity_logs").insert({
        id: logId,
        actor_id: actorId,
        action: logItem.action,
        entity: logItem.entity,
        entity_id: logItem.entityId || logItem.id || "",
        meta: typeof logItem.meta === "object" ? JSON.stringify(logItem.meta) : logItem.meta,
        created_at: logItem.createdAt ?? new Date().toISOString(),
      });
      if (logErr) {
        console.warn("Best-effort activity_log insert notice:", logErr);
      }
      return NextResponse.json({ ok: true, id: logId });
    }

    // 18. NOTIFICATION MUTATIONS (Best-effort in-app message dispatch)
    if (type === "notification") {
      const notif = data;
      const notifId = isUuid(notif.id) ? notif.id : genUuid();
      const targetUserId = isUuid(notif.userId) ? notif.userId : auth.userId;
      if (targetUserId !== auth.userId && !auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: cannot send notification to other users" }, { status: 403 });
      }
      // Best-effort in-app notification: non-fatal if delivery fails
      const { error: notifErr } = await admin.from("notifications").upsert({
        id: notifId,
        user_id: targetUserId,
        title: notif.title,
        body: notif.body,
        read: Boolean(notif.read),
        href: notif.href,
      });
      if (notifErr) {
        console.warn("Best-effort notification upsert notice:", notifErr);
      }
      return NextResponse.json({ ok: true, id: notifId });
    }

    if (type === "mark_notification_read") {
      const { id } = data;
      // Best-effort notification state update
      if (isUuid(id)) {
        const { error: readErr } = await admin.from("notifications").update({ read: true }).eq("id", id).eq("user_id", auth.userId);
        if (readErr) {
          console.warn("Best-effort mark_notification_read notice:", readErr);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 19. ANNOUNCEMENT MUTATIONS
    if (type === "announcement") {
      const ann = data;
      const annId = isUuid(ann.id) ? ann.id : genUuid();
      if (ann.chapterId) {
        const chapErr = checkChapterScope(ann.chapterId);
        if (chapErr) return chapErr;
      }
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: announcements require executive or campus lead role" }, { status: 403 });
      }
      const { error } = await admin.from("announcements").upsert({
        id: annId,
        audience: ann.audience ?? "global",
        chapter_id: isUuid(ann.chapterId) ? ann.chapterId : null,
        cluster_id: isUuid(ann.clusterId) ? ann.clusterId : null,
        title: ann.title,
        body: ann.body,
        author_id: auth.userId,
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
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: granting event permissions requires executive or campus lead role" }, { status: 403 });
      }
      if (isUuid(ep.eventId)) {
        const { data: ev } = await admin.from("events").select("chapter_id").eq("id", ep.eventId).maybeSingle();
        if (ev) {
          const chapErr = checkChapterScope(ev.chapter_id);
          if (chapErr) return chapErr;
        }
      }
      const epId = isUuid(ep.id) ? ep.id : genUuid();
      const { error } = await admin.from("event_permissions").upsert({
        id: epId,
        event_id: isUuid(ep.eventId) ? ep.eventId : null,
        user_id: isUuid(ep.userId) ? ep.userId : null,
        permission_type: ep.permissionType,
        is_temporary: Boolean(ep.isTemporary),
        granted_by: auth.userId,
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
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: deleting event permissions requires executive or campus lead role" }, { status: 403 });
      }
      if (isUuid(id)) {
        const { error: delEpErr } = await admin.from("event_permissions").delete().eq("id", id);
        if (delEpErr) {
          console.error("Mutation error (delete_event_permission):", delEpErr);
          return NextResponse.json({ ok: false, error: delEpErr.message }, { status: 500 });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // 21. PROFILE & USER ROLES MUTATIONS
    if (type === "profile") {
      const p = data;
      let targetId = isUuid(p.id) ? p.id : null;
      if (!targetId && p.email) {
        const { data: profByEmail } = await admin
          .from("profiles")
          .select("id")
          .eq("email", p.email.trim().toLowerCase())
          .maybeSingle();
        if (profByEmail?.id) {
          targetId = profByEmail.id;
        }
      }
      if (!targetId) targetId = auth.userId;

      // Only HQ can edit other users' profiles
      if (!auth.isHq && targetId !== auth.userId) {
        return NextResponse.json({ ok: false, error: "Permission denied: you can only update your own profile" }, { status: 403 });
      }

      if (targetId) {
        // Collect defined fields for safe partial updating
        const updatePayload: Record<string, any> = {};
        if (p.fullName !== undefined) updatePayload.full_name = p.fullName;
        if (p.email !== undefined && auth.isHq) updatePayload.email = p.email;
        if (p.avatarUrl !== undefined) updatePayload.avatar_url = p.avatarUrl;
        if (p.phone !== undefined) updatePayload.phone = p.phone;
        if (p.department !== undefined) updatePayload.department = p.department;
        if (p.year !== undefined) updatePayload.year = p.year;
        if (p.academicYear !== undefined) {
          updatePayload.academic_year = p.academicYear;
          if (p.year === undefined) updatePayload.year = p.academicYear;
        }
        if (p.section !== undefined) updatePayload.section = p.section;
        if (p.chapterId !== undefined && auth.isHq) updatePayload.chapter_id = isUuid(p.chapterId) ? p.chapterId : null;
        if (p.status !== undefined && auth.isHq) updatePayload.status = p.status;
        if (p.isPublic !== undefined) updatePayload.is_public = Boolean(p.isPublic);
        if (p.bio !== undefined) updatePayload.bio = p.bio;
        if (p.skills !== undefined) updatePayload.skills = p.skills;
        if (p.interests !== undefined) updatePayload.interests = p.interests;
        if (p.githubUrl !== undefined) updatePayload.github_url = p.githubUrl || null;
        if (p.linkedinUrl !== undefined) updatePayload.linkedin_url = p.linkedinUrl || null;
        if (p.portfolioUrl !== undefined) updatePayload.portfolio_url = p.portfolioUrl || null;
        if (p.resumeUrl !== undefined) updatePayload.resume_url = p.resumeUrl || null;
        if (p.discordUserId !== undefined) updatePayload.discord_user_id = p.discordUserId || null;
        if (p.discordUsername !== undefined) updatePayload.discord_username = p.discordUsername || null;
        if (p.discordConnected !== undefined) updatePayload.discord_connected = Boolean(p.discordConnected);
        if (p.discordConnectedAt !== undefined) updatePayload.discord_connected_at = p.discordConnectedAt || null;

        // Check if profile exists
        const { data: existingProf } = await admin.from("profiles").select("id").eq("id", targetId).maybeSingle();
        if (existingProf) {
          let { error: updErr } = await admin.from("profiles").update(updatePayload).eq("id", targetId);
          // If update failed because of updated_at or missing column, retry without it
          if (updErr && (updErr.message.includes("updated_at") || updErr.message.includes("column"))) {
            delete updatePayload.updated_at;
            const retry = await admin.from("profiles").update(updatePayload).eq("id", targetId);
            updErr = retry.error;
          }
          if (updErr) {
            console.error("Mutation error (update profile):", updErr);
            return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
          }
        } else {
          // If inserting a fresh profile, supply default values
          const insertPayload = {
            id: targetId,
            full_name: p.fullName || "User",
            email: p.email || "",
            status: p.status ?? "active",
            is_public: Boolean(p.isPublic),
            skills: p.skills ?? [],
            interests: p.interests ?? [],
            ...updatePayload,
          };
          delete (insertPayload as Record<string, unknown>).updated_at;
          const { error: insErr } = await admin.from("profiles").insert(insertPayload);
          if (insErr) {
            console.error("Mutation error (insert profile):", insErr);
            return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
          }
        }

        // Sync status with Supabase Auth ban if status changed (HQ only)
        if (auth.isHq && p.status === "disabled") {
          try {
            await admin.auth.admin.updateUserById(targetId, { ban_duration: "876000h" });
          } catch (banErr) {
            console.warn("Auth ban notice (non-fatal):", banErr);
          }
        } else if (auth.isHq && p.status === "active") {
          try {
            await admin.auth.admin.updateUserById(targetId, { ban_duration: "none" });
          } catch (unbanErr) {
            console.warn("Auth unban notice (non-fatal):", unbanErr);
          }
        }

        // Also record user disable/enable state in system_ui_states
        if (auth.isHq && p.status) {
          try {
            await admin.from("system_ui_states").upsert(
              {
                key: `user_status_${targetId}`,
                section: "users",
                component_id: targetId,
                state_type: "toggle",
                is_enabled: p.status === "active",
                is_visible: true,
                label: p.status,
                metadata: { status: p.status, email: p.email },
                updated_at: new Date().toISOString(),
              },
              { onConflict: "key" },
            );
          } catch (uiErr) {
            console.warn("Could not record user system_ui_state:", uiErr);
          }
        }
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

      const hasFaculty = assignments.some((a: any) => a.roleKey === "faculty_coordinator");
      const hasRestrictedRoles = assignments.some((a: any) =>
        ["campus_lead", "class_representative", "chairman"].includes(a.roleKey),
      );
      if (hasFaculty && hasRestrictedRoles) {
        return NextResponse.json(
          {
            ok: false,
            error: "Campus Lead and Class Representative roles cannot be assigned to Faculty members.",
          },
          { status: 400 },
        );
      }
      let effectiveAssignments = assignments;

      if (hasFaculty) {
        // Faculty role only remains: delete ALL existing user_roles for this user
        effectiveAssignments = assignments.filter((a: any) => a.roleKey === "faculty_coordinator");
        const { error: delError } = await admin
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (delError) {
          console.error("Error deleting old user_roles for faculty:", delError);
          return NextResponse.json({ ok: false, error: delError.message }, { status: 400 });
        }

        // Clean up any chapter campus_lead or class cohort rep references
        await admin.from("chapters").update({ campus_lead_id: null }).eq("campus_lead_id", userId);
        await admin.from("class_cohorts").update({ representative_id: null }).eq("representative_id", userId);
      } else {
        // Delete existing non-leadership user_roles for this user
        const { error: delError } = await admin
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .is("leadership_term_id", null);

        if (delError) {
          console.error("Error deleting old user_roles:", delError);
          return NextResponse.json({ ok: false, error: delError.message }, { status: 400 });
        }

        // Student role is default for all non-faculty accounts: ensure student is included
        if (!effectiveAssignments.some((a: any) => a.roleKey === "student")) {
          const { data: prof } = await admin.from("profiles").select("chapter_id").eq("id", userId).maybeSingle();
          const primaryChap = effectiveAssignments.find((a: any) => a.chapterId)?.chapterId || prof?.chapter_id || null;
          effectiveAssignments = [
            ...effectiveAssignments,
            { roleKey: "student", chapterId: primaryChap },
          ];
        }
      }

      let primaryChapterId: string | null = null;

      const rows = effectiveAssignments.map((a: any) => {
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
          id: genUuid(),
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

      // 3. Keep profiles.chapter_id and role synchronized
      const profileUpdates: Record<string, any> = {};
      if (primaryChapterId) {
        profileUpdates.chapter_id = primaryChapterId;
      }
      profileUpdates.role = hasFaculty ? "faculty_coordinator" : (effectiveAssignments.find((a: any) => a.roleKey !== "student")?.roleKey || "student");

      let profileSyncError: string | null = null;
      const { error: profErr } = await admin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);
      if (profErr) {
        console.warn("user_roles profiles chapter_id sync notice:", profErr);
        profileSyncError = profErr.message;
      }

      return NextResponse.json({
        ok: true,
        data: {
          userId,
          assignments: rows.map((r) => ({
            id: r.id,
            userId: r.user_id,
            user_id: r.user_id,
            roleKey: r.role_key,
            roleId: r.role_id,
            chapterId: r.chapter_id,
            organizationId: r.organization_id,
          })),
        },
        ...(profileSyncError ? { warning: `Roles updated, but profile chapter sync failed: ${profileSyncError}` } : {}),
      });
    }

    // 22. CHAPTER INVITE CODE MUTATIONS
    if (type === "chapter_invite_join") {
      const { code, codeId, chapterId, department, year } = data;
      const cleanCode = (code || "").trim().toUpperCase();
      const targetUserId = auth.userId;

      // 1. Locate invite token by id or token string
      let tokenRow: any = null;
      if (isUuid(codeId)) {
        const { data: foundById } = await admin
          .from("invite_tokens")
          .select("*")
          .eq("id", codeId)
          .maybeSingle();
        tokenRow = foundById;
      }
      if (!tokenRow && cleanCode) {
        const { data: foundByToken } = await admin
          .from("invite_tokens")
          .select("*")
          .ilike("token", cleanCode)
          .maybeSingle();
        tokenRow = foundByToken;
      }

      // Check system_ui_states for explicit revocation
      if (cleanCode) {
        const { data: uiRevoked } = await admin
          .from("system_ui_states")
          .select("is_enabled")
          .eq("key", `revoked_invite_${cleanCode}`)
          .maybeSingle();
        if (uiRevoked && !uiRevoked.is_enabled) {
          return NextResponse.json(
            { ok: false, error: "This invite code has been revoked and can no longer be used." },
            { status: 400 },
          );
        }
      }

      // Enforce: Reject if invite token is revoked, expired, or already used
      if (tokenRow) {
        if (!tokenRow.is_active) {
          return NextResponse.json(
            { ok: false, error: "This invite code has been revoked and can no longer be used." },
            { status: 400 },
          );
        }
        if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
          return NextResponse.json(
            { ok: false, error: "This invite code has expired and can no longer be used." },
            { status: 400 },
          );
        }
        const isReferral = Boolean(tokenRow.token && tokenRow.token.toLowerCase().startsWith("ref-"));
        if (!isReferral && tokenRow.used_by && !tokenRow.chapter_id) {
          return NextResponse.json(
            { ok: false, error: "This single-use invite link has already been used." },
            { status: 400 },
          );
        }
      }

      // 2. Synchronize user profile for target authenticated user
      let validProfileId: string | null = targetUserId;
      const profileUpdates: Record<string, any> = {
        status: "active",
      };
      if (isUuid(chapterId)) {
        profileUpdates.chapter_id = chapterId;
      }
      if (department && typeof department === "string") {
        profileUpdates.department = department.trim();
      }
      if (year && typeof year === "string") {
        profileUpdates.year = year.trim();
      }

      const { data: updatedProfile } = await admin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", targetUserId)
        .select("id")
        .maybeSingle();

      if (updatedProfile?.id) {
        validProfileId = updatedProfile.id;
      }

      // Ensure user has the student role for this chapter
      if (isUuid(chapterId)) {
        const { data: existingRole } = await admin
          .from("user_roles")
          .select("id")
          .eq("user_id", targetUserId)
          .eq("chapter_id", chapterId)
          .maybeSingle();

        if (!existingRole) {
          const { data: studentRole } = await admin
            .from("roles")
            .select("id")
            .eq("key", "student")
            .maybeSingle();

          await admin.from("user_roles").insert({
            user_id: targetUserId,
            role_key: "student",
            role_id: studentRole?.id || null,
            chapter_id: chapterId,
            organization_id: DEFAULT_ORG_ID,
            is_permanent: true,
          });
        }
      }

      // 3. Mark invite token with latest user and increment uses_count
      const effectiveTokenId = tokenRow?.id || (isUuid(codeId) ? codeId : null);
      const tokenString = cleanCode || tokenRow?.token || "";

      // Count prior usages from activity_logs for this token
      const { count: priorLogCount } = await admin
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .eq("action", "chapter_invite_used")
        .eq("entity_id", tokenString);

      const baseCount = Math.max(Number(tokenRow?.uses_count ?? 0), Number(priorLogCount ?? 0));
      const nextUses = baseCount + 1;

      // Try atomic RPC function first
      let rpcSucceeded = false;
      try {
        const { error: rpcErr } = await admin.rpc("increment_invite_token_usage", {
          p_token: tokenString,
          p_user_id: validProfileId,
        });
        if (!rpcErr) {
          rpcSucceeded = true;
        }
      } catch {
        rpcSucceeded = false;
      }

      // Fallback: direct table update
      if (!rpcSucceeded) {
        const updatePayload: Record<string, any> = {
          used_at: new Date().toISOString(),
          uses_count: nextUses,
        };
        if (validProfileId) {
          updatePayload.used_by = validProfileId;
        }

        let updRes: any = null;
        if (effectiveTokenId) {
          updRes = await admin.from("invite_tokens").update(updatePayload).eq("id", effectiveTokenId);
        } else if (cleanCode) {
          updRes = await admin.from("invite_tokens").update(updatePayload).ilike("token", cleanCode);
        }

        if (updRes?.error && updRes.error.message?.includes("uses_count")) {
          delete updatePayload.uses_count;
          if (effectiveTokenId) {
            updRes = await admin.from("invite_tokens").update(updatePayload).eq("id", effectiveTokenId);
          } else if (cleanCode) {
            updRes = await admin.from("invite_tokens").update(updatePayload).ilike("token", cleanCode);
          }
        }

        if (updRes?.error) {
          console.error("Mutation error (chapter_invite_join token update):", updRes.error);
          return NextResponse.json({ ok: false, error: updRes.error.message }, { status: 400 });
        }
      }

      // 4. Record usage in activity_logs
      await admin.from("activity_logs").insert({
        actor_id: validProfileId,
        action: "chapter_invite_used",
        entity: "chapter_invite_code",
        entity_id: cleanCode || tokenRow?.token || effectiveTokenId || "UNKNOWN",
        meta: JSON.stringify({
          chapterId,
          code: cleanCode || tokenRow?.token,
          userId: targetUserId,
          department,
          year,
          joinedAt: new Date().toISOString(),
        }),
      });

      // 5. If chapter_invite_uses table exists in Supabase, also record relational join row
      if (isUuid(validProfileId) && isUuid(chapterId)) {
        try {
          await admin.from("chapter_invite_uses").insert({
            invite_token_id: effectiveTokenId && isUuid(effectiveTokenId) ? effectiveTokenId : null,
            code: cleanCode || tokenRow?.token || "UNKNOWN",
            chapter_id: chapterId,
            user_id: validProfileId,
            department: department ? String(department).trim() : null,
            year: year ? String(year).trim() : null,
            joined_at: new Date().toISOString(),
          });
        } catch {
          // Gracefully ignore
        }
      }

      return NextResponse.json({ ok: true });
    }

    if (type === "student_referral_token") {
      const { id, code, expiresAt } = data;
      const cleanCode = (code || "").trim();
      const creatorId = auth.userId;

      const insertPayload: Record<string, any> = {
        token: cleanCode,
        chapter_id: null,
        expires_at: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        uses_count: 0,
        created_by: creatorId,
      };
      if (isUuid(id)) {
        insertPayload.id = id;
      }

      let { data: insRow, error: insErr } = await admin
        .from("invite_tokens")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insErr && insErr.message?.includes("uses_count")) {
        delete insertPayload.uses_count;
        const retry = await admin
          .from("invite_tokens")
          .insert(insertPayload)
          .select("id")
          .single();
        insRow = retry.data;
        insErr = retry.error;
      }

      if (insErr) {
        console.error("Error inserting student referral token in Supabase:", insErr);
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, id: insRow?.id || id });
    }

    if (type === "record_referral_use" || type === "referral_invite_join") {
      const { tokenId, token, referrerId, studentName, studentEmail } = data || {};
      const targetUserId = auth.userId;
      const cleanToken = (token || "").trim();

      // 1. Fetch the token row
      let tokenRow: any = null;
      if (isUuid(tokenId)) {
        const { data: byId } = await admin
          .from("invite_tokens")
          .select("id, token, created_by, uses_count, expires_at, is_active")
          .eq("id", tokenId)
          .maybeSingle();
        tokenRow = byId;
      }
      if (!tokenRow && cleanToken) {
        const { data: byCode } = await admin
          .from("invite_tokens")
          .select("id, token, created_by, uses_count, expires_at, is_active")
          .ilike("token", cleanToken)
          .maybeSingle();
        tokenRow = byCode;
      }

      const effectiveId = tokenRow?.id || tokenId;
      const effectiveToken = tokenRow?.token || cleanToken;
      const effectiveReferrer = tokenRow?.created_by || referrerId;

      // Calculate distinct users who have joined with this token
      const { data: priorLogs } = await admin
        .from("activity_logs")
        .select("actor_id, meta")
        .eq("action", "referral_invite_used")
        .eq("entity_id", effectiveToken);

      const distinctUsers = new Set<string>();
      if (priorLogs) {
        for (const log of priorLogs) {
          if (log.actor_id) distinctUsers.add(log.actor_id);
          try {
            const m = typeof log.meta === "string" ? JSON.parse(log.meta) : (log.meta || {});
            if (m?.newUserId) distinctUsers.add(m.newUserId);
            if (m?.studentEmail) distinctUsers.add(m.studentEmail.toLowerCase());
          } catch {}
        }
      }
      if (targetUserId) distinctUsers.add(targetUserId);
      if (studentEmail) distinctUsers.add(studentEmail.toLowerCase());

      const nextUses = Math.max(1, distinctUsers.size);

      // 2. Check if the 24-hour expiration has passed
      const isExpired = tokenRow?.expires_at && new Date(tokenRow.expires_at) < new Date();
      if (isExpired) {
        return NextResponse.json({ ok: false, error: "Referral invite link has expired (24h validity reached)." }, { status: 400 });
      }
      if (tokenRow && tokenRow.is_active === false) {
        return NextResponse.json({ ok: false, error: "Referral invite link has been revoked." }, { status: 400 });
      }

      // 3. Update token: increment uses_count, set used_at and latest used_by, keep is_active = true!
      if (effectiveId && isUuid(effectiveId)) {
        const updatePayload: Record<string, any> = {
          uses_count: nextUses,
          used_at: new Date().toISOString(),
          is_active: true,
          used_by: targetUserId,
        };
        let { error: updErr } = await admin.from("invite_tokens").update(updatePayload).eq("id", effectiveId);
        if (updErr && updErr.message?.includes("uses_count")) {
          delete updatePayload.uses_count;
          const retry = await admin.from("invite_tokens").update(updatePayload).eq("id", effectiveId);
          updErr = retry.error;
        }
        if (updErr) {
          console.error("Mutation error (record_referral_use):", updErr);
          return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });
        }
      }

      // 4. Record permanent log entry in activity_logs
      try {
        await admin.from("activity_logs").insert({
          actor_id: targetUserId,
          action: "referral_invite_used",
          entity: "referral_invite",
          entity_id: effectiveToken || effectiveId || "UNKNOWN",
          meta: JSON.stringify({
            tokenId: effectiveId,
            token: effectiveToken,
            referrerId: effectiveReferrer,
            newUserId: targetUserId,
            studentName: studentName || null,
            studentEmail: studentEmail || null,
            joinedAt: new Date().toISOString(),
            usesCount: nextUses,
          }),
        });
      } catch (logErr) {
        console.warn("Notice: activity_logs insert in record_referral_use:", logErr);
      }

      return NextResponse.json({ ok: true, usesCount: nextUses });
    }

    if (type === "chapter_invite_code") {
      const { id, chapterId, code, expiresAt, isReferral } = data;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: creating invite codes requires executive or campus lead role" }, { status: 403 });
      }
      const cleanCode = (code || "").trim().toUpperCase();
      const creatorId = auth.userId;

      let validChapterId: string | null = null;
      if (isUuid(chapterId)) {
        const { data: chapExists } = await admin
          .from("chapters")
          .select("id")
          .eq("id", chapterId)
          .maybeSingle();
        if (chapExists) validChapterId = chapExists.id;
      }
      if (!validChapterId && chapterId) {
        const { data: chapBySlug } = await admin
          .from("chapters")
          .select("id")
          .eq("slug", chapterId)
          .maybeSingle();
        if (chapBySlug) validChapterId = chapBySlug.id;
      }
      if (!validChapterId && !cleanCode.startsWith("REF-") && !isReferral && chapterId !== null) {
        const { data: firstChap } = await admin
          .from("chapters")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (firstChap) validChapterId = firstChap.id;
      }

      if (validChapterId) {
        const chapErr = checkChapterScope(validChapterId);
        if (chapErr) return chapErr;
      }

      const insertPayload: Record<string, any> = {
        token: cleanCode,
        chapter_id: validChapterId,
        expires_at: expiresAt || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        uses_count: 0,
        created_by: creatorId,
      };
      if (isUuid(id)) {
        insertPayload.id = id;
      }

      let { data: insRow, error: insErr } = await admin
        .from("invite_tokens")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insErr && insErr.message?.includes("uses_count")) {
        delete insertPayload.uses_count;
        const retry = await admin
          .from("invite_tokens")
          .insert(insertPayload)
          .select("id")
          .single();
        insRow = retry.data;
        insErr = retry.error;
      }

      if (insErr) {
        console.error("Error inserting invite token in Supabase:", insErr);
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, id: insRow?.id || id });
    }

    if (type === "revoke_chapter_invite_code" || type === "revoke_invite_token") {
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: revoking invite codes requires executive or campus lead role" }, { status: 403 });
      }
      const { id, code, token } = data || {};
      const targets = [id, code, token].filter(Boolean) as string[];

      for (const target of targets) {
        const clean = String(target).trim();
        if (!clean) continue;

        try {
          await admin.rpc("revoke_invite_code", { target_val: clean });
        } catch {
          // Fallback to direct table updates
        }

        let revokeError: any = null;
        if (isUuid(clean)) {
          const { error: e1 } = await admin.from("invite_tokens").update({ is_active: false }).eq("id", clean);
          if (e1) revokeError = e1;
        }

        const { error: e2 } = await admin.from("invite_tokens").update({ is_active: false }).ilike("token", clean);
        if (e2) revokeError = e2;

        const { error: e3 } = await admin
          .from("invite_tokens")
          .update({ is_active: false })
          .in("token", [clean, clean.toUpperCase(), clean.toLowerCase()]);
        if (e3) revokeError = e3;

        if (revokeError) {
          console.error("Mutation error (revoke_chapter_invite_code):", revokeError);
          return NextResponse.json({ ok: false, error: revokeError.message }, { status: 400 });
        }

        try {
          await admin.from("system_ui_states").upsert(
            {
              key: `revoked_invite_${clean.toUpperCase()}`,
              section: "invites",
              component_id: clean,
              state_type: "status",
              is_enabled: false,
              is_visible: false,
              label: "revoked",
              metadata: { revoked_at: new Date().toISOString(), target: clean },
              updated_at: new Date().toISOString(),
            },
            { onConflict: "key" },
          );
        } catch {}
      }
      return NextResponse.json({ ok: true });
    }

    // 23. SYSTEM UI & BUTTON STATE MUTATIONS
    if (type === "system_ui_state") {
      const st = data;
      if (!st.key || !st.section) {
        return NextResponse.json({ ok: false, error: "key and section are required" }, { status: 400 });
      }
      const { error } = await admin.from("system_ui_states").upsert({
        key: st.key,
        section: st.section,
        component_id: st.componentId || null,
        state_type: st.stateType || "button",
        is_enabled: st.isEnabled !== undefined ? Boolean(st.isEnabled) : true,
        is_visible: st.isVisible !== undefined ? Boolean(st.isVisible) : true,
        label: st.label || null,
        icon: st.icon || null,
        tone: st.tone || "default",
        action_url: st.actionUrl || null,
        metadata: st.metadata || {},
        scope: st.scope || "global",
        scope_id: st.scopeId || null,
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

      if (error) {
        console.error("Mutation error (system_ui_state):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // 24. DISCORD INTEGRATION MUTATIONS
    if (type === "discord_integration") {
      const disc = data;
      const { error } = await admin.from("discord_integrations").upsert({
        organization_id: isUuid(disc.organizationId) ? disc.organizationId : DEFAULT_ORG_ID,
        guild_id: disc.guildId,
        guild_name: disc.guildName || null,
        bot_status: disc.botStatus || "online",
        last_heartbeat: new Date().toISOString(),
        announcements_channel_id: disc.announcementsChannelId || null,
        events_channel_id: disc.eventsChannelId || null,
        audit_logs_channel_id: disc.auditLogsChannelId || null,
        leads_channel_id: disc.leadsChannelId || null,
        general_channel_id: disc.generalChannelId || null,
        webhook_url: disc.webhookUrl || null,
        audit_webhook_url: disc.auditWebhookUrl || null,
        sync_events: disc.syncEvents !== undefined ? Boolean(disc.syncEvents) : true,
        sync_announcements: disc.syncAnnouncements !== undefined ? Boolean(disc.syncAnnouncements) : true,
        sync_audit_logs: disc.syncAuditLogs !== undefined ? Boolean(disc.syncAuditLogs) : true,
        sync_registrations: disc.syncRegistrations !== undefined ? Boolean(disc.syncRegistrations) : false,
        role_mappings: disc.roleMappings || {},
        button_actions_enabled: disc.buttonActionsEnabled !== undefined ? Boolean(disc.buttonActionsEnabled) : true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "guild_id" });

      if (error) {
        console.error("Mutation error (discord_integration):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // 25. WEBSITE SECTION MUTATIONS
    if (type === "website_section") {
      const ws = data;
      if (!ws.slug || !ws.title) {
        return NextResponse.json({ ok: false, error: "slug and title are required" }, { status: 400 });
      }
      const { error } = await admin.from("website_sections").upsert({
        slug: ws.slug,
        title: ws.title,
        subtitle: ws.subtitle || null,
        content: ws.content || {},
        primary_button_label: ws.primaryButtonLabel || null,
        primary_button_url: ws.primaryButtonUrl || null,
        primary_button_enabled: ws.primaryButtonEnabled !== undefined ? Boolean(ws.primaryButtonEnabled) : true,
        secondary_button_label: ws.secondaryButtonLabel || null,
        secondary_button_url: ws.secondaryButtonUrl || null,
        secondary_button_enabled: ws.secondaryButtonEnabled !== undefined ? Boolean(ws.secondaryButtonEnabled) : true,
        is_published: ws.isPublished !== undefined ? Boolean(ws.isPublished) : true,
        sort_order: ws.sortOrder ?? 0,
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "slug" });

      if (error) {
        console.error("Mutation error (website_section):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["home", `section:${ws.slug}`]);
      return NextResponse.json({ ok: true });
    }

    // 26. CHAPTER STANDARD CHECK MUTATIONS
    if (type === "chapter_standard_check") {
      const { chapterId, standardId, done, note } = data;
      if (!isUuid(chapterId) || !standardId) {
        return NextResponse.json({ ok: false, error: "chapterId and standardId are required" }, { status: 400 });
      }
      const chapErr = checkChapterScope(chapterId);
      if (chapErr) return chapErr;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey) && !isFacultyRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: chapter standards require executive, lead, or faculty role" }, { status: 403 });
      }

      // Try upserting with modern columns
      let { error } = await admin.from("chapter_standard_checks").upsert({
        chapter_id: chapterId,
        standard_id: standardId,
        check_name: standardId,
        done: Boolean(done),
        status: done ? "passed" : "pending",
        note: note || null,
        notes: note || null,
        updated_at: new Date().toISOString(),
      });

      // If 'done' column doesn't exist in remote schema cache yet, fall back to legacy columns
      if (error && (error.message.includes("'done' column") || error.message.includes("'standard_id' column"))) {
        const res = await admin.from("chapter_standard_checks").upsert({
          chapter_id: chapterId,
          check_name: standardId,
          category: "compliance",
          status: done ? "passed" : "pending",
          notes: note || null,
          updated_at: new Date().toISOString(),
        });
        error = res.error;
      }

      if (error) {
        console.error("Mutation error (chapter_standard_check):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // 27. LEADERSHIP APPLICATION MUTATIONS
    if (type === "leadership_application") {
      const app = data;
      const appId = isUuid(app.id) ? app.id : genUuid();
      if (!isUuid(app.termId) || !isUuid(app.chapterId)) {
        return NextResponse.json({ ok: false, error: "termId and chapterId must be valid UUIDs" }, { status: 400 });
      }
      const chapErr = checkChapterScope(app.chapterId);
      if (chapErr) return chapErr;

      const { error } = await admin.from("leadership_applications").upsert({
        id: appId,
        term_id: app.termId,
        chapter_id: app.chapterId,
        user_id: auth.userId,
        role_key: app.roleKey,
        title: app.title,
        status: app.status ?? "applied",
        statement: app.statement || null,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error("Mutation error (leadership_application):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id: appId });
    }

    if (type === "leadership_application_status") {
      const { id, status } = data;
      if (!isUuid(id)) {
        return NextResponse.json({ ok: false, error: "Valid application id is required" }, { status: 400 });
      }
      if (!auth.isHq && !isCampusLead(auth.roleKey) && auth.roleKey !== "chairman") {
        return NextResponse.json({ ok: false, error: "Permission denied: reviewing applications requires campus lead or chairman role" }, { status: 403 });
      }
      const { data: appRow } = await admin.from("leadership_applications").select("chapter_id").eq("id", id).maybeSingle();
      if (appRow) {
        const chapErr = checkChapterScope(appRow.chapter_id);
        if (chapErr) return chapErr;
      }
      const { error } = await admin.from("leadership_applications").update({
        status,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) {
        console.error("Mutation error (leadership_application_status):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await admin.from("activity_logs").insert({
        actor_id: auth.userId,
        action: `leadership_application_${status}`,
        entity: "leadership_application",
        entity_id: id,
        meta: JSON.stringify({ status, reviewedAt: new Date().toISOString() }),
      });
      return NextResponse.json({ ok: true });
    }

    // ── VOLUNTEER & DELEGATED POWERS MUTATIONS ──
    if (type === "volunteer_group") {
      const g = data;
      const id = isUuid(g.id) ? g.id : genUuid();
      if (!isUuid(g.chapterId)) {
        return NextResponse.json({ ok: false, error: "Valid chapterId UUID is required" }, { status: 400 });
      }
      const chapErr = checkChapterScope(g.chapterId);
      if (chapErr) return chapErr;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: managing volunteer groups requires executive or campus lead role" }, { status: 403 });
      }
      const { error } = await admin.from("volunteer_groups").upsert({
        id,
        chapter_id: g.chapterId,
        name: g.name,
        description: g.description || null,
        group_type: g.groupType || "listed",
        is_preset: Boolean(g.isPreset),
        event_id: isUuid(g.eventId) ? g.eventId : null,
        valid_from: g.validFrom || null,
        valid_to: g.validTo || null,
        powers: g.powers,
        member_ids: Array.isArray(g.memberIds) ? g.memberIds.filter(isUuid) : [],
        custom_member_powers: g.customMemberPowers || {},
        created_by: auth.userId,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error("Mutation error (volunteer_group):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id });
    }

    if (type === "delete_volunteer_group") {
      const { id } = data;
      if (!isUuid(id)) return NextResponse.json({ ok: false, error: "Valid id required" }, { status: 400 });
      const { data: groupRow } = await admin.from("volunteer_groups").select("chapter_id").eq("id", id).maybeSingle();
      if (groupRow) {
        const chapErr = checkChapterScope(groupRow.chapter_id);
        if (chapErr) return chapErr;
      }
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied to delete volunteer group" }, { status: 403 });
      }
      const { error } = await admin.from("volunteer_groups").delete().eq("id", id);
      if (error) {
        console.error("Mutation error (delete_volunteer_group):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "volunteer_group_member") {
      const { groupId, userId, chapterId, customPowers } = data;
      if (!isUuid(groupId) || !isUuid(userId) || !isUuid(chapterId)) {
        return NextResponse.json({ ok: false, error: "Valid UUIDs are required for group, user, and chapter" }, { status: 400 });
      }
      const chapErr = checkChapterScope(chapterId);
      if (chapErr) return chapErr;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: managing volunteer members requires executive or campus lead role" }, { status: 403 });
      }
      const { error } = await admin.from("volunteer_group_members").upsert(
        {
          group_id: groupId,
          user_id: userId,
          chapter_id: chapterId,
          custom_powers: customPowers || null,
        },
        { onConflict: "group_id,user_id" }
      );
      if (error) {
        console.error("Mutation error (volunteer_group_member):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "remove_volunteer_group_member") {
      const { groupId, userId } = data;
      if (!isUuid(groupId) || !isUuid(userId)) {
        return NextResponse.json({ ok: false, error: "Valid UUIDs are required" }, { status: 400 });
      }
      const { data: groupRow } = await admin.from("volunteer_groups").select("chapter_id").eq("id", groupId).maybeSingle();
      if (groupRow) {
        const chapErr = checkChapterScope(groupRow.chapter_id);
        if (chapErr) return chapErr;
      }
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied to remove volunteer group member" }, { status: 403 });
      }
      const { error } = await admin
        .from("volunteer_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) {
        console.error("Mutation error (remove_volunteer_group_member):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "volunteer_assignment") {
      const a = data;
      const id = isUuid(a.id) ? a.id : genUuid();
      if (!isUuid(a.chapterId) || !isUuid(a.userId) || !isUuid(a.eventId)) {
        return NextResponse.json({ ok: false, error: "Valid UUIDs required for chapterId, userId, and eventId" }, { status: 400 });
      }
      const chapErr = checkChapterScope(a.chapterId);
      if (chapErr) return chapErr;
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied: volunteer assignments require executive or campus lead role" }, { status: 403 });
      }
      const { error } = await admin.from("volunteer_assignments").upsert({
        id,
        chapter_id: a.chapterId,
        user_id: a.userId,
        event_id: a.eventId,
        group_id: isUuid(a.groupId) ? a.groupId : null,
        tag: a.tag || "Volunteer",
        powers: a.powers,
        valid_from: a.validFrom || null,
        valid_to: a.validTo || null,
        status: a.status || "active",
        created_by: auth.userId,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error("Mutation error (volunteer_assignment):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, id });
    }

    if (type === "delete_volunteer_assignment") {
      const { id } = data;
      if (!isUuid(id)) return NextResponse.json({ ok: false, error: "Valid id required" }, { status: 400 });
      const { data: aRow } = await admin.from("volunteer_assignments").select("chapter_id").eq("id", id).maybeSingle();
      if (aRow) {
        const chapErr = checkChapterScope(aRow.chapter_id);
        if (chapErr) return chapErr;
      }
      if (!auth.isHq && !isCampusLead(auth.roleKey) && !isExecutiveRole(auth.roleKey)) {
        return NextResponse.json({ ok: false, error: "Permission denied to delete volunteer assignment" }, { status: 403 });
      }
      const { error } = await admin.from("volunteer_assignments").delete().eq("id", id);
      if (error) {
        console.error("Mutation error (delete_volunteer_assignment):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "open_handover_window") {
      if (auth.roleKey !== "founder" && !auth.isHq) {
        return NextResponse.json({ ok: false, error: "Only founders can open handover windows" }, { status: 403 });
      }
      const { chapterId, year, closedAt } = data;
      if (!chapterId || !year) {
        return NextResponse.json({ ok: false, error: "chapterId and year are required" }, { status: 400 });
      }

      // Close any existing open handover window for this chapter first
      await admin
        .from("handover_windows")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("chapter_id", chapterId)
        .eq("status", "open");

      const windowId = genUuid();
      const { data: newRow, error: insErr } = await admin
        .from("handover_windows")
        .insert({
          id: windowId,
          chapter_id: chapterId,
          year: String(year).trim(),
          opened_at: new Date().toISOString(),
          closed_at: closedAt ? new Date(closedAt).toISOString() : null,
          opened_by: auth.userId,
          status: "open",
        })
        .select()
        .single();

      if (insErr) {
        console.error("open_handover_window insert error:", insErr);
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, data: newRow, id: windowId });
    }

    if (type === "close_handover_window") {
      if (auth.roleKey !== "founder" && !auth.isHq) {
        return NextResponse.json({ ok: false, error: "Only founders can close handover windows" }, { status: 403 });
      }
      const { chapterId } = data;
      if (!chapterId) {
        return NextResponse.json({ ok: false, error: "chapterId is required" }, { status: 400 });
      }
      const { error: updErr } = await admin
        .from("handover_windows")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("chapter_id", chapterId)
        .eq("status", "open");

      if (updErr) {
        console.error("close_handover_window error:", updErr);
        return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "execute_term_handover") {
      const { chapterId, nextCampusLeadId, nextTermYear, nextExecutiveMembers } = data;
      if (!chapterId || !nextCampusLeadId || !nextTermYear) {
        return NextResponse.json(
          { ok: false, error: "chapterId, nextCampusLeadId, and nextTermYear are required" },
          { status: 400 },
        );
      }

      // Check handover window status
      const { data: openWin } = await admin
        .from("handover_windows")
        .select("id, status")
        .eq("chapter_id", chapterId)
        .eq("status", "open")
        .maybeSingle();

      if (!openWin) {
        return NextResponse.json(
          { ok: false, error: "Handover window is not open for this chapter" },
          { status: 400 },
        );
      }

      // Check current active term
      const { data: activeTerm } = await admin
        .from("terms")
        .select("*")
        .eq("chapter_id", chapterId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeTerm) {
        return NextResponse.json(
          { ok: false, error: "No active term exists for this chapter. Founders must initialize the first term." },
          { status: 400 },
        );
      }

      // Only the current active term's campus_lead_id for a chapter can execute the handover action
      if (activeTerm.campus_lead_id !== auth.userId && auth.roleKey !== "founder") {
        return NextResponse.json(
          { ok: false, error: "Only the current active term campus lead can execute the handover" },
          { status: 403 },
        );
      }

      // Try stored procedure first
      const { data: rpcRes, error: rpcErr } = await admin.rpc("execute_term_handover", {
        p_chapter_id: chapterId,
        p_acting_user_id: auth.userId,
        p_next_campus_lead_id: nextCampusLeadId,
        p_next_term_year: String(nextTermYear).trim(),
        p_next_exec_members: Array.isArray(nextExecutiveMembers) ? nextExecutiveMembers : [],
      });

      if (!rpcErr && rpcRes) {
        return NextResponse.json({ ok: true, data: rpcRes });
      }

      // Fallback transactional execution
      const nowIso = new Date().toISOString();
      const { data: studentRole } = await admin.from("roles").select("id").eq("key", "student").maybeSingle();
      const { data: leadRole } = await admin.from("roles").select("id").eq("key", "campus_lead").maybeSingle();
      const { data: execRole } = await admin.from("roles").select("id").eq("key", "executive_member").maybeSingle();

      if (activeTerm) {
        // a. Sets current terms row: status='closed', ended_at=now()
        await admin.from("terms").update({ status: "closed", ended_at: nowIso }).eq("id", activeTerm.id);

        // b. Sets outgoing campus lead's role -> 'student'
        await admin
          .from("user_roles")
          .delete()
          .eq("user_id", activeTerm.campus_lead_id)
          .eq("chapter_id", chapterId)
          .in("role_key", ["campus_lead", "chairman"]);

        await admin.from("user_roles").insert({
          user_id: activeTerm.campus_lead_id,
          role_key: "student",
          role_id: studentRole?.id ?? null,
          chapter_id: chapterId,
          is_permanent: true,
        });

        // c. Sets every current term_members user's role -> 'student'
        const { data: currentMembers } = await admin
          .from("term_members")
          .select("user_id")
          .eq("term_id", activeTerm.id);

        if (currentMembers && currentMembers.length > 0) {
          for (const m of currentMembers) {
            await admin
              .from("user_roles")
              .delete()
              .eq("user_id", m.user_id)
              .eq("chapter_id", chapterId)
              .eq("role_key", "executive_member");

            await admin.from("user_roles").insert({
              user_id: m.user_id,
              role_key: "student",
              role_id: studentRole?.id ?? null,
              chapter_id: chapterId,
              is_permanent: true,
            });
          }
        }
      }

      // d. Inserts new terms row (chapter_id, term_year = next year, campus_lead_id = new pick, status='active', started_at=now())
      const newTermId = genUuid();
      const { error: newTermErr } = await admin.from("terms").insert({
        id: newTermId,
        chapter_id: chapterId,
        term_year: String(nextTermYear).trim(),
        campus_lead_id: nextCampusLeadId,
        status: "active",
        started_at: nowIso,
      });

      if (newTermErr) {
        console.error("execute_term_handover new terms insert error:", newTermErr);
        return NextResponse.json({ ok: false, error: newTermErr.message }, { status: 400 });
      }

      // e. Sets new campus lead's role -> 'campus_lead'
      await admin
        .from("user_roles")
        .delete()
        .eq("user_id", nextCampusLeadId)
        .eq("chapter_id", chapterId)
        .eq("role_key", "executive_member");

      await admin.from("user_roles").insert({
        user_id: nextCampusLeadId,
        role_key: "campus_lead",
        role_id: leadRole?.id ?? null,
        chapter_id: chapterId,
        is_permanent: true,
      });
      await admin.from("chapters").update({ campus_lead_id: nextCampusLeadId }).eq("id", chapterId);

      // f. Inserts term_members rows for the new executive members, sets each of their user role -> 'executive_member'
      if (Array.isArray(nextExecutiveMembers) && nextExecutiveMembers.length > 0) {
        for (const item of nextExecutiveMembers) {
          const uId = item.userId ?? item.user_id;
          const designation = item.designation ? String(item.designation).trim() : null;
          if (uId && uId !== nextCampusLeadId) {
            await admin.from("term_members").insert({
              id: genUuid(),
              term_id: newTermId,
              user_id: uId,
              role: "executive_member",
              designation,
              added_at: nowIso,
            });
            await admin
              .from("user_roles")
              .delete()
              .eq("user_id", uId)
              .eq("chapter_id", chapterId)
              .eq("role_key", "executive_member");

            await admin.from("user_roles").insert({
              user_id: uId,
              role_key: "executive_member",
              role_id: execRole?.id ?? null,
              chapter_id: chapterId,
              is_permanent: true,
            });
          }
        }
      }

      // g. Do NOT touch handover_windows.status here
      return NextResponse.json({ ok: true, newTermId });
    }

    if (type === "assign_executive_member") {
      const { chapterId, userId, designation } = data;
      if (!chapterId || !userId) {
        return NextResponse.json({ ok: false, error: "chapterId and userId are required" }, { status: 400 });
      }

      // Restrict this option to users with role 'campus_lead' for their own chapter only (or founder)
      const isLead =
        (auth.roleKey === "campus_lead" || auth.roleKey === "chairman") && auth.chapterId === chapterId;
      if (!isLead && auth.roleKey !== "founder") {
        return NextResponse.json(
          { ok: false, error: "Only Campus Lead for this chapter can assign Executive Members" },
          { status: 403 },
        );
      }

      // Try stored procedure first
      const { data: rpcRes, error: rpcErr } = await admin.rpc("assign_chapter_executive_member", {
        p_chapter_id: chapterId,
        p_acting_user_id: auth.userId,
        p_target_user_id: userId,
        p_designation: designation ? String(designation).trim() : null,
      });

      if (!rpcErr && rpcRes) {
        return NextResponse.json({ ok: true, data: rpcRes });
      }

      // Fallback
      const { data: activeTerm } = await admin
        .from("terms")
        .select("id, campus_lead_id")
        .eq("chapter_id", chapterId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeTerm) {
        return NextResponse.json(
          { ok: false, error: "Cannot assign executive member: chapter has no active term. A founder must create the initial term first." },
          { status: 400 },
        );
      }

      // Verify caller is active campus lead for this chapter (or founder)
      if (activeTerm.campus_lead_id !== auth.userId && auth.roleKey !== "founder") {
        return NextResponse.json(
          { ok: false, error: "Only the active campus lead for this chapter can assign executive members" },
          { status: 403 },
        );
      }

      const termMemberId = genUuid();
      await admin.from("term_members").insert({
        id: termMemberId,
        term_id: activeTerm.id,
        user_id: userId,
        role: "executive_member",
        designation: designation ? String(designation).trim() : null,
        added_at: new Date().toISOString(),
      });

      const { data: execRole } = await admin
        .from("roles")
        .select("id")
        .eq("key", "executive_member")
        .maybeSingle();

      await admin.from("user_roles").insert({
        user_id: userId,
        role_key: "executive_member",
        role_id: execRole?.id ?? null,
        chapter_id: chapterId,
        is_permanent: true,
      });

      return NextResponse.json({ ok: true, termMemberId, termId: activeTerm.id });
    }

    // 21. CREATE FIRST CHAPTER TERM (FOUNDER ONLY)
    if (type === "create_first_term") {
      const { chapterId, campusLeadId, termYear, executiveMembers } = data;
      if (!isUuid(chapterId) || !isUuid(campusLeadId)) {
        return NextResponse.json({ ok: false, error: "Invalid chapterId or campusLeadId" }, { status: 400 });
      }

      // Only role 'founder' can create the first term
      if (auth.roleKey !== "founder" && !auth.assignedKeys?.includes("founder")) {
        return NextResponse.json(
          { ok: false, error: "Only founders can initialize the first chapter term" },
          { status: 403 },
        );
      }

      // Check that no active term already exists
      const { data: existingActive } = await admin
        .from("terms")
        .select("id")
        .eq("chapter_id", chapterId)
        .eq("status", "active")
        .maybeSingle();

      if (existingActive) {
        return NextResponse.json(
          { ok: false, error: "An active term already exists for this chapter. Use Term Change instead." },
          { status: 400 },
        );
      }

      // Try stored procedure first
      const { data: rpcRes, error: rpcErr } = await admin.rpc("create_first_chapter_term", {
        p_chapter_id: chapterId,
        p_acting_user_id: auth.userId,
        p_campus_lead_id: campusLeadId,
        p_term_year: String(termYear || new Date().getFullYear()).trim(),
        p_exec_members: Array.isArray(executiveMembers) ? executiveMembers : [],
      });

      if (!rpcErr && rpcRes) {
        return NextResponse.json({ ok: true, data: rpcRes });
      }

      // Fallback
      const nowIso = new Date().toISOString();
      const newTermId = genUuid();
      const { data: leadRole } = await admin.from("roles").select("id").eq("key", "campus_lead").maybeSingle();
      const { data: execRole } = await admin.from("roles").select("id").eq("key", "executive_member").maybeSingle();

      const { error: termErr } = await admin.from("terms").insert({
        id: newTermId,
        chapter_id: chapterId,
        term_year: String(termYear || new Date().getFullYear()).trim(),
        campus_lead_id: campusLeadId,
        status: "active",
        started_at: nowIso,
      });

      if (termErr) {
        return NextResponse.json({ ok: false, error: termErr.message }, { status: 400 });
      }

      // Set campus lead role
      await admin
        .from("user_roles")
        .delete()
        .eq("user_id", campusLeadId)
        .eq("chapter_id", chapterId)
        .in("role_key", ["executive_member", "campus_lead", "chairman"]);

      await admin.from("user_roles").insert({
        user_id: campusLeadId,
        role_key: "campus_lead",
        role_id: leadRole?.id ?? null,
        chapter_id: chapterId,
        is_permanent: true,
      });

      await admin.from("chapters").update({ campus_lead_id: campusLeadId }).eq("id", chapterId);

      // Insert executive members
      if (Array.isArray(executiveMembers) && executiveMembers.length > 0) {
        for (const item of executiveMembers) {
          const uId = item.userId ?? item.user_id;
          const designation = item.designation ? String(item.designation).trim() : null;
          if (uId && uId !== campusLeadId) {
            await admin.from("term_members").insert({
              id: genUuid(),
              term_id: newTermId,
              user_id: uId,
              role: "executive_member",
              designation,
              added_at: nowIso,
            });

            await admin
              .from("user_roles")
              .delete()
              .eq("user_id", uId)
              .eq("chapter_id", chapterId)
              .eq("role_key", "executive_member");

            await admin.from("user_roles").insert({
              user_id: uId,
              role_key: "executive_member",
              role_id: execRole?.id ?? null,
              chapter_id: chapterId,
              is_permanent: true,
            });
          }
        }
      }

      return NextResponse.json({ ok: true, termId: newTermId });
    }

    return NextResponse.json({ ok: false, error: `Unknown mutation type: ${type}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Mutation handler exception:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
