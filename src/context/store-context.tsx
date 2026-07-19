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
  defaultFormsForEvent,
  emptyForm,
  fieldToQuestion,
  mintQrCode,
  normalizeStore,
  questionToField,
} from "@/lib/forms/helpers";
import { isDemoMode } from "@/lib/mode";
import type {
  Announcement,
  AttendanceStatus,
  Chapter,
  Cluster,
  ElevatesStore,
  EventItem,
  EventRegistration,
  FormDefinition,
  FormField,
  FormPurpose,
  FormQuestion,
  FormResponse,
  FormStatus,
  Profile,
  RegistrationStatus,
  Report,
  ReportType,
  RoleKey,
  TaskStatus,
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
