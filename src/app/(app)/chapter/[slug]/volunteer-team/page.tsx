"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useAppDialogs } from "@/components/ui/app-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Stat } from "@/components/ui/stat";
import { VolunteerPowersModal } from "@/components/chapter/volunteer-powers-modal";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow } from "@/lib/access";
import { hasPermission, isHqRole } from "@/lib/permissions";
import {
  DEFAULT_VOLUNTEER_POWERS,
  VOLUNTEER_POWER_DEFINITIONS,
  getUserVolunteerPowers,
} from "@/lib/volunteers";
import { formatDate, formatDateTime, initials } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  Plus,
  QrCode,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  Calendar,
} from "lucide-react";
import type {
  Profile,
  VolunteerAssignment,
  VolunteerGroup,
  VolunteerGroupType,
  VolunteerPowers,
} from "@/types";

type GroupDraft = {
  name: string;
  description: string;
  groupType: VolunteerGroupType;
  eventId: string;
  validFrom: string;
  validTo: string;
  powers: VolunteerPowers;
};

const emptyGroupDraft = (): GroupDraft => ({
  name: "",
  description: "",
  groupType: "listed",
  eventId: "",
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  powers: { ...DEFAULT_VOLUNTEER_POWERS },
});

export default function ChapterVolunteerTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const {
    store,
    createVolunteerGroup,
    updateVolunteerGroup,
    deleteVolunteerGroup,
    addVolunteerToGroup,
    removeVolunteerFromGroup,
    updateVolunteerMemberPowers,
    assignVolunteerToEvent,
    removeVolunteerAssignment,
    updateVolunteerAssignmentPowers,
  } = useStore();

  const { session } = useCurrentUser();
  const { confirm } = useAppDialogs();
  const chapter = store.chapters.find((c) => c.slug === slug);

  const canManage =
    isHqRole(session.roleKey) ||
    session.roleKey === "campus_lead" ||
    session.roleKey === "chairman" ||
    hasPermission(store, session.roleKey, "leadership.manage");

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"groups" | "directory" | "events">("groups");
  const [groupTypeFilter, setGroupTypeFilter] = useState<"all" | "listed" | "temp">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [flash, setFlash] = useState("");

  // Group creation / editing modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDraft>(emptyGroupDraft);
  const [groupError, setGroupError] = useState("");

  // Powers modal state (can target a group OR an individual student in a group)
  const [powersTarget, setPowersTarget] = useState<{
    type: "group" | "member";
    groupId: string;
    userId?: string;
    title: string;
    initialPowers: VolunteerPowers;
    isOverride?: boolean;
  } | null>(null);

  // Add members to group modal
  const [addingMembersGroupId, setAddingMembersGroupId] = useState<string | null>(null);
  const [selectedStudentForGroup, setSelectedStudentForGroup] = useState<string>("");

  // Quick event assignment modal
  const [assignEventTarget, setAssignEventTarget] = useState<{
    targetType: "group" | "student";
    groupId?: string;
    studentId?: string;
    title: string;
  } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [assignValidFrom, setAssignValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [assignValidTo, setAssignValidTo] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  );

  // Expanded group details
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2500);
  }

  function toggleGroupExpand(groupId: string) {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  // Chapter-scoped records
  const chapterGroups = useMemo(() => {
    if (!chapter) return [];
    return (store.volunteerGroups || [])
      .filter((g) => g.chapterId === chapter.id)
      .slice()
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [store.volunteerGroups, chapter]);

  const filteredGroups = useMemo(() => {
    return chapterGroups.filter((g) => {
      if (groupTypeFilter !== "all" && g.groupType !== groupTypeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q))
      );
    });
  }, [chapterGroups, groupTypeFilter, searchQuery]);

  const chapterAssignments = useMemo(() => {
    if (!chapter) return [];
    return (store.volunteerAssignments || [])
      .filter((a) => a.chapterId === chapter.id)
      .slice()
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [store.volunteerAssignments, chapter]);

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

  // Set of student IDs who hold any active volunteer assignment or group membership
  const volunteerSummaryMap = useMemo(() => {
    const map = new Map<
      string,
      {
        tags: string[];
        groups: string[];
        assignmentsCount: number;
        hasAttendancePower: boolean;
      }
    >();

    for (const s of chapterStudents) {
      const vol = getUserVolunteerPowers(store, s.id);
      if (vol.isVolunteer) {
        map.set(s.id, {
          tags: vol.activeTags,
          groups: vol.activeGroups.map((g) => g.name),
          assignmentsCount: vol.activeAssignments.length,
          hasAttendancePower: vol.powers.canTakeAttendance || vol.powers.canScanQr,
        });
      }
    }
    return map;
  }, [chapterStudents, store]);

  const totalVolunteersCount = volunteerSummaryMap.size;
  const listedCount = chapterGroups.filter((g) => g.groupType === "listed").length;
  const tempCount = chapterGroups.filter((g) => g.groupType === "temp").length;

  if (!chapter) return <p className="text-orange">// Chapter not found</p>;

  // Open create group
  function startCreateGroup(type: VolunteerGroupType = "listed") {
    setEditingGroupId(null);
    setGroupDraft({
      ...emptyGroupDraft(),
      groupType: type,
    });
    setGroupError("");
    setShowGroupModal(true);
  }

  // Open edit group
  function startEditGroup(g: VolunteerGroup) {
    setEditingGroupId(g.id);
    setGroupDraft({
      name: g.name,
      description: g.description || "",
      groupType: g.groupType,
      eventId: g.eventId || "",
      validFrom: g.validFrom ? g.validFrom.slice(0, 10) : "",
      validTo: g.validTo ? g.validTo.slice(0, 10) : "",
      powers: g.powers || { ...DEFAULT_VOLUNTEER_POWERS },
    });
    setGroupError("");
    setShowGroupModal(true);
  }

  // Save group
  function handleSaveGroup() {
    setGroupError("");
    if (!chapter) return;
    const name = groupDraft.name.trim();
    if (!name) {
      setGroupError("Group name is required.");
      return;
    }

    if (editingGroupId) {
      updateVolunteerGroup(editingGroupId, {
        name,
        description: groupDraft.description.trim() || undefined,
        groupType: groupDraft.groupType,
        eventId: groupDraft.eventId || undefined,
        validFrom: groupDraft.validFrom || undefined,
        validTo: groupDraft.validTo || undefined,
        powers: groupDraft.powers,
      });
      flashMsg(`✓ Updated volunteer group "${name}"`);
    } else {
      createVolunteerGroup({
        chapterId: chapter.id,
        name,
        description: groupDraft.description.trim() || undefined,
        groupType: groupDraft.groupType,
        eventId: groupDraft.eventId || undefined,
        validFrom: groupDraft.validFrom || undefined,
        validTo: groupDraft.validTo || undefined,
        powers: groupDraft.powers,
      });
      flashMsg(`✓ Created ${groupDraft.groupType === "temp" ? "Temp Squad" : "Listed Group"} "${name}"`);
    }
    setShowGroupModal(false);
  }

  // Delete group
  async function handleDeleteGroup(g: VolunteerGroup) {
    const ok = await confirm({
      title: "Delete Volunteer Group",
      description: `Delete group “${g.name}”? All members will be unassigned from this squad.`,
      confirmLabel: "Delete Group",
      danger: true,
    });
    if (!ok) return;

    deleteVolunteerGroup(g.id);
    flashMsg(`Deleted group "${g.name}".`);
  }

  // Add member to group
  function handleAddMemberToGroup(groupId: string, userId: string) {
    if (!userId) return;
    addVolunteerToGroup(groupId, userId);
    const student = store.profiles.find((p) => p.id === userId);
    flashMsg(`✓ Added ${student?.fullName || "student"} to group.`);
    setSelectedStudentForGroup("");
    setAddingMembersGroupId(null);
  }

  // Remove member from group
  async function handleRemoveMemberFromGroup(g: VolunteerGroup, userId: string) {
    const student = store.profiles.find((p) => p.id === userId);
    const ok = await confirm({
      title: "Remove from Group",
      description: `Remove ${student?.fullName || "this student"} from “${g.name}”?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    removeVolunteerFromGroup(g.id, userId);
    flashMsg(`Removed ${student?.fullName || "student"} from group.`);
  }

  // Quick assign group or student to an event
  function handleAssignToEvent() {
    if (!chapter || !assignEventTarget || !selectedEventId) return;

    const event = store.events.find((e) => e.id === selectedEventId);
    const eventName = event?.title || "Event";

    if (assignEventTarget.targetType === "group" && assignEventTarget.groupId) {
      const group = chapterGroups.find((g) => g.id === assignEventTarget.groupId);
      if (!group) return;

      // Assign all members of the group to this event
      let count = 0;
      for (const userId of group.memberIds) {
        const memberCustom = group.customMemberPowers?.[userId];
        const effectivePowers = memberCustom
          ? { ...group.powers, ...memberCustom }
          : group.powers;

        assignVolunteerToEvent({
          chapterId: chapter.id,
          userId,
          eventId: selectedEventId,
          groupId: group.id,
          tag: group.name,
          powers: effectivePowers,
          validFrom: assignValidFrom || event?.startsAt,
          validTo: assignValidTo || event?.endsAt,
        });
        count++;
      }
      flashMsg(`✓ Assigned ${count} volunteers from "${group.name}" to ${eventName}!`);
    } else if (assignEventTarget.targetType === "student" && assignEventTarget.studentId) {
      const student = store.profiles.find((p) => p.id === assignEventTarget.studentId);
      assignVolunteerToEvent({
        chapterId: chapter.id,
        userId: assignEventTarget.studentId,
        eventId: selectedEventId,
        tag: `Volunteer · ${eventName}`,
        powers: { ...DEFAULT_VOLUNTEER_POWERS },
        validFrom: assignValidFrom || event?.startsAt,
        validTo: assignValidTo || event?.endsAt,
      });
      flashMsg(`✓ Assigned ${student?.fullName || "student"} to ${eventName}!`);
    }

    setAssignEventTarget(null);
    setSelectedEventId("");
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title="Volunteer Squads & Delegated Powers"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {flash ? (
              <span className="self-center text-[12px] font-semibold text-[var(--accent)] animate-pulse">
                {flash}
              </span>
            ) : null}
            <Link href={`/chapter/${slug}/attendance`}>
              <Button variant="orange" className="flex items-center gap-2 font-bold shadow-sm text-xs">
                <QrCode size={14} />
                Attendance Desk
              </Button>
            </Link>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => startCreateGroup("listed")}
                className="flex items-center gap-1.5 font-bold text-xs"
              >
                <Plus size={14} />
                Create Volunteer Group
              </Button>
            )}
          </div>
        }
      />

      {/* Stats Overview in Finexy-light style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total Active Volunteers" value={totalVolunteersCount} />
        <Stat label="Listed Pools (Saved)" value={listedCount} />
        <Stat label="Temp Event Squads" value={tempCount} />
        <Stat label="Total Group Squads" value={chapterGroups.length} />
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("groups")}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "groups"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-text-dim hover:text-text hover:bg-bg-page"
            }`}
          >
            <Layers size={13} />
            Volunteer Groups ({chapterGroups.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "directory"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-text-dim hover:text-text hover:bg-bg-page"
            }`}
          >
            <Users size={13} />
            Student Directory & Tagging ({chapterStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "events"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-text-dim hover:text-text hover:bg-bg-page"
            }`}
          >
            <Calendar size={13} />
            Event Assignments ({chapterAssignments.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "groups"
                ? "Search volunteer groups..."
                : "Search chapter students..."
            }
            className="pl-8 text-xs py-1.5 h-auto"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-mute hover:text-text"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: VOLUNTEER GROUPS (LISTED POOLS & TEMP SQUADS) */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          {/* Sub-filters for group types */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-text-dim uppercase tracking-wider mr-1">
                Filter:
              </span>
              <button
                type="button"
                onClick={() => setGroupTypeFilter("all")}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                  groupTypeFilter === "all"
                    ? "bg-bg-page border border-border text-text font-bold"
                    : "text-text-dim hover:text-text"
                }`}
              >
                All Groups ({chapterGroups.length})
              </button>
              <button
                type="button"
                onClick={() => setGroupTypeFilter("listed")}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                  groupTypeFilter === "listed"
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-text-dim hover:text-text"
                }`}
              >
                Listed Pools ({listedCount})
              </button>
              <button
                type="button"
                onClick={() => setGroupTypeFilter("temp")}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                  groupTypeFilter === "temp"
                    ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold"
                    : "text-text-dim hover:text-text"
                }`}
              >
                Temp Event Squads ({tempCount})
              </button>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => startCreateGroup("temp")}
                  className="text-xs text-amber-600 dark:text-amber-400 border border-amber-500/30 h-auto py-1 px-2.5"
                >
                  + New Temp Squad
                </Button>
                <Button
                  variant="orange"
                  onClick={() => startCreateGroup("listed")}
                  className="text-xs font-bold h-auto py-1 px-2.5"
                >
                  + New Listed Pool
                </Button>
              </div>
            )}
          </div>

          {/* Groups List */}
          {filteredGroups.length === 0 ? (
            <TerminalPanel title="volunteer.groups" accent="orange">
              <div className="py-12 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Layers size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text">No Volunteer Groups Found</h4>
                  <p className="text-xs text-text-dim max-w-md mx-auto mt-1">
                    Create a <strong>Listed Group</strong> (saved reusable pool) or a <strong>Temp Squad</strong> (for a specific event) to easily assign student volunteers and grant attendance powers.
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="orange"
                    onClick={() => startCreateGroup("listed")}
                    className="text-xs font-bold"
                  >
                    Create First Volunteer Group
                  </Button>
                )}
              </div>
            </TerminalPanel>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => {
                const isExpanded = expandedGroupIds.has(group.id);
                const isTemp = group.groupType === "temp";
                const linkedEvent = group.eventId
                  ? store.events.find((e) => e.id === group.eventId)
                  : null;

                const activePowersCount = Object.values(group.powers || {}).filter(Boolean).length;

                return (
                  <div
                    key={group.id}
                    className="rounded-[14px] border border-border/80 bg-bg shadow-sm hover:border-border transition overflow-hidden"
                  >
                    {/* Main Group Header Row */}
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleGroupExpand(group.id)}
                          className="mt-1 flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-mute hover:text-text transition shrink-0"
                          title={isExpanded ? "Collapse roster" : "Expand roster"}
                        >
                          <ChevronRight
                            size={14}
                            className={`transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-sm text-text truncate">
                              {group.name}
                            </h3>
                            <Badge
                              tone={isTemp ? "amber" : "green"}
                              className="font-bold text-[10px] uppercase tracking-wider"
                            >
                              {isTemp ? "Temp Squad" : "Listed Pool"}
                            </Badge>

                            {linkedEvent && (
                              <Link
                                href={`/chapter/${slug}/events/${linkedEvent.id}`}
                                className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                              >
                                <span>Event: {linkedEvent.title}</span>
                              </Link>
                            )}
                          </div>

                          {group.description && (
                            <p className="text-xs text-text-dim mt-1 line-clamp-1">
                              {group.description}
                            </p>
                          )}

                          {/* Validity Period & Squad Metadata */}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-text-mute">
                            <span className="flex items-center gap-1">
                              <Users size={12} className="text-text-dim" />
                              <strong className="text-text font-mono">
                                {group.memberIds.length}
                              </strong>{" "}
                              Volunteers
                            </span>

                            {group.validFrom && (
                              <span className="flex items-center gap-1">
                                <Calendar size={12} className="text-text-dim" />
                                Valid: {formatDate(group.validFrom)}
                                {group.validTo ? ` → ${formatDate(group.validTo)}` : ""}
                              </span>
                            )}
                          </div>

                          {/* Active Powers Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            {VOLUNTEER_POWER_DEFINITIONS.map((def) => {
                              const isEnabled = Boolean(group.powers?.[def.key]);
                              if (!isEnabled) return null;
                              return (
                                <span
                                  key={def.key}
                                  className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                                >
                                  <Check size={10} />
                                  {def.badge}
                                </span>
                              );
                            })}
                            {activePowersCount === 0 && (
                              <span className="text-[10px] text-text-mute font-mono">
                                (No active powers configured)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Group Action Buttons */}
                      {canManage && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                          {/* Configure Powers Button */}
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setPowersTarget({
                                type: "group",
                                groupId: group.id,
                                title: `Configure Powers: ${group.name}`,
                                initialPowers: group.powers || { ...DEFAULT_VOLUNTEER_POWERS },
                              })
                            }
                            className="text-xs py-1 px-2.5 h-auto border border-border hover:border-emerald-500/50 flex items-center gap-1"
                          >
                            <Settings2 size={13} className="text-emerald-500" />
                            Powers ({activePowersCount})
                          </Button>

                          {/* Add Member Button */}
                          <Button
                            variant="ghost"
                            onClick={() => setAddingMembersGroupId(group.id)}
                            className="text-xs py-1 px-2.5 h-auto border border-border flex items-center gap-1"
                          >
                            <UserPlus size={13} />
                            Add Student
                          </Button>

                          {/* Assign Group to Event Button */}
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setAssignEventTarget({
                                targetType: "group",
                                groupId: group.id,
                                title: `Assign "${group.name}" to Event`,
                              })
                            }
                            className="text-xs py-1 px-2.5 h-auto text-[var(--accent)] border border-[var(--accent)]/30"
                          >
                            Assign to Event
                          </Button>

                          {/* Edit Group Settings */}
                          <Button
                            variant="ghost"
                            onClick={() => startEditGroup(group)}
                            className="text-xs py-1 px-2 h-auto text-text-dim"
                          >
                            Edit
                          </Button>

                          {/* Delete Group */}
                          <Button
                            variant="danger"
                            onClick={() => handleDeleteGroup(group)}
                            className="text-xs py-1 px-2 h-auto text-red-500"
                            title="Delete group"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Expandable Group Members Sub-Panel */}
                    {isExpanded && (
                      <div className="border-t border-border/80 bg-bg-page/50 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-text flex items-center gap-1.5">
                            <Users size={13} className="text-[var(--accent)]" />
                            Squad Members ({group.memberIds.length})
                          </span>
                          <span className="text-[11px] text-text-dim">
                            Powers can be adjusted group-wide or individually for each student.
                          </span>
                        </div>

                        {group.memberIds.length === 0 ? (
                          <div className="p-6 text-center border border-dashed border-border rounded-[10px] space-y-2">
                            <p className="text-xs text-text-dim">
                              No volunteers added to this squad yet.
                            </p>
                            {canManage && (
                              <Button
                                variant="orange"
                                onClick={() => setAddingMembersGroupId(group.id)}
                                className="text-xs font-bold py-1 px-2.5 h-auto"
                              >
                                + Add Students to Squad
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {group.memberIds.map((userId) => {
                              const student = store.profiles.find((p) => p.id === userId);
                              const customPowers = group.customMemberPowers?.[userId];
                              const isOverridden = Boolean(customPowers);
                              const effectivePowers = customPowers
                                ? { ...group.powers, ...customPowers }
                                : group.powers;

                              return (
                                <div
                                  key={userId}
                                  className="flex items-center justify-between gap-2 p-2.5 rounded-[10px] border border-border bg-bg shadow-2xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                      {initials(student?.fullName || "Volunteer")}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <Link
                                          href={`/profile/${student?.elevatesId || userId}`}
                                          className="font-bold text-xs text-text truncate hover:text-[var(--accent)] hover:underline"
                                        >
                                          {student?.fullName || "Unknown Student"}
                                        </Link>
                                        <span className="inline-flex items-center rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 text-[9px] font-bold">
                                          Volunteer
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-text-mute truncate">
                                        {student?.elevatesId || student?.email || "Member"}
                                        {isOverridden && (
                                          <span className="ml-1 text-amber-500 font-semibold">
                                            · Custom Powers
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  {canManage && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      {/* Individual Power Checkbox Override */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPowersTarget({
                                            type: "member",
                                            groupId: group.id,
                                            userId,
                                            title: `Individual Powers: ${student?.fullName || "Student"}`,
                                            initialPowers: effectivePowers,
                                            isOverride: isOverridden,
                                          })
                                        }
                                        className="text-[11px] font-semibold text-text-dim hover:text-[var(--accent)] px-2 py-0.5 rounded border border-border hover:border-[var(--accent)] transition"
                                        title="Customize individual checkboxes for this student"
                                      >
                                        Powers
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMemberFromGroup(group, userId)}
                                        className="text-text-mute hover:text-red-500 p-1"
                                        title="Remove from squad"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDENT DIRECTORY & VOLUNTEER TAGGING */}
      {activeTab === "directory" && (
        <TerminalPanel
          title="Student Directory & Volunteer Tagging"
          meta={`${filteredStudents.length} Students`}
          accent="orange"
        >
          <div className="space-y-3">
            <p className="text-xs text-text-dim">
              Volunteers hold a <strong>Volunteer Tag</strong> that grants event and check-in authority without altering their primary student role. Add students to squads or grant delegated event powers below.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-dim">
                    <th className="pb-2.5 font-semibold">Student Name</th>
                    <th className="pb-2.5 font-semibold">ID / Email</th>
                    <th className="pb-2.5 font-semibold">Volunteer Tag & Squad</th>
                    <th className="pb-2.5 font-semibold">Attendance Authority</th>
                    <th className="pb-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-dim">
                        No students match your search query.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const summary = volunteerSummaryMap.get(student.id);
                      const isVol = Boolean(summary);

                      return (
                        <tr key={student.id} className="hover:bg-bg-page/40 transition">
                          <td className="py-3 font-semibold text-text">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-page border border-border text-[10px] font-bold">
                                {initials(student.fullName)}
                              </div>
                              <div>
                                <Link
                                  href={`/profile/${student.elevatesId || student.id}`}
                                  className="hover:text-[var(--accent)] hover:underline"
                                >
                                  {student.fullName}
                                </Link>
                                <div className="text-[10px] text-text-mute">
                                  {student.department || "Student"}
                                  {student.year ? ` · Yr ${student.year}` : ""}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 text-text-dim font-mono text-[11px]">
                            {student.elevatesId || student.email}
                          </td>

                          <td className="py-3">
                            {isVol ? (
                              <div className="flex flex-wrap items-center gap-1">
                                {summary?.groups.map((gName) => (
                                  <span
                                    key={gName}
                                    className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold"
                                  >
                                    <Tag size={9} />
                                    {gName}
                                  </span>
                                ))}
                                {summary?.groups.length === 0 && (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                                    Volunteer
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-text-mute">Student</span>
                            )}
                          </td>

                          <td className="py-3">
                            {isVol && summary?.hasAttendancePower ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <Check size={12} />
                                Attendance Desk Active
                              </span>
                            ) : (
                              <span className="text-[11px] text-text-mute">—</span>
                            )}
                          </td>

                          <td className="py-3 text-right">
                            {canManage && (
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Add to squad button */}
                                {chapterGroups.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedStudentForGroup(student.id);
                                      setAddingMembersGroupId(chapterGroups[0].id);
                                    }}
                                    className="text-[11px] py-1 px-2 h-auto text-text-dim hover:text-text border border-border"
                                  >
                                    + Add to Squad
                                  </Button>
                                )}

                                {/* Assign to event button */}
                                <Button
                                  variant="orange"
                                  onClick={() =>
                                    setAssignEventTarget({
                                      targetType: "student",
                                      studentId: student.id,
                                      title: `Assign ${student.fullName} as Event Volunteer`,
                                    })
                                  }
                                  className="text-[11px] py-1 px-2.5 h-auto font-bold"
                                >
                                  Assign Event
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TerminalPanel>
      )}

      {/* TAB 3: EVENT VOLUNTEER ASSIGNMENTS */}
      {activeTab === "events" && (
        <TerminalPanel
          title="Active Event Volunteer Assignments"
          meta={`${chapterAssignments.length} Assignments`}
          accent="green"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-text-dim">
                Direct event volunteer assignments granting powers for a specific event and validity period.
              </p>
              {canManage && chapterStudents.length > 0 && (
                <Button
                  variant="orange"
                  onClick={() =>
                    setAssignEventTarget({
                      targetType: "student",
                      studentId: chapterStudents[0].id,
                      title: "Assign Event Volunteer",
                    })
                  }
                  className="text-xs font-bold"
                >
                  + Assign Volunteer to Event
                </Button>
              )}
            </div>

            {chapterAssignments.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-[12px] space-y-2">
                <p className="text-xs text-text-dim">
                  No event-specific volunteer assignments recorded yet.
                </p>
                <p className="text-[11px] text-text-mute">
                  Assign volunteer squads or individual students to events to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {chapterAssignments.map((a) => {
                  const student = store.profiles.find((p) => p.id === a.userId);
                  const event = a.eventId ? store.events.find((e) => e.id === a.eventId) : null;
                  const group = a.groupId ? chapterGroups.find((g) => g.id === a.groupId) : null;

                  return (
                    <div
                      key={a.id}
                      className="p-3 rounded-[12px] border border-border bg-bg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          {initials(student?.fullName || "Volunteer")}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-text">
                              {student?.fullName || "Student"}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 text-[10px] font-bold">
                              {a.tag || "Volunteer"}
                            </span>
                            {event && (
                              <Link
                                href={`/chapter/${slug}/events/${event.id}`}
                                className="text-[11px] text-[var(--accent)] font-semibold hover:underline"
                              >
                                Event: {event.title}
                              </Link>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-mute mt-0.5">
                            <span>Elevates ID: {student?.elevatesId || "Member"}</span>
                            {group && <span>· Squad: {group.name}</span>}
                            {a.validFrom && (
                              <span>
                                · Valid: {formatDate(a.validFrom)}
                                {a.validTo ? ` → ${formatDate(a.validTo)}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button
                            variant="danger"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Remove Assignment",
                                description: `Remove volunteer assignment for ${student?.fullName || "this student"}?`,
                                confirmLabel: "Remove",
                                danger: true,
                              });
                              if (!ok) return;
                              removeVolunteerAssignment(a.id);
                              flashMsg("Assignment removed.");
                            }}
                            className="text-xs py-1 px-2 h-auto text-red-500"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TerminalPanel>
      )}

      {/* DIALOG 1: CREATE / EDIT VOLUNTEER GROUP */}
      <Dialog
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title={editingGroupId ? "Edit Volunteer Group" : "Create Volunteer Group / Squad"}
        description="Configure a reusable listed volunteer pool or a temporary event squad with powers."
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Squad / Group Name</FieldLabel>
            <Input
              value={groupDraft.name}
              onChange={(e) => setGroupDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Check-in Desk Squad, Logistics Crew, Hackathon Staff"
            />
          </div>

          <div>
            <FieldLabel>Description (Optional)</FieldLabel>
            <TextArea
              rows={2}
              value={groupDraft.description}
              onChange={(e) => setGroupDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Responsibilities, meeting points, venue checkpoints..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Group Type</FieldLabel>
              <Select
                value={groupDraft.groupType}
                onChange={(e) =>
                  setGroupDraft((d) => ({ ...d, groupType: e.target.value as VolunteerGroupType }))
                }
              >
                <option value="listed">Listed Group (Reusable Pool)</option>
                <option value="temp">Temp Squad (Event-Specific)</option>
              </Select>
            </div>

            <div>
              <FieldLabel>Linked Chapter Event (Optional)</FieldLabel>
              <Select
                value={groupDraft.eventId}
                onChange={(e) => setGroupDraft((d) => ({ ...d, eventId: e.target.value }))}
              >
                <option value="">No linked event (Chapter-wide)</option>
                {store.events
                  .filter((e) => e.chapterId === chapter.id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Valid From</FieldLabel>
              <Input
                type="date"
                value={groupDraft.validFrom}
                onChange={(e) => setGroupDraft((d) => ({ ...d, validFrom: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Valid Until</FieldLabel>
              <Input
                type="date"
                value={groupDraft.validTo}
                onChange={(e) => setGroupDraft((d) => ({ ...d, validTo: e.target.value }))}
              />
            </div>
          </div>

          {/* Inline Power Checkbox setup */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-[11px] font-bold text-text-dim uppercase tracking-wider block">
              Default Powers for Squad (Checkboxes)
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {VOLUNTEER_POWER_DEFINITIONS.map((def) => {
                const isChecked = Boolean(groupDraft.powers[def.key]);
                return (
                  <label
                    key={def.key}
                    className="flex items-start gap-2.5 p-2 rounded-[8px] border border-border bg-bg-page/50 cursor-pointer select-none text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        setGroupDraft((d) => ({
                          ...d,
                          powers: { ...d.powers, [def.key]: !d.powers[def.key] },
                        }))
                      }
                      className="mt-0.5 h-3.5 w-3.5 rounded border-border text-emerald-500 focus:ring-emerald-500/30 cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="font-bold text-text">{def.label}</span>
                      <p className="text-[10px] text-text-dim">{def.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {groupError && <p className="text-xs text-[var(--accent)] font-semibold">{groupError}</p>}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" onClick={() => setShowGroupModal(false)} className="text-xs">
              Cancel
            </Button>
            <Button variant="orange" onClick={handleSaveGroup} className="text-xs font-bold">
              {editingGroupId ? "Save Changes" : "Create Group"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG 2: POWERS CHECKBOX MODAL (GROUP OR INDIVIDUAL OVERRIDE) */}
      {powersTarget && (
        <VolunteerPowersModal
          open={Boolean(powersTarget)}
          onClose={() => setPowersTarget(null)}
          title={powersTarget.title}
          initialPowers={powersTarget.initialPowers}
          isIndividualOverride={powersTarget.type === "member"}
          onResetToGroup={() => {
            if (powersTarget.type === "member" && powersTarget.userId) {
              updateVolunteerMemberPowers(powersTarget.groupId, powersTarget.userId, null);
              flashMsg("Reset member to group default powers.");
            }
          }}
          onSave={(newPowers) => {
            if (powersTarget.type === "group") {
              updateVolunteerGroup(powersTarget.groupId, { powers: newPowers });
              flashMsg("✓ Updated group default powers!");
            } else if (powersTarget.type === "member" && powersTarget.userId) {
              updateVolunteerMemberPowers(powersTarget.groupId, powersTarget.userId, newPowers);
              flashMsg("✓ Updated individual volunteer powers!");
            }
          }}
        />
      )}

      {/* DIALOG 3: ADD STUDENT TO SQUAD */}
      <Dialog
        open={Boolean(addingMembersGroupId)}
        onClose={() => {
          setAddingMembersGroupId(null);
          setSelectedStudentForGroup("");
        }}
        title="Add Student to Volunteer Squad"
        description="Select a chapter student to appoint to this volunteer group."
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Select Student</FieldLabel>
            <Select
              value={selectedStudentForGroup}
              onChange={(e) => setSelectedStudentForGroup(e.target.value)}
            >
              <option value="">Select student…</option>
              {chapterStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.elevatesId || s.email})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                setAddingMembersGroupId(null);
                setSelectedStudentForGroup("");
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              disabled={!selectedStudentForGroup}
              onClick={() => {
                if (addingMembersGroupId && selectedStudentForGroup) {
                  handleAddMemberToGroup(addingMembersGroupId, selectedStudentForGroup);
                }
              }}
              className="text-xs font-bold"
            >
              Add to Squad
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG 4: ASSIGN GROUP OR STUDENT TO EVENT */}
      <Dialog
        open={Boolean(assignEventTarget)}
        onClose={() => {
          setAssignEventTarget(null);
          setSelectedEventId("");
        }}
        title={assignEventTarget?.title || "Assign to Event"}
        description="Grant delegated event powers for the duration of this event."
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Select Chapter Event</FieldLabel>
            <Select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">Select event…</option>
              {store.events
                .filter((e) => e.chapterId === chapter.id)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.status})
                  </option>
                ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Valid From</FieldLabel>
              <Input
                type="date"
                value={assignValidFrom}
                onChange={(e) => setAssignValidFrom(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Valid To</FieldLabel>
              <Input
                type="date"
                value={assignValidTo}
                onChange={(e) => setAssignValidTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                setAssignEventTarget(null);
                setSelectedEventId("");
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              disabled={!selectedEventId}
              onClick={handleAssignToEvent}
              className="text-xs font-bold"
            >
              Confirm Event Assignment
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
