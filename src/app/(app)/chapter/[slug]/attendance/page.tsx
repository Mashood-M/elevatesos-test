"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { QrScanner } from "@/components/domain/qr-scanner";
import { CheckCircle2, ChevronDown, Play, Users, X, XCircle } from "lucide-react";
import { useStore, useCurrentUser } from "@/context/store-context";
import { chapterEyebrow, isFacultyRole } from "@/lib/access";
import {
  isAttendanceTakeable,
  isEventOngoing,
  isEventEnded,
  isEventBeforeStart,
} from "@/lib/events";
import {
  clearOfflineQueue,
  enqueueOfflineCheckIn,
  loadOfflineQueue,
  saveRegSnapshot,
  type OfflineCheckInItem,
} from "@/lib/attendance/offline-queue";
import { hasPermission } from "@/lib/permissions";
import { cohortRepIds } from "@/lib/forms/helpers";
import { cn, formatDateTime } from "@/lib/utils";
import type { AttendanceStatus, ClassCohort, EventAttendanceSession } from "@/types";

type DeskMessage = { tone: "ok" | "err"; text: string };

export default function ChapterAttendancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const {
    store,
    checkIn,
    updateAttendance,
    quickRegisterAndCheckIn,
    deleteAttendance,
    deleteRegistration,
    issueCertificate,
    updateEvent,
    startEvent,
    endEvent,
  } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const isCampusLead =
    session.roleKey === "campus_lead" ||
    session.roleKey === "chairman" ||
    session.roleKey === "founder" ||
    session.roleKey === "hq_admin" ||
    session.roleKey === "elevates_coordinator" ||
    session.roleKey === "faculty_coordinator";

  // Class Representative Scoped Cohort
  const myClassCohort = useMemo(() => {
    if (session.roleKey !== "class_representative" || !chapter) return null;
    const fromCohorts = (store.classCohorts ?? []).find(
      (c) =>
        (c.chapterId === chapter.id || !c.chapterId) &&
        cohortRepIds(c).includes(session.userId),
    );
    if (fromCohorts) return fromCohorts;
    const myProfile = store.profiles.find((p) => p.id === session.userId);
    if (myProfile?.department && myProfile?.year) {
      return {
        id: "rep-profile-cohort",
        chapterId: chapter.id,
        department: myProfile.department,
        year: myProfile.year,
        section: myProfile.section || "",
        repIds: [session.userId],
      } as ClassCohort;
    }
    return null;
  }, [session.roleKey, session.userId, store.classCohorts, store.profiles, chapter]);

  const [selectedEvent, setSelectedEvent] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [qrInput, setQrInput] = useState("");
  const method: "qr" | "manual" | "bulk" | "representative" = "qr";
  const status: AttendanceStatus = "present";
  const [flash, setFlash] = useState<DeskMessage | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [selectedRegs, setSelectedRegs] = useState<string[]>([]);
  const offlineDesk = false;
  const [offlineQueue, setOfflineQueue] = useState<OfflineCheckInItem[]>([]);
  const [rosterQuery, setRosterQuery] = useState("");
  const [attendanceSort, setAttendanceSort] = useState<
    | "registered_recent"
    | "registered_oldest"
    | "present_first"
    | "not_present_first"
    | "name_asc"
    | "name_desc"
    | "elevates_id"
  >("registered_recent");
  const [online, setOnline] = useState(true);
  const [rosterTab, setRosterTab] = useState<"approved" | "waitlist" | "chapter">("approved");
  const [isOnSpotOpen, setIsOnSpotOpen] = useState(false);
  const [onSpotSearch, setOnSpotSearch] = useState("");
  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
  const [volunteerSearch, setVolunteerSearch] = useState("");
  const [volunteerPendingId, setVolunteerPendingId] = useState<string | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "present" | "volunteer">("all");
  const [isAttendanceMenuOpen, setIsAttendanceMenuOpen] = useState(false);
  const [popNotification, setPopNotification] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!popNotification) return;
    const timer = setTimeout(() => {
      setPopNotification(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [popNotification]);

  const isFaculty = isFacultyRole(session.roleKey);

  const canVerify =
    isCampusLead ||
    hasPermission(
      store,
      session.roleKey,
      "attendance.verify",
    );

  const isReadOnly = isFaculty || (!canVerify && !isCampusLead);

  const queryEventId = searchParams.get("eventId");

  const events = useMemo(() => {
    if (!chapter) return [];
    const chapterEvents = store.events.filter((e) => e.chapterId === chapter.id);
    const preferred = chapterEvents.filter((e) =>
      [
        "ongoing",
        "registration_open",
        "registration_closed",
        "completed",
        "approved",
      ].includes(e.status),
    );
    let list = preferred.length ? preferred : chapterEvents;
    if (queryEventId) {
      const linked = chapterEvents.find((e) => e.id === queryEventId);
      if (linked && !list.some((e) => e.id === linked.id)) {
        list = [linked, ...list];
      }
    }
    return list;
  }, [store.events, chapter, queryEventId]);

  useEffect(() => {
    if (!queryEventId) return;
    const exists = store.events.some(
      (e) => e.id === queryEventId && e.chapterId === chapter?.id,
    );
    if (exists) setSelectedEvent(queryEventId);
  }, [queryEventId, store.events, chapter?.id]);

  const eventId = selectedEvent || events[0]?.id || "";
  const hasEvent = Boolean(eventId);
  const currentEvent = store.events.find((e) => e.id === eventId);
  const attendanceTakeable = useMemo(
    () => isAttendanceTakeable(currentEvent),
    [currentEvent],
  );
  const isOngoing = currentEvent ? isEventOngoing(currentEvent) : false;
  const isEnded = currentEvent ? isEventEnded(currentEvent) : false;
  const isBefore = currentEvent ? isEventBeforeStart(currentEvent) : false;

  // Configured attendance terms/sessions for this event
  const attendanceSessions: EventAttendanceSession[] = useMemo(() => {
    if (!currentEvent) return [{ id: "sess-1", name: "Main Session", isRequired: true }];
    if (currentEvent.attendanceSessions && currentEvent.attendanceSessions.length > 0) {
      return currentEvent.attendanceSessions;
    }
    return [{ id: "sess-1", name: "Main Session", isRequired: true }];
  }, [currentEvent]);

  // Ensure activeSessionId points to a valid session
  useEffect(() => {
    if (attendanceSessions.length > 0) {
      if (!activeSessionId || !attendanceSessions.some((s) => s.id === activeSessionId)) {
        setActiveSessionId(attendanceSessions[0].id);
      }
    }
  }, [attendanceSessions, activeSessionId]);

  const activeSessionObj = attendanceSessions.find((s) => s.id === activeSessionId) || attendanceSessions[0];
  const isMultiSession = attendanceSessions.length > 1;

  // All students enrolled or holding roles in this chapter
  const chapterStudents = useMemo(() => {
    if (!chapter) return [];
    const memberUserIds = new Set(
      (store.userRoles ?? [])
        .filter((ur) => ur.chapterId === chapter.id)
        .map((ur) => ur.userId),
    );
    return (store.profiles ?? []).filter(
      (p) => p.chapterId === chapter.id || memberUserIds.has(p.id),
    );
  }, [store.profiles, store.userRoles, chapter]);

  const eventRegistrations = useMemo(() => {
    if (!eventId) return [];
    return store.registrations.filter((r) => r.eventId === eventId);
  }, [store.registrations, eventId]);

  const approvedRegs = useMemo(() => {
    let raw = eventRegistrations.filter((r) => r.status === "approved");
    if (session.roleKey === "class_representative" && myClassCohort) {
      raw = raw.filter((reg) => {
        const user = store.profiles.find((p) => p.id === reg.userId);
        if (!user) return false;
        const matchDept =
          (user.department || "").trim().toLowerCase() ===
          myClassCohort.department.trim().toLowerCase();
        const matchYear =
          (user.year || "").trim().toLowerCase() ===
          myClassCohort.year.trim().toLowerCase();
        const matchSec =
          !myClassCohort.section ||
          !user.section ||
          user.section.trim().toLowerCase() ===
          myClassCohort.section.trim().toLowerCase();
        return matchDept && matchYear && matchSec;
      });
    }

    // Deduplicate by userId so each attendee is strictly unique in the directory
    const seen = new Set<string>();
    const regs: typeof raw = [];
    for (const r of raw) {
      if (!seen.has(r.userId)) {
        seen.add(r.userId);
        regs.push(r);
      }
    }
    return regs;
  }, [eventRegistrations, store.profiles, session.roleKey, myClassCohort]);

  const waitlistedRegs = useMemo(() => {
    return eventRegistrations.filter(
      (r) => r.status === "waitlisted" || r.status === "pending" || r.status === "reviewed",
    );
  }, [eventRegistrations]);

  const filteredRoster = useMemo(() => {
    let list = approvedRegs;

    // 1. Filter by search query
    const q = rosterQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((reg) => {
        const user = store.profiles.find((p) => p.id === reg.userId);
        return (
          user?.fullName.toLowerCase().includes(q) ||
          user?.email.toLowerCase().includes(q) ||
          user?.elevatesId?.toLowerCase().includes(q) ||
          reg.qrCode.toLowerCase().includes(q)
        );
      });
    }

    // 1b. Filter by attendance status if selected
    if (attendanceFilter !== "all") {
      list = list.filter((reg) => {
        const userAttRecords = store.attendance.filter((att) => att.registrationId === reg.id);
        const att = isMultiSession
          ? userAttRecords.find(
              (r) =>
                r.sessionId === activeSessionObj?.id ||
                r.session === activeSessionObj?.id ||
                r.sessionName === activeSessionObj?.name,
            )
          : userAttRecords[0];

        if (attendanceFilter === "present") {
          return att?.status === "present";
        }
        if (attendanceFilter === "volunteer") {
          return att?.status === "volunteer";
        }
        return true;
      });
    }

    // 2. Sort students
    list = [...list].sort((a, b) => {
      const userA = store.profiles.find((p) => p.id === a.userId);
      const userB = store.profiles.find((p) => p.id === b.userId);

      const recordsA = store.attendance.filter((att) => att.registrationId === a.id);
      const recordsB = store.attendance.filter((att) => att.registrationId === b.id);

      const attA = isMultiSession
        ? recordsA.find(
            (r) =>
              r.sessionId === activeSessionObj?.id ||
              r.session === activeSessionObj?.id ||
              r.sessionName === activeSessionObj?.name,
          )
        : recordsA[0];
      const attB = isMultiSession
        ? recordsB.find(
            (r) =>
              r.sessionId === activeSessionObj?.id ||
              r.session === activeSessionObj?.id ||
              r.sessionName === activeSessionObj?.name,
          )
        : recordsB[0];

      const isPresentA =
        attA &&
        (attA.status === "present" ||
          attA.status === "volunteer" ||
          attA.status === "speaker");
      const isPresentB =
        attB &&
        (attB.status === "present" ||
          attB.status === "volunteer" ||
          attB.status === "speaker");

      const isNotPresentA = !attA || attA.status === "absent";
      const isNotPresentB = !attB || attB.status === "absent";

      if (attendanceSort === "present_first") {
        if (isPresentA && !isPresentB) return -1;
        if (!isPresentA && isPresentB) return 1;
        return (userA?.fullName || "").localeCompare(userB?.fullName || "");
      }

      if (attendanceSort === "not_present_first") {
        if (isNotPresentA && !isNotPresentB) return -1;
        if (!isNotPresentA && isNotPresentB) return 1;
        return (userA?.fullName || "").localeCompare(userB?.fullName || "");
      }

      if (attendanceSort === "name_asc") {
        return (userA?.fullName || "").localeCompare(userB?.fullName || "");
      }

      if (attendanceSort === "name_desc") {
        return (userB?.fullName || "").localeCompare(userA?.fullName || "");
      }

      if (attendanceSort === "elevates_id") {
        return (userA?.elevatesId || "").localeCompare(userB?.elevatesId || "");
      }

      if (attendanceSort === "registered_oldest") {
        return (
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
      }

      // Default: registered_recent (newest registrations first)
      return (
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    });

    return list;
  }, [
    approvedRegs,
    rosterQuery,
    attendanceFilter,
    attendanceSort,
    store.profiles,
    store.attendance,
    isMultiSession,
    activeSessionObj,
  ]);

  const filteredWaitlist = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    if (!q) return waitlistedRegs;
    return waitlistedRegs.filter((reg) => {
      const user = store.profiles.find((p) => p.id === reg.userId);
      return (
        user?.fullName.toLowerCase().includes(q) ||
        user?.email.toLowerCase().includes(q) ||
        user?.elevatesId?.toLowerCase().includes(q) ||
        reg.qrCode.toLowerCase().includes(q)
      );
    });
  }, [waitlistedRegs, rosterQuery, store.profiles]);

  const filteredChapterStudents = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    if (!q) return chapterStudents;
    return chapterStudents.filter((student) => {
      return (
        student.fullName.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q) ||
        student.department?.toLowerCase().includes(q) ||
        student.year?.toLowerCase().includes(q) ||
        student.elevatesId?.toLowerCase().includes(q)
      );
    });
  }, [chapterStudents, rosterQuery]);

  const filteredOnSpotStudents = useMemo(() => {
    const q = onSpotSearch.trim().toLowerCase();
    if (!q) return chapterStudents.slice(0, 30);
    return chapterStudents.filter((student) => {
      return (
        student.fullName.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q) ||
        student.department?.toLowerCase().includes(q) ||
        student.year?.toLowerCase().includes(q) ||
        student.elevatesId?.toLowerCase().includes(q)
      );
    });
  }, [chapterStudents, onSpotSearch]);

  const volunteerCount = useMemo(() => {
    if (!eventId) return 0;
    return store.attendance.filter(
      (a) => a.eventId === eventId && a.status === "volunteer",
    ).length;
  }, [store.attendance, eventId]);

  const filteredVolunteerStudents = useMemo(() => {
    const q = volunteerSearch.trim().toLowerCase();
    if (!q) return chapterStudents;
    return chapterStudents.filter((student) => {
      return (
        student.fullName.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q) ||
        student.department?.toLowerCase().includes(q) ||
        student.year?.toLowerCase().includes(q) ||
        student.elevatesId?.toLowerCase().includes(q)
      );
    });
  }, [chapterStudents, volunteerSearch]);

  useEffect(() => {
    setOfflineQueue(loadOfflineQueue(eventId));
  }, [eventId]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const regs = store.registrations.filter(
      (r) => r.eventId === eventId && r.status === "approved" && r.qrCode,
    );
    if (!regs.length) return;
    saveRegSnapshot({
      eventId,
      savedAt: new Date().toISOString(),
      regs: regs.map((r) => ({
        id: r.id,
        qrCode: r.qrCode,
        userId: r.userId,
      })),
    });
  }, [eventId, store.registrations]);

  const stats = useMemo(() => {
    const checked = store.attendance.filter((a) => a.eventId === eventId);
    const approvedUserIds = new Set(approvedRegs.map((r) => r.userId));
    
    // Deduplicate by distinct approved student (userId) to accurately count unique attendees
    const uniqueCheckedInUserIds = new Set(
      checked
        .filter(
          (a) =>
            approvedUserIds.has(a.userId) &&
            (a.status === "present" || a.status === "volunteer" || a.status === "speaker"),
        )
        .map((a) => a.userId)
        .filter(Boolean),
    );

    const uniquePresentUserIds = new Set(
      checked
        .filter((a) => approvedUserIds.has(a.userId) && a.status === "present")
        .map((a) => a.userId)
        .filter(Boolean),
    );

    const currentSessionChecked = checked.filter(
      (a) => (a.sessionId === activeSessionObj?.id || a.session === activeSessionObj?.id) && (a.status === "present"),
    );

    // Full completion: attended all required sessions
    const fullyAttended = approvedRegs.filter((r) => {
      const userRecords = checked.filter((a) => a.registrationId === r.id && (a.status === "present"));
      return attendanceSessions.every((sess) =>
        userRecords.some((a) => a.sessionId === sess.id || a.session === sess.id || a.sessionName === sess.name),
      );
    });

    const absentCount = Math.max(0, approvedRegs.length - uniqueCheckedInUserIds.size);

    return {
      approved: approvedRegs.length,
      currentSessionCount: currentSessionChecked.length,
      fullyAttendedCount: fullyAttended.length,
      checkedIn: uniqueCheckedInUserIds.size,
      present: uniquePresentUserIds.size,
      absent: absentCount,
    };
  }, [store.attendance, eventId, approvedRegs, attendanceSessions, activeSessionObj]);

  const deskRef = useRef({
    eventId,
    activeSessionId: activeSessionObj?.id || "sess-1",
    activeSessionName: activeSessionObj?.name || "Main Session",
    status,
    offlineDesk,
    online,
    userId: session.userId,
  });
  deskRef.current = {
    eventId,
    activeSessionId: activeSessionObj?.id || "sess-1",
    activeSessionName: activeSessionObj?.name || "Main Session",
    status,
    offlineDesk,
    online,
    userId: session.userId,
  };

  const runCheckIn = useCallback(
    (registrationId: string, m: "qr" | "manual" | "bulk" | "representative" = "qr", sessId?: string, sessName?: string) => {
      const { eventId: eid, status: st, userId, activeSessionId: currentSessId, activeSessionName: currentSessName } = deskRef.current;
      const targetId = sessId ?? currentSessId;
      const targetName = sessName ?? currentSessName;
      if (!eid) {
        setFlash({ tone: "err", text: "Select an event first." });
        return false;
      }
      const targetEvent = store.events.find((e) => e.id === eid);
      const takeable = isAttendanceTakeable(targetEvent);
      if (!takeable.allowed) {
        setFlash({ tone: "err", text: takeable.reason || "Attendance cannot be taken at this time." });
        return false;
      }
      if (session.roleKey === "class_representative" && myClassCohort) {
        const reg = store.registrations.find((r) => r.id === registrationId);
        const user = store.profiles.find((p) => p.id === reg?.userId);
        const matchDept =
          (user?.department || "").trim().toLowerCase() ===
          myClassCohort.department.trim().toLowerCase();
        const matchYear =
          (user?.year || "").trim().toLowerCase() ===
          myClassCohort.year.trim().toLowerCase();
        if (!matchDept || !matchYear) {
          setFlash({
            tone: "err",
            text: `Access restricted: As Class Rep for ${myClassCohort.department} (${myClassCohort.year}), you can only mark attendance for your class.`,
          });
          return false;
        }
      }
      const result = checkIn(registrationId, st, m, userId, eid, targetId, targetName);
      if (!result.ok) {
        setFlash({ tone: "err", text: result.message });
        return false;
      }
      setFlash({
        tone: "ok",
        text: `Checked in [${targetName}] · ${st} · via ${m}`,
      });
      return true;
    },
    [checkIn, session.roleKey, myClassCohort, store.registrations, store.profiles, store.events],
  );

  const handleAddVolunteer = useCallback(
    async (studentId: string, _studentName: string) => {
      if (!eventId) {
        setPopNotification({ tone: "err", text: "Select an event first." });
        return;
      }
      const takeable = isAttendanceTakeable(currentEvent);
      if (!takeable.allowed) {
        setPopNotification({ tone: "err", text: takeable.reason || "Attendance cannot be taken at this time." });
        return;
      }
      if (volunteerPendingId) return;
      setVolunteerPendingId(studentId);
      try {
        const reg = store.registrations.find(
          (r) => r.eventId === eventId && r.userId === studentId,
        );
        if (reg) {
          const res = updateAttendance(
            reg.id,
            "volunteer",
            session.userId,
            activeSessionObj?.id,
            activeSessionObj?.name,
          );
          if (res.ok) {
            setPopNotification({ tone: "ok", text: "New volunteer is added" });
          } else {
            setPopNotification({ tone: "err", text: res.message });
          }
        } else {
          const res = quickRegisterAndCheckIn(
            eventId,
            studentId,
            "volunteer",
            "manual",
            session.userId,
            activeSessionObj?.id,
            activeSessionObj?.name,
          );
          if (res.ok) {
            setPopNotification({ tone: "ok", text: "New volunteer is added" });
          } else {
            setPopNotification({ tone: "err", text: res.message });
          }
        }
      } finally {
        setVolunteerPendingId(null);
      }
    },
    [eventId, store.registrations, updateAttendance, quickRegisterAndCheckIn, session.userId, activeSessionObj, volunteerPendingId],
  );

  const handleRemoveVolunteer = useCallback(
    async (studentId: string, _studentName: string) => {
      if (!eventId) return;
      if (volunteerPendingId) return;
      setVolunteerPendingId(studentId);
      try {
        // 1. Delete all attendance records for this volunteer in this event
        const attRecords = store.attendance.filter(
          (a) => a.eventId === eventId && a.userId === studentId,
        );
        for (const att of attRecords) {
          await deleteAttendance(att.id);
        }

        // 2. Delete registration for this student in this event so they are also removed from the event directory
        const regs = store.registrations.filter(
          (r) => r.eventId === eventId && r.userId === studentId,
        );
        for (const reg of regs) {
          await deleteRegistration(reg.id);
        }

        setPopNotification({ tone: "ok", text: "Volunteer removed" });
      } finally {
        setVolunteerPendingId(null);
      }
    },
    [eventId, store.attendance, store.registrations, deleteAttendance, deleteRegistration, volunteerPendingId],
  );

  const handleQrScan = useCallback(
    (codeOverride?: string) => {
      let rawCode = (codeOverride ?? qrInput).trim();
      if (!rawCode) return;

      // Clean potential wrapping quotes or whitespace
      rawCode = rawCode.replace(/^["']|["']$/g, "").trim();

      // If scanned data is a URL, extract qr/code/id param or last pathname segment
      if (rawCode.startsWith("http://") || rawCode.startsWith("https://")) {
        try {
          const parsedUrl = new URL(rawCode);
          const q =
            parsedUrl.searchParams.get("qr") ||
            parsedUrl.searchParams.get("code") ||
            parsedUrl.searchParams.get("id");
          if (q) {
            rawCode = q.trim();
          } else {
            const segments = parsedUrl.pathname.split("/").filter(Boolean);
            if (segments.length > 0) rawCode = segments[segments.length - 1].trim();
          }
        } catch {}
      } else if (rawCode.startsWith("{") && rawCode.endsWith("}")) {
        try {
          const parsed = JSON.parse(rawCode);
          const q = parsed.qrCode || parsed.code || parsed.id;
          if (q) rawCode = String(q).trim();
        } catch {}
      }

      const code = rawCode;

      const { eventId: eid, status: st, offlineDesk: off, online: on, activeSessionId: sessId, activeSessionName: sessName } =
        deskRef.current;
      if (!eid) {
        setFlash({ tone: "err", text: "Select an event first." });
        return;
      }
      const targetEvent = store.events.find((e) => e.id === eid);
      const takeable = isAttendanceTakeable(targetEvent);
      if (!takeable.allowed) {
        setFlash({ tone: "err", text: takeable.reason || "Attendance cannot be taken at this time." });
        return;
      }

      if (off || !on) {
        const list = enqueueOfflineCheckIn(eid, {
          eventId: eid,
          qrCode: code,
          status: st,
        });
        setOfflineQueue(list);
        setFlash({ tone: "ok", text: `Queued offline (${sessName}) · ${code}` });
        setQrInput("");
        return;
      }

      let reg = store.registrations.find(
        (r) =>
          (r.qrCode?.trim().toLowerCase() === code.toLowerCase() ||
            r.id?.trim().toLowerCase() === code.toLowerCase()) &&
          r.eventId === eid &&
          r.status !== "rejected",
      );

      // If not found by registration QR directly, check if it matches an attendee's Elevates ID, email, or profile ID
      if (!reg) {
        const matchedProfile = store.profiles.find(
          (p) =>
            p.elevatesId?.trim().toLowerCase() === code.toLowerCase() ||
            p.email?.trim().toLowerCase() === code.toLowerCase() ||
            p.id === code,
        );
        if (matchedProfile) {
          reg = store.registrations.find(
            (r) =>
              r.eventId === eid &&
              r.userId === matchedProfile.id &&
              r.status !== "rejected",
          );
        }
      }

      // If not registered for this event yet, check if it matches a chapter or campus student: on-spot register & mark attendance
      if (!reg) {
        const studentProf =
          chapterStudents.find(
            (p) =>
              p.elevatesId?.toLowerCase() === code.toLowerCase() ||
              p.email?.toLowerCase() === code.toLowerCase() ||
              p.id === code,
          ) ||
          store.profiles.find(
            (p) =>
              p.elevatesId?.toLowerCase() === code.toLowerCase() ||
              p.email?.toLowerCase() === code.toLowerCase() ||
              p.id === code,
          );
        if (studentProf) {
          const res = quickRegisterAndCheckIn(
            eid,
            studentProf.id,
            st,
            "qr",
            deskRef.current.userId,
            sessId,
            sessName,
          );
          if (res.ok) {
            setFlash({
              tone: "ok",
              text: `Scanned & marked present: ${studentProf.fullName} (${studentProf.elevatesId || "ID"}) [${sessName}]!`,
            });
          } else {
            setFlash({ tone: "err", text: res.message });
          }
          setQrInput("");
          return;
        }
      }

      if (!reg) {
        setFlash({
          tone: "err",
          text: "Student or QR not found for this event.",
        });
        return;
      }
      if (session.roleKey === "class_representative" && myClassCohort) {
        const user = store.profiles.find((p) => p.id === reg.userId);
        const matchDept =
          (user?.department || "").trim().toLowerCase() ===
          myClassCohort.department.trim().toLowerCase();
        const matchYear =
          (user?.year || "").trim().toLowerCase() ===
          myClassCohort.year.trim().toLowerCase();
        if (!matchDept || !matchYear) {
          setFlash({
            tone: "err",
            text: `Access restricted: Student belongs to ${user?.department || "another dept"} (${user?.year || "another year"}), outside your class.`,
          });
          setQrInput("");
          return;
        }
      }
      const existing = store.attendance.find(
        (a) =>
          a.registrationId === reg.id &&
          (isMultiSession
            ? (a.sessionId === sessId || a.session === sessId || a.sessionName === sessName)
            : a.eventId === eid),
      );
      if (existing && existing.status === "present") {
        const user = store.profiles.find((p) => p.id === reg.userId);
        setFlash({
          tone: "ok",
          text: `Already marked present: ${user?.fullName || "Attendee"} [${sessName}]`,
        });
        setQrInput("");
        return;
      }

      if (existing) {
        const result = updateAttendance(
          reg.id,
          st,
          deskRef.current.userId,
          sessId,
          sessName,
        );
        const user = store.profiles.find((p) => p.id === reg.userId);
        setFlash(
          result.ok
            ? { tone: "ok", text: `Marked present: ${user?.fullName || "Attendee"} [${sessName}]` }
            : { tone: "err", text: result.message },
        );
      } else {
        const ok = runCheckIn(reg.id, "qr", sessId, sessName);
        if (ok) {
          const user = store.profiles.find((p) => p.id === reg.userId);
          setFlash({
            tone: "ok",
            text: `Marked present: ${user?.fullName || "Attendee"} [${sessName}]`,
          });
        }
      }
      setQrInput("");
    },
    [qrInput, store.registrations, store.attendance, store.profiles, updateAttendance, runCheckIn, session.roleKey, myClassCohort, isCampusLead, chapterStudents, quickRegisterAndCheckIn],
  );

  const onCameraScan = useCallback(
    (code: string) => {
      handleQrScan(code);
    },
    [handleQrScan],
  );

  function syncOffline() {
    if (!online || !offlineQueue.length || !eventId) return;
    const takeable = isAttendanceTakeable(currentEvent);
    if (!takeable.allowed) {
      setFlash({ tone: "err", text: takeable.reason || "Attendance cannot be taken at this time." });
      return;
    }
    let ok = 0;
    for (const item of offlineQueue) {
      const reg = store.registrations.find(
        (r) =>
          r.qrCode === item.qrCode &&
          r.eventId === item.eventId &&
          r.status !== "rejected",
      );
      if (reg) {
        const res = checkIn(
          reg.id,
          item.status as AttendanceStatus,
          "qr",
          session.userId,
          item.eventId,
          activeSessionObj.id,
          activeSessionObj.name,
        );
        if (res.ok) ok++;
      }
    }
    clearOfflineQueue(eventId);
    setOfflineQueue([]);
    setFlash({ tone: "ok", text: `Synced ${ok} offline check-ins.` });
  }

  function handleBulk() {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    if (!eventId || !currentEvent) return;
    const takeable = isAttendanceTakeable(currentEvent);
    if (!takeable.allowed) {
      setFlash({ tone: "err", text: takeable.reason || "Attendance cannot be taken at this time." });
      return;
    }
    let ok = 0;
    for (const line of lines) {
      let reg = store.registrations.find(
        (r) =>
          r.eventId === eventId &&
          r.status !== "rejected" &&
          (r.qrCode?.toLowerCase() === line.toLowerCase() ||
            store.profiles.find((p) => p.id === r.userId)?.email.toLowerCase() ===
            line.toLowerCase() ||
            store.profiles.find((p) => p.id === r.userId)?.elevatesId?.toLowerCase() ===
            line.toLowerCase()),
      );
      if (!reg) {
        reg = store.registrations.find(
          (r) =>
            r.eventId === eventId &&
            r.status !== "rejected" &&
            (r.qrCode?.toLowerCase() === line.toLowerCase() ||
              store.profiles.find((p) => p.id === r.userId)?.email.toLowerCase() ===
              line.toLowerCase() ||
              store.profiles.find((p) => p.id === r.userId)?.elevatesId?.toLowerCase() ===
              line.toLowerCase()),
        );
      }
      if (reg) {
        if (session.roleKey === "class_representative" && myClassCohort) {
          const user = store.profiles.find((p) => p.id === reg.userId);
          const matchDept =
            (user?.department || "").trim().toLowerCase() ===
            myClassCohort.department.trim().toLowerCase();
          const matchYear =
            (user?.year || "").trim().toLowerCase() ===
            myClassCohort.year.trim().toLowerCase();
          if (!matchDept || !matchYear) continue;
        }
        const res = checkIn(
          reg.id,
          status,
          "bulk",
          session.userId,
          eventId,
          activeSessionObj.id,
          activeSessionObj.name,
        );
        if (res.ok) ok++;
      } else if (isCampusLead) {
        const studentProf = chapterStudents.find(
          (p) =>
            p.email.toLowerCase() === line.toLowerCase() ||
            p.elevatesId?.toLowerCase() === line.toLowerCase() ||
            p.id === line,
        );
        if (studentProf) {
          const res = quickRegisterAndCheckIn(
            eventId,
            studentProf.id,
            status,
            "bulk",
            session.userId,
            activeSessionObj.id,
            activeSessionObj.name,
          );
          if (res.ok) ok++;
        }
      }
    }
    setBulkText("");
    setFlash({ tone: "ok", text: `Bulk processed: ${ok} / ${lines.length} (${activeSessionObj.name})` });
  }

  function handleRepresentative() {
    if (!selectedRegs.length || !eventId || !currentEvent) return;
    const takeable = isAttendanceTakeable(currentEvent);
    if (!takeable.allowed) {
      setFlash({ tone: "err", text: takeable.reason || "Attendance cannot be taken at this time." });
      return;
    }
    let ok = 0;
    for (const regId of selectedRegs) {
      const res = checkIn(
        regId,
        status,
        "representative",
        session.userId,
        eventId,
        activeSessionObj.id,
        activeSessionObj.name,
      );
      if (res.ok) ok++;
    }
    setFlash({
      tone: "ok",
      text: `Representative check-in (${activeSessionObj.name}) · ${ok} students`,
    });
    setSelectedRegs([]);
  }

  function handleAddCustomCheckpoint() {
    if (!eventId || !currentEvent) return;
    const count = attendanceSessions.length + 1;
    const newSession: EventAttendanceSession = {
      id: `sess-${Date.now().toString().slice(-4)}`,
      name: `Checkpoint ${count}`,
      time: "",
      isRequired: true,
    };
    const updated = [...attendanceSessions, newSession];
    updateEvent(eventId, { attendanceSessions: updated });
    setActiveSessionId(newSession.id);
    setFlash({
      tone: "ok",
      text: `Added checkpoint session "${newSession.name}".`,
    });
  }

  if (!chapter) {
    return <p className="text-[var(--accent)]">Chapter not found</p>;
  }

  if (!canVerify && !isCampusLead && !isFaculty) {
    return (
      <div>
        <PageHeader
          eyebrow={chapterEyebrow(session.roleKey, "programs")}
          title="Attendance"
          description="You need attendance.verify permission or faculty status to view attendance."
        />
        <p className="text-[13px] text-text-dim">
          Switch to Faculty Coordinator, Campus Lead, Class Rep, Secretary, or Coordinator.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isReadOnly ? "Attendance Overview" : "Attendance Desk"}

        actions={
          !isReadOnly ? (
            <div className="flex items-center gap-2">
              {isCampusLead && hasEvent && (
                <Button
                  variant="orange"
                  className="text-xs"
                  disabled={!attendanceTakeable.allowed}
                  title={!attendanceTakeable.allowed ? attendanceTakeable.reason : undefined}
                  onClick={() => setIsOnSpotOpen(true)}
                >
                  + On-Spot Check-in
                </Button>
              )}
              {hasEvent && isMultiSession && (
                <Button
                  variant="ghost"
                  className="text-xs border border-border"
                  onClick={handleAddCustomCheckpoint}
                >
                  + Add Checkpoint Session
                </Button>
              )}
            </div>
          ) : null
        }
      />

      {/* Top Stats Bar in clean ERP styling */}
      <div className={cn("mb-4 grid grid-cols-2 gap-3", isMultiSession ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-4")}>
        <Stat label="Approved Students" value={stats.approved} />
        {isMultiSession ? (
          <>
            <Stat label={`Active: ${activeSessionObj.name}`} value={`${stats.currentSessionCount} / ${stats.approved}`} />
            <Stat label="All Terms Complete" value={`${stats.fullyAttendedCount} / ${stats.approved}`} />
            <Stat label="Total Scans Logged" value={stats.checkedIn} />
            <Stat label="Configured Terms" value={`${attendanceSessions.length} Checkpoints`} />
          </>
        ) : (
          <>
            <Stat label="Checked In" value={stats.checkedIn} />
            <Stat label="Present" value={stats.present} accent="green" />
            <Stat label="Absent" value={stats.absent} />
          </>
        )}
      </div>

      {/* Class Representative Scope Banner */}
      {session.roleKey === "class_representative" && myClassCohort && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-400">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              <strong>Class Representative Attendance Desk:</strong> Filtered to your class &mdash;{" "}
              <strong>{myClassCohort.department} · {myClassCohort.year}{myClassCohort.section ? ` (Sec ${myClassCohort.section})` : ""}</strong>.
              Showing {approvedRegs.length} registered student{approvedRegs.length === 1 ? "" : "s"}.
            </span>
          </div>
          <Badge tone="cyan">Class Scoped</Badge>
        </div>
      )}

      {isReadOnly ? (
        <TerminalPanel
          title="Event Attendance Overview"
          meta={
            [
              currentEvent?.title,
              isMultiSession ? `Checkpoint: ${activeSessionObj?.name}` : undefined,
              "Read-only oversight",
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        >
          {/* Dynamic Multi-Session / Checkpoint Switcher */}
          {isMultiSession ? (
            <div className="mb-4 rounded-[var(--radius)] border border-border/80 bg-bg-panel p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                  Filter by Checkpoint Session:
                </span>
                <span className="text-[11px] font-mono text-text-mute">
                  {attendanceSessions.findIndex((s) => s.id === activeSessionId) + 1} of {attendanceSessions.length} checkpoints
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {attendanceSessions.map((sess, idx) => {
                  const isActive = sess.id === activeSessionId;
                  return (
                    <Button
                      key={sess.id || idx}
                      type="button"
                      variant={isActive ? "orange" : "ghost"}
                      className={cn(
                        "h-7 text-[11px] font-medium px-2.5",
                        !isActive && "border border-border/60 hover:border-border",
                      )}
                      onClick={() => {
                        setActiveSessionId(sess.id);
                        setFlash(null);
                      }}
                    >
                      #{idx + 1} {sess.name} {sess.time ? `(${sess.time})` : ""}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid max-w-3xl gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Select Event to Inspect</FieldLabel>
              <Select
                value={eventId}
                onChange={(e) => {
                  setSelectedEvent(e.target.value);
                  setFlash(null);
                  setSelectedRegs([]);
                  setRosterQuery("");
                  setAttendanceSort("registered_recent");
                }}
              >
                {events.length === 0 ? (
                  <option value="">No events in this chapter</option>
                ) : (
                  events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} · {ev.status.replaceAll("_", " ")}
                    </option>
                  ))
                )}
              </Select>
            </div>
            {currentEvent ? (
              <div className="rounded-[var(--radius)] border border-border/70 bg-bg/70 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{currentEvent.title}</span>
                  <Badge tone={isOngoing ? "green" : currentEvent.status === "completed" ? "green" : "orange"}>
                    {isOngoing ? "Live Ongoing" : currentEvent.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-text-dim">
                  {formatDateTime(currentEvent.startsAt)} &bull; {currentEvent.venue || "Campus / Online"}
                </p>
                <p className="mt-0.5 text-[11px] text-text-mute">
                  Capacity: {currentEvent.capacity} &bull; Registered: {eventRegistrations.length} students
                </p>
              </div>
            ) : null}
          </div>


        </TerminalPanel>
      ) : (
        <TerminalPanel
          title="Check-in desk"
          meta={
            [
              currentEvent?.title,
              isMultiSession ? `Session: ${activeSessionObj?.name}` : undefined,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        >
          {/* Dynamic Multi-Session / Checkpoint Switcher */}
          {isMultiSession ? (
            <div className="mb-4 rounded-[var(--radius)] border border-border/80 bg-bg-panel p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                  Active Check-In Checkpoint:
                </span>
                <span className="text-[11px] font-mono text-text-mute">
                  {attendanceSessions.findIndex((s) => s.id === activeSessionId) + 1} of {attendanceSessions.length} terms
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {attendanceSessions.map((sess, idx) => {
                  const isActive = sess.id === activeSessionId;
                  return (
                    <Button
                      key={sess.id || idx}
                      type="button"
                      variant={isActive ? "orange" : "ghost"}
                      className={cn(
                        "h-7 text-[11px] font-medium px-2.5",
                        !isActive && "border border-border/60 hover:border-border",
                      )}
                      onClick={() => {
                        setActiveSessionId(sess.id);
                        setFlash(null);
                      }}
                    >
                      #{idx + 1} {sess.name} {sess.time ? `(${sess.time})` : ""}
                    </Button>
                  );
                })}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 text-[11px] text-text-dim border border-dashed border-border px-2"
                  onClick={handleAddCustomCheckpoint}
                >
                  + Add Checkpoint
                </Button>
              </div>
            </div>
          ) : null}

          <div className="max-w-md">
            <FieldLabel>Event</FieldLabel>
            <Select
              value={eventId}
              onChange={(e) => {
                setSelectedEvent(e.target.value);
                setFlash(null);
                setSelectedRegs([]);
                setRosterQuery("");
                setAttendanceSort("registered_recent");
              }}
            >
              {events.length === 0 ? (
                <option value="">No events</option>
              ) : (
                events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} · {ev.status.replaceAll("_", " ")}
                  </option>
                ))
              )}
            </Select>
          </div>

          {currentEvent && (
            <div
              className={cn(
                "mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--radius)] border p-3 text-xs",
                isOngoing
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : isBefore
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    : "border-red-500/40 bg-red-500/10 text-red-300",
              )}
            >
              <div className="flex items-start sm:items-center gap-2.5">
                {isOngoing ? (
                  <span className="relative flex h-2.5 w-2.5 shrink-0 mt-0.5 sm:mt-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                ) : isBefore ? (
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 mt-0.5 sm:mt-0" />
                ) : (
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-400 mt-0.5 sm:mt-0" />
                )}
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <span>
                      {isOngoing
                        ? "Event is Currently Ongoing · Attendance Active"
                        : isBefore
                          ? "Event Has Not Started Yet · Attendance Locked"
                          : "Event Concluded · Attendance Closed"}
                    </span>
                    <Badge tone={isOngoing ? "green" : isBefore ? "orange" : "mute"}>
                      {currentEvent.status === "ongoing"
                        ? "Live Ongoing"
                        : currentEvent.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] opacity-90">
                    {isOngoing
                      ? "Attendance can only be taken while the event is ongoing. Real-time verification is active."
                      : isBefore
                        ? `Attendance cannot be taken before the event starts. Scheduled: ${formatDateTime(currentEvent.startsAt)}. Start the event manually or wait for scheduled time.`
                        : `This event ended on ${formatDateTime(currentEvent.endsAt || currentEvent.startsAt)}. Attendance cannot be taken after the event has ended.`}
                  </p>
                </div>
              </div>

              {(isCampusLead || session.roleKey === "elevates_coordinator" || session.roleKey === "hq_admin" || Boolean(currentEvent && currentEvent.organizerId === session.userId)) && (
                <div className="flex items-center gap-2 shrink-0">
                  {!isOngoing && !isEnded && currentEvent.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="orange"
                      className="h-8 px-3 text-xs font-semibold shadow-sm flex items-center gap-1.5"
                      onClick={async () => {
                        await startEvent(currentEvent.id, session.userId);
                        setFlash({
                          tone: "ok",
                          text: `Event "${currentEvent.title}" is now ONGOING! Attendance is active.`,
                        });
                      }}
                    >
                      <Play size={12} className="fill-current" />
                      Start Event Now
                    </Button>
                  )}
                  {isOngoing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-xs font-semibold border border-red-500/50 hover:bg-red-500/20 text-red-300 flex items-center gap-1"
                      onClick={async () => {
                        if (confirm(`End event "${currentEvent.title}"? Attendance will be closed.`)) {
                          await endEvent(currentEvent.id, session.userId);
                          setFlash({
                            tone: "ok",
                            text: `Event "${currentEvent.title}" ended. Attendance is closed.`,
                          });
                        }
                      }}
                    >
                      <CheckCircle2 size={12} />
                      End Event
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {flash ? (
            <p
              className={cn(
                "mt-3 text-[12px] rounded-[var(--radius)] border px-3 py-2",
                flash.tone === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300",
              )}
            >
              {flash.text}
            </p>
          ) : null}

          {/* QR Scanner & Manual Input Side-by-Side */}
          <div className="mt-4 border-t border-border/70 pt-4">
            {isMultiSession ? (
              <div className="mb-3 flex items-center justify-between rounded-[var(--radius)] border border-border/80 bg-bg-panel px-3 py-2 text-[12px]">
                <span className="text-text">
                  Scanning for: <strong className="text-[var(--accent)]">{activeSessionObj.name}</strong>
                  {activeSessionObj.time ? ` (${activeSessionObj.time})` : ""}
                </span>
                <Badge tone={attendanceTakeable.allowed ? "green" : "mute"}>
                  {attendanceTakeable.allowed ? "Ready" : "Locked"}
                </Badge>
              </div>
            ) : null}

            <QrScanner
              onScan={onCameraScan}
              active={attendanceTakeable.allowed}
              disabled={!hasEvent || !attendanceTakeable.allowed}
              sideContent={
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={
                      !attendanceTakeable.allowed
                        ? "Attendance locked (event not ongoing)"
                        : "Or paste / type QR code..."
                    }
                    value={qrInput}
                    disabled={!hasEvent || !attendanceTakeable.allowed}
                    onChange={(e) => setQrInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQrScan()}
                    aria-label="QR Code input"
                    className="h-9 text-xs"
                  />
                  <Button
                    variant="orange"
                    size="sm"
                    className="h-9 px-4 text-xs font-semibold shrink-0"
                    disabled={!hasEvent || !qrInput.trim() || !attendanceTakeable.allowed}
                    onClick={() => handleQrScan()}
                  >
                    Verify
                  </Button>
                </div>
              }
            />
            {!attendanceTakeable.allowed && currentEvent && (
              <p className="mt-2 text-center text-[11px] text-text-dim">
                ⚠️ Attendance cannot be taken {isBefore ? "before the event starts" : "after the event has ended"}.
              </p>
            )}
          </div>
        </TerminalPanel>
      )}

      {/* Directory Table Matrix */}
      <TerminalPanel
        title="Directory"
        meta={
          rosterTab === "approved"
            ? `${filteredRoster.length}${rosterQuery ? ` / ${approvedRegs.length}` : ""} approved`
            : rosterTab === "waitlist"
              ? `${filteredWaitlist.length}${rosterQuery ? ` / ${waitlistedRegs.length}` : ""} waitlisted`
              : `${filteredChapterStudents.length}${rosterQuery ? ` / ${chapterStudents.length}` : ""} chapter students`
        }
        className="mt-4"
      >
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:max-w-md">
            <Input
              value={rosterQuery}
              onChange={(e) => setRosterQuery(e.target.value)}
              placeholder={
                rosterTab === "approved"
                  ? "Search name, email, or QR..."
                  : rosterTab === "waitlist"
                    ? "Search waitlisted student..."
                    : "Search any student in chapter..."
              }
              disabled={!hasEvent}
              aria-label="Filter directory"
              className="w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(isCampusLead || isFaculty) && (
              <select
                value={rosterTab}
                onChange={(e) => {
                  setRosterTab(e.target.value as "approved" | "waitlist" | "chapter");
                  setRosterQuery("");
                }}
                aria-label="Filter roster category"
                className="h-8 rounded-lg border border-border/80 bg-bg-panel hover:bg-bg-elevated text-text text-xs font-medium px-2.5 pr-7 outline-none cursor-pointer transition-colors focus:ring-1 focus:ring-orange-500/30 focus:border-orange-500/40"
              >
                <option value="approved">Approved Attendees ({approvedRegs.length})</option>
                <option value="waitlist">Waitlist ({waitlistedRegs.length})</option>
                <option value="chapter">All Students ({chapterStudents.length})</option>
              </select>
            )}

            {hasEvent && !isReadOnly && (
              <button
                type="button"
                disabled={!attendanceTakeable.allowed}
                title={!attendanceTakeable.allowed ? attendanceTakeable.reason : undefined}
                className={cn(
                  "h-8 px-2.5 text-xs font-medium rounded-lg border border-border/80 bg-bg-panel hover:bg-bg-elevated hover:border-border text-text hover:text-orange-500 transition-colors flex items-center gap-1.5 shrink-0",
                  !attendanceTakeable.allowed && "opacity-50 cursor-not-allowed",
                )}
                onClick={() => {
                  if (!attendanceTakeable.allowed) {
                    setFlash({ tone: "err", text: attendanceTakeable.reason || "Attendance cannot be taken at this time." });
                    return;
                  }
                  setIsVolunteerModalOpen(true);
                }}
              >
                <Users className="w-3.5 h-3.5 text-orange-500" />
                <span>+ Volunteer Student</span>
              </button>
            )}
          </div>
        </div>

        {rosterTab === "approved" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-text-mute">
                  <th className="pb-2">Student</th>
                  <th className="pb-2">QR</th>
                  {isMultiSession ? (
                    <>
                      {attendanceSessions.map((sess, i) => (
                        <th key={sess.id || i} className="pb-2 text-center">
                          #{i + 1} {sess.name}
                        </th>
                      ))}
                      <th className="pb-2 text-center">Terms Progress</th>
                    </>
                  ) : (
                    <>
                      <th className="pb-2">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => setIsAttendanceMenuOpen((prev) => !prev)}
                            className={cn(
                              "inline-flex items-center gap-1 font-semibold text-[11px] transition-colors py-0.5 px-1.5 rounded -ml-1.5",
                              attendanceFilter !== "all"
                                ? "bg-orange-500/15 text-orange-500 hover:bg-orange-500/25"
                                : "text-text-mute hover:text-text hover:bg-bg-elevated",
                            )}
                            title="Filter by attendance status"
                          >
                            <span>Attendance</span>
                            {attendanceFilter !== "all" && (
                              <span className="text-[10px] font-bold capitalize">
                                ({attendanceFilter})
                              </span>
                            )}
                            <ChevronDown className="w-3 h-3 opacity-70" />
                          </button>

                          {isAttendanceMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setIsAttendanceMenuOpen(false)}
                              />
                              <div className="absolute left-0 top-full mt-1 z-30 min-w-[150px] rounded-[var(--radius)] border border-border bg-bg-panel p-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceFilter("all");
                                    setIsAttendanceMenuOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors flex items-center justify-between",
                                    attendanceFilter === "all"
                                      ? "bg-orange-500/15 text-orange-500 font-medium"
                                      : "hover:bg-bg-elevated text-text",
                                  )}
                                >
                                  <span>All Attendees</span>
                                  <span className="text-[10px] text-text-dim">
                                    {approvedRegs.length}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceFilter("present");
                                    setIsAttendanceMenuOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors flex items-center justify-between",
                                    attendanceFilter === "present"
                                      ? "bg-green-500/15 text-green-500 font-medium"
                                      : "hover:bg-bg-elevated text-text",
                                  )}
                                >
                                  <span>Present</span>
                                  <span className="text-[10px] text-text-dim">
                                    {stats.present}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceFilter("volunteer");
                                    setIsAttendanceMenuOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors flex items-center justify-between",
                                    attendanceFilter === "volunteer"
                                      ? "bg-orange-500/15 text-orange-500 font-medium"
                                      : "hover:bg-bg-elevated text-text",
                                  )}
                                >
                                  <span>Volunteer</span>
                                  <span className="text-[10px] text-text-dim">
                                    {volunteerCount}
                                  </span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </th>
                      <th className="pb-2">{isReadOnly ? "Method" : "Action"}</th>
                    </>
                  )}
                  {session.roleKey !== "class_representative" && (
                    <th className="pb-2">Certificate</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRoster.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        (isMultiSession ? attendanceSessions.length + 3 : 4) +
                        (session.roleKey !== "class_representative" ? 1 : 0)
                      }
                      className="py-10 text-center text-text-mute"
                    >
                      {rosterQuery ? (
                        <div>
                          <p className="font-medium text-text text-sm">
                            No students found matching &ldquo;{rosterQuery}&rdquo;
                          </p>
                          <p className="text-[11px] text-text-dim mt-1">
                            Try checking for typos or clearing your search.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-text text-sm">
                            No approved attendees found
                          </p>
                          <p className="text-[11px] text-text-dim mt-1">
                            Registered and approved students will appear here.
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                {filteredRoster.map((reg) => {
                  const user = store.profiles.find((p) => p.id === reg.userId);
                  const userAttRecords = store.attendance.filter(
                    (a) => a.registrationId === reg.id,
                  );

                  const singleAtt = userAttRecords[0];
                  const attendedSessionsCount = attendanceSessions.filter((sess) =>
                    userAttRecords.some(
                      (a) =>
                        (a.sessionId === sess.id || a.session === sess.id || a.sessionName === sess.name) &&
                        (a.status === "present" || a.status === "late" || a.status === "volunteer" || a.status === "speaker"),
                    ),
                  ).length;

                  const isFullyComplete = attendedSessionsCount === attendanceSessions.length;
                  const cert = store.certificates.find(
                    (c) => c.eventId === reg.eventId && c.userId === reg.userId,
                  );

                  return (
                    <tr key={reg.id} className="border-b border-border/50">
                      <td className="py-3">
                        <p className="font-normal text-text">{user?.fullName}</p>
                        <p className="text-[11px] text-text-mute">{user?.email}</p>
                      </td>

                      <td className="py-3 font-mono text-[11px] text-text-dim">
                        {reg.qrCode || "—"}
                      </td>

                      {/* Multi-Session Columns */}
                      {isMultiSession ? (
                        <>
                          {attendanceSessions.map((sess) => {
                            const sessRecord = userAttRecords.find(
                              (a) => a.sessionId === sess.id || a.session === sess.id || a.sessionName === sess.name,
                            );
                            return (
                              <td key={sess.id} className="py-3 text-center">
                                {sessRecord ? (
                                  <div className="inline-flex items-center gap-1">
                                    <Badge tone={sessRecord.status === "present" ? "green" : "orange"}>
                                      {sessRecord.status}
                                    </Badge>
                                    {!isReadOnly && (
                                      <Button
                                        variant="ghost"
                                        className="h-6 px-1 text-[10px]"
                                        disabled={!attendanceTakeable.allowed}
                                        title={!attendanceTakeable.allowed ? attendanceTakeable.reason : undefined}
                                        onClick={() => {
                                          if (!attendanceTakeable.allowed) {
                                            setFlash({ tone: "err", text: attendanceTakeable.reason || "Attendance cannot be taken at this time." });
                                            return;
                                          }
                                          const res = updateAttendance(
                                            reg.id,
                                            sessRecord.status === "present" ? "absent" : "present",
                                            session.userId,
                                            sess.id,
                                            sess.name,
                                          );
                                          if (!res.ok) {
                                            setFlash({ tone: "err", text: res.message });
                                          }
                                        }}
                                      >
                                        ⇄
                                      </Button>
                                    )}
                                  </div>
                                ) : !isReadOnly ? (
                                  <Button
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px] border border-border"
                                    disabled={!hasEvent || !attendanceTakeable.allowed}
                                    title={!attendanceTakeable.allowed ? attendanceTakeable.reason : undefined}
                                    onClick={() => runCheckIn(reg.id, "manual", sess.id, sess.name)}
                                  >
                                    + Mark
                                  </Button>
                                ) : (
                                  <span className="text-[11px] text-text-mute">—</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="py-3 text-center">
                            {isFullyComplete ? (
                              <Badge tone="green">
                                ✓ {attendedSessionsCount}/{attendanceSessions.length} (100%)
                              </Badge>
                            ) : attendedSessionsCount > 0 ? (
                              <Badge tone="orange">
                                {attendedSessionsCount}/{attendanceSessions.length} Terms
                              </Badge>
                            ) : (
                              <Badge tone="mute">0/{attendanceSessions.length}</Badge>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3">
                            {singleAtt ? (
                              <Badge
                                tone={
                                  singleAtt.status === "present"
                                    ? "green"
                                    : singleAtt.status === "volunteer"
                                      ? "orange"
                                      : "mute"
                                }
                              >
                                {singleAtt.status} · {formatDateTime(singleAtt.checkedInAt)}
                              </Badge>
                            ) : (
                              <Badge tone="orange">not checked in</Badge>
                            )}
                          </td>
                          <td className="py-3">
                            {isReadOnly ? (
                              <span className="font-mono text-[11px] text-text-dim">
                                {singleAtt ? (singleAtt.method || "verified") : "—"}
                              </span>
                            ) : !singleAtt ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="ghost"
                                  className="h-8"
                                  disabled={!hasEvent || !attendanceTakeable.allowed}
                                  title={!attendanceTakeable.allowed ? attendanceTakeable.reason : undefined}
                                  onClick={() => runCheckIn(reg.id, "manual")}
                                >
                                  Check in
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="h-8"
                                  disabled={!hasEvent || !attendanceTakeable.allowed}
                                  title={!attendanceTakeable.allowed ? attendanceTakeable.reason : undefined}
                                  onClick={() => {
                                    const result = checkIn(
                                      reg.id,
                                      "absent",
                                      "manual",
                                      session.userId,
                                      eventId,
                                    );
                                    setFlash(
                                      result.ok
                                        ? { tone: "ok", text: "Marked absent" }
                                        : { tone: "err", text: result.message },
                                    );
                                  }}
                                >
                                  Mark absent
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-text-dim">Checked in</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Certificate Column */}
                      {session.roleKey !== "class_representative" && (
                        <td className="py-3">
                          {cert ? (
                            <Badge tone="green">Issued · {cert.certificateId}</Badge>
                          ) : (singleAtt?.status === "volunteer" || userAttRecords.some((a) => a.status === "volunteer")) ? (
                            <span className="text-[11px] text-text-dim">Volunteer</span>
                          ) : !isReadOnly && (isMultiSession ? isFullyComplete : Boolean(singleAtt && singleAtt.status === "present")) ? (
                            <Button
                              variant="orange"
                              className="h-7 text-[11px]"
                              onClick={() => {
                                const res = issueCertificate(reg.eventId, reg.userId);
                                setFlash(
                                  res.ok
                                    ? { tone: "ok", text: `Issued cert for ${user?.fullName}` }
                                    : { tone: "err", text: res.message },
                                );
                              }}
                            >
                              Issue cert ↗
                            </Button>
                          ) : (
                            <span className="text-[11px] text-text-mute">
                              {isMultiSession
                                ? isFullyComplete
                                  ? "Eligible (Completed)"
                                  : `Requires ${attendanceSessions.length} terms`
                                : singleAtt && singleAtt.status === "present"
                                  ? "Eligible"
                                  : "Requires check-in"}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rosterTab === "waitlist" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-text-mute">
                  <th className="pb-2">Student</th>
                  <th className="pb-2">Elevates ID</th>
                  <th className="pb-2">Class / Dept</th>
                  <th className="pb-2">Registration Status</th>
                  <th className="pb-2 text-right">Approval & Check-in</th>
                </tr>
              </thead>
              <tbody>
                {filteredWaitlist.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-dim">
                      No waitlisted or pending registrations found.
                    </td>
                  </tr>
                ) : (
                  filteredWaitlist.map((reg) => {
                    const user = store.profiles.find((p) => p.id === reg.userId);
                    return (
                      <tr key={reg.id} className="border-b border-border/50">
                        <td className="py-3">
                          <p className="font-medium text-text">{user?.fullName || "Student"}</p>
                          <p className="text-[11px] text-text-mute">{user?.email}</p>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-text-dim">
                          {user?.elevatesId || "—"}
                        </td>
                        <td className="py-3 text-[11px] text-text-dim">
                          {user?.department || "General"} · {user?.year || ""}
                        </td>
                        <td className="py-3">
                          <Badge tone="orange">{reg.status.replace("_", " ")}</Badge>
                        </td>
                        <td className="py-3 text-right">
                          {!isReadOnly ? (
                            <Button
                              variant="orange"
                              className="h-7 text-[11px]"
                              onClick={() => {
                                const res = runCheckIn(
                                  reg.id,
                                  "manual",
                                  activeSessionObj.id,
                                  activeSessionObj.name,
                                );
                                if (res) {
                                  setFlash({
                                    tone: "ok",
                                    text: `Approved & checked in ${user?.fullName || "student"} [${activeSessionObj.name}]!`,
                                  });
                                }
                              }}
                            >
                              ✓ Approve & Check In
                            </Button>
                          ) : (
                            <Badge tone="mute">Read-only</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {rosterTab === "chapter" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-text-mute">
                  <th className="pb-2">Chapter Student</th>
                  <th className="pb-2">Elevates ID</th>
                  <th className="pb-2">Department / Year</th>
                  <th className="pb-2">Event Registration</th>
                  <th className="pb-2 text-right">Attendance Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredChapterStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-dim">
                      No chapter students matching &quot;{rosterQuery}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredChapterStudents.map((student) => {
                    const studentReg = eventRegistrations.find((r) => r.userId === student.id);
                    const attRecord = studentReg
                      ? store.attendance.find(
                        (a) =>
                          a.registrationId === studentReg.id &&
                          (a.sessionId === activeSessionObj.id || a.session === activeSessionObj.id),
                      )
                      : null;

                    return (
                      <tr key={student.id} className="border-b border-border/50">
                        <td className="py-3">
                          <p className="font-medium text-text">{student.fullName}</p>
                          <p className="text-[11px] text-text-mute">{student.email}</p>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-text-dim">
                          {student.elevatesId || "—"}
                        </td>
                        <td className="py-3 text-[11px] text-text-dim">
                          {student.department || "General"} · {student.year || "—"}
                        </td>
                        <td className="py-3">
                          {studentReg?.status === "approved" ? (
                            <Badge tone="green">Registered</Badge>
                          ) : studentReg ? (
                            <Badge tone="orange">{studentReg.status}</Badge>
                          ) : (
                            <Badge tone="mute">Not Registered</Badge>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {attRecord ? (
                            <Badge tone={attRecord.status === "present" ? "green" : "orange"}>
                              ✓ {attRecord.status} ({activeSessionObj.name})
                            </Badge>
                          ) : !isReadOnly ? (
                            <Button
                              variant="orange"
                              className="h-7 text-[11px]"
                              onClick={() => {
                                const res = quickRegisterAndCheckIn(
                                  eventId,
                                  student.id,
                                  status,
                                  "manual",
                                  session.userId,
                                  activeSessionObj.id,
                                  activeSessionObj.name,
                                );
                                if (res.ok) {
                                  setFlash({
                                    tone: "ok",
                                    text: `Checked in ${student.fullName} [${activeSessionObj.name}] · ${status}`,
                                  });
                                } else {
                                  setFlash({ tone: "err", text: res.message });
                                }
                              }}
                            >
                              + Check In
                            </Button>
                          ) : (
                            <Badge tone="mute">Unmarked</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </TerminalPanel>

      {/* Volunteer Students Modal */}
      {isVolunteerModalOpen && !isReadOnly && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-2.5 sm:p-4 backdrop-blur-sm">
          <div className="flex flex-col w-full max-w-xl max-h-[90dvh] rounded-[var(--radius)] border border-border bg-bg-panel p-4 sm:p-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-text text-sm sm:text-base">
                    Volunteer Students
                  </h3>
                  <p className="text-[11px] text-text-dim">
                    Assign or remove chapter students as event volunteers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsVolunteerModalOpen(false);
                  setVolunteerSearch("");
                }}
                className="rounded-full p-1.5 text-text-dim hover:bg-bg-elevated hover:text-text transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search filter */}
            <div className="pt-3 pb-2 shrink-0">
              <Input
                value={volunteerSearch}
                onChange={(e) => setVolunteerSearch(e.target.value)}
                placeholder="Search chapter students by name, email, or ID..."
                className="w-full text-xs"
                autoFocus
              />
            </div>

            {/* Student list */}
            <div className="overflow-y-auto flex-1 divide-y divide-border/40 min-h-[220px] max-h-[50vh] pr-1">
              {filteredVolunteerStudents.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-dim">
                  No students found matching &ldquo;{volunteerSearch}&rdquo;
                </div>
              ) : (
                filteredVolunteerStudents.map((student) => {
                  const volunteerAtt = store.attendance.find(
                    (a) => a.eventId === eventId && a.userId === student.id && a.status === "volunteer",
                  );
                  const isVolunteer = Boolean(volunteerAtt);

                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between gap-3 py-2.5 px-1 hover:bg-bg-elevated/40 rounded transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-text truncate">
                            {student.fullName}
                          </p>
                          {isVolunteer && (
                            <span className="rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1">
                              ✓ Volunteer
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-text-dim mt-0.5 truncate">
                          <span>{student.email}</span>
                          {student.department && (
                            <>
                              <span>•</span>
                              <span>{student.department} {student.year ? `(${student.year})` : ""}</span>
                            </>
                          )}
                          {student.elevatesId && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-text-dim">{student.elevatesId}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isVolunteer ? (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={volunteerPendingId === student.id}
                            className="h-7 px-3 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 border border-red-500/25 transition-colors disabled:opacity-50"
                            onClick={() => handleRemoveVolunteer(student.id, student.fullName)}
                          >
                            {volunteerPendingId === student.id ? "Removing..." : "Remove"}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="orange"
                            disabled={volunteerPendingId === student.id}
                            className="h-7 px-3 text-xs font-semibold shadow-xs disabled:opacity-50"
                            onClick={() => handleAddVolunteer(student.id, student.fullName)}
                          >
                            {volunteerPendingId === student.id ? "Adding..." : "+ Add"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer summary */}
            <div className="border-t border-border pt-3 mt-2 flex items-center justify-between text-xs text-text-dim shrink-0">
              <span>
                {volunteerCount} active {volunteerCount === 1 ? "volunteer" : "volunteers"}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-3 text-xs border border-border"
                onClick={() => {
                  setIsVolunteerModalOpen(false);
                  setVolunteerSearch("");
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* On-Spot Chapter Student Check-in Dialog */}
      {isOnSpotOpen && !isReadOnly && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-2.5 sm:p-4 backdrop-blur-sm">
          <div className="flex flex-col w-full max-w-xl max-h-[92dvh] rounded-[var(--radius)] border border-border bg-bg-panel p-4 sm:p-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="text-sm font-semibold text-text">On-Spot Chapter Student Check-in</h3>
                <p className="text-[12px] text-text-dim truncate sm:whitespace-normal">
                  Mark attendance for any student enrolled in {chapter?.name || "this chapter"} [
                  <span className="text-[var(--accent)]">{activeSessionObj.name}</span>].
                </p>
              </div>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-text-dim hover:text-text shrink-0"
                onClick={() => {
                  setIsOnSpotOpen(false);
                  setOnSpotSearch("");
                }}
              >
                ✕
              </Button>
            </div>

            <div className="mt-3 shrink-0">
              <Input
                autoFocus
                value={onSpotSearch}
                onChange={(e) => setOnSpotSearch(e.target.value)}
                placeholder="Search by name, email, department, or Elevates ID..."
                className="w-full"
              />
            </div>

            <div className="mt-3 flex-1 min-h-0 max-h-[55dvh] sm:max-h-72 space-y-2 overflow-y-auto">
              {filteredOnSpotStudents.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-text-dim">
                  No students found matching &quot;{onSpotSearch}&quot;.
                </p>
              ) : (
                filteredOnSpotStudents.map((stud) => {
                  const studReg = eventRegistrations.find((r) => r.userId === stud.id);
                  const isChecked = studReg
                    ? store.attendance.some(
                      (a) =>
                        a.registrationId === studReg.id &&
                        (a.sessionId === activeSessionObj.id || a.session === activeSessionObj.id) &&
                        (a.status === "present" || a.status === "late"),
                    )
                    : false;

                  return (
                    <div
                      key={stud.id}
                      className="flex items-center justify-between rounded-[var(--radius)] border border-border/60 bg-bg p-2.5 text-[12px]"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text">{stud.fullName}</span>
                          {stud.elevatesId && (
                            <span className="font-mono text-[10px] text-text-dim">
                              {stud.elevatesId}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-mute">
                          {stud.department || "General"} · {stud.year || "Student"} &mdash; {stud.email}
                        </p>
                      </div>
                      <div>
                        {isChecked ? (
                          <Badge tone="green">✓ Checked In</Badge>
                        ) : (
                          <Button
                            variant="orange"
                            className="h-7 px-3 text-[11px]"
                            onClick={() => {
                              const res = quickRegisterAndCheckIn(
                                eventId,
                                stud.id,
                                status,
                                "manual",
                                session.userId,
                                activeSessionObj.id,
                                activeSessionObj.name,
                              );
                              if (res.ok) {
                                setFlash({
                                  tone: "ok",
                                  text: `On-spot verified: ${stud.fullName} [${activeSessionObj.name}] · ${status}`,
                                });
                                setIsOnSpotOpen(false);
                                setOnSpotSearch("");
                              } else {
                                setFlash({ tone: "err", text: res.message });
                              }
                            }}
                          >
                            Check In
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[11px] text-text-dim">
                Showing {filteredOnSpotStudents.length} of {chapterStudents.length} chapter students
              </span>
              <Button
                variant="ghost"
                className="h-8 text-[12px]"
                onClick={() => {
                  setIsOnSpotOpen(false);
                  setOnSpotSearch("");
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pop Notification (Toast) */}
      {popNotification && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed bottom-6 right-6 z-[70] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4",
            popNotification.tone === "ok"
              ? "border-emerald-500/30 bg-[#0c1a14]/95 text-emerald-100 shadow-emerald-950/40"
              : "border-red-500/30 bg-[#1c0f12]/95 text-red-100 shadow-red-950/40",
          )}
        >
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              popNotification.tone === "ok"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400",
            )}
          >
            {popNotification.tone === "ok" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
          </div>
          <p className="text-xs font-medium tracking-tight">
            {popNotification.text}
          </p>
          <button
            type="button"
            onClick={() => setPopNotification(null)}
            className="ml-2 rounded-md p-1 text-text-dim hover:text-text hover:bg-white/5 transition-colors"
            aria-label="Close notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
