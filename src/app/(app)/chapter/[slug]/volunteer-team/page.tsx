"use client";

import { use, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { cn, formatDate, initials } from "@/lib/utils";
import {
  ArrowLeftRight,
  Calendar,
  Check,
  Plus,
  QrCode,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
  AlertCircle,
} from "lucide-react";
import type { LeadershipStatus, Profile, VolunteerGroup } from "@/types";

type ReplacingVolunteerState = {
  userId: string;
  studentName: string;
  teamId: string;
};

export default function ChapterVolunteerTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const {
    store,
    addLeadershipAssignment,
    removeLeadershipAssignment,
    createLeadershipTerm,
    createVolunteerGroup,
    updateVolunteerGroup,
    deleteVolunteerGroup,
    addVolunteerToGroup,
    removeVolunteerFromGroup,
    updateEvent,
  } = useStore();
  const { session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const canManage =
    isHqRole(session.roleKey) ||
    session.roleKey === "campus_lead" ||
    session.roleKey === "chairman" ||
    hasPermission(store, session.roleKey, "leadership.manage");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [flash, setFlash] = useState("");

  // Top Bar: Event Selection for Assignment
  const [selectedEventIdForAssign, setSelectedEventIdForAssign] = useState<string>("");

  // Active Team Tab in Left Card (e.g. Team 1, Team 2, Team 3...)
  const [activeTeamId, setActiveTeamId] = useState<string>("");

  // Replace Volunteer Modal State
  const [replacingVolunteer, setReplacingVolunteer] = useState<ReplacingVolunteerState | null>(null);
  const [replacementStudentId, setReplacementStudentId] = useState<string>("");

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2800);
  }

  // Active term for chapter
  const terms = useMemo(() => {
    if (!chapter) return [];
    const rank = (s: LeadershipStatus) =>
      s === "active" ? 0 : s === "upcoming" ? 1 : 2;
    return store.leadershipTerms
      .filter((t) => t.chapterId === chapter.id)
      .slice()
      .sort((a, b) => {
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return b.startDate.localeCompare(a.startDate);
      });
  }, [store.leadershipTerms, chapter]);

  const activeTerm = terms.find((t) => t.status === "active") ?? terms[0];

  function ensureActiveTermId(): string {
    if (!chapter) return "term-default";
    if (activeTerm?.id) return activeTerm.id;
    const existing = store.leadershipTerms.find((t) => t.chapterId === chapter.id);
    if (existing?.id) return existing.id;
    const created = createLeadershipTerm({
      chapterId: chapter.id,
      academicYear: "2025-26",
      title: "Permanent Volunteer Team",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      status: "active",
      handoverNotes: "Auto-initialized chapter volunteer team",
    });
    return created?.id ?? "term-default";
  }

  // Chapter Events (sorted latest-first)
  const chapterEvents = useMemo(() => {
    if (!chapter) return [];
    return store.events
      .filter((e) => e.chapterId === chapter.id)
      .slice()
      .sort((a, b) => new Date(b.startsAt || b.publishedAt || 0).getTime() - new Date(a.startsAt || a.publishedAt || 0).getTime());
  }, [store.events, chapter]);

  // Chapter Volunteer Teams / Groups (Tabs: Team 1, Team 2, ...)
  // Strictly filter to numbered teams (Team 1, Team 2...) created by the campus lead via the [+] button
  const chapterTeams = useMemo(() => {
    if (!chapter) return [];
    return (store.volunteerGroups || [])
      .filter(
        (g) =>
          g.chapterId === chapter.id &&
          g.groupType === "listed" &&
          /^Team\s+\d+$/i.test(g.name.trim()),
      )
      .slice()
      .sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.name.replace(/\D/g, ""), 10) || 0;
        if (numA !== numB) return numA - numB;
        return (a.createdAt || "").localeCompare(b.createdAt || "");
      });
  }, [store.volunteerGroups, chapter]);

  // Keep activeTeamId synchronized with available numbered teams
  useEffect(() => {
    if (chapterTeams.length > 0) {
      if (!activeTeamId || !chapterTeams.some((t) => t.id === activeTeamId)) {
        setActiveTeamId(chapterTeams[0].id);
        setSelectedEventIdForAssign(chapterTeams[0].eventId || "");
      }
    } else {
      setActiveTeamId("");
      setSelectedEventIdForAssign("");
    }
  }, [chapterTeams, activeTeamId]);

  // Currently Selected / Active Team
  const activeTeam: VolunteerGroup | null = useMemo(() => {
    if (chapterTeams.length === 0) return null;
    return chapterTeams.find((t) => t.id === activeTeamId) ?? chapterTeams[0];
  }, [chapterTeams, activeTeamId]);

  // Event assigned to active team
  const activeTeamAssignedEvent = useMemo(() => {
    if (!activeTeam?.eventId) return null;
    return chapterEvents.find((e) => e.id === activeTeam.eventId) ?? null;
  }, [activeTeam, chapterEvents]);

  // When active team changes, sync top event selector
  useEffect(() => {
    if (activeTeam) {
      setSelectedEventIdForAssign(activeTeam.eventId || "");
    }
  }, [activeTeam?.id, activeTeam?.eventId]);

  // Active Team Member IDs
  const activeTeamMemberIds = useMemo(() => {
    return new Set(activeTeam?.memberIds || []);
  }, [activeTeam]);

  // Mapping: studentId -> which event & team they are assigned to
  // Rule: One student or team cannot manage two events at the same time
  const studentEventMap = useMemo(() => {
    const map = new Map<string, { eventId: string; eventTitle: string; teamId: string; teamName: string }>();

    for (const t of chapterTeams) {
      if (t.eventId && t.memberIds) {
        const ev = chapterEvents.find((e) => e.id === t.eventId);
        if (ev) {
          for (const uId of t.memberIds) {
            if (!map.has(uId)) {
              map.set(uId, { eventId: ev.id, eventTitle: ev.title, teamId: t.id, teamName: t.name });
            }
          }
        }
      }
    }

    return map;
  }, [chapterTeams, chapterEvents]);

  // Eligible students from the chapter
  const chapterStudents = useMemo(() => {
    if (!chapter) return [];
    return store.profiles
      .filter(
        (p) =>
          p.chapterId === chapter.id &&
          (p.status ?? "active") !== "disabled" &&
          p.id !== chapter.campusLeadId &&
          p.id !== chapter.facultyId,
      )
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [store.profiles, chapter]);

  // Students available for replacement in active team
  const availableStudentsForReplacement = useMemo(() => {
    return chapterStudents.filter((s) => {
      if (activeTeamMemberIds.has(s.id)) return false;
      const conflict = studentEventMap.get(s.id);
      if (conflict && activeTeam?.eventId && conflict.eventId !== activeTeam.eventId) {
        return false; // Busy with another event
      }
      return true;
    });
  }, [chapterStudents, activeTeamMemberIds, studentEventMap, activeTeam?.eventId]);

  // Filtered students for search
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return chapterStudents.filter((s) => {
      return (
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.elevatesId && s.elevatesId.toLowerCase().includes(q))
      );
    });
  }, [chapterStudents, searchQuery]);

  // Instant Add New Team (Team 1, Team 2, Team 3...) - NO POPUP, 1-CLICK CREATION
  function handleQuickAddTeam() {
    if (!chapter) return;
    const existingNums = chapterTeams.map((t) => {
      const m = t.name.match(/\d+/);
      return m ? parseInt(m[0], 10) : 0;
    });
    let nextNumber = 1;
    while (existingNums.includes(nextNumber)) {
      nextNumber++;
    }
    const teamName = `Team ${nextNumber}`;
    const created = createVolunteerGroup({
      chapterId: chapter.id,
      name: teamName,
      groupType: "listed",
      isPreset: true,
      memberIds: [],
    });

    if (created?.id) {
      setActiveTeamId(created.id);
      setSelectedEventIdForAssign("");
      flashMsg(`✓ Created ${teamName}!`);
    }
  }

  // Assign Active Team to Selected Event
  function handleAssignActiveTeamToEvent() {
    if (!activeTeam || !chapter) return;
    if (!selectedEventIdForAssign) {
      flashMsg(`Please select an event from the dropdown to assign ${activeTeam.name}.`);
      return;
    }

    const targetEventId = selectedEventIdForAssign;
    const oldEventId = activeTeam.eventId;

    // Rule: One team can only be assigned to one event at a time
    const conflictingTeam = chapterTeams.find(
      (t) => t.id !== activeTeam.id && t.eventId === targetEventId,
    );
    if (conflictingTeam) {
      const evTitle = chapterEvents.find((e) => e.id === targetEventId)?.title || "event";
      if (
        !confirm(
          `"${evTitle}" is currently assigned to "${conflictingTeam.name}". Do you want to switch it to "${activeTeam.name}"?`,
        )
      ) {
        return;
      }
      updateVolunteerGroup(conflictingTeam.id, { eventId: undefined });
    }

    // If changing event, unbind members from old event
    if (oldEventId && oldEventId !== targetEventId) {
      const oldEv = chapterEvents.find((e) => e.id === oldEventId);
      if (oldEv && oldEv.volunteerStudentIds) {
        const filtered = oldEv.volunteerStudentIds.filter((id) => !activeTeam.memberIds.includes(id));
        updateEvent(oldEv.id, { volunteerStudentIds: filtered });
      }
    }

    updateVolunteerGroup(activeTeam.id, { eventId: targetEventId });

    // Sync team members to target event.volunteerStudentIds
    if (activeTeam.memberIds.length > 0) {
      const targetEv = chapterEvents.find((e) => e.id === targetEventId);
      if (targetEv) {
        const merged = Array.from(new Set([...(targetEv.volunteerStudentIds || []), ...activeTeam.memberIds]));
        updateEvent(targetEv.id, { volunteerStudentIds: merged });
      }
    }

    const assignedEv = chapterEvents.find((e) => e.id === targetEventId);
    flashMsg(`✓ Assigned ${activeTeam.name} to "${assignedEv?.title || "event"}"!`);
  }

  // Clear Event from Active Team (Reset for future events while keeping volunteer directory intact)
  function handleClearActiveTeamEvent() {
    if (!activeTeam || !chapter) return;
    const oldEventId = activeTeam.eventId;
    if (oldEventId) {
      const oldEv = chapterEvents.find((e) => e.id === oldEventId);
      if (oldEv && oldEv.volunteerStudentIds) {
        const filtered = oldEv.volunteerStudentIds.filter((id) => !activeTeam.memberIds.includes(id));
        updateEvent(oldEv.id, { volunteerStudentIds: filtered });
      }
    }
    updateVolunteerGroup(activeTeam.id, { eventId: undefined });
    setSelectedEventIdForAssign("");
    flashMsg(`✓ Cleared event assignment from ${activeTeam.name}!`);
  }

  // Add Student to Active Team
  function handleAddStudentToActiveTeam(student: Profile) {
    if (!activeTeam || !chapter) return;

    // Conflict check: student cannot manage two events at a time
    if (activeTeam.eventId) {
      const conflict = studentEventMap.get(student.id);
      if (conflict && conflict.eventId !== activeTeam.eventId) {
        flashMsg(`⚠️ ${student.fullName} is already assigned to "${conflict.eventTitle}" in ${conflict.teamName}. A student cannot manage two events at the same time.`);
        return;
      }
    }

    if (activeTeamMemberIds.has(student.id)) return;

    addVolunteerToGroup(activeTeam.id, student.id);

    // If active team is already assigned to an event, sync event.volunteerStudentIds immediately
    if (activeTeam.eventId) {
      const ev = chapterEvents.find((e) => e.id === activeTeam.eventId);
      if (ev) {
        const merged = Array.from(new Set([...(ev.volunteerStudentIds || []), student.id]));
        updateEvent(ev.id, { volunteerStudentIds: merged });
      }
    }

    flashMsg(
      activeTeamAssignedEvent
        ? `✓ Added ${student.fullName} to ${activeTeam.name} (${activeTeamAssignedEvent.title})!`
        : `✓ Added ${student.fullName} to ${activeTeam.name}!`,
    );
  }

  // Remove Student from Active Team
  function handleRemoveStudentFromActiveTeam(userId: string, studentName: string) {
    if (!activeTeam || !chapter) return;
    removeVolunteerFromGroup(activeTeam.id, userId);

    // Also update event.volunteerStudentIds if team has an assigned event
    if (activeTeam.eventId) {
      const ev = chapterEvents.find((e) => e.id === activeTeam.eventId);
      if (ev && ev.volunteerStudentIds?.includes(userId)) {
        updateEvent(ev.id, {
          volunteerStudentIds: ev.volunteerStudentIds.filter((id) => id !== userId),
        });
      }
    }

    flashMsg(`Removed ${studentName} from ${activeTeam.name}`);
  }

  // Replace Volunteer in Active Team
  function handleConfirmReplace() {
    if (!replacingVolunteer || !replacementStudentId || !activeTeam) return;
    const newStudent = store.profiles.find((p) => p.id === replacementStudentId);
    if (!newStudent) return;

    // Remove old student
    handleRemoveStudentFromActiveTeam(replacingVolunteer.userId, replacingVolunteer.studentName);

    // Add new student
    handleAddStudentToActiveTeam(newStudent);

    flashMsg(`✓ Replaced ${replacingVolunteer.studentName} with ${newStudent.fullName}!`);
    setReplacingVolunteer(null);
    setReplacementStudentId("");
  }

  // Batch Appoint Selected Students to Active Team
  function handleBatchAppoint() {
    if (selectedStudentIds.length === 0 || !activeTeam) return;
    let count = 0;
    for (const sId of selectedStudentIds) {
      if (!activeTeamMemberIds.has(sId)) {
        const student = store.profiles.find((p) => p.id === sId);
        if (student) {
          // Check conflict
          if (activeTeam.eventId) {
            const conflict = studentEventMap.get(sId);
            if (conflict && conflict.eventId !== activeTeam.eventId) {
              continue; // Skip conflicted students
            }
          }
          handleAddStudentToActiveTeam(student);
          count++;
        }
      }
    }
    setSelectedStudentIds([]);
    flashMsg(`✓ Added ${count} student(s) to ${activeTeam.name}!`);
  }

  // Delete Team
  function handleDeleteTeam(teamId: string, teamName: string) {
    if (!confirm(`Are you sure you want to delete ${teamName}?`)) return;
    const teamToDelete = chapterTeams.find((t) => t.id === teamId);
    if (teamToDelete?.eventId && teamToDelete.memberIds?.length) {
      const ev = chapterEvents.find((e) => e.id === teamToDelete.eventId);
      if (ev && ev.volunteerStudentIds) {
        const filtered = ev.volunteerStudentIds.filter((id) => !teamToDelete.memberIds.includes(id));
        updateEvent(ev.id, { volunteerStudentIds: filtered });
      }
    }
    deleteVolunteerGroup(teamId);
    const remaining = chapterTeams.filter((t) => t.id !== teamId);
    if (remaining.length > 0) {
      setActiveTeamId(remaining[0].id);
      setSelectedEventIdForAssign(remaining[0].eventId || "");
    } else {
      setActiveTeamId("");
      setSelectedEventIdForAssign("");
    }
    flashMsg(`Deleted ${teamName}`);
  }

  if (!chapter) {
    return (
      <div className="p-8 text-center text-text-dim">
        Chapter not found.
      </div>
    );
  }

  if (session.roleKey === "class_representative") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={chapterEyebrow(session.roleKey, "programs")}
          title="Volunteer Team"
        />
        <TerminalPanel title="access.restricted" accent="orange">
          <p className="text-sm text-text-dim">
            Class Representatives do not have permission to manage the chapter volunteer team.
          </p>
          <Link
            href={`/chapter/${slug}`}
            className="mt-3 inline-block text-[var(--accent)] font-semibold text-xs"
          >
            ← Back to chapter
          </Link>
        </TerminalPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "programs")}
        title="Volunteer Squads & Teams"
        description="Organize reusable volunteer squads, designate event check-in crews, and configure attendance permissions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {flash ? (
              <span className="self-center text-xs font-semibold text-[var(--accent)] animate-pulse">
                {flash}
              </span>
            ) : null}
            <Link href={`/chapter/${slug}/attendance`}>
              <Button variant="orange" className="flex items-center gap-1.5 font-bold shadow-sm text-xs sm:text-sm">
                <QrCode size={14} />
                Attendance Desk
              </Button>
            </Link>
          </div>
        }
      />

      {/* 4-Stat Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Active Volunteers"
          value={new Set(chapterTeams.flatMap((t) => t.memberIds)).size}
          hint="Appointed in squads"
          accent="orange"
        />
        <Stat
          label="Volunteer Teams"
          value={chapterTeams.length}
          hint="Operational crews"
        />
        <Stat
          label="Assigned Events"
          value={chapterTeams.filter((t) => t.eventId).length}
          hint="Active deployments"
        />
        <Stat
          label="Available Students"
          value={availableStudentsForReplacement.length}
          hint="Ready for appointment"
        />
      </div>

      {/* TOP SECTION: Event Selection & Team Assignment Bar */}
      <div className="rounded-[var(--radius)] border border-border/80 bg-bg-panel p-4 sm:p-5 shadow-[var(--shadow-sm)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] shrink-0">
            <Calendar size={15} />
          </div>
          <span className="text-xs font-bold text-text shrink-0">Deploy Squad to Event:</span>

          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedEventIdForAssign}
              onChange={(e) => setSelectedEventIdForAssign(e.target.value)}
              className="text-xs h-9 bg-bg min-w-[220px] max-w-xs font-medium rounded-[var(--radius-sm)] border-border/80"
            >
              <option value="">-- Select an Event --</option>
              {chapterEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} {ev.status ? `· [${ev.status.replace("_", " ")}]` : ""}
                </option>
              ))}
            </Select>

            {canManage && activeTeam && (
              <Button
                variant="orange"
                className="h-9 px-3.5 text-xs flex items-center gap-1.5 font-bold shadow-xs shrink-0"
                onClick={handleAssignActiveTeamToEvent}
                disabled={!selectedEventIdForAssign}
                title={`Assign ${activeTeam.name} to selected event`}
              >
                <Calendar size={13} />
                <span>Assign {activeTeam.name}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Right: current assignment status + clear */}
        <div className="text-xs text-text-dim shrink-0">
          {activeTeamAssignedEvent && activeTeam ? (
            <div className="flex items-center gap-2">
              <span className="bg-bg px-2.5 py-1 rounded-[var(--radius-sm)] border border-border/70">
                <strong className="text-text">{activeTeam.name}</strong> &rarr;{" "}
                <strong className="text-[var(--accent)]">{activeTeamAssignedEvent.title}</strong>
              </span>
              {canManage && (
                <button
                  type="button"
                  onClick={handleClearActiveTeamEvent}
                  className="text-xs font-semibold text-red-500 hover:underline cursor-pointer transition"
                  title="Clear event assignment while keeping team volunteers intact"
                >
                  Clear Event
                </button>
              )}
            </div>
          ) : (
            <span className="text-text-mute text-xs">
              {activeTeam ? `${activeTeam.name} is not assigned to an event` : "No team selected"}
            </span>
          )}
        </div>
      </div>

      {/* Main Split Interface: Appointed Members (Left) vs Student Directory (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Volunteer Team with Tabs (Team 1, Team 2... and [+] button) */}
        <div className="lg:col-span-7 space-y-4">
          <TerminalPanel
            title="Volunteer Team"
            meta={activeTeam ? `${activeTeamMemberIds.size} Appointed in ${activeTeam.name}` : "0 Appointed"}
            accent="green"
            action={
              activeTeam ? (
                <div className="flex items-center gap-2">
                  <Badge tone="green" className="font-bold text-[11px] px-2.5 py-0.5">
                    {activeTeamMemberIds.size} Active Volunteers
                  </Badge>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTeam(activeTeam.id, activeTeam.name)}
                      className="text-text-dim hover:text-red-500 p-1 text-xs transition"
                      title={`Delete ${activeTeam.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ) : null
            }
          >
            {chapterTeams.length === 0 ? (
              /* When NO teams have been created yet */
              <div className="rounded-[12px] border border-dashed border-border/90 bg-bg p-8 text-center space-y-3.5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Users size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text">No Teams Created Yet</h4>
                  <p className="text-xs text-text-dim max-w-sm mx-auto mt-1">
                    Click the button below to create <strong>Team 1</strong>. You can then appoint students and assign Team 1 to an event.
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="orange"
                    className="h-8 px-4 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                    onClick={handleQuickAddTeam}
                  >
                    <Plus size={14} strokeWidth={2.8} />
                    Add Team 1
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* TEAM TABS BAR WITH [+] BUTTON (UNDER VOLUNTEER TEAM LABEL) */}
                <div className="mb-4 pb-3 border-b border-border">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                    {chapterTeams.map((team, idx) => {
                      const isSelected = team.id === activeTeam?.id;
                      const teamEvent = team.eventId ? chapterEvents.find((e) => e.id === team.eventId) : null;
                      const displayName = team.name || `Team ${idx + 1}`;

                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => {
                            setActiveTeamId(team.id);
                            setSelectedEventIdForAssign(team.eventId || "");
                          }}
                          className={cn(
                            "group flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                            isSelected
                              ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm font-bold"
                              : "bg-bg text-text-dim border-border hover:text-text hover:border-text-dim/50 hover:bg-bg-panel",
                          )}
                        >
                          <span>{displayName}</span>

                          {/* Cross button to delete team instead of count */}
                          {canManage && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTeam(team.id, displayName);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  handleDeleteTeam(team.id, displayName);
                                }
                              }}
                              className={cn(
                                "inline-flex items-center justify-center h-4 w-4 rounded-full transition-colors ml-0.5",
                                isSelected
                                  ? "text-white/80 hover:text-white hover:bg-black/25"
                                  : "text-text-dim hover:text-red-500 hover:bg-red-500/10",
                              )}
                              title={`Delete ${displayName}`}
                            >
                              <X size={11} strokeWidth={2.5} />
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Instant + Button: Creates Team 2, Team 3... immediately (Zero Form, Icon only) */}
                    {canManage && (
                      <button
                        type="button"
                        onClick={handleQuickAddTeam}
                        className="flex items-center justify-center h-8 w-8 rounded-[10px] bg-bg border border-dashed border-border hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 text-text-dim transition shrink-0 shadow-sm"
                        title={`Add Team ${chapterTeams.length + 1}`}
                      >
                        <Plus size={15} strokeWidth={2.8} />
                      </button>
                    )}
                  </div>
                </div>

                {/* SUBHEADER: Appointed Members in Active Team */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-text flex items-center gap-1.5">
                    Appointed Members
                    <span className="text-text-dim font-normal">
                      in <strong className="text-text">{activeTeam?.name || "this team"}</strong>
                    </span>
                  </span>
                  {activeTeamAssignedEvent && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-text-dim">Assigned to:</span>
                      <span className="font-bold text-[var(--accent)]">{activeTeamAssignedEvent.title}</span>
                    </div>
                  )}
                </div>

                {/* Members directory of Active Team */}
                {activeTeamMemberIds.size === 0 ? (
                  <div className="rounded-[12px] border border-dashed border-border/80 bg-bg/50 p-8 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                      <UserPlus size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-text">
                        No Volunteers in {activeTeam?.name || "this team"} Yet
                      </h4>
                      <p className="text-xs text-text-dim max-w-sm mx-auto mt-1">
                        Select students from the <strong>Student Directory</strong> on the right and click the orange <strong>+</strong> button to add them into <strong>{activeTeam?.name || "this team"}</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.from(activeTeamMemberIds).map((userId) => {
                      const student = store.profiles.find((p) => p.id === userId);
                      const studentMeta = [
                        student?.year ? `Yr ${student.year}` : null,
                        student?.section ? `Sec ${student.section}` : null,
                        student?.email || "Chapter Member",
                      ]
                        .filter(Boolean)
                        .join(" · ");

                      return (
                        <div
                          key={userId}
                          className="rounded-[12px] border border-border/80 bg-bg p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs shadow-sm">
                              {initials(student?.fullName ?? "Volunteer")}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/profile/${student?.elevatesId || userId}`}
                                  className="font-bold text-sm text-text hover:text-[var(--accent)] hover:underline truncate"
                                >
                                  {student?.fullName ?? "Unknown Student"}
                                </Link>
                                {student?.elevatesId && (
                                  <span className="font-mono text-[10px] bg-bg-panel border border-border px-1.5 py-0.2 rounded font-semibold text-text-dim shrink-0">
                                    {student.elevatesId}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-dim mt-0.5 truncate">
                                {studentMeta}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons: Replace & Remove */}
                          {canManage && (
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              <Button
                                variant="ghost"
                                className="h-7 px-2.5 text-[11px] border border-border/70 hover:bg-bg-panel text-text-dim hover:text-text font-medium"
                                onClick={() => {
                                  if (!activeTeam) return;
                                  setReplacingVolunteer({
                                    userId,
                                    studentName: student?.fullName ?? "Volunteer",
                                    teamId: activeTeam.id,
                                  });
                                  setReplacementStudentId(availableStudentsForReplacement[0]?.id || "");
                                }}
                                title={`Replace ${student?.fullName ?? "volunteer"}`}
                              >
                                <ArrowLeftRight size={11} className="mr-1 text-text-dim" />
                                <span>Replace</span>
                              </Button>

                              <Button
                                variant="ghost"
                                className="h-7 px-2 text-[11px] text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
                                onClick={() =>
                                  handleRemoveStudentFromActiveTeam(
                                    userId,
                                    student?.fullName ?? "Volunteer",
                                  )
                                }
                                title={`Remove ${student?.fullName ?? "volunteer"}`}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TerminalPanel>
        </div>

        {/* RIGHT PANEL: Student Directory */}
        <div className="lg:col-span-5 space-y-4">
          <TerminalPanel
            title="Student Directory"
            meta={`${filteredStudents.length} Students`}
          >
            {/* Search Input */}
            <div className="relative mb-3.5">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
              />
              <Input
                type="text"
                placeholder="Search students by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-bg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Batch Action Bar if students selected */}
            {canManage && selectedStudentIds.length > 0 && activeTeam && (
              <div className="mb-3.5 p-2.5 rounded-[10px] bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-text">
                  {selectedStudentIds.length} student(s) selected
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="orange"
                    className="h-7 px-2.5 text-[11px] font-bold"
                    onClick={handleBatchAppoint}
                  >
                    Add to {activeTeam.name}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="text-xs text-text-dim hover:text-text px-1"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Students List */}
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-dim rounded-[10px] border border-border bg-bg">
                No students found matching &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                {filteredStudents.map((student) => {
                  const isInActiveTeam = activeTeamMemberIds.has(student.id);
                  const isChecked = selectedStudentIds.includes(student.id);

                  // Conflict rule: student cannot manage two events at the same time
                  const conflict = studentEventMap.get(student.id);
                  const isConflictWithOtherEvent = Boolean(
                    conflict &&
                    activeTeam?.eventId &&
                    conflict.eventId !== activeTeam.eventId,
                  );

                  const metaLine = [
                    student.year ? `Yr ${student.year}` : null,
                    student.section ? `Sec ${student.section}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <div
                      key={student.id}
                      className={cn(
                        "flex items-center justify-between gap-3 p-2.5 rounded-[12px] border transition",
                        isInActiveTeam
                          ? "bg-emerald-500/[0.04] border-emerald-500/30"
                          : isConflictWithOtherEvent
                            ? "bg-amber-500/[0.04] border-amber-500/20 opacity-80"
                            : "bg-bg border-border hover:border-border/90",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {canManage && !isInActiveTeam && !isConflictWithOtherEvent ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds((prev) => [...prev, student.id]);
                              } else {
                                setSelectedStudentIds((prev) =>
                                  prev.filter((id) => id !== student.id),
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-border accent-[var(--accent)] shrink-0 cursor-pointer"
                          />
                        ) : (
                          <div className="w-4 shrink-0" />
                        )}

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-panel border border-border text-text font-bold text-xs">
                          {initials(student.fullName)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-text truncate">
                              {student.fullName}
                            </span>
                            {student.elevatesId && (
                              <span className="font-mono text-[9px] bg-bg-panel border border-border px-1 py-0.2 rounded text-text-dim shrink-0">
                                {student.elevatesId}
                              </span>
                            )}
                          </div>
                          {metaLine && (
                            <p className="text-[11px] text-text-dim truncate">
                              {metaLine}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Action: In Team Badge or Conflict or Orange Oval + Button */}
                      {canManage && (
                        <div className="shrink-0">
                          {isInActiveTeam ? (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                <Check size={11} strokeWidth={2.5} />
                                In Team
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveStudentFromActiveTeam(student.id, student.fullName)
                                }
                                className="text-text-dim hover:text-red-500 p-1"
                                title={`Remove from ${activeTeam?.name}`}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : isConflictWithOtherEvent ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 max-w-[130px] truncate"
                              title={`${student.fullName} is in ${conflict?.teamName} (${conflict?.eventTitle}). A student cannot manage two events at the same time.`}
                            >
                              <AlertCircle size={10} />
                              In {conflict?.teamName} ({conflict?.eventTitle})
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddStudentToActiveTeam(student)}
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white shadow-sm transition transform active:scale-95"
                              title={`Add ${student.fullName} to ${activeTeam?.name || "Team"}`}
                            >
                              <Plus size={15} strokeWidth={2.8} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TerminalPanel>
        </div>
      </div>

      {/* DIALOG: Replace Volunteer Modal */}
      <Dialog
        open={Boolean(replacingVolunteer)}
        onClose={() => setReplacingVolunteer(null)}
        title="Replace Volunteer"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-text-dim">
            Select an available student to replace <strong>{replacingVolunteer?.studentName}</strong> in <strong>{activeTeam?.name}</strong>.
          </p>

          {availableStudentsForReplacement.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-dim bg-bg rounded-lg border border-border">
              No available students found who are not already volunteers.
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text">Choose Replacement Student</label>
              <Select
                value={replacementStudentId}
                onChange={(e) => setReplacementStudentId(e.target.value)}
                className="text-xs bg-bg"
              >
                {availableStudentsForReplacement.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} {s.elevatesId ? `(${s.elevatesId})` : ""} {s.year ? `· Yr ${s.year}` : ""}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              onClick={() => setReplacingVolunteer(null)}
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              className="h-8 px-4 text-xs font-bold"
              disabled={availableStudentsForReplacement.length === 0 || !replacementStudentId}
              onClick={handleConfirmReplace}
            >
              Confirm Replacement
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
