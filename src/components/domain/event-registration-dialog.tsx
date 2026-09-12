"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Select } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";
import { mintQrCode } from "@/lib/forms/helpers";
import { genUuid } from "@/lib/uuid";
import type { EventItem, EventRegistration } from "@/types";
import {
  Calendar,
  CheckCircle2,
  GraduationCap,
  MapPin,
  QrCode,
  ShieldCheck,
  User,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";

interface EventRegistrationDialogProps {
  open: boolean;
  onClose: () => void;
  event: EventItem | null;
  onSuccess?: () => void;
}

export function EventRegistrationDialog({
  open,
  onClose,
  event,
  onSuccess,
}: EventRegistrationDialogProps) {
  const { store, registerForEvent } = useStore();
  const { session, profile } = useCurrentUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredReg, setRegisteredReg] = useState<EventRegistration | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string>("");

  const eventChapter = useMemo(() => {
    if (!event) return null;
    return store.chapters.find((c) => c.id === event.chapterId) ?? null;
  }, [event, store.chapters]);

  const userChapter = useMemo(() => {
    if (!profile?.chapterId) return null;
    return store.chapters.find((c) => c.id === profile.chapterId) ?? null;
  }, [profile?.chapterId, store.chapters]);

  // Existing registration check
  const existingReg = useMemo(() => {
    if (!event || !session.userId) return null;
    return (
      store.registrations.find(
        (r) =>
          r.eventId === event.id &&
          r.userId === session.userId &&
          r.status !== "rejected",
      ) ?? null
    );
  }, [event, session.userId, store.registrations]);

  // Find user's cohort & auto-select rep
  const { autoRep, availableReps } = useMemo(() => {
    if (!event) return { autoRep: null, availableReps: [] };
    const targetChapterId = profile?.chapterId || event.chapterId;

    // 1. Find matching cohort
    const cohort = (store.classCohorts ?? []).find(
      (c) =>
        c.chapterId === targetChapterId &&
        c.department.trim().toUpperCase() ===
          (profile?.department ?? "").trim().toUpperCase() &&
        c.year.trim().toLowerCase() ===
          (profile?.year ?? "").trim().toLowerCase() &&
        (!profile?.section ||
          c.section.trim().toUpperCase() === profile.section.trim().toUpperCase()),
    );

    let defaultRep: (typeof store.profiles)[0] | null = null;
    if (cohort?.repIds?.length) {
      defaultRep = store.profiles.find((p) => cohort.repIds.includes(p.id)) ?? null;
    }

    // 2. All available class reps in chapter
    const repRoles = (store.userRoles ?? []).filter(
      (ur) =>
        ur.chapterId === targetChapterId &&
        (ur.roleKey === "class_representative" || ur.roleId === "role-class-rep"),
    );
    const repUserIds = new Set(repRoles.map((ur) => ur.userId));
    if (cohort?.repIds) {
      cohort.repIds.forEach((id) => repUserIds.add(id));
    }

    const reps = store.profiles.filter((p) => repUserIds.has(p.id));
    return {
      autoRep: defaultRep || reps[0] || null,
      availableReps: reps,
    };
  }, [
    event,
    profile?.chapterId,
    profile?.department,
    profile?.year,
    profile?.section,
    store.classCohorts,
    store.profiles,
    store.userRoles,
  ]);

  const effectiveRepId = selectedRepId || autoRep?.id || "";

  async function handleConfirm() {
    if (!event || !profile) return;
    setLoading(true);
    setError("");

    try {
      const regId = genUuid();
      const qrCode = mintQrCode(event.id, profile.id);

      const registration: EventRegistration = {
        id: regId,
        eventId: event.id,
        userId: profile.id,
        status: "pending",
        representativeId: effectiveRepId || undefined,
        answers: {
          name: profile.fullName,
          email: profile.email,
          phone: profile.phone || "",
          department: profile.department || "",
          year: profile.year || "",
          section: profile.section || "",
          elevatesId: profile.elevatesId || "",
          chapterId: profile.chapterId || event.chapterId,
          registeredAutomatically: true,
          registeredAt: new Date().toISOString(),
        },
        qrCode,
        createdAt: new Date().toISOString(),
      };

      const res = registerForEvent(registration);
      if (!res.ok) {
        setError(res.message);
        setLoading(false);
        return;
      }

      const finalStatus = res.status || "approved";
      const finalReg: EventRegistration = {
        ...registration,
        status: finalStatus,
        qrCode: finalStatus === "approved" ? qrCode : "",
      };

      setRegisteredReg(finalReg);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleModalClose() {
    setError("");
    setRegisteredReg(null);
    setSelectedRepId("");
    onClose();
  }

  if (!event) return null;

  const activeReg = registeredReg || existingReg;

  return (
    <Dialog
      open={open}
      onClose={handleModalClose}
      title={activeReg ? "Event Registration" : "Confirm Event Registration"}
      description={
        activeReg
          ? "You are registered for this event."
          : "Your verified student details in Elevates OS will be automatically submitted."
      }
      className="max-w-lg"
    >
      <div className="space-y-4 pt-1">
        {/* EVENT SUMMARY CARD */}
        <div className="rounded-[14px] border border-border/80 bg-bg p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] font-mono">
                {event.category || "Event"}
              </span>
              <h3 className="mt-0.5 text-base font-bold text-text">
                {event.title}
              </h3>
              <p className="mt-1 text-[12px] text-text-dim flex items-center gap-1.5">
                <Calendar size={13} className="text-text-mute shrink-0" />
                <span>{formatDateTime(event.startsAt)}</span>
              </p>
              <p className="mt-1 text-[12px] text-text-dim flex items-center gap-1.5">
                <MapPin size={13} className="text-text-mute shrink-0" />
                <span>
                  {event.venue}
                  {eventChapter ? ` · ${eventChapter.name}` : ""}
                </span>
              </p>
            </div>
            <Badge tone="cyan">
              {event.status === "registration_open" ? "Open" : event.status}
            </Badge>
          </div>
        </div>

        {/* ALREADY REGISTERED VIEW */}
        {activeReg ? (
          <div className="space-y-4">
            <div
              className={`rounded-[14px] border p-4 text-center ${
                activeReg.status === "waitlisted"
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                  : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <div
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full mb-2 ${
                  activeReg.status === "waitlisted"
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {activeReg.status === "waitlisted" ? (
                  <Clock size={22} />
                ) : (
                  <CheckCircle2 size={22} />
                )}
              </div>
              <p className="text-sm font-bold">
                {activeReg.status === "waitlisted"
                  ? "Placed on Waiting List"
                  : "Seat Confirmed!"}
              </p>
              <p className="mt-0.5 text-[12px] text-text-dim">
                Status:{" "}
                <span className="font-semibold capitalize text-text">
                  {activeReg.status}
                </span>
                {activeReg.status === "waitlisted"
                  ? " — Event seats are full. The Campus Lead will review and approve seats if spots open."
                  : " — Your registration is approved and your check-in QR code is ready below."}
              </p>
            </div>

            {activeReg.qrCode ? (
              <div className="rounded-[14px] border border-border bg-bg p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-mute font-mono">
                  Your Check-In QR
                </p>
                <div className="mx-auto mt-3 w-fit rounded-2xl border-2 border-border/80 bg-white p-4 sm:p-5 shadow-md">
                  <QRCode
                    value={activeReg.qrCode}
                    size={190}
                    level="M"
                    style={{ height: "auto", maxWidth: "100%", width: 190 }}
                  />
                </div>
                <p className="mt-3 font-mono text-[12px] font-bold text-text tracking-wider">
                  {activeReg.qrCode}
                </p>
                <p className="mt-1 text-[11px] text-text-dim">
                  Show this QR code at the door for instant check-in.
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              variant="primary"
              className="w-full justify-center h-10"
              onClick={handleModalClose}
            >
              Done
            </Button>
          </div>
        ) : (
          /* REGISTRATION CONFIRMATION FORM */
          <div className="space-y-4">
            {/* AUTO-FETCHED VERIFIED PROFILE CARD */}
            <div className="rounded-[14px] border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[var(--accent)]" />
                  <span className="text-[12px] font-semibold text-text">
                    Verified Student Details
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-mono font-medium">
                  <Sparkles size={12} />
                  Auto-populated
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                <div>
                  <span className="text-text-mute text-[10px] block uppercase">Student Name</span>
                  <span className="font-semibold text-text">
                    {profile?.fullName ?? "Student Member"}
                  </span>
                </div>
                <div>
                  <span className="text-text-mute text-[10px] block uppercase">Elevates ID</span>
                  <span className="font-mono font-semibold text-[var(--accent)]">
                    {profile?.elevatesId || "ELV-STUDENT"}
                  </span>
                </div>
                <div>
                  <span className="text-text-mute text-[10px] block uppercase">Email</span>
                  <span className="text-text truncate block">{profile?.email || "—"}</span>
                </div>
                <div>
                  <span className="text-text-mute text-[10px] block uppercase">Phone</span>
                  <span className="text-text">{profile?.phone || "Not set in profile"}</span>
                </div>
                <div>
                  <span className="text-text-mute text-[10px] block uppercase">Academic Class</span>
                  <span className="text-text">
                    {[profile?.department, profile?.year, profile?.section ? `Sec ${profile.section}` : null]
                      .filter(Boolean)
                      .join(" · ") || "General Student"}
                  </span>
                </div>
                <div>
                  <span className="text-text-mute text-[10px] block uppercase">Campus Chapter</span>
                  <span className="text-text truncate block">
                    {userChapter?.name || eventChapter?.name || "Campus Chapter"}
                  </span>
                </div>
              </div>
            </div>

            {/* CLASS REP ASSIGNMENT */}
            {availableReps.length > 1 ? (
              <div>
                <FieldLabel>Class Representative (for approval review)</FieldLabel>
                <Select
                  value={effectiveRepId}
                  onChange={(e) => setSelectedRepId(e.target.value)}
                  className="w-full text-xs"
                >
                  {availableReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.fullName} {rep.department ? `(${rep.department})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            ) : autoRep ? (
              <div className="flex items-center justify-between rounded-[10px] border border-border/60 bg-bg p-2.5 text-[12px]">
                <div className="flex items-center gap-2">
                  <GraduationCap size={15} className="text-cyan shrink-0" />
                  <span className="text-text-dim">Assigned Class Rep:</span>
                  <span className="font-semibold text-text">{autoRep.fullName}</span>
                </div>
                <Badge tone="cyan">Assigned</Badge>
              </div>
            ) : null}

            {/* ERROR MESSAGE */}
            {error && (
              <div className="rounded-[10px] border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-400 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={handleModalClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="orange"
                className="h-10 px-5 font-semibold text-sm"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "Registering..." : "Confirm & Register"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
