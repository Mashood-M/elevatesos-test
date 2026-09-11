"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { QrScanner } from "@/components/domain/qr-scanner";
import { useStore, useCurrentUser } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
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
  const { store, checkIn, updateAttendance, quickRegisterAndCheckIn, issueCertificate, updateEvent } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const isCampusLead =
    session.roleKey === "campus_lead" ||
    session.roleKey === "chairman" ||
    session.roleKey === "founder" ||
    session.roleKey === "hq_admin";

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
  const [method, setMethod] = useState<
    "qr" | "manual" | "bulk" | "representative"
  >("qr");
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [flash, setFlash] = useState<DeskMessage | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [selectedRegs, setSelectedRegs] = useState<string[]>([]);
  const [offlineDesk, setOfflineDesk] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineCheckInItem[]>([]);
  const [rosterQuery, setRosterQuery] = useState("");
  const [online, setOnline] = useState(true);
  const [rosterTab, setRosterTab] = useState<"approved" | "waitlist" | "chapter">("approved");
  const [isOnSpotOpen, setIsOnSpotOpen] = useState(false);
  const [onSpotSearch, setOnSpotSearch] = useState("");

  const canVerify =
    isCampusLead ||
    hasPermission(
      store,
      session.roleKey,
      "attendance.verify",
    );

  const queryEventId = searchParams.get("eventId");

  const events = useMemo(() => {
    if (!chapter) return [];
    const chapterEvents = store.events.filter((e) => e.chapterId === chapter.id);
    const preferred = chapterEvents.filter((e) =>
      [
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
    let regs = eventRegistrations.filter((r) => r.status === "approved");
    if (session.roleKey === "class_representative" && myClassCohort) {
      regs = regs.filter((reg) => {
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
    return regs;
  }, [eventRegistrations, store.profiles, session.roleKey, myClassCohort]);

  const waitlistedRegs = useMemo(() => {
    return eventRegistrations.filter(
      (r) => r.status === "waitlisted" || r.status === "pending" || r.status === "reviewed",
    );
  }, [eventRegistrations]);

  const filteredRoster = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    if (!q) return approvedRegs;
    return approvedRegs.filter((reg) => {
      const user = store.profiles.find((p) => p.id === reg.userId);
      return (
        user?.fullName.toLowerCase().includes(q) ||
        user?.email.toLowerCase().includes(q) ||
        user?.elevatesId?.toLowerCase().includes(q) ||
        reg.qrCode.toLowerCase().includes(q)
      );
    });
  }, [approvedRegs, rosterQuery, store.profiles]);

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
    const currentSessionChecked = checked.filter(
      (a) => (a.sessionId === activeSessionObj?.id || a.session === activeSessionObj?.id) && (a.status === "present" || a.status === "late"),
    );

    // Full completion: attended all required sessions
    const fullyAttended = approvedRegs.filter((r) => {
      const userRecords = checked.filter((a) => a.registrationId === r.id && (a.status === "present" || a.status === "late"));
      return attendanceSessions.every((sess) =>
        userRecords.some((a) => a.sessionId === sess.id || a.session === sess.id || a.sessionName === sess.name),
      );
    });

    return {
      approved: approvedRegs.length,
      currentSessionCount: currentSessionChecked.length,
      fullyAttendedCount: fullyAttended.length,
      checkedIn: checked.length,
      present: checked.filter((a) => a.status === "present").length,
      late: checked.filter((a) => a.status === "late").length,
      absent: checked.filter((a) => a.status === "absent").length,
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
    (registrationId: string, m: typeof method, sessId?: string, sessName?: string) => {
      const { eventId: eid, status: st, userId, activeSessionId: currentSessId, activeSessionName: currentSessName } = deskRef.current;
      const targetId = sessId ?? currentSessId;
      const targetName = sessName ?? currentSessName;
      if (!eid) {
        setFlash({ tone: "err", text: "Select an event first." });
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
    [checkIn, session.roleKey, myClassCohort, store.registrations, store.profiles],
  );

  const handleQrScan = useCallback(
    (codeOverride?: string) => {
      const code = (codeOverride ?? qrInput).trim();
      if (!code) return;

      const { eventId: eid, status: st, offlineDesk: off, online: on, activeSessionId: sessId, activeSessionName: sessName } =
        deskRef.current;
      if (!eid) {
        setFlash({ tone: "err", text: "Select an event first." });
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
          r.qrCode === code &&
          r.eventId === eid &&
          r.status === "approved",
      );

      // If not approved, check if waitlisted or pending (Campus Lead can auto-approve)
      if (!reg && isCampusLead) {
        const pendingReg = store.registrations.find(
          (r) => r.qrCode === code && r.eventId === eid,
        );
        if (pendingReg) {
          reg = pendingReg;
        }
      }

      // If not found by registration QR, check if it's an Elevates ID, email, or profile ID of a chapter student
      if (!reg && isCampusLead) {
        const studentProf = chapterStudents.find(
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
              text: `On-spot verified: ${studentProf.fullName} (${studentProf.elevatesId || "ID"}) checked in [${sessName}]!`,
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
          text: isCampusLead
            ? "Student or QR not found for this event or chapter."
            : "QR not found for this event (must be approved).",
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
        (a) => a.registrationId === reg.id && (a.sessionId === sessId || a.session === sessId),
      );
      if (existing) {
        const result = updateAttendance(
          reg.id,
          st,
          deskRef.current.userId,
          sessId,
          sessName,
        );
        setFlash(
          result.ok
            ? { tone: "ok", text: `Updated ${sessName} status to ${st}` }
            : { tone: "err", text: result.message },
        );
      } else {
        runCheckIn(reg.id, "qr", sessId, sessName);
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
    let ok = 0;
    for (const item of offlineQueue) {
      const reg = store.registrations.find(
        (r) =>
          r.qrCode === item.qrCode &&
          r.eventId === item.eventId &&
          r.status === "approved",
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
    let ok = 0;
    for (const line of lines) {
      let reg = store.registrations.find(
        (r) =>
          r.eventId === eventId &&
          r.status === "approved" &&
          (r.qrCode.toLowerCase() === line.toLowerCase() ||
            store.profiles.find((p) => p.id === r.userId)?.email.toLowerCase() ===
              line.toLowerCase() ||
            store.profiles.find((p) => p.id === r.userId)?.elevatesId?.toLowerCase() ===
              line.toLowerCase()),
      );
      if (!reg && isCampusLead) {
        reg = store.registrations.find(
          (r) =>
            r.eventId === eventId &&
            (r.qrCode.toLowerCase() === line.toLowerCase() ||
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
    if (!selectedRegs.length || !eventId) return;
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

  if (!canVerify && !isCampusLead) {
    return (
      <div>
        <PageHeader
          eyebrow={chapterEyebrow(session.roleKey, "programs")}
          title="Attendance"
          description="You need attendance.verify permission to operate check-in."
        />
        <p className="text-[13px] text-text-dim">
          Switch to Campus Lead, Class Rep, Secretary, or Coordinator.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Attendance Desk"
        description="Verify arrivals & checkpoints via QR scanner, directory matrix, bulk input, or class representative."
        actions={
          <div className="flex items-center gap-2">
            {isCampusLead && hasEvent && (
              <Button
                variant="orange"
                className="text-xs"
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
        }
      />

      {/* Top Stats Bar in clean ERP styling */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
            <Stat label="Late" value={stats.late} accent="orange" />
            <Stat label="Absent" value={stats.absent} />
          </>
        )}
      </div>

      {isCampusLead && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-xs text-orange-400">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
            <span>
              <strong>Campus Lead Attendance Desk:</strong> Full Chapter Authority &mdash; You have access to take attendance for <strong>any student enrolled in {chapter?.name || "this chapter"}</strong> across all departments and academic years.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="orange">Chapter-Wide Authority</Badge>
            <Button
              variant="orange"
              className="h-6 text-[11px] px-2"
              onClick={() => setIsOnSpotOpen(true)}
            >
              + On-Spot Student Check-in
            </Button>
          </div>
        </div>
      )}

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

      <TerminalPanel
        title="Check-in desk"
        meta={
          [
            currentEvent?.title,
            isMultiSession ? `Session: ${activeSessionObj?.name}` : undefined,
            offlineDesk || !online ? "queue" : "live",
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

        <div className="grid max-w-3xl gap-3 md:grid-cols-3">
          <div>
            <FieldLabel>Event</FieldLabel>
            <Select
              value={eventId}
              onChange={(e) => {
                setSelectedEvent(e.target.value);
                setFlash(null);
                setSelectedRegs([]);
                setRosterQuery("");
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
          <div>
            <FieldLabel>Method</FieldLabel>
            <Select
              value={method}
              onChange={(e) =>
                setMethod(
                  e.target.value as
                    | "qr"
                    | "manual"
                    | "bulk"
                    | "representative",
                )
              }
            >
              <option value="qr">QR scan</option>
              <option value="manual">Manual (directory table)</option>
              <option value="representative">Class representative</option>
              <option value="bulk">Bulk list</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as AttendanceStatus)
              }
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="volunteer">Volunteer</option>
              <option value="speaker">Speaker</option>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/70 pt-3">
          <label className="flex items-center gap-2 text-[12px] text-text-dim">
            <input
              type="checkbox"
              checked={offlineDesk}
              disabled={!hasEvent}
              onChange={(e) => setOfflineDesk(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Queue scans locally
          </label>
          <Badge tone={online && !offlineDesk ? "green" : "orange"}>
            {offlineDesk || !online ? "queue" : "live"}
          </Badge>
          {offlineQueue.length ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-text-dim">
                {offlineQueue.length} queued
              </span>
              <Button
                variant="ghost"
                className="h-7 text-[11px]"
                disabled={!online}
                onClick={syncOffline}
              >
                Sync to cloud
              </Button>
            </div>
          ) : null}
        </div>

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

        {/* QR Scanner Mode */}
        {method === "qr" ? (
          <div className="mt-4 border-t border-border/70 pt-4">
            {isMultiSession ? (
              <div className="mb-3 flex items-center justify-between rounded-[var(--radius)] border border-border/80 bg-bg-panel px-3 py-2 text-[12px]">
                <span className="text-text">
                  Scanning for: <strong className="text-[var(--accent)]">{activeSessionObj.name}</strong>
                  {activeSessionObj.time ? ` (${activeSessionObj.time})` : ""}
                </span>
                <Badge tone="green">Ready</Badge>
              </div>
            ) : null}

            <QrScanner onScan={onCameraScan} active={method === "qr"} disabled={!hasEvent} />

            <div className="mt-4 flex max-w-md gap-2">
              <Input
                placeholder="Or paste / type QR code..."
                value={qrInput}
                disabled={!hasEvent}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQrScan()}
                aria-label="QR Code input"
              />
              <Button
                variant="orange"
                disabled={!hasEvent || !qrInput.trim()}
                onClick={() => handleQrScan()}
              >
                Verify
              </Button>
            </div>
          </div>
        ) : null}

        {method === "manual" ? (
          <p className="mt-4 border-t border-border/70 pt-4 text-[13px] text-text-dim">
            Use the directory below — click Check in or toggle status per student.
          </p>
        ) : null}

        {method === "bulk" ? (
          <div className="mt-4 max-w-xl space-y-2 border-t border-border/70 pt-4">
            <FieldLabel>
              One QR code or email per line {isMultiSession ? `(${activeSessionObj.name})` : ""}
            </FieldLabel>
            <TextArea
              rows={4}
              value={bulkText}
              disabled={!hasEvent}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"QR-ELV-DECODE-001\nuser@elevates.live\n..."}
            />
            <Button
              variant="orange"
              disabled={!hasEvent}
              onClick={handleBulk}
            >
              Process bulk {isMultiSession ? `(${activeSessionObj.name})` : ""}
            </Button>
          </div>
        ) : null}

        {method === "representative" ? (
          <div className="mt-4 max-w-xl border-t border-border/70 pt-4">
            <p className="mb-2 text-[12px] text-text-dim">
              Select students to check in together {isMultiSession ? `for ${activeSessionObj.name}` : ""}:
            </p>
            <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto rounded-[var(--radius)] border border-border/80 bg-bg-panel p-2">
              {approvedRegs.map((reg) => {
                const user = store.profiles.find((p) => p.id === reg.userId);
                const att = store.attendance.find(
                  (a) =>
                    a.registrationId === reg.id &&
                    (a.sessionId === activeSessionObj.id || a.session === activeSessionObj.id),
                );
                return (
                  <li key={reg.id} className="flex items-center justify-between text-[12px] border-b border-border/40 pb-1.5 last:border-0">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={Boolean(att) || !hasEvent}
                        checked={selectedRegs.includes(reg.id)}
                        onChange={(e) => {
                          setSelectedRegs((ids) =>
                            e.target.checked
                              ? [...ids, reg.id]
                              : ids.filter((id) => id !== reg.id),
                          );
                        }}
                      />
                      <span className="font-medium text-text">{user?.fullName}</span>
                      <span className="text-text-mute">({user?.year} · {user?.department?.split(" ")[0]})</span>
                    </label>
                    {att ? <Badge tone="green">{att.status}</Badge> : <Badge tone="mute">unmarked</Badge>}
                  </li>
                );
              })}
            </ul>
            <Button
              variant="orange"
              disabled={!hasEvent || selectedRegs.length === 0}
              onClick={handleRepresentative}
            >
              Check in selected ({selectedRegs.length})
            </Button>
          </div>
        ) : null}
      </TerminalPanel>

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
        {isCampusLead && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-border/70 pb-3">
            <Button
              type="button"
              variant={rosterTab === "approved" ? "orange" : "ghost"}
              className={cn("h-7 text-[12px] px-3", rosterTab !== "approved" && "border border-border/70")}
              onClick={() => {
                setRosterTab("approved");
                setRosterQuery("");
              }}
            >
              Approved Attendees ({approvedRegs.length})
            </Button>
            <Button
              type="button"
              variant={rosterTab === "waitlist" ? "orange" : "ghost"}
              className={cn("h-7 text-[12px] px-3", rosterTab !== "waitlist" && "border border-border/70")}
              onClick={() => {
                setRosterTab("waitlist");
                setRosterQuery("");
              }}
            >
              Waitlist / Pending ({waitlistedRegs.length})
            </Button>
            <Button
              type="button"
              variant={rosterTab === "chapter" ? "orange" : "ghost"}
              className={cn("h-7 text-[12px] px-3", rosterTab !== "chapter" && "border border-border/70")}
              onClick={() => {
                setRosterTab("chapter");
                setRosterQuery("");
              }}
            >
              All Chapter Students ({chapterStudents.length})
            </Button>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 max-w-xl">
          <div className="w-full max-w-sm">
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
            />
          </div>
          {isCampusLead && (
            <Button
              variant="ghost"
              className="h-9 text-xs border border-dashed border-border hover:border-orange-500/50"
              onClick={() => setIsOnSpotOpen(true)}
              disabled={!hasEvent}
            >
              + On-Spot Check-in
            </Button>
          )}
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
                      <th className="pb-2">Attendance</th>
                      <th className="pb-2">Action</th>
                    </>
                  )}
                  {session.roleKey !== "class_representative" && (
                    <th className="pb-2">Certificate</th>
                  )}
                </tr>
              </thead>
              <tbody>
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
                        <p className="font-medium text-text">{user?.fullName}</p>
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
                                    <Button
                                      variant="ghost"
                                      className="h-6 px-1 text-[10px]"
                                      onClick={() => {
                                        updateAttendance(
                                          reg.id,
                                          sessRecord.status === "present" ? "absent" : "present",
                                          session.userId,
                                          sess.id,
                                          sess.name,
                                        );
                                      }}
                                    >
                                      ⇄
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px] border border-border"
                                    onClick={() => runCheckIn(reg.id, "manual", sess.id, sess.name)}
                                  >
                                    + Mark
                                  </Button>
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
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone="green">
                                  {singleAtt.status} · {formatDateTime(singleAtt.checkedInAt)}
                                </Badge>
                                <Select
                                  className="h-8 w-auto text-[11px]"
                                  value={singleAtt.status}
                                  onChange={(e) => {
                                    const result = updateAttendance(
                                      reg.id,
                                      e.target.value as AttendanceStatus,
                                      session.userId,
                                    );
                                    setFlash(
                                      result.ok
                                        ? { tone: "ok", text: `Updated ${user?.fullName}` }
                                        : { tone: "err", text: result.message },
                                    );
                                  }}
                                >
                                  <option value="present">Present</option>
                                  <option value="late">Late</option>
                                  <option value="absent">Absent</option>
                                  <option value="volunteer">Volunteer</option>
                                  <option value="speaker">Speaker</option>
                                </Select>
                              </div>
                            ) : (
                              <Badge tone="orange">not checked in</Badge>
                            )}
                          </td>
                          <td className="py-3">
                            {!singleAtt ? (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="ghost"
                                  className="h-8"
                                  disabled={!hasEvent}
                                  onClick={() => runCheckIn(reg.id, "manual")}
                                >
                                  Check in
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="h-8"
                                  disabled={!hasEvent}
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
                          ) : (isMultiSession ? isFullyComplete : Boolean(singleAtt && singleAtt.status === "present")) ? (
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
                              {isMultiSession ? `Requires ${attendanceSessions.length} terms` : "Requires check-in"}
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
                          ) : (
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

      {/* On-Spot Chapter Student Check-in Dialog */}
      {isOnSpotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[var(--radius)] border border-border bg-bg-panel p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-text">On-Spot Chapter Student Check-in</h3>
                <p className="text-[12px] text-text-dim">
                  Mark attendance for any student enrolled in {chapter?.name || "this chapter"} [
                  <span className="text-[var(--accent)]">{activeSessionObj.name}</span>].
                </p>
              </div>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-text-dim hover:text-text"
                onClick={() => {
                  setIsOnSpotOpen(false);
                  setOnSpotSearch("");
                }}
              >
                ✕
              </Button>
            </div>

            <div className="mt-3">
              <Input
                autoFocus
                value={onSpotSearch}
                onChange={(e) => setOnSpotSearch(e.target.value)}
                placeholder="Search by name, email, department, or Elevates ID..."
                className="w-full"
              />
            </div>

            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
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
    </div>
  );
}
