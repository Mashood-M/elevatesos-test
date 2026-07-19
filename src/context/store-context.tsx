"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSeedStore } from "@/lib/demo/seed";
import { loadDemoStore, saveDemoStore } from "@/lib/demo/persist";
import {
  insertChapterRemote,
  loadStoreFromSupabase,
} from "@/lib/data/supabase-bootstrap";
import {
  answerableQuestions,
  cohortRepIds,
  defaultFormsForEvent,
  emptyForm,
  fieldToQuestion,
  mintQrCode,
  normalizeStore,
  questionToField,
} from "@/lib/forms/helpers";
import {
  isAssignableLeadershipRole,
  isSingletonLeadershipRole,
} from "@/lib/leadership";
import { isDemoMode } from "@/lib/mode";
import type {
  Announcement,
  AttendanceStatus,
  Chapter,
  ClassCohort,
  Cluster,
  Department,
  ElevatesStore,
  EventItem,
  EventRegistration,
  FormDefinition,
  FormField,
  FormPurpose,
  FormQuestion,
  FormResponse,
  FormStatus,
  LeadershipAssignment,
  LeadershipStatus,
  LeadershipTerm,
  Profile,
  RegistrationStatus,
  Report,
  ReportType,
  RoleKey,
  TaskStatus,
  UserRole,
  UserRoleAssignmentInput,
} from "@/types";

type CheckInResult = { ok: true } | { ok: false; message: string };

type StoreContextValue = {
  store: ElevatesStore;
  setSession: (userId: string, roleKey: RoleKey, chapterId?: string) => void;
  updateRegistrationStatus: (
    id: string,
    status: RegistrationStatus,
    actorId: string,
  ) => void;
  checkIn: (
    registrationId: string,
    status: AttendanceStatus,
    method: "qr" | "manual" | "bulk" | "representative",
    actorId: string,
    expectedEventId?: string,
  ) => CheckInResult;
  updateAttendance: (
    registrationId: string,
    status: AttendanceStatus,
    actorId: string,
  ) => CheckInResult;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  approveEvent: (eventId: string) => void;
  approveReport: (reportId: string, comment: string, actorId: string) => void;
  createEvent: (event: EventItem) => void;
  updateEvent: (id: string, patch: Partial<EventItem>) => void;
  registerForEvent: (registration: EventRegistration) => void;
  issueCertificate: (eventId: string, userId: string) => CheckInResult;
  saveEventForm: (eventId: string, fields: FormField[]) => void;
  saveForm: (
    eventId: string,
    purpose: FormPurpose,
    fields: FormField[],
    title?: string,
  ) => void;
  createForm: (
    input: Partial<FormDefinition> & { chapterId: string },
  ) => FormDefinition;
  updateForm: (id: string, patch: Partial<FormDefinition>) => void;
  deleteForm: (id: string) => void;
  duplicateForm: (id: string) => FormDefinition | null;
  saveFormQuestions: (id: string, questions: FormQuestion[]) => void;
  setFormStatus: (id: string, status: FormStatus) => void;
  submitFormResponse: (
    input: Omit<FormResponse, "id" | "submittedAt">,
  ) => FormResponse | null;
  deleteFormResponse: (id: string) => void;
  createChapter: (
    input: Pick<Chapter, "name" | "slug" | "college" | "city" | "status">,
  ) => Chapter;
  updateChapter: (
    id: string,
    patch: Partial<
      Pick<
        Chapter,
        | "name"
        | "slug"
        | "college"
        | "city"
        | "status"
        | "facultyId"
        | "notes"
        | "healthScore"
      >
    >,
  ) => void;
  updateProfile: (
    id: string,
    patch: Partial<
      Pick<
        Profile,
        | "department"
        | "year"
        | "section"
        | "bio"
        | "skills"
        | "interests"
        | "githubUrl"
        | "linkedinUrl"
        | "portfolioUrl"
      >
    >,
  ) => void;
  createUser: (input: {
    fullName: string;
    email: string;
    chapterId?: string;
    roleKey: RoleKey;
    organizationId?: string;
  }) => Profile | null;
  updateUser: (
    id: string,
    patch: Partial<
      Pick<Profile, "fullName" | "email" | "chapterId" | "status" | "bio">
    >,
  ) => boolean;
  setUserRoles: (
    userId: string,
    assignments: UserRoleAssignmentInput[],
  ) => boolean;
  createDepartment: (input: {
    chapterId: string;
    name: string;
    id?: string;
  }) => Department | null;
  updateDepartment: (id: string, patch: { name: string }) => boolean;
  deleteDepartment: (id: string) => boolean;
  createClassCohort: (
    input: Omit<ClassCohort, "id"> & { id?: string },
  ) => ClassCohort | null;
  updateClassCohort: (
    id: string,
    patch: Partial<Omit<ClassCohort, "id" | "chapterId">>,
  ) => boolean;
  deleteClassCohort: (id: string) => void;
  createLeadershipTerm: (input: {
    chapterId: string;
    academicYear: string;
    title: string;
    startDate: string;
    endDate: string;
    status?: "upcoming" | "active";
    handoverNotes?: string;
  }) => LeadershipTerm | null;
  updateLeadershipTerm: (
    id: string,
    patch: Partial<
      Pick<
        LeadershipTerm,
        | "academicYear"
        | "title"
        | "startDate"
        | "endDate"
        | "status"
        | "handoverNotes"
      >
    >,
  ) => boolean;
  archiveLeadershipTerm: (id: string) => boolean;
  addLeadershipAssignment: (input: {
    termId: string;
    userId: string;
    roleKey: RoleKey;
    title: string;
  }) => LeadershipAssignment | null;
  updateLeadershipAssignment: (
    id: string,
    patch: Partial<Pick<LeadershipAssignment, "userId" | "roleKey" | "title">>,
  ) => boolean;
  removeLeadershipAssignment: (id: string) => boolean;
  createCluster: (
    input: Pick<Cluster, "chapterId" | "name" | "slug" | "description"> & {
      leaderId?: string;
    },
  ) => Cluster;
  updateCluster: (
    id: string,
    patch: Partial<
      Pick<Cluster, "name" | "description" | "leaderId" | "facultyId" | "slug">
    >,
  ) => void;
  joinCluster: (clusterId: string, userId: string) => void;
  leaveCluster: (clusterId: string, userId: string) => void;
  addClusterMember: (clusterId: string, userId: string) => void;
  removeClusterMember: (clusterId: string, userId: string) => void;
  toggleRoadmapWeek: (clusterId: string, week: number) => void;
  addRoadmapWeek: (clusterId: string, title: string) => void;
  removeRoadmapWeek: (clusterId: string, week: number) => void;
  submitReport: (input: {
    chapterId: string;
    type: ReportType;
    title: string;
    submittedBy: string;
  }) => Report;
  createAnnouncement: (
    input: Omit<Announcement, "id" | "createdAt">,
  ) => Announcement;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  resetDemoStore: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function log(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
) {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId,
    action,
    entity,
    entityId,
    createdAt: new Date().toISOString(),
  };
}

function removeUserRoleForAssignment(
  s: ElevatesStore,
  assignment: LeadershipAssignment,
): UserRole[] {
  const role = s.roles.find((r) => r.key === assignment.roleKey);
  if (!role) return s.userRoles;
  return s.userRoles.filter(
    (ur) =>
      !(
        ur.leadershipTermId === assignment.termId &&
        ur.userId === assignment.userId &&
        ur.roleId === role.id
      ),
  );
}

function upsertUserRoleForAssignment(
  s: ElevatesStore,
  term: LeadershipTerm,
  assignment: LeadershipAssignment,
): UserRole[] {
  const role = s.roles.find((r) => r.key === assignment.roleKey);
  if (!role) return s.userRoles;
  const without = removeUserRoleForAssignment(s, assignment);
  const exists = without.some(
    (ur) =>
      ur.userId === assignment.userId &&
      ur.roleId === role.id &&
      ur.chapterId === term.chapterId &&
      ur.leadershipTermId === term.id,
  );
  if (exists) return without;
  const ur: UserRole = {
    id: `ur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: assignment.userId,
    roleId: role.id,
    chapterId: term.chapterId,
    leadershipTermId: term.id,
  };
  return [...without, ur];
}

function syncActiveTermUserRoles(
  s: ElevatesStore,
  term: LeadershipTerm,
  assignments: LeadershipAssignment[],
): UserRole[] {
  let userRoles = s.userRoles.filter((ur) => ur.leadershipTermId !== term.id);
  const base = { ...s, userRoles };
  for (const a of assignments) {
    userRoles = upsertUserRoleForAssignment(
      { ...base, userRoles },
      term,
      a,
    );
  }
  return userRoles;
}

function maybeIssueCert(
  s: ElevatesStore,
  eventId: string,
  userId: string,
  status: AttendanceStatus,
) {
  const event = s.events.find((e) => e.id === eventId);
  if (
    !event?.certificateEnabled ||
    !(
      status === "present" ||
      status === "late" ||
      status === "volunteer" ||
      status === "speaker"
    ) ||
    s.certificates.some((c) => c.eventId === eventId && c.userId === userId)
  ) {
    return s.certificates;
  }
  const certificateId = `ELV-${event.chapterId.toUpperCase()}-${Date.now()
    .toString()
    .slice(-5)}`;
  return [
    {
      id: `cert-${Date.now()}`,
      certificateId,
      eventId,
      userId,
      issuedAt: new Date().toISOString(),
      verificationQr: `VERIFY-${certificateId}`,
      digitalSignature: `sig_${certificateId.toLowerCase()}`,
    },
    ...s.certificates,
  ];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ElevatesStore>(() =>
    normalizeStore(createSeedStore()),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (isDemoMode()) {
        const saved = loadDemoStore();
        if (!cancelled && saved) setStore(normalizeStore(saved));
      } else {
        const remote = await loadStoreFromSupabase();
        if (!cancelled) setStore(normalizeStore(remote));
      }
      if (!cancelled) setHydrated(true);
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !isDemoMode()) return;
    saveDemoStore(store);
  }, [store, hydrated]);

  const value = useMemo<StoreContextValue>(
    () => ({
      store,
      setSession: (userId, roleKey, chapterId) => {
        setStore((s) => ({
          ...s,
          session: { userId, roleKey, chapterId },
        }));
      },
      updateRegistrationStatus: (id, status, actorId) => {
        setStore((s) => ({
          ...s,
          registrations: s.registrations.map((r) => {
            if (r.id !== id) return r;
            const qrCode =
              status === "approved"
                ? r.qrCode || mintQrCode(r.eventId, r.userId)
                : status === "pending" || status === "rejected"
                  ? ""
                  : r.qrCode;
            return {
              ...r,
              status,
              qrCode,
              reviewedBy:
                status === "reviewed" || status === "approved"
                  ? actorId
                  : r.reviewedBy,
              approvedBy: status === "approved" ? actorId : r.approvedBy,
            };
          }),
          activityLogs: [
            log(actorId, `registration_${status}`, "registration", id),
            ...s.activityLogs,
          ],
        }));
      },
      checkIn: (registrationId, status, method, actorId, expectedEventId) => {
        let result: CheckInResult = { ok: true };
        setStore((s) => {
          const reg = s.registrations.find((r) => r.id === registrationId);
          if (!reg) {
            result = { ok: false, message: "Registration not found." };
            return s;
          }
          if (reg.status !== "approved") {
            result = {
              ok: false,
              message: "Only approved registrations can check in.",
            };
            return s;
          }
          if (expectedEventId && reg.eventId !== expectedEventId) {
            result = {
              ok: false,
              message: "QR does not belong to the selected event.",
            };
            return s;
          }
          const existing = s.attendance.find(
            (a) => a.registrationId === registrationId,
          );
          const record = {
            id: existing?.id ?? `att-${Date.now()}`,
            eventId: reg.eventId,
            registrationId,
            userId: reg.userId,
            status,
            method,
            checkedInAt: new Date().toISOString(),
            checkedInBy: actorId,
          };
          const attendance = existing
            ? s.attendance.map((a) =>
                a.registrationId === registrationId ? record : a,
              )
            : [record, ...s.attendance];
          return {
            ...s,
            attendance,
            certificates: maybeIssueCert(s, reg.eventId, reg.userId, status),
            activityLogs: [
              log(actorId, "check_in", "attendance", registrationId),
              ...s.activityLogs,
            ],
          };
        });
        return result;
      },
      updateAttendance: (registrationId, status, actorId) => {
        let result: CheckInResult = { ok: true };
        setStore((s) => {
          const existing = s.attendance.find(
            (a) => a.registrationId === registrationId,
          );
          if (!existing) {
            result = { ok: false, message: "Not checked in yet." };
            return s;
          }
          const attendance = s.attendance.map((a) =>
            a.registrationId === registrationId
              ? { ...a, status, checkedInBy: actorId }
              : a,
          );
          return {
            ...s,
            attendance,
            certificates: maybeIssueCert(
              s,
              existing.eventId,
              existing.userId,
              status,
            ),
          };
        });
        return result;
      },
      updateTaskStatus: (id, status) => {
        setStore((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        }));
      },
      approveEvent: (eventId) => {
        setStore((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === eventId
              ? { ...e, status: "registration_open" as const }
              : e,
          ),
        }));
      },
      approveReport: (reportId, comment, actorId) => {
        setStore((s) => ({
          ...s,
          reports: s.reports.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: "approved" as const,
                  hqComment: comment,
                  approvedBy: actorId,
                }
              : r,
          ),
          activityLogs: [
            log(actorId, "report_approved", "report", reportId),
            ...s.activityLogs,
          ],
        }));
      },
      createEvent: (event) => {
        const forms = defaultFormsForEvent(
          event.id,
          event.chapterId,
          event.title,
        );
        const regFields = forms[0].questions.map(questionToField);
        setStore((s) => ({
          ...s,
          events: [event, ...s.events],
          forms: [...forms, ...(s.forms ?? [])],
          eventForms: [
            { eventId: event.id, fields: regFields },
            ...s.eventForms,
          ],
        }));
      },
      updateEvent: (id, patch) => {
        setStore((s) => {
          const prev = s.events.find((e) => e.id === id);
          if (!prev) return s;
          const { id: _id, chapterId: _chapterId, ...safe } = patch;
          void _id;
          void _chapterId;
          return {
            ...s,
            events: s.events.map((e) =>
              e.id === id ? { ...e, ...safe, id: e.id, chapterId: e.chapterId } : e,
            ),
            activityLogs: [
              log(s.session.userId, "event_updated", "event", id),
              ...s.activityLogs,
            ],
          };
        });
      },
      registerForEvent: (registration) => {
        setStore((s) => ({
          ...s,
          registrations: [
            { ...registration, qrCode: registration.qrCode || "" },
            ...s.registrations,
          ],
        }));
      },
      saveEventForm: (eventId, fields) => {
        const questions = fields.map(fieldToQuestion);
        const now = new Date().toISOString();
        setStore((s) => {
          const forms = [...(s.forms ?? [])];
          const idx = forms.findIndex(
            (f) => f.eventId === eventId && f.purpose === "registration",
          );
          if (idx >= 0) {
            forms[idx] = {
              ...forms[idx],
              questions,
              updatedAt: now,
            };
          } else {
            const chapterId =
              s.events.find((e) => e.id === eventId)?.chapterId ?? "ch-ekc";
            forms.unshift({
              id: `form-reg-${eventId}`,
              purpose: "registration",
              title: "Registration",
              chapterId,
              eventId,
              status: "open",
              questions,
              createdAt: now,
              updatedAt: now,
            });
          }
          const exists = s.eventForms.some((f) => f.eventId === eventId);
          return {
            ...s,
            forms,
            eventForms: exists
              ? s.eventForms.map((f) =>
                  f.eventId === eventId ? { eventId, fields } : f,
                )
              : [{ eventId, fields }, ...s.eventForms],
          };
        });
      },
      saveForm: (eventId, purpose, fields, title) => {
        const questions = fields.map(fieldToQuestion);
        const now = new Date().toISOString();
        setStore((s) => {
          const forms = [...(s.forms ?? [])];
          const idx = forms.findIndex(
            (f) => f.eventId === eventId && f.purpose === purpose,
          );
          const chapterId =
            s.events.find((e) => e.id === eventId)?.chapterId ?? "ch-ekc";
          if (idx >= 0) {
            forms[idx] = {
              ...forms[idx],
              questions,
              title: title ?? forms[idx].title,
              updatedAt: now,
            };
          } else {
            forms.unshift({
              id: `form-${purpose}-${eventId}`,
              purpose,
              title: title ?? purpose,
              chapterId,
              eventId,
              status: "open",
              questions,
              createdAt: now,
              updatedAt: now,
            });
          }
          let eventForms = s.eventForms;
          if (purpose === "registration") {
            const exists = eventForms.some((f) => f.eventId === eventId);
            eventForms = exists
              ? eventForms.map((f) =>
                  f.eventId === eventId ? { eventId, fields } : f,
                )
              : [{ eventId, fields }, ...eventForms];
          }
          return { ...s, forms, eventForms };
        });
      },
      createForm: (input) => {
        const base = emptyForm(input.chapterId, input.purpose ?? "custom");
        const form: FormDefinition = {
          ...base,
          ...input,
          id: input.id ?? base.id,
          questions: input.questions ?? base.questions,
          status: input.status ?? "draft",
          createdAt: input.createdAt ?? base.createdAt,
          updatedAt: new Date().toISOString(),
        };
        setStore((s) => ({ ...s, forms: [form, ...(s.forms ?? [])] }));
        return form;
      },
      updateForm: (id, patch) => {
        const now = new Date().toISOString();
        setStore((s) => {
          const forms = (s.forms ?? []).map((f) =>
            f.id === id ? { ...f, ...patch, id: f.id, updatedAt: now } : f,
          );
          const nextForm = forms.find((f) => f.id === id);
          let eventForms = s.eventForms;
          if (
            nextForm?.purpose === "registration" &&
            nextForm.eventId &&
            (patch.questions || patch.eventId !== undefined)
          ) {
            const fields = nextForm.questions.map(questionToField);
            const exists = eventForms.some(
              (ef) => ef.eventId === nextForm.eventId,
            );
            eventForms = exists
              ? eventForms.map((ef) =>
                  ef.eventId === nextForm.eventId
                    ? { eventId: nextForm.eventId!, fields }
                    : ef,
                )
              : [{ eventId: nextForm.eventId, fields }, ...eventForms];
          }
          return { ...s, forms, eventForms };
        });
      },
      deleteForm: (id) => {
        setStore((s) => ({
          ...s,
          forms: (s.forms ?? []).filter((f) => f.id !== id),
          formResponses: (s.formResponses ?? []).filter((r) => r.formId !== id),
        }));
      },
      duplicateForm: (id) => {
        const source = store.forms?.find((f) => f.id === id);
        if (!source) return null;
        const now = new Date().toISOString();
        const copy: FormDefinition = {
          ...source,
          id: `form-${Date.now()}`,
          title: `${source.title} (copy)`,
          status: "draft",
          questions: source.questions.map((q) => ({
            ...q,
            id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          })),
          createdAt: now,
          updatedAt: now,
        };
        setStore((s) => ({ ...s, forms: [copy, ...(s.forms ?? [])] }));
        return copy;
      },
      saveFormQuestions: (id, questions) => {
        const now = new Date().toISOString();
        setStore((s) => {
          const forms = (s.forms ?? []).map((f) =>
            f.id === id ? { ...f, questions, updatedAt: now } : f,
          );
          const form = forms.find((f) => f.id === id);
          let eventForms = s.eventForms;
          if (form?.purpose === "registration" && form.eventId) {
            const fields = questions.map(questionToField);
            const exists = eventForms.some((ef) => ef.eventId === form.eventId);
            eventForms = exists
              ? eventForms.map((ef) =>
                  ef.eventId === form.eventId
                    ? { eventId: form.eventId!, fields }
                    : ef,
                )
              : [{ eventId: form.eventId, fields }, ...eventForms];
          }
          return { ...s, forms, eventForms };
        });
      },
      setFormStatus: (id, status) => {
        setStore((s) => ({
          ...s,
          forms: (s.forms ?? []).map((f) =>
            f.id === id
              ? { ...f, status, updatedAt: new Date().toISOString() }
              : f,
          ),
        }));
      },
      submitFormResponse: (input) => {
        const form = store.forms?.find((f) => f.id === input.formId);
        if (!form) return null;
        if (form.status !== "open") return null;
        const already = store.formResponses?.some(
          (r) =>
            r.formId === input.formId &&
            r.userId === input.userId &&
            (input.eventId ? r.eventId === input.eventId : true),
        );
        if (already) return null;
        for (const q of answerableQuestions(form)) {
          if (!q.required) continue;
          const v = input.answers[q.id];
          if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) {
            return null;
          }
        }
        const response: FormResponse = {
          ...input,
          id: `fres-${Date.now()}`,
          submittedAt: new Date().toISOString(),
        };
        setStore((s) => ({
          ...s,
          formResponses: [response, ...(s.formResponses ?? [])],
        }));
        return response;
      },
      deleteFormResponse: (id) => {
        setStore((s) => ({
          ...s,
          formResponses: (s.formResponses ?? []).filter((r) => r.id !== id),
        }));
      },
      issueCertificate: (eventId, userId) => {
        let result: CheckInResult = { ok: true };
        setStore((s) => {
          if (
            s.certificates.some(
              (c) => c.eventId === eventId && c.userId === userId,
            )
          ) {
            result = { ok: false, message: "Certificate already issued." };
            return s;
          }
          const att = s.attendance.find(
            (a) => a.eventId === eventId && a.userId === userId,
          );
          if (
            !att ||
            !(
              att.status === "present" ||
              att.status === "late" ||
              att.status === "volunteer" ||
              att.status === "speaker"
            )
          ) {
            result = {
              ok: false,
              message: "Requires verified attendance (present/late/volunteer/speaker).",
            };
            return s;
          }
          const certificateId = `ELV-MANUAL-${Date.now().toString().slice(-6)}`;
          return {
            ...s,
            certificates: [
              {
                id: `cert-${Date.now()}`,
                certificateId,
                eventId,
                userId,
                issuedAt: new Date().toISOString(),
                verificationQr: `VERIFY-${certificateId}`,
                digitalSignature: `sig_${certificateId.toLowerCase()}`,
              },
              ...s.certificates,
            ],
          };
        });
        return result;
      },
      createChapter: (input) => {
        const chapter: Chapter = {
          id: `ch-${Date.now()}`,
          organizationId: store.organization.id,
          name: input.name,
          slug: input.slug,
          college: input.college,
          city: input.city,
          status: input.status,
          healthScore: 40,
          memberCount: 0,
          eventCount: 0,
          projectCount: 0,
          foundedAt: new Date().toISOString(),
        };
        if (!isDemoMode()) {
          void insertChapterRemote({
            ...input,
            organizationId: store.organization.id,
          }).then((row) => {
            if (!row) return;
            setStore((s) => ({
              ...s,
              chapters: s.chapters.map((c) =>
                c.id === chapter.id
                  ? { ...c, id: row.id, organizationId: row.organization_id }
                  : c,
              ),
            }));
          });
        }
        setStore((s) => ({
          ...s,
          chapters: [
            { ...chapter, organizationId: s.organization.id },
            ...s.chapters,
          ],
          activityLogs: [
            log(s.session.userId, "chapter_created", "chapter", chapter.id),
            ...s.activityLogs,
          ],
          notifications: [
            {
              id: `n-${Date.now()}`,
              userId: s.session.userId,
              title: "Chapter created",
              body: `${chapter.name} is onboarding.`,
              read: false,
              createdAt: new Date().toISOString(),
              href: `/chapter/${chapter.slug}`,
            },
            ...s.notifications,
          ],
        }));
        return chapter;
      },
      updateChapter: (id, patch) => {
        setStore((s) => ({
          ...s,
          chapters: s.chapters.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
          activityLogs: [
            log(s.session.userId, "chapter_updated", "chapter", id),
            ...s.activityLogs,
          ],
        }));
      },
      updateProfile: (id, patch) => {
        setStore((s) => ({
          ...s,
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        }));
      },
      createUser: (input) => {
        const fullName = input.fullName.trim();
        const email = input.email.trim().toLowerCase();
        if (!fullName || !email) return null;
        const role = store.roles.find((r) => r.key === input.roleKey);
        if (!role) return null;
        if (store.profiles.some((p) => p.email.toLowerCase() === email)) {
          return null;
        }
        const isHq = role.scope === "hq";
        if (!isHq && !input.chapterId) return null;
        if (input.chapterId && !store.chapters.some((c) => c.id === input.chapterId)) {
          return null;
        }
        const id = `u-${Date.now()}`;
        const profile: Profile = {
          id,
          email,
          fullName,
          chapterId: isHq ? undefined : input.chapterId,
          status: "active",
          skills: [],
          interests: [],
          points: 0,
          badges: [],
        };
        const orgId = input.organizationId ?? store.organization.id;
        const userRole: UserRole = {
          id: `ur-${Date.now()}`,
          userId: id,
          roleId: role.id,
          chapterId: isHq ? undefined : input.chapterId,
          organizationId: isHq ? orgId : undefined,
        };
        setStore((s) => ({
          ...s,
          profiles: [profile, ...s.profiles],
          userRoles: [...s.userRoles, userRole],
          chapters: s.chapters.map((c) =>
            c.id === input.chapterId
              ? { ...c, memberCount: c.memberCount + 1 }
              : c,
          ),
          activityLogs: [
            log(s.session.userId, "user_created", "profile", id),
            ...s.activityLogs,
          ],
        }));
        return profile;
      },
      updateUser: (id, patch) => {
        const existing = store.profiles.find((p) => p.id === id);
        if (!existing) return false;
        if (patch.email !== undefined) {
          const email = patch.email.trim().toLowerCase();
          if (!email) return false;
          if (
            store.profiles.some(
              (p) => p.id !== id && p.email.toLowerCase() === email,
            )
          ) {
            return false;
          }
        }
        if (
          patch.chapterId !== undefined &&
          patch.chapterId &&
          !store.chapters.some((c) => c.id === patch.chapterId)
        ) {
          return false;
        }
        setStore((s) => {
          const prev = s.profiles.find((p) => p.id === id);
          const nextChapter =
            patch.chapterId !== undefined ? patch.chapterId : prev?.chapterId;
          let chapters = s.chapters;
          if (prev && patch.chapterId !== undefined && prev.chapterId !== nextChapter) {
            chapters = s.chapters.map((c) => {
              if (c.id === prev.chapterId) {
                return { ...c, memberCount: Math.max(0, c.memberCount - 1) };
              }
              if (c.id === nextChapter) {
                return { ...c, memberCount: c.memberCount + 1 };
              }
              return c;
            });
          }
          return {
            ...s,
            chapters,
            profiles: s.profiles.map((p) => {
              if (p.id !== id) return p;
              return {
                ...p,
                ...(patch.fullName !== undefined
                  ? { fullName: patch.fullName.trim() }
                  : {}),
                ...(patch.email !== undefined
                  ? { email: patch.email.trim().toLowerCase() }
                  : {}),
                ...(patch.chapterId !== undefined
                  ? { chapterId: patch.chapterId || undefined }
                  : {}),
                ...(patch.status !== undefined ? { status: patch.status } : {}),
                ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
              };
            }),
            activityLogs: [
              log(s.session.userId, "user_updated", "profile", id),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      setUserRoles: (userId, assignments) => {
        if (!store.profiles.some((p) => p.id === userId)) return false;
        const built: UserRole[] = [];
        for (const a of assignments) {
          const role = store.roles.find((r) => r.key === a.roleKey);
          if (!role) return false;
          if (role.scope === "hq") {
            built.push({
              id: `ur-${Date.now()}-${built.length}`,
              userId,
              roleId: role.id,
              organizationId: a.organizationId ?? store.organization.id,
            });
          } else {
            if (!a.chapterId) return false;
            if (!store.chapters.some((c) => c.id === a.chapterId)) return false;
            built.push({
              id: `ur-${Date.now()}-${built.length}`,
              userId,
              roleId: role.id,
              chapterId: a.chapterId,
              leadershipTermId: undefined,
            });
          }
        }
        setStore((s) => {
          const others = s.userRoles.filter((ur) => ur.userId !== userId);
          const leadershipLinked = s.userRoles.filter(
            (ur) => ur.userId === userId && Boolean(ur.leadershipTermId),
          );
          return {
            ...s,
            userRoles: [...others, ...built, ...leadershipLinked],
            activityLogs: [
              log(s.session.userId, "user_roles_set", "profile", userId),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      createDepartment: (input) => {
        const name = input.name.trim();
        if (!name) return null;
        const dup = (store.departments ?? []).some(
          (d) =>
            d.chapterId === input.chapterId &&
            d.name.trim().toUpperCase() === name.toUpperCase(),
        );
        if (dup) return null;
        const department: Department = {
          id: input.id ?? `dept-${Date.now()}`,
          chapterId: input.chapterId,
          name,
        };
        setStore((s) => ({
          ...s,
          departments: [department, ...(s.departments ?? [])],
          activityLogs: [
            log(s.session.userId, "department_created", "department", department.id),
            ...s.activityLogs,
          ],
        }));
        return department;
      },
      updateDepartment: (id, patch) => {
        const existing = store.departments?.find((d) => d.id === id);
        if (!existing) return false;
        const name = patch.name.trim();
        if (!name) return false;
        const dup = (store.departments ?? []).some(
          (d) =>
            d.id !== id &&
            d.chapterId === existing.chapterId &&
            d.name.trim().toUpperCase() === name.toUpperCase(),
        );
        if (dup) return false;
        const oldName = existing.name;
        setStore((s) => ({
          ...s,
          departments: (s.departments ?? []).map((d) =>
            d.id === id ? { ...d, name } : d,
          ),
          classCohorts: (s.classCohorts ?? []).map((c) =>
            c.chapterId === existing.chapterId &&
            c.department.trim().toUpperCase() === oldName.trim().toUpperCase()
              ? { ...c, department: name }
              : c,
          ),
          profiles: s.profiles.map((p) =>
            p.chapterId === existing.chapterId &&
            (p.department ?? "").trim().toUpperCase() ===
              oldName.trim().toUpperCase()
              ? { ...p, department: name }
              : p,
          ),
          activityLogs: [
            log(s.session.userId, "department_updated", "department", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      deleteDepartment: (id) => {
        const existing = store.departments?.find((d) => d.id === id);
        if (!existing) return false;
        const inUse = (store.classCohorts ?? []).some(
          (c) =>
            c.chapterId === existing.chapterId &&
            c.department.trim().toUpperCase() ===
              existing.name.trim().toUpperCase(),
        );
        if (inUse) return false;
        setStore((s) => ({
          ...s,
          departments: (s.departments ?? []).filter((d) => d.id !== id),
          activityLogs: [
            log(s.session.userId, "department_deleted", "department", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      createClassCohort: (input) => {
        const department = input.department.trim();
        const year = input.year.trim();
        const section = input.section.trim();
        const repIds = [
          ...new Set(
            (input.repIds ?? [])
              .map((id) => id.trim())
              .filter(Boolean),
          ),
        ].slice(0, 2);
        if (!department || !year || !section || repIds.length < 1) {
          return null;
        }
        const deptOk = (store.departments ?? []).some(
          (d) =>
            d.chapterId === input.chapterId &&
            d.name.trim().toUpperCase() === department.toUpperCase(),
        );
        if (!deptOk) return null;
        const dup = (store.classCohorts ?? []).some(
          (c) =>
            c.chapterId === input.chapterId &&
            c.department.trim().toUpperCase() === department.toUpperCase() &&
            c.year.trim().toLowerCase() === year.toLowerCase() &&
            c.section.trim().toUpperCase() === section.toUpperCase(),
        );
        if (dup) return null;
        const repsOk = repIds.every((id) =>
          store.profiles.some(
            (p) => p.id === id && p.chapterId === input.chapterId,
          ),
        );
        if (!repsOk) return null;
        const cohort: ClassCohort = {
          id: input.id ?? `cc-${Date.now()}`,
          chapterId: input.chapterId,
          department,
          year,
          section,
          repIds,
        };
        setStore((s) => ({
          ...s,
          classCohorts: [cohort, ...(s.classCohorts ?? [])],
          activityLogs: [
            log(s.session.userId, "class_cohort_created", "class_cohort", cohort.id),
            ...s.activityLogs,
          ],
        }));
        return cohort;
      },
      updateClassCohort: (id, patch) => {
        const existing = store.classCohorts?.find((c) => c.id === id);
        if (!existing) return false;
        const repIds = [
          ...new Set(
            (patch.repIds ?? cohortRepIds(existing))
              .map((rid) => rid.trim())
              .filter(Boolean),
          ),
        ].slice(0, 2);
        const next: ClassCohort = {
          id: existing.id,
          chapterId: existing.chapterId,
          department: (patch.department ?? existing.department).trim(),
          year: (patch.year ?? existing.year).trim(),
          section: (patch.section ?? existing.section).trim(),
          repIds,
        };
        if (!next.department || !next.year || !next.section) return false;
        if (next.repIds.length < 1) return false;
        const deptOk = (store.departments ?? []).some(
          (d) =>
            d.chapterId === next.chapterId &&
            d.name.trim().toUpperCase() === next.department.toUpperCase(),
        );
        if (!deptOk) return false;
        const dup = (store.classCohorts ?? []).some(
          (c) =>
            c.id !== id &&
            c.chapterId === next.chapterId &&
            c.department.trim().toUpperCase() === next.department.toUpperCase() &&
            c.year.trim().toLowerCase() === next.year.toLowerCase() &&
            c.section.trim().toUpperCase() === next.section.toUpperCase(),
        );
        if (dup) return false;
        const repsOk = next.repIds.every((rid) =>
          store.profiles.some(
            (p) => p.id === rid && p.chapterId === next.chapterId,
          ),
        );
        if (!repsOk) return false;
        setStore((s) => ({
          ...s,
          classCohorts: (s.classCohorts ?? []).map((c) =>
            c.id === id ? next : c,
          ),
          activityLogs: [
            log(s.session.userId, "class_cohort_updated", "class_cohort", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      deleteClassCohort: (id) => {
        setStore((s) => ({
          ...s,
          classCohorts: (s.classCohorts ?? []).filter((c) => c.id !== id),
          activityLogs: [
            log(s.session.userId, "class_cohort_deleted", "class_cohort", id),
            ...s.activityLogs,
          ],
        }));
      },
      createLeadershipTerm: (input) => {
        const academicYear = input.academicYear.trim();
        const title = input.title.trim();
        const startDate = input.startDate.trim();
        const endDate = input.endDate.trim();
        if (!input.chapterId || !academicYear || !title || !startDate || !endDate) {
          return null;
        }
        const status: LeadershipStatus = input.status ?? "upcoming";
        const term: LeadershipTerm = {
          id: `lt-${Date.now()}`,
          chapterId: input.chapterId,
          academicYear,
          title,
          startDate,
          endDate,
          status,
          handoverNotes: input.handoverNotes?.trim() || undefined,
        };
        setStore((s) => {
          let terms = [...s.leadershipTerms, term];
          let userRoles = s.userRoles;
          if (status === "active") {
            terms = terms.map((t) =>
              t.chapterId === input.chapterId &&
              t.id !== term.id &&
              t.status === "active"
                ? { ...t, status: "archived" as const }
                : t,
            );
          }
          return {
            ...s,
            leadershipTerms: terms,
            userRoles,
            activityLogs: [
              log(s.session.userId, "leadership_term_created", "leadership_term", term.id),
              ...s.activityLogs,
            ],
          };
        });
        return term;
      },
      updateLeadershipTerm: (id, patch) => {
        const existing = store.leadershipTerms.find((t) => t.id === id);
        if (!existing) return false;
        const next: LeadershipTerm = {
          ...existing,
          academicYear: (patch.academicYear ?? existing.academicYear).trim(),
          title: (patch.title ?? existing.title).trim(),
          startDate: (patch.startDate ?? existing.startDate).trim(),
          endDate: (patch.endDate ?? existing.endDate).trim(),
          status: patch.status ?? existing.status,
          handoverNotes:
            patch.handoverNotes !== undefined
              ? patch.handoverNotes.trim() || undefined
              : existing.handoverNotes,
        };
        if (!next.academicYear || !next.title || !next.startDate || !next.endDate) {
          return false;
        }
        setStore((s) => {
          let terms = s.leadershipTerms.map((t) => (t.id === id ? next : t));
          let userRoles = s.userRoles;
          if (next.status === "active") {
            terms = terms.map((t) =>
              t.chapterId === next.chapterId &&
              t.id !== id &&
              t.status === "active"
                ? { ...t, status: "archived" as const }
                : t,
            );
            const assignments = s.leadershipAssignments.filter(
              (a) => a.termId === id,
            );
            userRoles = syncActiveTermUserRoles(s, next, assignments);
          } else if (existing.status === "active") {
            // Demoted from active → clear term-linked demo roles
            userRoles = s.userRoles.filter(
              (ur) => ur.leadershipTermId !== id,
            );
          }
          return {
            ...s,
            leadershipTerms: terms,
            userRoles,
            activityLogs: [
              log(s.session.userId, "leadership_term_updated", "leadership_term", id),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      archiveLeadershipTerm: (id) => {
        const existing = store.leadershipTerms.find((t) => t.id === id);
        if (!existing || existing.status === "archived") return false;
        setStore((s) => ({
          ...s,
          leadershipTerms: s.leadershipTerms.map((t) =>
            t.id === id ? { ...t, status: "archived" as const } : t,
          ),
          userRoles: s.userRoles.filter((ur) => ur.leadershipTermId !== id),
          activityLogs: [
            log(s.session.userId, "leadership_term_archived", "leadership_term", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      addLeadershipAssignment: (input) => {
        const term = store.leadershipTerms.find((t) => t.id === input.termId);
        if (!term) return null;
        const title = input.title.trim();
        if (!title || !input.userId) return null;
        if (!isAssignableLeadershipRole(input.roleKey)) return null;
        const memberOk = store.profiles.some(
          (p) => p.id === input.userId && p.chapterId === term.chapterId,
        );
        if (!memberOk) return null;
        if (isSingletonLeadershipRole(input.roleKey)) {
          const taken = store.leadershipAssignments.some(
            (a) => a.termId === input.termId && a.roleKey === input.roleKey,
          );
          if (taken) return null;
        }
        const assignment: LeadershipAssignment = {
          id: `la-${Date.now()}`,
          termId: input.termId,
          userId: input.userId,
          roleKey: input.roleKey,
          title,
        };
        setStore((s) => {
          let userRoles = s.userRoles;
          if (term.status === "active") {
            userRoles = upsertUserRoleForAssignment(s, term, assignment);
          }
          return {
            ...s,
            leadershipAssignments: [...s.leadershipAssignments, assignment],
            userRoles,
            activityLogs: [
              log(
                s.session.userId,
                "leadership_assignment_added",
                "leadership_assignment",
                assignment.id,
              ),
              ...s.activityLogs,
            ],
          };
        });
        return assignment;
      },
      updateLeadershipAssignment: (id, patch) => {
        const existing = store.leadershipAssignments.find((a) => a.id === id);
        if (!existing) return false;
        const term = store.leadershipTerms.find((t) => t.id === existing.termId);
        if (!term) return false;
        const next: LeadershipAssignment = {
          ...existing,
          userId: patch.userId ?? existing.userId,
          roleKey: patch.roleKey ?? existing.roleKey,
          title: (patch.title ?? existing.title).trim(),
        };
        if (!next.title) return false;
        if (!isAssignableLeadershipRole(next.roleKey)) return false;
        const memberOk = store.profiles.some(
          (p) => p.id === next.userId && p.chapterId === term.chapterId,
        );
        if (!memberOk) return false;
        if (isSingletonLeadershipRole(next.roleKey)) {
          const taken = store.leadershipAssignments.some(
            (a) =>
              a.id !== id &&
              a.termId === next.termId &&
              a.roleKey === next.roleKey,
          );
          if (taken) return false;
        }
        setStore((s) => {
          let userRoles = s.userRoles;
          if (term.status === "active") {
            userRoles = removeUserRoleForAssignment(s, existing);
            const withRemoval = { ...s, userRoles };
            userRoles = upsertUserRoleForAssignment(
              withRemoval,
              term,
              next,
            );
          }
          return {
            ...s,
            leadershipAssignments: s.leadershipAssignments.map((a) =>
              a.id === id ? next : a,
            ),
            userRoles,
            activityLogs: [
              log(
                s.session.userId,
                "leadership_assignment_updated",
                "leadership_assignment",
                id,
              ),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      removeLeadershipAssignment: (id) => {
        const existing = store.leadershipAssignments.find((a) => a.id === id);
        if (!existing) return false;
        const term = store.leadershipTerms.find((t) => t.id === existing.termId);
        setStore((s) => {
          let userRoles = s.userRoles;
          if (term?.status === "active") {
            userRoles = removeUserRoleForAssignment(s, existing);
          }
          return {
            ...s,
            leadershipAssignments: s.leadershipAssignments.filter(
              (a) => a.id !== id,
            ),
            userRoles,
            activityLogs: [
              log(
                s.session.userId,
                "leadership_assignment_removed",
                "leadership_assignment",
                id,
              ),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      createCluster: (input) => {
        const cluster: Cluster = {
          id: `cl-${Date.now()}`,
          chapterId: input.chapterId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          leaderId: input.leaderId,
          memberIds: input.leaderId ? [input.leaderId] : [],
          roadmap: [
            { week: 1, title: "Kickoff & setup", done: false },
            { week: 2, title: "Core skills", done: false },
            { week: 3, title: "Build sprint", done: false },
            { week: 4, title: "Demo day", done: false },
          ],
        };
        setStore((s) => ({
          ...s,
          clusters: [cluster, ...s.clusters],
          activityLogs: [
            log(s.session.userId, "cluster_created", "cluster", cluster.id),
            ...s.activityLogs,
          ],
        }));
        return cluster;
      },
      updateCluster: (id, patch) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        }));
      },
      joinCluster: (clusterId, userId) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId && !c.memberIds.includes(userId)
              ? { ...c, memberIds: [...c.memberIds, userId] }
              : c,
          ),
        }));
      },
      leaveCluster: (clusterId, userId) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId
              ? {
                  ...c,
                  memberIds: c.memberIds.filter((id) => id !== userId),
                  leaderId: c.leaderId === userId ? undefined : c.leaderId,
                }
              : c,
          ),
        }));
      },
      addClusterMember: (clusterId, userId) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId && !c.memberIds.includes(userId)
              ? { ...c, memberIds: [...c.memberIds, userId] }
              : c,
          ),
        }));
      },
      removeClusterMember: (clusterId, userId) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId
              ? {
                  ...c,
                  memberIds: c.memberIds.filter((id) => id !== userId),
                  leaderId: c.leaderId === userId ? undefined : c.leaderId,
                }
              : c,
          ),
        }));
      },
      toggleRoadmapWeek: (clusterId, week) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId
              ? {
                  ...c,
                  roadmap: c.roadmap.map((w) =>
                    w.week === week ? { ...w, done: !w.done } : w,
                  ),
                }
              : c,
          ),
        }));
      },
      addRoadmapWeek: (clusterId, title) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) => {
            if (c.id !== clusterId) return c;
            const week =
              c.roadmap.reduce((m, w) => Math.max(m, w.week), 0) + 1;
            return {
              ...c,
              roadmap: [...c.roadmap, { week, title, done: false }],
            };
          }),
        }));
      },
      removeRoadmapWeek: (clusterId, week) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId
              ? { ...c, roadmap: c.roadmap.filter((w) => w.week !== week) }
              : c,
          ),
        }));
      },
      submitReport: (input) => {
        const report: Report = {
          id: `rep-${Date.now()}`,
          chapterId: input.chapterId,
          type: input.type,
          title: input.title,
          status: "submitted",
          submittedBy: input.submittedBy,
          submittedAt: new Date().toISOString(),
        };
        setStore((s) => ({
          ...s,
          reports: [report, ...s.reports],
          activityLogs: [
            log(input.submittedBy, "report_submitted", "report", report.id),
            ...s.activityLogs,
          ],
        }));
        return report;
      },
      createAnnouncement: (input) => {
        const announcement: Announcement = {
          ...input,
          id: `ann-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        setStore((s) => ({
          ...s,
          announcements: [announcement, ...s.announcements],
        }));
        return announcement;
      },
      markNotificationRead: (id) => {
        setStore((s) => ({
          ...s,
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        }));
      },
      markAllNotificationsRead: (userId) => {
        setStore((s) => ({
          ...s,
          notifications: s.notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n,
          ),
        }));
      },
      resetDemoStore: () => {
        setStore(normalizeStore(createSeedStore()));
      },
    }),
    [store],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function useCurrentUser() {
  const { store } = useStore();
  const profile = store.profiles.find((p) => p.id === store.session.userId);
  const role = store.roles.find((r) => r.key === store.session.roleKey);
  return { profile, role, session: store.session };
}
