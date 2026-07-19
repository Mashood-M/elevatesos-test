"use client";

import { use, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { useStore, useCurrentUser } from "@/context/store-context";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

export default function ChapterAttendancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, checkIn, updateAttendance, issueCertificate } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const [selectedEvent, setSelectedEvent] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [method, setMethod] = useState<
    "qr" | "manual" | "bulk" | "representative"
  >("qr");
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [message, setMessage] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [selectedRegs, setSelectedRegs] = useState<string[]>([]);

  const canVerify = hasPermission(
    store,
    session.roleKey,
    "attendance.verify",
  );

  const events = useMemo(() => {
    if (!chapter) return [];
    const chapterEvents = store.events.filter((e) => e.chapterId === chapter.id);
    const preferred = chapterEvents.filter((e) =>
      ["registration_open", "registration_closed", "completed", "approved"].includes(
        e.status,
      ),
    );
    return preferred.length ? preferred : chapterEvents;
  }, [store.events, chapter]);

  const eventId = selectedEvent || events[0]?.id || "";

  const approvedRegs = store.registrations.filter(
    (r) => r.eventId === eventId && r.status === "approved",
  );

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

  if (!chapter) {
    return <p className="text-[var(--accent)]">Chapter not found</p>;
  }

  if (!canVerify) {
    return (
      <div>
        <PageHeader
          title="Attendance"
          description="You need attendance.verify permission to operate check-in."
        />
        <p className="text-[13px] text-text-dim">
          Switch to Class Rep, Secretary, or Coordinator.
        </p>
      </div>
    );
  }

  function runCheckIn(registrationId: string, m = method) {
    const result = checkIn(
      registrationId,
      status,
      m,
      session.userId,
      eventId,
    );
    if (!result.ok) {
      setMessage(result.message);
      return false;
    }
    setMessage(`Checked in · ${status} · via ${m}`);
    return true;
  }

  function handleQrScan() {
    const code = qrInput.trim();
    if (!code) return;
    const reg = store.registrations.find(
      (r) =>
        r.qrCode === code &&
        r.eventId === eventId &&
        r.status === "approved",
    );
    if (!reg) {
      setMessage(
        "QR not found for this event (must be approved for the selected event).",
      );
      return;
    }
    const existing = store.attendance.find((a) => a.registrationId === reg.id);
    if (existing) {
      const result = updateAttendance(reg.id, status, session.userId);
      setMessage(
        result.ok
          ? `Updated status to ${status}`
          : result.message,
      );
    } else {
      runCheckIn(reg.id, "qr");
    }
    setQrInput("");
  }

  function handleBulk() {
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
    setMessage(`Bulk done · ${ok} checked in · ${fail} skipped`);
  }

  function handleRepresentative() {
    let ok = 0;
    for (const id of selectedRegs) {
      if (runCheckIn(id, "representative")) ok += 1;
    }
    setMessage(`Representative check-in · ${ok} students`);
    setSelectedRegs([]);
  }

  const demoCodes = approvedRegs
    .filter((r) => r.qrCode)
    .slice(0, 3)
    .map((r) => r.qrCode);

  return (
    <div>
      <PageHeader
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

      <TerminalPanel title="Desk config">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <FieldLabel>Event</FieldLabel>
            <Select
              value={eventId}
              onChange={(e) => {
                setSelectedEvent(e.target.value);
                setMessage("");
                setSelectedRegs([]);
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
              <option value="manual">Manual</option>
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
        {message ? (
          <p className="mt-3 text-[13px] text-[var(--accent)]">{message}</p>
        ) : null}
      </TerminalPanel>

      {(method === "qr" || method === "manual") && (
        <TerminalPanel title="QR / code" className="mt-4">
          <FieldLabel>Scan or paste QR</FieldLabel>
          <div className="flex gap-2">
            <Input
              placeholder="QR-EV2-…"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQrScan()}
            />
            <Button variant="orange" onClick={handleQrScan}>
              Check in
            </Button>
          </div>
          {demoCodes.length > 0 ? (
            <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
              Demo codes for this event: {demoCodes.join(" · ")}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-text-mute">
              No approved QR codes yet — approve registrations first.
            </p>
          )}
        </TerminalPanel>
      )}

      {method === "bulk" ? (
        <TerminalPanel title="Bulk paste" className="mt-4">
          <FieldLabel>One QR code or email per line</FieldLabel>
          <TextArea
            rows={5}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"QR-EV2-ANANYA-A2\nananya@…"}
          />
          <Button variant="orange" className="mt-3" onClick={handleBulk}>
            Process bulk
          </Button>
        </TerminalPanel>
      ) : null}

      {method === "representative" ? (
        <TerminalPanel title="Representative multi-select" className="mt-4">
          <p className="mb-3 text-[12px] text-text-dim">
            Select approved students, then check them in together.
          </p>
          <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto">
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
                      disabled={Boolean(att)}
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
                    {att ? (
                      <Badge tone="mute">{att.status}</Badge>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
          <Button
            variant="orange"
            disabled={selectedRegs.length === 0}
            onClick={handleRepresentative}
          >
            Check in selected ({selectedRegs.length})
          </Button>
        </TerminalPanel>
      ) : null}

      <TerminalPanel
        title="Roster"
        meta={`${approvedRegs.length} approved`}
        className="mt-4"
      >
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
              {approvedRegs.map((reg) => {
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
                    <td className="py-3 font-medium">{user?.fullName}</td>
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
                              setMessage(
                                result.ok
                                  ? `Updated ${user?.fullName}`
                                  : result.message,
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
                              onClick={() => runCheckIn(reg.id, "manual")}
                            >
                              Check in
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-8"
                              onClick={() => {
                                const result = checkIn(
                                  reg.id,
                                  "absent",
                                  "manual",
                                  session.userId,
                                  eventId,
                                );
                                setMessage(
                                  result.ok
                                    ? "Marked absent"
                                    : result.message,
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
                              setMessage(
                                result.ok
                                  ? "Certificate issued"
                                  : result.message,
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
              {approvedRegs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-text-dim">
                    No approved registrations for this event.
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
