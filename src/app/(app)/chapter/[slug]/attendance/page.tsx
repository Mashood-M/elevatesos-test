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
import { cn, formatDateTime } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

type DeskMessage = { tone: "ok" | "err"; text: string };

export default function ChapterAttendancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const { store, checkIn, updateAttendance, issueCertificate } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const [selectedEvent, setSelectedEvent] = useState("");
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

  const canVerify = hasPermission(
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

  const approvedRegs = useMemo(
    () =>
      store.registrations.filter(
        (r) => r.eventId === eventId && r.status === "approved",
      ),
    [store.registrations, eventId],
  );

  const filteredRoster = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    if (!q) return approvedRegs;
    return approvedRegs.filter((reg) => {
      const user = store.profiles.find((p) => p.id === reg.userId);
      return (
        user?.fullName.toLowerCase().includes(q) ||
        user?.email.toLowerCase().includes(q) ||
        reg.qrCode.toLowerCase().includes(q)
      );
    });
  }, [approvedRegs, rosterQuery, store.profiles]);

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
    return {
      approved: approvedRegs.length,
      checkedIn: checked.length,
      present: checked.filter((a) => a.status === "present").length,
      late: checked.filter((a) => a.status === "late").length,
      absent: checked.filter((a) => a.status === "absent").length,
    };
  }, [store.attendance, eventId, approvedRegs.length]);

  const deskRef = useRef({
    eventId,
    status,
    offlineDesk,
    online,
    userId: session.userId,
  });
  deskRef.current = {
    eventId,
    status,
    offlineDesk,
    online,
    userId: session.userId,
  };

  const runCheckIn = useCallback(
    (registrationId: string, m: typeof method) => {
      const { eventId: eid, status: st, userId } = deskRef.current;
      if (!eid) {
        setFlash({ tone: "err", text: "Select an event first." });
        return false;
      }
      const result = checkIn(registrationId, st, m, userId, eid);
      if (!result.ok) {
        setFlash({ tone: "err", text: result.message });
        return false;
      }
      setFlash({ tone: "ok", text: `Checked in · ${st} · via ${m}` });
      return true;
    },
    [checkIn],
  );

  const handleQrScan = useCallback(
    (codeOverride?: string) => {
      const code = (codeOverride ?? qrInput).trim();
      if (!code) return;

      const { eventId: eid, status: st, offlineDesk: off, online: on } =
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
        setFlash({ tone: "ok", text: `Queued offline · ${code}` });
        setQrInput("");
        return;
      }

      const reg = store.registrations.find(
        (r) =>
          r.qrCode === code &&
          r.eventId === eid &&
          r.status === "approved",
      );
      if (!reg) {
        setFlash({
          tone: "err",
          text: "QR not found for this event (must be approved).",
        });
        return;
      }
      const existing = store.attendance.find(
        (a) => a.registrationId === reg.id,
      );
      if (existing) {
        const result = updateAttendance(
          reg.id,
          st,
          deskRef.current.userId,
        );
        setFlash(
          result.ok
            ? { tone: "ok", text: `Updated status to ${st}` }
            : { tone: "err", text: result.message },
        );
      } else {
        runCheckIn(reg.id, "qr");
      }
      setQrInput("");
    },
    [qrInput, store.registrations, store.attendance, updateAttendance, runCheckIn],
  );

  const onCameraScan = useCallback(
    (code: string) => {
      handleQrScan(code);
    },
    [handleQrScan],
  );

  function flushOfflineQueue() {
    if (!eventId) {
      setFlash({ tone: "err", text: "Select an event first." });
      return;
    }
    if (!online) {
      setFlash({ tone: "err", text: "Go online to sync the queue." });
      return;
    }
    const queue = loadOfflineQueue(eventId);
    let ok = 0;
    let fail = 0;
    const seen = new Set(
      store.attendance
        .filter((a) => a.eventId === eventId)
        .map((a) => a.registrationId),
    );
    for (const item of queue) {
      const reg = store.registrations.find(
        (r) =>
          r.qrCode === item.qrCode &&
          r.eventId === eventId &&
          r.status === "approved",
      );
      if (!reg) {
        fail += 1;
        continue;
      }
      const st = item.status as AttendanceStatus;
      const result = seen.has(reg.id)
        ? updateAttendance(reg.id, st, session.userId)
        : checkIn(reg.id, st, "qr", session.userId, eventId);
      if (result.ok) {
        ok += 1;
        seen.add(reg.id);
      } else fail += 1;
    }
    clearOfflineQueue(eventId);
    setOfflineQueue([]);
    setFlash({
      tone: fail && !ok ? "err" : "ok",
      text: `Synced offline queue · ${ok} ok · ${fail} skipped`,
    });
  }

  function handleBulk() {
    if (!eventId) {
      setFlash({ tone: "err", text: "Select an event first." });
      return;
    }
    const lines = bulkText
      .split(/\n|,/)
      .map((l) => l.trim())
      .filter(Boolean);
    let ok = 0;
    let fail = 0;
    for (const line of lines) {
      const byQr = store.registrations.find(
        (r) =>
          r.qrCode === line &&
          r.eventId === eventId &&
          r.status === "approved",
      );
      const byEmail = store.profiles.find(
        (p) => p.email.toLowerCase() === line.toLowerCase(),
      );
      const reg =
        byQr ??
        store.registrations.find(
          (r) =>
            r.eventId === eventId &&
            r.status === "approved" &&
            r.userId === byEmail?.id,
        );
      if (reg && runCheckIn(reg.id, "bulk")) ok += 1;
      else fail += 1;
    }
    setFlash({
      tone: fail && !ok ? "err" : "ok",
      text: `Bulk done · ${ok} checked in · ${fail} skipped`,
    });
  }

  function handleRepresentative() {
    if (!eventId) {
      setFlash({ tone: "err", text: "Select an event first." });
      return;
    }
    let ok = 0;
    for (const id of selectedRegs) {
      if (runCheckIn(id, "representative")) ok += 1;
    }
    setFlash({
      tone: "ok",
      text: `Representative check-in · ${ok} students`,
    });
    setSelectedRegs([]);
  }

  const demoCodes = approvedRegs
    .filter((r) => r.qrCode)
    .slice(0, 3)
    .map((r) => r.qrCode);

  if (!chapter) {
    return <p className="text-[var(--accent)]">Chapter not found</p>;
  }

  if (!canVerify) {
    return (
      <div>
        <PageHeader
          eyebrow={chapterEyebrow(session.roleKey, "programs")}
          title="Attendance"
          description="You need attendance.verify permission to operate check-in."
        />
        <p className="text-[13px] text-text-dim">
          Switch to Class Rep, Secretary, or Coordinator.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Attendance check-in"
        description="QR, manual, bulk, and representative check-in. Certificates issue after verified attendance."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Checked in" value={stats.checkedIn} />
        <Stat label="Present" value={stats.present} />
        <Stat label="Late" value={stats.late} />
        <Stat label="Absent" value={stats.absent} />
      </div>

      <TerminalPanel
        title="Check-in desk"
        meta={
          [
            events.find((e) => e.id === eventId)?.title,
            offlineDesk || !online ? "queue" : "live",
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
      >
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
              <option value="manual">Manual (roster)</option>
              <option value="representative">Representative</option>
              <option value="bulk">Bulk paste</option>
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
            <>
              <span className="text-[12px] text-text-mute">
                {offlineQueue.length} queued
              </span>
              <Button
                type="button"
                variant="ghost"
                className="h-8"
                onClick={flushOfflineQueue}
                disabled={!online || !hasEvent}
              >
                Sync
              </Button>
            </>
          ) : null}
          {flash ? (
            <p
              className={cn(
                "text-[13px]",
                flash.tone === "ok"
                  ? "text-[var(--success)]"
                  : "text-[var(--accent)]",
              )}
            >
              {flash.text}
            </p>
          ) : null}
          {!hasEvent ? (
            <p className="text-[13px] text-text-dim">
              Select an event to run check-in.
            </p>
          ) : null}
        </div>

        {method === "qr" ? (
          <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
            <QrScanner
              active={method === "qr"}
              disabled={!hasEvent}
              onScan={onCameraScan}
            />
            <div className="max-w-xl">
              <FieldLabel>Paste or type QR</FieldLabel>
              <div className="flex gap-2">
                <Input
                  className="min-w-0 flex-1"
                  placeholder="QR-EV2-…"
                  value={qrInput}
                  disabled={!hasEvent}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQrScan()}
                />
                <Button
                  variant="orange"
                  className="shrink-0"
                  disabled={!hasEvent || !qrInput.trim()}
                  onClick={() => handleQrScan()}
                >
                  Check in
                </Button>
              </div>
              {demoCodes.length > 0 ? (
                <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                  Demo: {demoCodes.join(" · ")}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-text-mute">
                  No approved QR codes yet — approve registrations first.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {method === "manual" ? (
          <p className="mt-4 border-t border-border/70 pt-4 text-[13px] text-text-dim">
            Use the roster below — search by name, email, or QR, then Check in
            or mark Absent. Status above applies to new check-ins.
          </p>
        ) : null}

        {method === "bulk" ? (
          <div className="mt-4 max-w-xl space-y-2 border-t border-border/70 pt-4">
            <FieldLabel>One QR code or email per line</FieldLabel>
            <TextArea
              rows={4}
              value={bulkText}
              disabled={!hasEvent}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"QR-EV2-ANANYA-A2\nananya@…"}
            />
            <Button
              variant="orange"
              disabled={!hasEvent}
              onClick={handleBulk}
            >
              Process bulk
            </Button>
          </div>
        ) : null}

        {method === "representative" ? (
          <div className="mt-4 max-w-xl border-t border-border/70 pt-4">
            <p className="mb-2 text-[12px] text-text-dim">
              Select approved students, then check them in together.
            </p>
            <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto">
              {approvedRegs.map((reg) => {
                const user = store.profiles.find((p) => p.id === reg.userId);
                const att = store.attendance.find(
                  (a) => a.registrationId === reg.id,
                );
                return (
                  <li key={reg.id}>
                    <label className="flex items-center gap-2 text-[13px]">
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
                      {user?.fullName}
                      {att ? <Badge tone="mute">{att.status}</Badge> : null}
                    </label>
                  </li>
                );
              })}
              {!approvedRegs.length ? (
                <li className="text-[13px] text-text-dim">
                  No approved registrations.
                </li>
              ) : null}
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

      <TerminalPanel
        title="Roster"
        meta={`${filteredRoster.length}${
          rosterQuery ? ` / ${approvedRegs.length}` : ""
        } approved`}
        className="mt-4"
      >
        <div className="mb-3 max-w-sm">
          <Input
            value={rosterQuery}
            onChange={(e) => setRosterQuery(e.target.value)}
            placeholder="Search name, email, or QR"
            disabled={!hasEvent}
            aria-label="Filter roster"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] text-text-mute">
                <th className="pb-2">Student</th>
                <th className="pb-2">QR</th>
                <th className="pb-2">Attendance</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.map((reg) => {
                const user = store.profiles.find((p) => p.id === reg.userId);
                const att = store.attendance.find(
                  (a) => a.registrationId === reg.id,
                );
                const cert = store.certificates.find(
                  (c) =>
                    c.eventId === reg.eventId && c.userId === reg.userId,
                );
                return (
                  <tr key={reg.id} className="border-b border-border/50">
                    <td className="py-3">
                      <p className="font-medium">{user?.fullName}</p>
                      <p className="text-[11px] text-text-mute">
                        {user?.email}
                      </p>
                    </td>
                    <td className="py-3 font-[family-name:var(--font-mono)] text-[11px] text-text-dim">
                      {reg.qrCode || "—"}
                    </td>
                    <td className="py-3">
                      {att ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="green">
                            {att.status} · {formatDateTime(att.checkedInAt)}
                          </Badge>
                          <Select
                            className="h-8 w-auto text-[11px]"
                            value={att.status}
                            onChange={(e) => {
                              const result = updateAttendance(
                                reg.id,
                                e.target.value as AttendanceStatus,
                                session.userId,
                              );
                              setFlash(
                                result.ok
                                  ? {
                                      tone: "ok",
                                      text: `Updated ${user?.fullName}`,
                                    }
                                  : {
                                      tone: "err",
                                      text: result.message,
                                    },
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
                      <div className="flex flex-wrap gap-2">
                        {!att ? (
                          <>
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
                                    ? {
                                        tone: "ok",
                                        text: "Marked absent",
                                      }
                                    : {
                                        tone: "err",
                                        text: result.message,
                                      },
                                );
                              }}
                            >
                              Absent
                            </Button>
                          </>
                        ) : null}
                        {att &&
                        !cert &&
                        ["present", "late", "volunteer", "speaker"].includes(
                          att.status,
                        ) ? (
                          <Button
                            variant="orange"
                            className="h-8"
                            onClick={() => {
                              const result = issueCertificate(
                                reg.eventId,
                                reg.userId,
                              );
                              setFlash(
                                result.ok
                                  ? {
                                      tone: "ok",
                                      text: "Certificate issued",
                                    }
                                  : {
                                      tone: "err",
                                      text: result.message,
                                    },
                              );
                            }}
                          >
                            Issue cert
                          </Button>
                        ) : null}
                        {cert ? (
                          <a
                            href={`/verify/certificate/${cert.certificateId}`}
                            className="self-center text-[11px] font-medium text-[var(--accent)] hover:underline"
                          >
                            Verify
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-text-dim">
                    {approvedRegs.length === 0
                      ? "No approved registrations for this event."
                      : "No roster matches — clear search."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </TerminalPanel>
    </div>
  );
}
