"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { FormSharePanel } from "@/components/domain/form-share-panel";
import { EventRegistrationDialog } from "@/components/domain/event-registration-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { TicketCard } from "@/components/ui/ticket-card";
import { useCurrentUser, useStore } from "@/context/store-context";
import { isFacultyRole } from "@/lib/access";
import {
  canRegisterNow,
  isEventVisibleToUser,
  DEFAULT_EVENT_CATEGORIES,
  getAllEventCategories,
  getEventRegistrationState,
  canPublishEvent,
  isEventOngoing,
  isEventEnded,
  isEventBeforeStart,
  isAttendanceTakeable,
} from "@/lib/events";
import { defaultFormsForEvent, getEventForm, mintQrCode } from "@/lib/forms/helpers";
import { hasPermission } from "@/lib/permissions";
import { fromLocalInput, toLocalInput, formatDateTime } from "@/lib/datetime";
import { Search, Users, GraduationCap, X, Plus, Trash2, Clock, CheckCircle2, Bell, AlertCircle, Ban, Play, Crown, Mic, Sparkles, XCircle } from "lucide-react";
import { DeleteEventDialog } from "@/components/domain/delete-event-dialog";
import { EventRemindersPanel } from "@/components/domain/event-reminders-panel";
import type { EventAttendanceSession, EventItem, EventStatus, Profile, RegistrationStatus, Visibility } from "@/types";


function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-[14px] bg-bg px-4 py-3 shadow-[var(--shadow-sm)]">
      <p className="text-[10px] uppercase tracking-wider text-text-dim">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-text-dim">{hint}</p> : null}
    </div>
  );
}

type EventDraft = {
  title: string;
  category: string;
  description: string;
  venue: string;
  capacity: string;
  waitlistCapacity: string;
  visibility: Visibility;
  startsAt: string;
  endsAt: string;
  registrationStart: string;
  registrationEnd: string;
  certificateEnabled: boolean;
  topics: string;
  eventType: "standalone" | "main" | "sub";
  parentEventId: string;
  attendanceSessions: EventAttendanceSession[];
  hasPlatform: boolean;
  hasCaseStudy: boolean;
  platformName: string;
  caseStudySlug: string;
  tagline: string;
  liveUrl: string;
  repoUrl: string;
  highlightMetric: string;
  architectureSummary: string;
};

function draftFromEvent(event: EventItem): EventDraft {
  return {
    title: event.title,
    category: (event.category || "WORKSHOP").toUpperCase(),
    description: event.description,
    venue: event.venue,
    capacity: String(event.capacity),
    waitlistCapacity: String(event.waitlistCapacity),
    visibility: event.visibility,
    startsAt: toLocalInput(event.startsAt),
    endsAt: toLocalInput(event.endsAt),
    registrationStart: toLocalInput(event.registrationStart),
    registrationEnd: toLocalInput(event.registrationEnd),
    certificateEnabled: event.certificateEnabled,
    topics: event.topics ? event.topics.join(", ") : "",
    eventType: event.eventType ?? "standalone",
    parentEventId: event.parentEventId ?? "",
    attendanceSessions: event.attendanceSessions && event.attendanceSessions.length > 0
      ? event.attendanceSessions
      : [{ id: "sess-1", name: "Main Arrival Check-In", time: "09:30 AM", isRequired: true }],
    hasPlatform: !!(event.platform?.enabled || event.caseStudy?.enabled),
    hasCaseStudy: !!event.caseStudy?.enabled,
    platformName: event.platform?.platformName ?? event.caseStudy?.platformName ?? "",
    caseStudySlug: event.caseStudy?.caseStudySlug ?? "",
    tagline: event.platform?.tagline ?? event.caseStudy?.tagline ?? "",
    liveUrl: event.platform?.liveUrl ?? event.caseStudy?.liveUrl ?? "",
    repoUrl: event.platform?.repoUrl ?? event.caseStudy?.repoUrl ?? "",
    highlightMetric: event.platform?.highlightMetric ?? event.caseStudy?.highlightMetric ?? "",
    architectureSummary: event.platform?.architectureSummary ?? event.caseStudy?.architectureSummary ?? "",
  };
}




function regStatusTone(
  status: RegistrationStatus,
): "green" | "orange" | "mute" | "cyan" {
  if (status === "approved") return "green";
  if (status === "waitlisted") return "mute";
  if (status === "rejected") return "mute";
  if (status === "reviewed") return "cyan";
  return "orange";
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug, eventId } = use(params);
  const router = useRouter();
  const {
    store,
    createForm,
    updateEvent,
    startEvent,
    endEvent,
    deleteEvent,
    updateRegistrationStatus,
    batchUpdateRegistrationStatus,
    setFormStatus,
    sendEventReminders,
    addEventCategory,
  } = useStore();
  const { session } = useCurrentUser();

  const chapter = store.chapters.find(
    (c) => c.slug === slug || c.id === slug,
  ) ?? store.chapters[0];

  const event = store.events.find(
    (e) =>
      e.id === eventId ||
      e.id.toLowerCase() === eventId.toLowerCase() ||
      e.slug === eventId ||
      (e.slug && e.slug.toLowerCase() === eventId.toLowerCase()) ||
      e.id === `evt-${eventId}` ||
      eventId === `evt-${e.id}`,
  );


  const isFaculty = isFacultyRole(session.roleKey);
  const canEdit = hasPermission(store, session.roleKey, "event.manage");
  const canApprove =
    hasPermission(store, session.roleKey, "registration.approve") ||
    Boolean(event && event.organizerId === session.userId);
  const canReview = hasPermission(store, session.roleKey, "registration.review");
  const canAttendance = hasPermission(
    store,
    session.roleKey,
    "attendance.verify",
  );
  const isOps = canEdit || canReview || canApprove;
  const canPublish =
    canPublishEvent(session.roleKey, event, session.userId) || isOps;
  const canManageEvent =
    canEdit ||
    canPublish ||
    isOps ||
    session.roleKey === "campus_lead" ||
    session.roleKey === "chairman" ||
    session.roleKey === "elevates_coordinator" ||
    session.roleKey === "faculty_coordinator" ||
    session.roleKey === "hq_admin" ||
    Boolean(event && event.organizerId === session.userId);
  const isFacultyMonitor = isFaculty && !isOps;
  const isStudentView = !isOps && !isFacultyMonitor && !isFaculty;

  const isOngoing = event ? (event.status === "ongoing" || isEventOngoing(event)) : false;
  const isEnded = event ? (event.status === "completed" || isEventEnded(event)) : false;

  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if ((isEnded || isOngoing) && editing) {
      setEditing(false);
    }
  }, [isEnded, isOngoing, editing]);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [queueFlash, setQueueFlash] = useState("");
  const [admitCount, setAdmitCount] = useState<number>(1);
  const [publishFlash, setPublishFlash] = useState("");
  const [qrCopied, setQrCopied] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("all");
  const [studentDeptFilter, setStudentDeptFilter] = useState<string>("all");
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState<string>("all");
  const [directoryAttendanceFilter, setDirectoryAttendanceFilter] = useState<string>("all");
  const [registerOpen, setRegisterOpen] = useState(false);

  const allCategories = useMemo(() => {
    const list = getAllEventCategories(store.eventCategories);
    const cur = draft?.category ? draft.category.trim().toUpperCase() : "";
    if (cur && !list.includes(cur)) {
      return [...list, cur];
    }
    return list;
  }, [store.eventCategories, draft?.category]);

  const handleAddNewTopic = () => {
    const normalized = newTopicInput.trim().toUpperCase();
    if (!normalized) return;
    addEventCategory(normalized);
    setDraft((d) => (d ? { ...d, category: normalized } : d));
    setNewTopicInput("");
    setIsAddingTopic(false);
  };

  useEffect(() => {
    if (event && !editing) {
      setDraft(draftFromEvent(event));
    }
  }, [event, editing]);

  const regs = useMemo(
    () => (event ? store.registrations.filter((r) => r.eventId === event.id) : []),
    [store.registrations, event],
  );

  const eventAttendanceRecords = useMemo(() => {
    if (!event) return [];
    return store.attendance.filter((a) => a.eventId === event.id);
  }, [store.attendance, event]);

  const eventDirectory = useMemo(() => {
    if (!event) return [];

    const peopleMap = new Map<string, {
      id: string;
      key: string;
      userId?: string;
      fullName: string;
      department: string;
      year: string;
      email: string;
      phone?: string;
      elevatesId?: string;
      role: "attendee" | "coordinator" | "speaker" | "volunteer";
      roleLabel: string;
      isStudentMember: boolean;
      registrationStatus?: RegistrationStatus;
      regId?: string;
      registeredAt?: string;
      attendanceStatus: "present" | "absent" | "not_checked_in";
      attendanceNote?: string;
      isAutoPresent: boolean;
      rep?: Profile;
    }>();

    // 1. Speakers / Hosts (event.hosts)
    const validHosts = Array.isArray(event.hosts) ? event.hosts : [];
    validHosts.forEach((host, idx) => {
      const hName = host.name?.trim();
      if (!hName) return;
      const lowerName = hName.toLowerCase();
      const prof = store.profiles.find(
        (p) =>
          p.fullName?.trim().toLowerCase() === lowerName ||
          p.email?.trim().toLowerCase() === lowerName,
      );

      const key = prof?.id ? `user-${prof.id}` : `speaker-${idx}-${lowerName}`;
      peopleMap.set(key, {
        id: key,
        key,
        userId: prof?.id,
        fullName: prof?.fullName || hName,
        department: prof?.department || "Speaker",
        year: prof?.year || "—",
        email: prof?.email || "—",
        phone: prof?.phone,
        elevatesId: prof?.elevatesId,
        role: "speaker",
        roleLabel: host.role?.trim() ? `Speaker (${host.role.trim()})` : "Session Speaker",
        isStudentMember: Boolean(prof),
        attendanceStatus: "present",
        attendanceNote: "Session Speaker (Conducting Session)",
        isAutoPresent: true,
      });
    });

    // 2. Coordinators / Organizers
    // 2a. Primary Organizer
    if (event.organizerId) {
      const orgProf = store.profiles.find((p) => p.id === event.organizerId);
      const key = `user-${event.organizerId}`;
      if (!peopleMap.has(key)) {
        peopleMap.set(key, {
          id: key,
          key,
          userId: event.organizerId,
          fullName: orgProf?.fullName || "Lead Coordinator",
          department: orgProf?.department || "Coordinator",
          year: orgProf?.year || "—",
          email: orgProf?.email || "—",
          phone: orgProf?.phone,
          elevatesId: orgProf?.elevatesId,
          role: "coordinator",
          roleLabel: "Lead Event Coordinator",
          isStudentMember: Boolean(orgProf),
          attendanceStatus: "present",
          attendanceNote: "Managing Event & Session Operations",
          isAutoPresent: true,
        });
      }
    }

    // 2b. Faculty Coordinator
    if (event.facultyId) {
      const facProf = store.profiles.find((p) => p.id === event.facultyId);
      const key = `user-${event.facultyId}`;
      if (!peopleMap.has(key)) {
        peopleMap.set(key, {
          id: key,
          key,
          userId: event.facultyId,
          fullName: facProf?.fullName || "Faculty Coordinator",
          department: facProf?.department || "Faculty",
          year: facProf?.year || "—",
          email: facProf?.email || "—",
          phone: facProf?.phone,
          elevatesId: facProf?.elevatesId,
          role: "coordinator",
          roleLabel: "Faculty Coordinator",
          isStudentMember: Boolean(facProf),
          attendanceStatus: "present",
          attendanceNote: "Faculty Oversight (Auto-Present)",
          isAutoPresent: true,
        });
      }
    }

    // 2c. Additional Organizers
    const extraOrgs = [
      ...(Array.isArray(event.organizers) ? event.organizers : []),
      ...(Array.isArray(event.organizer) ? event.organizer : []),
    ];
    extraOrgs.forEach((org, idx) => {
      const oName = org.name?.trim();
      if (!oName) return;
      const lowerName = oName.toLowerCase();
      const prof = store.profiles.find(
        (p) =>
          p.fullName?.trim().toLowerCase() === lowerName ||
          p.email?.trim().toLowerCase() === lowerName,
      );
      const key = prof?.id ? `user-${prof.id}` : `org-${idx}-${lowerName}`;
      if (!peopleMap.has(key)) {
        peopleMap.set(key, {
          id: key,
          key,
          userId: prof?.id,
          fullName: prof?.fullName || oName,
          department: prof?.department || "Coordinator",
          year: prof?.year || "—",
          email: prof?.email || "—",
          phone: prof?.phone,
          elevatesId: prof?.elevatesId,
          role: "coordinator",
          roleLabel: "Event Co-Organizer",
          isStudentMember: Boolean(prof),
          attendanceStatus: "present",
          attendanceNote: "Coordinating Session",
          isAutoPresent: true,
        });
      }
    });

    // 2d. Managing Team Students
    if (Array.isArray(event.managingStudentIds)) {
      event.managingStudentIds.forEach((mId) => {
        const prof = store.profiles.find((p) => p.id === mId);
        const key = `user-${mId}`;
        if (!peopleMap.has(key)) {
          peopleMap.set(key, {
            id: key,
            key,
            userId: mId,
            fullName: prof?.fullName || "Management Student",
            department: prof?.department || "Operations",
            year: prof?.year || "—",
            email: prof?.email || "—",
            phone: prof?.phone,
            elevatesId: prof?.elevatesId,
            role: "coordinator",
            roleLabel: "Event Managing Team",
            isStudentMember: Boolean(prof),
            attendanceStatus: "present",
            attendanceNote: "Managing Event Logistics",
            isAutoPresent: true,
          });
        }
      });
    }

    // 3. Volunteers
    const volunteerRecords = eventAttendanceRecords.filter((a) => a.status === "volunteer");
    volunteerRecords.forEach((vol) => {
      const prof = store.profiles.find((p) => p.id === vol.userId);
      const key = `user-${vol.userId}`;
      const existing = peopleMap.get(key);
      if (existing) {
        if (existing.role === "attendee") {
          existing.role = "volunteer";
          existing.roleLabel = "Event Volunteer";
          existing.attendanceStatus = "present";
          existing.attendanceNote = "Operations Volunteer (Managing Session)";
          existing.isAutoPresent = true;
        }
      } else {
        peopleMap.set(key, {
          id: key,
          key,
          userId: vol.userId,
          fullName: prof?.fullName || "Volunteer Student",
          department: prof?.department || "Volunteer",
          year: prof?.year || "—",
          email: prof?.email || "—",
          phone: prof?.phone,
          elevatesId: prof?.elevatesId,
          role: "volunteer",
          roleLabel: "Event Volunteer",
          isStudentMember: Boolean(prof),
          attendanceStatus: "present",
          attendanceNote: "Operations Volunteer (Managing Session)",
          isAutoPresent: true,
        });
      }
    });

    // 4. Registered Students (Attendees)
    regs.forEach((reg) => {
      const user = store.profiles.find((p) => p.id === reg.userId);
      const rep = reg.representativeId
        ? store.profiles.find((p) => p.id === reg.representativeId)
        : undefined;

      const userKey = reg.userId ? `user-${reg.userId}` : `reg-${reg.id}`;
      const existing = peopleMap.get(userKey);

      const userAttRecords = eventAttendanceRecords.filter(
        (a) => a.registrationId === reg.id || (reg.userId && a.userId === reg.userId),
      );
      const hasPresentAtt = userAttRecords.some(
        (a) =>
          a.status === "present" ||
          a.status === "volunteer" ||
          a.status === "speaker",
      );

      if (existing) {
        existing.regId = reg.id;
        existing.registrationStatus = reg.status;
        existing.registeredAt = reg.createdAt;
        if (rep && !existing.rep) existing.rep = rep;
      } else {
        const isPresent = hasPresentAtt;
        const attStatus: "present" | "absent" | "not_checked_in" = isPresent
          ? "present"
          : isEnded
            ? "absent"
            : "not_checked_in";

        const attNote = isPresent
          ? "Verified Present"
          : isEnded
            ? "Absent (Did Not Check In)"
            : "Not Checked In Yet";

        peopleMap.set(userKey, {
          id: userKey,
          key: userKey,
          userId: reg.userId,
          fullName: user?.fullName || reg.guestName || "Anonymous Student",
          department: user?.department || "Unassigned",
          year: user?.year || "—",
          email: user?.email || reg.guestEmail || "—",
          phone: user?.phone || "—",
          elevatesId: user?.elevatesId,
          role: "attendee",
          roleLabel: "Student Attendee",
          isStudentMember: Boolean(user),
          registrationStatus: reg.status,
          regId: reg.id,
          registeredAt: reg.createdAt,
          attendanceStatus: attStatus,
          attendanceNote: attNote,
          isAutoPresent: false,
          rep,
        });
      }
    });

    return Array.from(peopleMap.values());
  }, [event, regs, eventAttendanceRecords, store.profiles, isEnded]);

  const directoryStats = useMemo(() => {
    const total = eventDirectory.length;
    const presentCount = eventDirectory.filter((p) => p.attendanceStatus === "present").length;
    const absentCount = eventDirectory.filter((p) => p.attendanceStatus !== "present").length;
    const attendeesCount = eventDirectory.filter((p) => p.role === "attendee").length;
    const coordinatorsCount = eventDirectory.filter((p) => p.role === "coordinator").length;
    const speakersCount = eventDirectory.filter((p) => p.role === "speaker").length;
    const volunteersCount = eventDirectory.filter((p) => p.role === "volunteer").length;
    return {
      total,
      presentCount,
      absentCount,
      attendeesCount,
      coordinatorsCount,
      speakersCount,
      volunteersCount,
    };
  }, [eventDirectory]);

  const availableDepts = useMemo(() => {
    const set = new Set<string>();
    eventDirectory.forEach((s) => {
      if (s.department && s.department !== "Unassigned" && s.department !== "Speaker" && s.department !== "Coordinator" && s.department !== "Faculty" && s.department !== "Operations" && s.department !== "Volunteer") {
        set.add(s.department);
      }
    });
    return Array.from(set).sort();
  }, [eventDirectory]);

  const [showRemindersModal, setShowRemindersModal] = useState(false);

  const eventReminders = useMemo(() => {
    if (!event) return [];
    return (store.eventReminders ?? []).filter(
      (r) =>
        r.eventId === event.id ||
        r.eventId === `evt-${event.id}` ||
        (event.slug && r.eventId === event.slug),
    );
  }, [store.eventReminders, event]);

  const filteredDirectory = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return eventDirectory.filter((item) => {
      if (directoryRoleFilter !== "all" && item.role !== directoryRoleFilter) {
        return false;
      }
      if (studentStatusFilter !== "all") {
        if (!item.registrationStatus || item.registrationStatus !== studentStatusFilter) {
          return false;
        }
      }
      if (directoryAttendanceFilter !== "all") {
        if (directoryAttendanceFilter === "present" && item.attendanceStatus !== "present") {
          return false;
        }
        if (directoryAttendanceFilter === "absent" && item.attendanceStatus === "present") {
          return false;
        }
      }
      if (studentDeptFilter !== "all" && item.department !== studentDeptFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.year.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.roleLabel.toLowerCase().includes(q) ||
        item.attendanceStatus.toLowerCase().includes(q) ||
        (item.registrationStatus && item.registrationStatus.toLowerCase().includes(q)) ||
        (item.elevatesId && item.elevatesId.toLowerCase().includes(q))
      );
    });
  }, [
    eventDirectory,
    studentSearch,
    directoryRoleFilter,
    studentStatusFilter,
    directoryAttendanceFilter,
    studentDeptFilter,
  ]);

  const registeredStudents = useMemo(() => {
    return regs.map((reg) => {
      const user = store.profiles.find((p) => p.id === reg.userId);
      const rep = reg.representativeId
        ? store.profiles.find((p) => p.id === reg.representativeId)
        : undefined;
      return {
        reg,
        user,
        rep,
        fullName: user?.fullName || reg.guestName || "Anonymous Student",
        department: user?.department || "Unassigned",
        year: user?.year || "—",
        email: user?.email || reg.guestEmail || "—",
        phone: user?.phone || "—",
        elevatesId: user?.elevatesId,
        status: reg.status,
      };
    });
  }, [regs, store.profiles]);

  const filteredRegisteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return registeredStudents.filter((item) => {
      if (studentStatusFilter !== "all" && item.status !== studentStatusFilter) {
        return false;
      }
      if (studentDeptFilter !== "all" && item.department !== studentDeptFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.year.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        (item.elevatesId && item.elevatesId.toLowerCase().includes(q))
      );
    });
  }, [registeredStudents, studentSearch, studentStatusFilter, studentDeptFilter]);

  if (isDeleting) {
    return (
      <div className="py-16 text-center">
        <p className="text-xs text-text-dim">Deleting event...</p>
      </div>
    );
  }

  if (!chapter || !event) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold text-text">Event not found</p>
        <p className="mt-1 text-xs text-text-dim">
          The event you are looking for does not exist or has been removed.
        </p>
        <Link
          href={session.chapterId ? `/chapter/${slug}/events` : `/events`}
          className="mt-3 inline-block text-[var(--accent)] text-sm"
        >
          Back to events
        </Link>
      </div>
    );
  }

  const isVisible = isEventVisibleToUser(
    event,
    chapter.id,
    session.roleKey,
    session.userId,
    store.chapters,
  );

  if (!isVisible) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
          <span className="text-xl">🔒</span>
        </div>
        <p className="font-semibold text-text">
          {event.status === "draft" || event.status === "pending_approval"
            ? "Event is in Draft"
            : "Access Restricted"}
        </p>
        <p className="mt-1.5 text-xs text-text-dim leading-relaxed">
          {event.status === "draft" || event.status === "pending_approval"
            ? "This event has been saved as a draft and is awaiting publication by the Campus Lead before students can view it."
            : "This event is exclusive to verified members of this campus chapter."}
        </p>
        <Link
          href={`/chapter/${slug}/events`}
          className="mt-4 inline-block rounded-md bg-bg-panel px-4 py-2 text-[var(--accent)] text-xs font-semibold border border-border hover:bg-bg-hover"
        >
          Back to events
        </Link>
      </div>
    );
  }


  const regState = getEventRegistrationState(store, event, session.userId);
  const approved = regs.filter((r) => r.status === "approved").length;
  const waitlisted = regs.filter((r) => r.status === "waitlisted").length;
  const seatsLeft = Math.max(0, event.capacity - approved);
  const regForm = getEventForm(store, event.id, "registration");
  const fbForm = getEventForm(store, event.id, "feedback");
  const myReg = regs.find((r) => r.userId === session.userId);
  const organizer = store.profiles.find((p) => p.id === event.organizerId);
  const queue = useMemo(() => {
    return regs
      .filter((r) => r.status === "waitlisted")
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [regs]);
  const eligibility = canRegisterNow(store, event, session.userId);

  function startEdit() {
    if (isEnded || isOngoing) return;
    setDraft(draftFromEvent(event!));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(draftFromEvent(event!));
    setEditing(false);
  }

  function saveEdit() {
    if (!draft || !draft.title.trim() || !draft.venue.trim()) return;
    const topics = draft.topics
      ? draft.topics.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const isPlatformActive = draft.hasPlatform || draft.hasCaseStudy;
    const platformData = isPlatformActive
      ? {
          enabled: true,
          platformName: draft.platformName || draft.title,
          tagline: draft.tagline,
          liveUrl: draft.liveUrl,
          repoUrl: draft.repoUrl,
          highlightMetric: draft.highlightMetric,
          architectureSummary: draft.architectureSummary,
        }
      : undefined;

    const finalCategory = (draft.category.trim() || event!.category || "WORKSHOP").toUpperCase();
    addEventCategory(finalCategory);

    updateEvent(event!.id, {
      title: draft.title.trim(),
      category: finalCategory,
      description: draft.description.trim(),
      venue: draft.venue.trim(),
      capacity: Math.max(1, parseInt(draft.capacity, 10) || event!.capacity),
      waitlistCapacity: Math.max(
        0,
        parseInt(draft.waitlistCapacity, 10) || 0,
      ),
      visibility: draft.visibility,
      status: event!.status,
      startsAt: fromLocalInput(draft.startsAt),
      endsAt: fromLocalInput(draft.endsAt),
      registrationStart: fromLocalInput(draft.registrationStart),
      registrationEnd: fromLocalInput(draft.registrationEnd),
      certificateEnabled: draft.certificateEnabled,
      topics,
      eventType: draft.eventType,
      parentEventId: draft.eventType === "sub" ? draft.parentEventId || undefined : undefined,
      attendanceSessions: draft.attendanceSessions,
      platform: platformData,


      caseStudy: isPlatformActive
        ? {
            enabled: true,
            platformName: draft.platformName || draft.title,
            tagline: draft.tagline,
            caseStudySlug:
              draft.caseStudySlug ||
              draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            liveUrl: draft.liveUrl,
            repoUrl: draft.repoUrl,
            highlightMetric: draft.highlightMetric,
            architectureSummary: draft.architectureSummary,
          }
        : undefined,
    });
    setEditing(false);
  }

  function ensureForm(purpose: "registration" | "feedback") {
    const existing = getEventForm(store, event!.id, purpose);
    if (existing) {
      router.push(`/chapter/${slug}/forms/${existing.id}`);
      return;
    }
    const defaults = defaultFormsForEvent(
      event!.id,
      chapter!.id,
      event!.title,
      event!,
    );
    const template = defaults.find((f) => f.purpose === purpose)!;
    const created = createForm({
      ...template,
      id: template.id,
      status: "open",
    });
    router.push(`/chapter/${slug}/forms/${created.id}`);
  }

  function publishEvent() {
    setPublishFlash("");
    const existing = getEventForm(store, event!.id, "registration");
    if (!existing) {
      const template = defaultFormsForEvent(
        event!.id,
        chapter!.id,
        event!.title,
        event!,
      ).find((f) => f.purpose === "registration");
      if (template) {
        createForm({
          ...template,
          id: template.id,
          status: "open",
        });
      }
      setPublishFlash("Published — registration form created and opened.");
    } else if (existing.status !== "open") {
      setFormStatus(existing.id, "open");
      setPublishFlash("Published — registration form reopened.");
    } else {
      setPublishFlash("Published — registration is open.");
    }
    updateEvent(event!.id, {
      status: "registration_open",
      publishedAt: new Date().toISOString(),
      registrationStart: new Date().toISOString(),
    });
  }

  function stopRegistration() {
    setPublishFlash("");
    const existing = getEventForm(store, event!.id, "registration");
    if (existing && existing.status === "open") {
      setFormStatus(existing.id, "closed");
    }
    updateEvent(event!.id, {
      status: "registration_closed",
    });
    setPublishFlash("Registration stopped. Students can no longer register.");
  }

  function handleRegAction(regId: string, status: RegistrationStatus) {
    setQueueFlash("");
    const result = updateRegistrationStatus(regId, status, session.userId);
    if (!result.ok) {
      setQueueFlash(result.message);
      return;
    }
    if (status === "approved" && result.status === "waitlisted") {
      setQueueFlash(
        "Seats full — registrant moved to the waitlist (no QR yet).",
      );
    }
  }

  async function copyQr(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setQrCopied(true);
      window.setTimeout(() => setQrCopied(false), 1400);
    } catch {
      // ignore
    }
  }

  const parentEvent = event.parentEventId
    ? store.events.find((e) => e.id === event.parentEventId)
    : null;
  const subEvents = store.events.filter((e) => e.parentEventId === event.id);

  const detailsReadonly = (
    <>
      {parentEvent ? (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-[12px] border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3.5 py-2.5 text-[12px]">
          <div>
            <span className="font-semibold text-[var(--accent)]">⚡ Sub-Event of Flagship:</span>{" "}
            <span className="font-medium text-text">{parentEvent.title}</span>
          </div>
          <Link
            href={`/chapter/${slug}/events/${parentEvent.id}`}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            View Main Event →
          </Link>
        </div>
      ) : null}

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-dim">Scope</dt>
          <dd className="font-medium">
            {event.eventType === "main"
              ? "🏆 Main Flagship Event"
              : event.eventType === "sub"
              ? "⚡ Sub-Event"
              : "🌟 Standalone Event"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-dim">Starts</dt>
          <dd>{formatDateTime(event.startsAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-dim">Ends</dt>
          <dd>{formatDateTime(event.endsAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-dim">Venue</dt>
          <dd>{event.venue}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-dim">Registration</dt>
          <dd className="text-right text-[13px]">
            Closes {new Date(event.registrationEnd).toLocaleDateString()}
          </dd>
        </div>
        {!isStudentView ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-text-dim">Visibility</dt>
              <dd className="capitalize">
                {event.visibility.replaceAll("_", " ")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-dim">Organizer</dt>
              <dd>{organizer?.fullName ?? event.organizerId}</dd>
            </div>
          </>
        ) : null}
      </dl>

      {event.topics && event.topics.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.topics.map((t) => (
            <Badge key={t} tone="mute">
              {t}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Custom Built Platform / Web App Showcase */}
      {(event.platform?.enabled || event.caseStudy?.enabled) ? (
        <div className="mt-4 rounded-[12px] border border-border/80 bg-bg-panel p-3.5 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                🚀 Custom Built Platform / Live Web App
              </span>
              <p className="mt-0.5 text-sm font-semibold text-text">
                {event.platform?.platformName || event.caseStudy?.platformName || event.title}
              </p>
              {(event.platform?.tagline || event.caseStudy?.tagline) ? (
                <p className="text-[12px] text-text-dim">
                  {event.platform?.tagline || event.caseStudy?.tagline}
                </p>
              ) : null}
            </div>
            {(event.platform?.highlightMetric || event.caseStudy?.highlightMetric) ? (
              <Badge tone="orange">
                {event.platform?.highlightMetric || event.caseStudy?.highlightMetric}
              </Badge>
            ) : null}
          </div>
          {(event.platform?.architectureSummary || event.caseStudy?.architectureSummary) ? (
            <p className="mt-2 text-[12px] text-text-mute">
              {event.platform?.architectureSummary || event.caseStudy?.architectureSummary}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
            {(event.platform?.liveUrl || event.caseStudy?.liveUrl) ? (
              <a
                href={event.platform?.liveUrl || event.caseStudy?.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Launch Live App ↗
              </a>
            ) : null}
            {(event.platform?.repoUrl || event.caseStudy?.repoUrl) ? (
              <a
                href={event.platform?.repoUrl || event.caseStudy?.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-text-dim hover:text-text hover:underline"
              >
                GitHub Source ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Sub-Events List (if this is a main flagship event) */}
      {subEvents.length > 0 ? (
        <div className="mt-4 rounded-[12px] border border-border/80 bg-bg p-3.5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[12px] font-semibold text-text">
              ⚡ Sub-Events Track ({subEvents.length})
            </p>
            <Link
              href={`/chapter/${slug}/events?create=1`}
              className="text-[11px] text-[var(--accent)] hover:underline"
            >
              + Add Sub-Event
            </Link>
          </div>
          <div className="space-y-2">
            {subEvents.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-[10px] border border-border/60 bg-bg-panel px-3 py-2 text-[12px]"
              >
                <div>
                  <span className="font-medium text-text">{sub.title}</span>
                  <span className="ml-1.5 text-[10px] text-text-dim">
                    · {sub.category} · {sub.venue}
                  </span>
                  {sub.platform?.enabled && sub.platform.liveUrl ? (
                    <span className="ml-1.5 text-[10px] text-[var(--accent)]">
                      (Live App ↗)
                    </span>
                  ) : null}
                </div>
                <Link
                  href={`/chapter/${slug}/events/${sub.id}`}
                  className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {event.description ? (
        <p className="mt-4 text-[13px] leading-relaxed text-text-dim">
          {event.description}
        </p>
      ) : null}
    </>
  );

  if (isStudentView) {
    return (
      <div>
        <PageHeader
          title={event.title}
          description={`${event.category} · ${event.venue}`}
          actions={
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Link
                href={session.chapterId ? `/chapter/${slug}/events` : `/events`}
                className="text-[12px] font-medium text-text-dim hover:text-[var(--accent)]"
              >
                ← Events
              </Link>
              {isEventOngoing(event) && (
                <Badge tone="green" className="flex items-center gap-1 font-bold animate-pulse shadow-sm">
                  <span className="relative flex h-2 w-2 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Ongoing Event
                </Badge>
              )}
              {myReg && myReg.status !== "rejected" ? (
                <Badge tone={regStatusTone(myReg.status)}>
                  {myReg.status === "approved" ? "Confirmed Pass" : myReg.status.replaceAll("_", " ")}
                </Badge>
              ) : event.status === "completed" ? (
                <Badge tone="mute">Event Completed</Badge>
              ) : event.status === "cancelled" ? (
                <Badge tone="magenta">Event Cancelled</Badge>
              ) : event.status === "registration_closed" ? (
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-[12px] opacity-75 cursor-not-allowed border border-border"
                  disabled
                >
                  Registration Stopped
                </Button>
              ) : regState.status === "upcoming" || regState.isUpcoming ? (
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-[12px] opacity-80 cursor-not-allowed border border-border"
                  disabled
                  title={regState.reason || `Registration opens on ${new Date(event.registrationStart).toLocaleString()}`}
                >
                  Registration Not Started
                </Button>
              ) : regState.isClosed ? (
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-[12px] opacity-75 cursor-not-allowed border border-border"
                  disabled
                  title={regState.reason || "Registration is closed"}
                >
                  Registration Closed
                </Button>
              ) : regState.isWaitlist ? (
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-[12px] border-amber-500/40 text-amber-500 font-semibold"
                  onClick={() => setRegisterOpen(true)}
                >
                  Join Waiting List
                </Button>
              ) : (
                <Button
                  variant="orange"
                  className="h-8 px-3 text-[12px]"
                  onClick={() => setRegisterOpen(true)}
                >
                  Register
                </Button>
              )}
            </div>
          }
        />

        {isEventOngoing(event) && (
          <div className="mb-4 rounded-[var(--radius)] border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 flex items-center gap-2.5 shadow-[var(--shadow-sm)]">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <p className="font-semibold text-emerald-300">This event is currently ongoing</p>
              <p className="text-text-dim text-[11px] mt-0.5">
                The session is live at {event.venue}. Attendance is being taken now.
              </p>
            </div>
          </div>
        )}

        {(regState.status === "upcoming" || regState.isUpcoming) && (
          <div className="mb-4 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-500 flex items-center gap-2.5">
            <Clock size={16} className="shrink-0" />
            <div>
              <p className="font-semibold">Registration Not Started</p>
              <p className="text-text-dim text-[11px] mt-0.5">
                {regState.reason || `Registration for this event will open on ${formatDateTime(event.registrationStart)}.`}
              </p>
            </div>
          </div>
        )}
        {event.status === "registration_closed" && (
          <div className="mb-4 rounded-[var(--radius)] border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <div>
              <p className="font-semibold">Registration Stopped</p>
              <p className="text-text-dim text-[11px] mt-0.5">
                Registration has been stopped by the event organizer.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <TicketCard
              event={event}
              meta={`${seatsLeft} seats left · closes ${new Date(event.registrationEnd).toLocaleDateString()}`}
              hideStatus={true}
            />
            <TerminalPanel title="about">
              {event.description ? (
                <p className="text-[13px] leading-relaxed text-text-dim">
                  {event.description}
                </p>
              ) : (
                <p className="text-[13px] text-text-dim">No description yet.</p>
              )}
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-dim">Starts</dt>
                  <dd>{formatDateTime(event.startsAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-dim">Ends</dt>
                  <dd>{formatDateTime(event.endsAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-dim">Venue</dt>
                  <dd>{event.venue}</dd>
                </div>
              </dl>
              {!eligibility.ok &&
              event.status === "registration_open" &&
              (!myReg || myReg.status === "rejected") ? (
                <p className="mt-4 text-[12px] text-text-mute">
                  {eligibility.reason}
                </p>
              ) : null}
            </TerminalPanel>
          </div>

          <TerminalPanel
            title="your registration"
            meta={myReg && myReg.status !== "rejected" ? myReg.status : "none"}
          >
            {!myReg || myReg.status === "rejected" ? (
              <div className="space-y-3">
                {regState.status === "ended" ? (
                  <p className="text-[13px] text-text-dim font-medium">
                    This event has ended. Registrations are no longer accepted.
                  </p>
                ) : regState.isClosed ? (
                  <>
                    <p className="text-[13px] text-text-dim">
                      {regState.reason || "Registration is closed for this event."}
                    </p>
                    <Button
                      variant="ghost"
                      className="h-8 px-3 text-[12px] text-text-dim border border-border/70 cursor-not-allowed opacity-75"
                      disabled
                    >
                      Registration Closed
                    </Button>
                  </>
                ) : regState.isWaitlist ? (
                  <>
                    <p className="text-[13px] text-amber-500 font-medium">
                      All confirmed seats are filled. Waiting list is open — registration will place you in the queue (first-come, first-served).
                    </p>
                    <Button
                      variant="orange"
                      className="h-8 px-3 text-[12px] bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                      onClick={() => setRegisterOpen(true)}
                    >
                      Join Waiting List
                    </Button>
                  </>
                ) : eligibility.ok ? (
                  <>
                    <p className="text-[13px] text-text-dim">
                      Direct registration with instant seat confirmation — no approval request needed.
                    </p>
                    <Button
                      variant="orange"
                      className="h-8 px-3 text-[12px]"
                      onClick={() => setRegisterOpen(true)}
                    >
                      Register now
                    </Button>
                  </>
                ) : (
                  <p className="text-[13px] text-text-dim">
                    {eligibility.reason}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Badge tone={regStatusTone(myReg.status)}>
                  {myReg.status.replaceAll("_", " ")}
                </Badge>
                {myReg.status === "waitlisted" ? (
                  <p className="text-[13px] text-amber-500 font-medium">
                    You are on the waiting list in first-registered priority order. If registered members do not attend the event, the event coordinator will approve seats from the waiting list.
                  </p>
                ) : null}
                <div className="rounded-[14px] border border-border bg-bg px-4 py-5">
                  <p className="text-center text-[11px] font-medium uppercase tracking-wider text-text-mute">
                    Your check-in QR
                  </p>
                  <div className="mx-auto mt-3 w-fit rounded-2xl border-2 border-border/80 bg-white p-4 sm:p-5 shadow-md">
                    <QRCode
                      value={myReg.qrCode || mintQrCode(event.id, myReg.userId)}
                      size={190}
                      level="M"
                      style={{ height: "auto", maxWidth: "100%", width: 190 }}
                    />
                  </div>
                  <p className="mt-3 break-all text-center font-[family-name:var(--font-mono)] text-[12px] font-semibold tracking-wide text-text">
                    {myReg.qrCode || mintQrCode(event.id, myReg.userId)}
                  </p>
                  <p className="mt-1 text-center text-[12px] text-text-dim">
                    Show this at the door to directly mark your attendance.
                  </p>
                  <div className="mt-3 flex justify-center">
                    <Button
                      variant="ghost"
                      className="h-9 px-4"
                      onClick={() => copyQr(myReg.qrCode || mintQrCode(event.id, myReg.userId))}
                    >
                      {qrCopied ? "Copied" : "Copy code"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {event.status === "completed" && fbForm?.status === "open" ? (
              <Link
                href={`/f/${fbForm.id}`}
                className="mt-4 inline-block text-[12px] font-medium text-[var(--accent)] hover:underline"
              >
                Give feedback →
              </Link>
            ) : null}
          </TerminalPanel>
        </div>

        <EventRegistrationDialog
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          event={event}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={event.title}
        description={`${event.category} · ${event.venue}${
          event.progressStage ? ` · EOS stage: ${event.progressStage}` : ""
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-text-dim">
              <Link
                href={`/chapter/${slug}/events`}
                className="hover:text-[var(--accent)]"
              >
                ← Events
              </Link>
              {canAttendance || isFaculty ? (
                <Link
                  href={`/chapter/${slug}/attendance?eventId=${event.id}`}
                  className="hover:text-[var(--accent)]"
                >
                  Attendance
                </Link>
              ) : null}
              {canEdit || canApprove ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors"
                  onClick={() => setShowRemindersModal(true)}
                >
                  <Bell size={13} className="text-[var(--accent)]" />
                  <span>Reminders ({eventReminders.length})</span>
                </button>
              ) : null}
            </div>
            {isFaculty ? (
              <Badge tone="cyan">Faculty Oversight</Badge>
            ) : null}
            {isEventOngoing(event) && (
              <Badge tone="green" className="flex items-center gap-1 font-bold animate-pulse shadow-sm">
                <span className="relative flex h-2 w-2 mr-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live / Ongoing
              </Badge>
            )}
            {canManageEvent ? (
              <div className="flex flex-wrap items-center gap-2">
                {isEnded ? (
                  <Badge tone="mute" className="h-8 px-3 text-[12px] font-semibold border border-border/80 inline-flex items-center">
                    Event Ended (Read-Only)
                  </Badge>
                ) : isOngoing ? (
                  /* When an event has started, users can't register, and the event ONLY can end! Other options do not work / are hidden */
                  <Button
                    variant="danger"
                    className="h-8 px-3 text-[12px] flex items-center gap-1 font-semibold shadow-sm"
                    onClick={() => {
                      endEvent(event.id, session.userId);
                      setPublishFlash("Event ended. Status marked Completed, and attendance is now closed.");
                    }}
                    title="End this event now and close attendance"
                  >
                    <CheckCircle2 size={13} />
                    End Event
                  </Button>
                ) : editing ? (
                  <>
                    <Button
                      variant="ghost"
                      className="h-8 px-3 text-[12px]"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      className="h-8 px-3 text-[12px]"
                      onClick={saveEdit}
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Start Event Control (Only before event starts!) */}
                    {event.status !== "cancelled" && (
                      <Button
                        variant="green"
                        className="h-8 px-3 text-[12px] flex items-center gap-1.5 font-bold shadow-sm"
                        onClick={() => {
                          startEvent(event.id, session.userId);
                          setPublishFlash("Event started! Event status is now Ongoing and attendance can be taken.");
                        }}
                        title="Start event now - transitions to Ongoing and allows attendance"
                      >
                        <Play size={13} className="fill-current" />
                        Start Event
                      </Button>
                    )}

                    {/* Publish / Stop Registration (Only before event starts!) */}
                    {canPublish && (
                      event.status === "registration_open" ? (
                        <Button
                          variant="danger"
                          className="h-8 px-3 text-[12px] flex items-center gap-1"
                          onClick={stopRegistration}
                          title="Stop registration immediately for this event"
                        >
                          <Ban size={13} />
                          Stop Registration
                        </Button>
                      ) : (
                        <Button
                          variant="orange"
                          className="h-8 px-3 text-[12px] flex items-center gap-1"
                          onClick={publishEvent}
                          title="Publish event and open registration"
                        >
                          <Play size={13} />
                          {event.status === "registration_closed" ? "Reopen Registration" : "Publish Event"}
                        </Button>
                      )
                    )}

                    <Button
                      variant="secondary"
                      className="h-8 px-3 text-[12px]"
                      onClick={() => ensureForm("registration")}
                      title="Edit the registration questions, fields, and options for this event"
                    >
                      Customize Form 📋
                    </Button>

                    {canEdit && (
                      <Button
                        variant="primary"
                        className="h-8 px-3 text-[12px]"
                        onClick={startEdit}
                      >
                        Edit Details
                      </Button>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        }
      />

      {isEventOngoing(event) && (
        <div className="mb-5 rounded-[var(--radius)] border border-emerald-500/40 bg-emerald-500/10 p-4 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-[13px] font-bold text-emerald-400">
                  Event is Currently Ongoing
                </p>
                <p className="text-[11px] text-text-dim">
                  This event is active right now. Attendance is open and can be recorded for students.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(canAttendance || isOps || isFaculty) && (
                <Link href={`/chapter/${slug}/attendance?eventId=${event.id}`}>
                  <Button variant="green" className="h-8 px-3.5 text-[12px] font-bold shadow-sm">
                    Take Attendance Now →
                  </Button>
                </Link>
              )}
              {canManageEvent && (
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-[12px] border border-red-500/40 text-red-400 hover:bg-red-500/10 font-semibold"
                  onClick={() => {
                    endEvent(event.id, session.userId);
                    setPublishFlash("Event ended. Marked completed.");
                  }}
                >
                  End Event
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {publishFlash || queueFlash ? (
        <p className="mb-4 text-[13px] text-[var(--accent)]">
          {queueFlash || publishFlash}
        </p>
      ) : null}

      {event.status === "draft" && (
        <div className="mb-5 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 p-4 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 text-sm font-bold">
                📝
              </span>
              <div>
                <p className="text-[13px] font-semibold text-text">
                  Draft Event — Unpublished
                </p>
                <p className="text-[11px] text-text-dim">
                  {canPublish
                    ? "A registration form has been generated. You can customize questions, add fields, and publish when ready."
                    : "This event is saved as a draft. It will be visible to students once published by the Campus Lead."}
                </p>
              </div>
            </div>
            {canPublish && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-[12px] font-semibold border border-amber-500/30"
                  onClick={() => ensureForm("registration")}
                >
                  Customize Form Questions 📋
                </Button>
                <Button
                  variant="orange"
                  className="h-8 px-4 text-[12px] font-semibold shadow-sm"
                  onClick={publishEvent}
                >
                  Publish Event → Open Registration
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {event.status === "registration_closed" && (
        <div className="mb-5 rounded-[var(--radius)] border border-red-500/30 bg-red-500/10 p-4 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-sm font-bold">
                ⏹
              </span>
              <div>
                <p className="text-[13px] font-semibold text-text">
                  Registration Stopped
                </p>
                <p className="text-[11px] text-text-dim">
                  Registration has been stopped for this event. Students can view event details but cannot submit new registrations.
                </p>
              </div>
            </div>
            {canPublish && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="orange"
                  className="h-8 px-4 text-[12px] font-semibold shadow-sm"
                  onClick={publishEvent}
                >
                  Publish Event → Reopen Registration
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {event.status === "registration_open" && (regState.status === "upcoming" || regState.isUpcoming) && (
        <div className="mb-5 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 p-4 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 text-sm font-bold">
                ⏰
              </span>
              <div>
                <p className="text-[13px] font-semibold text-text">
                  Auto-Registration Scheduled
                </p>
                <p className="text-[11px] text-text-dim">
                  Event is published. Registration will automatically open on <strong className="text-text">{formatDateTime(event.registrationStart)}</strong>.
                </p>
              </div>
            </div>
            {canPublish && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="orange"
                  className="h-8 px-4 text-[12px] font-semibold shadow-sm"
                  onClick={() => {
                    updateEvent(event.id, {
                      registrationStart: new Date().toISOString(),
                    });
                    setPublishFlash("Registration opened immediately!");
                  }}
                  title="Open registration right now without waiting for schedule"
                >
                  Open Registration Now
                </Button>
                <Button
                  variant="danger"
                  className="h-8 px-3 text-[12px]"
                  onClick={stopRegistration}
                >
                  Stop Registration
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Registered" value={regs.length} hint={`${approved} confirmed · ${waitlisted} waitlist`} />
        <Stat label="Approved" value={approved} hint={`${waitlisted} waitlist`} />
        <Stat
          label="Capacity"
          value={`${seatsLeft} left`}
          hint={`${event.capacity} seats · wl ${event.waitlistCapacity}`}
        />
        <Stat
          label="Reg closes"
          value={new Date(event.registrationEnd).toLocaleDateString()}
          hint={`Opened ${new Date(event.registrationStart).toLocaleDateString()}`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <TerminalPanel
          title="event.details"
          meta={editing ? "editing" : isEnded ? "ended" : isOngoing ? "ongoing" : event.status}
          accent={editing ? "orange" : isOngoing ? "green" : undefined}
        >
          {editing && draft && canEdit && !isEnded && !isOngoing ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2 rounded-[10px] border border-border/80 bg-bg p-3 shadow-[var(--shadow-sm)]">
                <FieldLabel>Event Scope / Hierarchy</FieldLabel>
                <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={`rounded-[8px] border px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      draft.eventType === "standalone"
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-text"
                        : "border-border/80 bg-bg text-text-dim"
                    }`}
                    onClick={() =>
                      setDraft((d) =>
                        d ? { ...d, eventType: "standalone", parentEventId: "" } : d,
                      )
                    }
                  >
                    🌟 Standalone
                  </button>
                  <button
                    type="button"
                    className={`rounded-[8px] border px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      draft.eventType === "main"
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-text"
                        : "border-border/80 bg-bg text-text-dim"
                    }`}
                    onClick={() =>
                      setDraft((d) =>
                        d ? { ...d, eventType: "main", parentEventId: "" } : d,
                      )
                    }
                  >
                    🏆 Main Flagship
                  </button>
                  <button
                    type="button"
                    className={`rounded-[8px] border px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                      draft.eventType === "sub"
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-text"
                        : "border-border/80 bg-bg text-text-dim"
                    }`}
                    onClick={() =>
                      setDraft((d) => (d ? { ...d, eventType: "sub" } : d))
                    }
                  >
                    ⚡ Sub-Event
                  </button>
                </div>
                {draft.eventType === "sub" ? (
                  <div className="mt-2.5">
                    <FieldLabel>Parent Main Event</FieldLabel>
                    <Select
                      value={draft.parentEventId}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, parentEventId: e.target.value } : d,
                        )
                      }
                    >
                      <option value="">Select parent flagship event…</option>
                      {store.events
                        .filter(
                          (ev) =>
                            ev.chapterId === chapter.id && ev.id !== event.id,
                        )
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            🏆 {m.title}
                          </option>
                        ))}
                    </Select>
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, title: e.target.value } : d))
                  }
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel className="mb-0">Category / Topic</FieldLabel>
                  {!isAddingTopic ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingTopic(true)}
                      className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={11} /> Add New Topic
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingTopic(false);
                        setNewTopicInput("");
                      }}
                      className="text-[11px] text-text-dim hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {isAddingTopic ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="e.g. CYBERSECURITY"
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewTopic();
                        } else if (e.key === "Escape") {
                          setIsAddingTopic(false);
                          setNewTopicInput("");
                        }
                      }}
                      autoFocus
                      className="font-bold uppercase tracking-wider h-11"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNewTopic}
                      disabled={!newTopicInput.trim()}
                      className="h-11 px-4 font-bold uppercase tracking-wider shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={draft.category ? draft.category.toUpperCase() : "WORKSHOP"}
                    onChange={(e) => {
                      if (e.target.value === "__NEW_TOPIC__") {
                        setIsAddingTopic(true);
                      } else {
                        setDraft((d) =>
                          d ? { ...d, category: e.target.value.toUpperCase() } : d,
                        );
                      }
                    }}
                    className="font-semibold uppercase"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__NEW_TOPIC__" className="text-[var(--accent)] font-bold">
                      + Add New Topic...
                    </option>
                  </Select>
                )}
              </div>
              <div>
                <FieldLabel>Venue</FieldLabel>
                <Input
                  value={draft.venue}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, venue: e.target.value } : d))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Description</FieldLabel>
                <TextArea
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, description: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Capacity</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="e.g. 100"
                  value={draft.capacity}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, capacity: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Waitlist capacity</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="e.g. 15"
                  value={draft.waitlistCapacity}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, waitlistCapacity: e.target.value } : d,
                    )
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Visibility</FieldLabel>
                <Select
                  value={draft.visibility}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            visibility: e.target.value as Visibility,
                          }
                        : d,
                    )
                  }
                >
                  <option value="chapter_only">Chapter Only</option>
                  <option value="specific_chapters">Selected Chapters</option>
                  <option value="all_chapters">All Chapters</option>
                  <option value="public">Public</option>
                </Select>
              </div>
              <div>
                <FieldLabel>Starts</FieldLabel>
                <Input
                  type="datetime-local"
                  min={toLocalInput(new Date().toISOString())}
                  value={draft.startsAt}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, startsAt: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Ends</FieldLabel>
                <Input
                  type="datetime-local"
                  min={draft.startsAt || toLocalInput(new Date().toISOString())}
                  value={draft.endsAt}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, endsAt: e.target.value } : d))
                  }
                />
              </div>
              <div>
                <FieldLabel>Registration opens</FieldLabel>
                <Input
                  type="datetime-local"
                  min={toLocalInput(new Date().toISOString())}
                  value={draft.registrationStart}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, registrationStart: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Registration closes</FieldLabel>
                <Input
                  type="datetime-local"
                  min={draft.registrationStart || toLocalInput(new Date().toISOString())}
                  value={draft.registrationEnd}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, registrationEnd: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Topics / Tags (comma-separated)</FieldLabel>
                <Input
                  placeholder="e.g. AI, Full-Stack, Web3, Career"
                  value={draft.topics}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, topics: e.target.value } : d,
                    )
                  }
                />
              </div>

              {/* Custom Built Platform / Web App in Edit Mode */}
              <div className="md:col-span-2 rounded-[12px] border border-border/80 bg-bg p-3.5 shadow-[var(--shadow-sm)]">
                <label className="flex items-center gap-2 text-[13px] font-medium text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.hasPlatform || draft.hasCaseStudy}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              hasPlatform: e.target.checked,
                              hasCaseStudy: e.target.checked,
                            }
                          : d,
                      )
                    }
                    className="h-4 w-4 rounded border-border accent-[var(--accent)]"
                  />
                  <span>💻 Built a custom platform / web app for this {draft.eventType === "sub" ? "sub-event" : "event"}</span>
                </label>
                <p className="mt-1 text-[11px] text-text-dim">
                  Enable if your team built a custom web app (e.g. QR Hunt Scanner, Live Leaderboard, Battle Arena) for this event.
                </p>

                {(draft.hasPlatform || draft.hasCaseStudy) ? (
                  <div className="mt-3 grid gap-3 border-t border-border/60 pt-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Platform / App Name</FieldLabel>
                      <Input
                        placeholder={
                          draft.eventType === "sub"
                            ? "e.g. Vibranium QR Treasure Hunt Engine"
                            : "e.g. Vibranium Portal / Celestia Platform"
                        }
                        value={draft.platformName}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, platformName: e.target.value } : d,
                          )
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Live Web App URL</FieldLabel>
                      <Input
                        placeholder="https://hunt.vibranium.live or https://..."
                        value={draft.liveUrl}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, liveUrl: e.target.value } : d,
                          )
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Highlight Metric / Feature</FieldLabel>
                      <Input
                        placeholder="e.g. 120+ Teams · Real-time GPS & QR Scanner"
                        value={draft.highlightMetric}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, highlightMetric: e.target.value } : d,
                          )
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Source Code / GitHub Repo</FieldLabel>
                      <Input
                        placeholder="https://github.com/..."
                        value={draft.repoUrl}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, repoUrl: e.target.value } : d,
                          )
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>Architecture / Tech Stack Highlights</FieldLabel>
                      <Input
                        placeholder="e.g. Next.js 15, WebSockets, Supabase Realtime, Geolocation API"
                        value={draft.architectureSummary}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  architectureSummary: e.target.value,
                                }
                              : d,
                          )
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-text-dim">
                  <input
                    type="checkbox"
                    checked={draft.certificateEnabled}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? { ...d, certificateEnabled: e.target.checked }
                          : d,
                      )
                    }
                    className="accent-[var(--accent)]"
                  />
                  Certificates enabled
                </label>
              </div>
              <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={saveEdit}>
                    Save changes
                  </Button>
                  <Button variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
                {canEdit ? (
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete event
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              {detailsReadonly}
              {isEnded ? (
                <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-text-dim">
                  <span>This event has ended and is in read-only archive mode. Details cannot be edited.</span>
                  <Badge tone="mute">Event Ended</Badge>
                </div>
              ) : isOngoing ? (
                <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-emerald-400">
                  <span>Event is currently live. Details are locked while the event is ongoing.</span>
                  <Badge tone="green">Live / Ongoing</Badge>
                </div>
              ) : canEdit ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <Button variant="ghost" onClick={startEdit}>
                    Edit details
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete event
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </TerminalPanel>

        {isOps ? (
          <TerminalPanel title="linked.forms" accent="orange">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-bg p-3 shadow-[var(--shadow-sm)]">
                <div>
                  <p className="font-semibold">Registration</p>
                  <p className="text-[12px] text-text-dim">
                    {isEnded
                      ? "Registration closed (Event Ended)"
                      : isOngoing
                        ? "Registration closed (Event Ongoing)"
                        : regForm
                          ? `${regForm.title} · ${regForm.status}`
                          : "Not created yet"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canEdit && !isEnded && !isOngoing ? (
                    <Button
                      variant="primary"
                      onClick={() => ensureForm("registration")}
                    >
                      {regForm ? "Manage form" : "Create form"}
                    </Button>
                  ) : null}
                  {regForm?.status === "open" && !isEnded && !isOngoing ? (
                    <Link href={`/f/${regForm.id}`}>
                      <Button variant="ghost">Public fill</Button>
                    </Link>
                  ) : null}
                  {canEdit && regForm && !isEnded && !isOngoing ? (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setFormStatus(
                          regForm.id,
                          regForm.status === "open" ? "closed" : "open",
                        )
                      }
                    >
                      {regForm.status === "open" ? "Close" : "Open"}
                    </Button>
                  ) : null}
                </div>
              </div>

              {regForm?.status === "open" && !isEnded && !isOngoing ? (
                <FormSharePanel formId={regForm.id} title="Registration link" />
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-bg p-3 shadow-[var(--shadow-sm)]">
                <div>
                  <p className="font-semibold">Feedback</p>
                  <p className="text-[12px] text-text-dim">
                    {fbForm
                      ? `${fbForm.title} · ${fbForm.status}`
                      : "Not created yet"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canEdit ? (
                    <Button
                      variant="orange"
                      onClick={() => ensureForm("feedback")}
                    >
                      {fbForm ? "Manage form" : "Create form"}
                    </Button>
                  ) : null}
                  {fbForm?.status === "open" ? (
                    <Link href={`/f/${fbForm.id}`}>
                      <Button variant="ghost">Public fill</Button>
                    </Link>
                  ) : null}
                  {canEdit && fbForm ? (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setFormStatus(
                          fbForm.id,
                          fbForm.status === "open" ? "closed" : "open",
                        )
                      }
                    >
                      {fbForm.status === "open" ? "Close" : "Open"}
                    </Button>
                  ) : null}
                </div>
              </div>

              {fbForm?.status === "open" ? (
                <FormSharePanel formId={fbForm.id} title="Feedback link" />
              ) : null}

              <Link href={`/chapter/${slug}/forms`}>
                <Button variant="ghost" className="w-full">
                  Open Forms hub
                </Button>
              </Link>
            </div>
          </TerminalPanel>
        ) : (
          <TerminalPanel title="faculty.oversight" meta="read-only">
            <div className="space-y-3.5 text-[13px]">
              <div className="rounded-[10px] border border-border/70 bg-bg p-3.5 shadow-[var(--shadow-sm)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-text">Faculty Coordinator Oversight</p>
                  <Badge tone="cyan">Faculty View</Badge>
                </div>
                <p className="mt-1.5 text-xs text-text-dim leading-relaxed">
                  As the faculty advisor, you have institutional oversight over this chapter event.
                  Review student participation, department-wise registration counts, and attendance delivery below.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-[10px] border border-border/60 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                    Total Registrations
                  </span>
                  <p className="mt-1 text-xl font-bold text-text">{regs.length}</p>
                  <p className="mt-0.5 text-[11px] text-text-dim">Student signups</p>
                </div>
                <div className="rounded-[10px] border border-border/60 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                    Approved Attendees
                  </span>
                  <p className="mt-1 text-xl font-bold text-emerald-500">{approved}</p>
                  <p className="mt-0.5 text-[11px] text-text-dim">Confirmed seats</p>
                </div>
                <div className="rounded-[10px] border border-border/60 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                    Waiting List
                  </span>
                  <p className="mt-1 text-xl font-bold text-amber-500">{waitlisted}</p>
                  <p className="mt-0.5 text-[11px] text-text-dim">Requires Campus Lead approval</p>
                </div>
                <div className="rounded-[10px] border border-border/60 bg-bg p-3 shadow-[var(--shadow-sm)]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Available Seats
                  </span>
                  <p className="mt-1 text-xl font-bold text-[var(--accent)]">{seatsLeft} / {event.capacity}</p>
                  <p className="mt-0.5 text-[11px] text-text-dim">{seatsLeft > 0 ? "Open for instant registration" : "Capacity reached"}</p>
                </div>
              </div>

              <div className="rounded-[10px] border border-border/50 bg-bg/50 px-3.5 py-2.5 text-xs text-text-dim flex items-center justify-between">
                <span>View full event attendance:</span>
                <Link
                  href={`/chapter/${slug}/attendance?eventId=${event.id}`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Attendance Registry →
                </Link>
              </div>
            </div>
          </TerminalPanel>
        )}
      </div>

      {isOps ? (
        <TerminalPanel
          title="event.reminders"
          meta={`${eventReminders.length} configured`}
          accent="orange"
          className="mb-6"
        >
          <EventRemindersPanel
            event={event}
            chapterSlug={chapter.slug}
            canManage={canEdit || canApprove}
          />
        </TerminalPanel>
      ) : null}

      {queue.length > 0 ? (
        <TerminalPanel
          title="waiting.list.approvals"
          meta={`${queue.length} student${queue.length === 1 ? "" : "s"} in queue (FIFO)`}
          accent="orange"
          className="mb-6"
        >
          <div className="mb-3 flex items-start gap-2.5 rounded-[10px] bg-amber-500/10 p-3 text-xs text-amber-400">
            <span className="text-base leading-none">ℹ️</span>
            <div>
              <p className="font-semibold">Event Capacity Waiting List (First-Come, First-Served)</p>
              <p className="mt-0.5 text-text-dim leading-relaxed">
                Direct registrations are approved immediately with an instant QR pass while seats are available.
                These students joined the waiting list after the {event.capacity}-seat limit was reached.
                <strong> If any registered members do not attend the event</strong>, the event coordinator can approve students from the waiting list for whatever amount of seats are needed.
                The waiting list is strictly prioritized by first-registered order (first to register gets the seat).
              </p>
            </div>
          </div>

          {canApprove ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border/70 bg-bg p-3 shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text">Admit from Waiting List:</span>
                <span className="text-[11px] text-text-dim">(fill open or no-show seats)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={queue.length}
                  value={admitCount}
                  onChange={(e) =>
                    setAdmitCount(
                      Math.max(
                        1,
                        Math.min(queue.length, parseInt(e.target.value, 10) || 1),
                      ),
                    )
                  }
                  className="h-8 w-16 rounded border border-border bg-bg-panel px-2 text-center font-mono text-xs text-text"
                />
                <Button
                  variant="orange"
                  className="h-8 px-3 text-xs font-semibold"
                  onClick={() => {
                    const count = Math.min(admitCount, queue.length);
                    const targetIds = queue.slice(0, count).map((r) => r.id);
                    const ok = batchUpdateRegistrationStatus(
                      targetIds,
                      "approved",
                      session.userId,
                    );
                    if (ok) {
                      setQueueFlash(
                        `Successfully approved the next ${count} waitlisted student${count === 1 ? "" : "s"} in priority order! Check-in QR codes minted.`,
                      );
                    }
                  }}
                >
                  Approve Next {Math.min(admitCount, queue.length)} in Queue (FIFO) → Mint QR
                </Button>
              </div>
            </div>
          ) : null}

          {queueFlash ? (
            <div className="mb-3 rounded-[8px] bg-[var(--accent)]/10 px-3 py-2 text-xs font-medium text-[var(--accent)]">
              {queueFlash}
            </div>
          ) : null}
          <ul className="space-y-3">
            {queue.map((reg, idx) => {
              const user = store.profiles.find((p) => p.id === reg.userId);
              return (
                <li
                  key={reg.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-bg p-3 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
                      Priority #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-text">{user?.fullName || reg.guestName || "Student"}</p>
                      <p className="text-[11px] text-text-dim">
                        {user?.department || "Unassigned"} • Year {user?.year || "—"} • Registered {new Date(reg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canApprove ? (
                      <>
                        <Button
                          variant="green"
                          className="h-8 px-3 text-[12px]"
                          onClick={() => handleRegAction(reg.id, "approved")}
                        >
                          Approve Seat → Mint QR
                        </Button>
                        <Button
                          variant="danger"
                          className="h-8 px-3 text-[12px]"
                          onClick={() => handleRegAction(reg.id, "rejected")}
                        >
                          Decline
                        </Button>
                      </>
                    ) : (
                      <span className="rounded-full bg-border/50 px-2.5 py-1 text-[11px] font-medium text-text-dim">
                        Approvals restricted to Event Coordinator & Campus Lead
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </TerminalPanel>
      ) : null}

      <TerminalPanel
        title="event.directory"
        meta={`${filteredDirectory.length} of ${eventDirectory.length} event participants (${directoryStats.presentCount} present)`}
        accent={isFaculty ? "cyan" : undefined}
      >
        <div className="space-y-4">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-[10px] border border-border/70 bg-bg p-3 shadow-[var(--shadow-sm)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                Total Directory
              </span>
              <p className="mt-1 text-xl font-bold text-text">{directoryStats.total}</p>
              <p className="mt-0.5 text-[11px] text-text-dim">
                {directoryStats.attendeesCount} attendees · {directoryStats.coordinatorsCount + directoryStats.speakersCount + directoryStats.volunteersCount} staff
              </p>
            </div>
            <div className="rounded-[10px] border border-emerald-500/30 bg-emerald-500/5 p-3 shadow-[var(--shadow-sm)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={11} /> Present / Attended
              </span>
              <p className="mt-1 text-xl font-bold text-emerald-400">{directoryStats.presentCount}</p>
              <p className="mt-0.5 text-[11px] text-emerald-500/80">
                Verified & Auto-Present
              </p>
            </div>
            <div className="rounded-[10px] border border-border/70 bg-bg p-3 shadow-[var(--shadow-sm)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim flex items-center gap-1">
                <Clock size={11} /> {isEnded ? "Absent" : "Not Checked In"}
              </span>
              <p className="mt-1 text-xl font-bold text-text-dim">{directoryStats.absentCount}</p>
              <p className="mt-0.5 text-[11px] text-text-dim">
                {isEnded ? "Did not attend" : "Check-in pending"}
              </p>
            </div>
            <div className="rounded-[10px] border border-purple-500/30 bg-purple-500/5 p-3 shadow-[var(--shadow-sm)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <Mic size={11} /> Session Leads
              </span>
              <p className="mt-1 text-xl font-bold text-purple-400">
                {directoryStats.coordinatorsCount + directoryStats.speakersCount + directoryStats.volunteersCount}
              </p>
              <p className="mt-0.5 text-[11px] text-purple-400/80">
                {directoryStats.speakersCount} spk · {directoryStats.coordinatorsCount} coord · {directoryStats.volunteersCount} vol
              </p>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={14} />
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name, role, department, academic year, email..."
                className="pl-8 h-9 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={directoryRoleFilter}
                onChange={(e) => setDirectoryRoleFilter(e.target.value)}
                className="h-9 text-xs min-w-[130px]"
              >
                <option value="all">All Roles ({eventDirectory.length})</option>
                <option value="attendee">Attendees ({directoryStats.attendeesCount})</option>
                <option value="coordinator">Coordinators ({directoryStats.coordinatorsCount})</option>
                <option value="speaker">Speakers ({directoryStats.speakersCount})</option>
                <option value="volunteer">Volunteers ({directoryStats.volunteersCount})</option>
              </Select>

              <Select
                value={directoryAttendanceFilter}
                onChange={(e) => setDirectoryAttendanceFilter(e.target.value)}
                className="h-9 text-xs min-w-[140px]"
              >
                <option value="all">All Attendance</option>
                <option value="present">Present ({directoryStats.presentCount})</option>
                <option value="absent">Absent / Unchecked ({directoryStats.absentCount})</option>
              </Select>

              <Select
                value={studentStatusFilter}
                onChange={(e) => setStudentStatusFilter(e.target.value)}
                className="h-9 text-xs min-w-[125px]"
              >
                <option value="all">All Reg Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="waitlisted">Waitlisted</option>
                <option value="rejected">Rejected</option>
              </Select>

              {availableDepts.length > 0 ? (
                <Select
                  value={studentDeptFilter}
                  onChange={(e) => setStudentDeptFilter(e.target.value)}
                  className="h-9 text-xs min-w-[140px]"
                >
                  <option value="all">All Departments</option>
                  {availableDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              ) : null}

              {(studentSearch || directoryRoleFilter !== "all" || directoryAttendanceFilter !== "all" || studentStatusFilter !== "all" || studentDeptFilter !== "all") ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStudentSearch("");
                    setDirectoryRoleFilter("all");
                    setDirectoryAttendanceFilter("all");
                    setStudentStatusFilter("all");
                    setStudentDeptFilter("all");
                  }}
                  className="h-9 px-2 text-xs text-text-dim hover:text-text"
                >
                  <X size={13} className="mr-1" /> Reset
                </Button>
              ) : null}
            </div>
          </div>

          {/* Table or Empty State */}
          {!eventDirectory.length ? (
            <div className="rounded-[12px] border border-dashed border-border/80 bg-bg p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-bg-panel text-text-dim">
                <Users size={20} />
              </div>
              <p className="mt-3 text-sm font-semibold text-text">No event participants yet</p>
              <p className="mt-1 text-xs text-text-dim max-w-sm mx-auto">
                When students register or session leads/coordinators are configured for this event, they will appear here.
              </p>
            </div>
          ) : !filteredDirectory.length ? (
            <div className="rounded-[12px] border border-dashed border-border/80 bg-bg p-8 text-center">
              <p className="text-sm font-medium text-text">No participants match your search</p>
              <p className="mt-1 text-xs text-text-dim">Try modifying your keyword, role, or attendance status filter.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStudentSearch("");
                  setDirectoryRoleFilter("all");
                  setDirectoryAttendanceFilter("all");
                  setStudentStatusFilter("all");
                  setStudentDeptFilter("all");
                }}
                className="mt-3 h-8 text-xs text-[var(--accent)]"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[10px] border border-border bg-bg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-bg-panel/60 font-medium text-text-dim">
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3">Participant</th>
                    <th className="py-2.5 px-3">Event Role</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Academic Year</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Registration</th>
                    <th className="py-2.5 px-3">Attendance</th>
                    <th className="py-2.5 px-3">Registered / Added</th>
                    {canApprove && (
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredDirectory.map((item, idx) => (
                    <tr
                      key={item.key}
                      className="transition-colors hover:bg-bg-panel/50"
                    >
                      <td className="py-2.5 px-3 text-text-mute font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="min-w-[140px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-text">
                              {item.fullName}
                            </span>
                            {item.role === "speaker" && item.isStudentMember && (
                              <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-purple-400 border border-purple-500/30">
                                Student Speaker
                              </span>
                            )}
                          </div>
                          {item.elevatesId ? (
                            <p className="font-mono text-[10px] text-text-mute">
                              {item.elevatesId}
                            </p>
                          ) : null}
                          {item.rep ? (
                            <p className="text-[10px] text-text-dim">
                              Rep: {item.rep.fullName}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {item.role === "coordinator" ? (
                          <div>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              <Crown size={11} className="mr-1" /> Coordinator
                            </span>
                            <p className="text-[10px] text-text-dim mt-0.5">{item.roleLabel}</p>
                          </div>
                        ) : item.role === "speaker" ? (
                          <div>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              <Mic size={11} className="mr-1" /> Speaker
                            </span>
                            <p className="text-[10px] text-text-dim mt-0.5">{item.roleLabel}</p>
                          </div>
                        ) : item.role === "volunteer" ? (
                          <div>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <Sparkles size={11} className="mr-1" /> Volunteer
                            </span>
                            <p className="text-[10px] text-text-dim mt-0.5">{item.roleLabel}</p>
                          </div>
                        ) : (
                          <Badge tone="mute">
                            <Users size={10} className="mr-1 inline" /> Attendee
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block rounded-[6px] border border-border/80 bg-bg-panel px-2 py-0.5 text-[11px] font-medium text-text">
                          {item.department}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-text-dim font-medium">
                        {item.year}
                      </td>
                      <td className="py-2.5 px-3 text-text-dim font-mono text-[11px]">
                        {item.email}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.registrationStatus ? (
                          <Badge tone={regStatusTone(item.registrationStatus)}>
                            {item.registrationStatus.replaceAll("_", " ")}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-text-mute font-medium">Event Staff</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.isAutoPresent ? (
                          item.role === "speaker" ? (
                            <div>
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 size={12} className="mr-1 text-emerald-400" /> Present
                              </span>
                              <p className="text-[10px] text-purple-400 font-medium mt-0.5">
                                Speaker · Session Lead
                              </p>
                            </div>
                          ) : item.role === "coordinator" ? (
                            <div>
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 size={12} className="mr-1 text-emerald-400" /> Present
                              </span>
                              <p className="text-[10px] text-cyan-400 font-medium mt-0.5">
                                Coordinator · Session Host
                              </p>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 size={12} className="mr-1 text-emerald-400" /> Present
                              </span>
                              <p className="text-[10px] text-amber-400 font-medium mt-0.5">
                                Volunteer · Operations
                              </p>
                            </div>
                          )
                        ) : item.attendanceStatus === "present" ? (
                          <div>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={12} className="mr-1 text-emerald-400" /> Present
                            </span>
                            <p className="text-[10px] text-emerald-400/80 mt-0.5">
                              {item.attendanceNote || "Verified Attendee"}
                            </p>
                          </div>
                        ) : item.attendanceStatus === "absent" ? (
                          <div>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircle size={12} className="mr-1 text-rose-400" /> Absent
                            </span>
                            <p className="text-[10px] text-rose-400/80 mt-0.5">
                              Did not check in
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-bg-panel text-text-dim border border-border/80">
                              <Clock size={12} className="mr-1 text-text-dim" /> Not Checked In
                            </span>
                            <p className="text-[10px] text-text-dim mt-0.5">
                              Pending check-in
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-text-mute text-[11px]">
                        {item.registeredAt ? (
                          new Date(item.registeredAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        ) : (
                          <span className="text-text-dim font-mono">—</span>
                        )}
                      </td>
                      {canApprove && (
                        <td className="py-2.5 px-3 text-right">
                          {item.regId && item.registrationStatus === "waitlisted" ? (
                            <Button
                              variant="green"
                              className="h-6 px-2 text-[11px]"
                              onClick={() => handleRegAction(item.regId!, "approved")}
                            >
                              Approve Seat
                            </Button>
                          ) : item.regId && item.registrationStatus === "approved" ? (
                            <Button
                              variant="ghost"
                              className="h-6 px-2 text-[11px] text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              onClick={() => handleRegAction(item.regId!, "rejected")}
                              title="Release seat if student does not attend"
                            >
                              Release / No-Show
                            </Button>
                          ) : item.regId && item.registrationStatus === "rejected" ? (
                            <Button
                              variant="ghost"
                              className="h-6 px-2 text-[11px] text-[var(--accent)]"
                              onClick={() => handleRegAction(item.regId!, "approved")}
                            >
                              Re-admit
                            </Button>
                          ) : (
                            <span className="text-[11px] text-text-dim">
                              {item.role === "attendee" ? "—" : "Event Leader"}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TerminalPanel>

      {event ? (
        <DeleteEventDialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            const targetId = event.id;
            setIsDeleting(true);
            setShowDeleteConfirm(false);
            deleteEvent(targetId);
            router.push(`/chapter/${slug}/events`);
          }}
          eventTitle={event.title}
        />
      ) : null}

      {event ? (
        <Dialog
          open={showRemindersModal}
          onClose={() => setShowRemindersModal(false)}
          title={`Reminders — ${event.title}`}
          description="Schedule automated notifications or trigger an immediate broadcast to attendees."
          className="max-w-2xl"
        >
          <div className="pt-2">
            <EventRemindersPanel
              event={event}
              chapterSlug={chapter.slug}
              canManage={canEdit || canApprove}
            />
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
