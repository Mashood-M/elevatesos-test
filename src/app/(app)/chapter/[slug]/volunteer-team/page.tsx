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
import { formatDate, initials } from "@/lib/utils";
import {
  Check,
  ChevronRight,
  Layers,
  Plus,
  QrCode,
  Search,
  Settings2,
  Sparkles,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X,
  Calendar,
} from "lucide-react";
import type {
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
    assignVolunteerGroupToEvent,
    applyVolunteerPresetToEvent,
    removeVolunteerAssignment,
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
  const [groupTypeFilter, setGroupTypeFilter] = useState<"all" | "presets" | "events" | "listed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [flash, setFlash] = useState("");

  // Group creation / editing modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isPresetModal, setIsPresetModal] = useState(false);
  const [presetSelectedStudentIds, setPresetSelectedStudentIds] = useState<string[]>([]);
  const [presetStudentSearch, setPresetStudentSearch] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDraft>(emptyGroupDraft);
  const [groupError, setGroupError] = useState("");

  // Quick preset application popover target
  const [applyPresetTargetSquad, setApplyPresetTargetSquad] = useState<VolunteerGroup | null>(null);
  const [assignPresetTargetGroup, setAssignPresetTargetGroup] = useState<VolunteerGroup | null>(null);

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
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");

  // Quick event assignment modal (for individual students or unlinked pools)
  const [assignEventTarget, setAssignEventTarget] = useState<{
    targetType: "group" | "student";
    groupId?: string;
    studentId?: string;
    title: string;
  } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [assignStudentId, setAssignStudentId] = useState<string>("");
  const [assignStudentSearch, setAssignStudentSearch] = useState<string>("");

  // Expanded group details
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2500);
  }

  const startAddVolunteerStudent = (targetGroupId?: string) => {
    if (chapterGroups.length === 0) {
      flashMsg("Please create a volunteer squad first before adding students.");
      startCreateGroup("listed");
      return;
    }
    const gid = targetGroupId || chapterGroups[0].id;
    setAddingMembersGroupId(gid);
    setSelectedStudentForGroup("");
    setStudentSearchQuery("");
  };

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

  const chapterPresets = useMemo(() => {
    return chapterGroups.filter((g) => Boolean(g.isPreset));
  }, [chapterGroups]);

  const chapterEventSquads = useMemo(() => {
    return chapterGroups.filter((g) => Boolean(g.eventId));
  }, [chapterGroups]);

  const chapterRegularPools = useMemo(() => {
    return chapterGroups.filter((g) => !g.isPreset && !g.eventId);
  }, [chapterGroups]);

  const filteredGroups = useMemo(() => {
    return chapterGroups.filter((g) => {
      if (groupTypeFilter === "presets" && !g.isPreset) return false;
      if (groupTypeFilter === "events" && !g.eventId) return false;
      if (groupTypeFilter === "listed" && (g.isPreset || g.eventId)) return false;
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

  const currentAddingGroup = useMemo(() => {
    return chapterGroups.find((g) => g.id === addingMembersGroupId);
  }, [chapterGroups, addingMembersGroupId]);

  const filteredAddStudents = useMemo(() => {
    const q = studentSearchQuery.toLowerCase().trim();
    if (!q) return chapterStudents;
    return chapterStudents.filter((s) => {
      return (
        s.fullName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.elevatesId && s.elevatesId.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.year && s.year.toLowerCase().includes(q))
      );
    });
  }, [chapterStudents, studentSearchQuery]);

  const filteredAssignStudents = useMemo(() => {
    const q = assignStudentSearch.toLowerCase().trim();
    if (!q) return chapterStudents;
    return chapterStudents.filter((s) => {
      return (
        s.fullName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.elevatesId && s.elevatesId.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.year && s.year.toLowerCase().includes(q))
      );
    });
  }, [chapterStudents, assignStudentSearch]);

  const filteredPresetStudents = useMemo(() => {
    const q = presetStudentSearch.toLowerCase().trim();
    if (!q) return chapterStudents;
    return chapterStudents.filter((s) => {
      return (
        s.fullName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.elevatesId && s.elevatesId.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.year && s.year.toLowerCase().includes(q))
      );
    });
  }, [chapterStudents, presetStudentSearch]);

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

  if (!chapter) return <p className="text-orange">{"// Chapter not found"}</p>;

  function startCreatePreset() {
    setEditingGroupId(null);
    setIsPresetModal(true);
    setPresetSelectedStudentIds([]);
    setPresetStudentSearch("");
    setGroupDraft({
      name: "",
      description: "",
      groupType: "listed",
      eventId: "",
      validFrom: new Date().toISOString().slice(0, 10),
      validTo: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      powers: { ...DEFAULT_VOLUNTEER_POWERS },
    });
    setGroupError("");
    setShowGroupModal(true);
  }

  function startEditPreset(preset: VolunteerGroup) {
    setEditingGroupId(preset.id);
    setIsPresetModal(true);
    setPresetSelectedStudentIds([...preset.memberIds]);
    setPresetStudentSearch("");
    setGroupDraft({
      name: preset.name,
      description: preset.description || "",
      groupType: "listed",
      eventId: "",
      validFrom: preset.validFrom || new Date().toISOString().slice(0, 10),
      validTo: preset.validTo || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      powers: { ...(preset.powers || DEFAULT_VOLUNTEER_POWERS) },
    });
    setGroupError("");
    setShowGroupModal(true);
  }

  function startCreateGroup(type: VolunteerGroupType = "listed") {
    setEditingGroupId(null);
    setIsPresetModal(false);
    setPresetSelectedStudentIds([]);
    setPresetStudentSearch("");
    setGroupDraft({
      name: "",
      description: "",
      groupType: type,
      eventId: "",
      validFrom: new Date().toISOString().slice(0, 10),
      validTo: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      powers: { ...DEFAULT_VOLUNTEER_POWERS },
    });
    setGroupError("");
    setShowGroupModal(true);
  }

  function startEditGroup(group: VolunteerGroup) {
    if (group.isPreset) {
      startEditPreset(group);
      return;
    }
    setEditingGroupId(group.id);
    setIsPresetModal(false);
    setPresetSelectedStudentIds([...group.memberIds]);
    setPresetStudentSearch("");
    setGroupDraft({
      name: group.name,
      description: group.description || "",
      groupType: group.groupType,
      eventId: group.eventId || "",
      validFrom: group.validFrom || new Date().toISOString().slice(0, 10),
      validTo: group.validTo || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      powers: { ...group.powers },
    });
    setGroupError("");
    setShowGroupModal(true);
  }

  function handleSaveGroup() {
    if (!chapter) return;
    if (!groupDraft.name.trim()) {
      setGroupError("Group name is required.");
      return;
    }

    if (editingGroupId) {
      updateVolunteerGroup(editingGroupId, {
        name: groupDraft.name.trim(),
        description: groupDraft.description.trim(),
        groupType: groupDraft.groupType,
        eventId: isPresetModal ? undefined : (groupDraft.eventId || undefined),
        isPreset: isPresetModal,
        ...(isPresetModal ? { memberIds: presetSelectedStudentIds } : {}),
        validFrom: groupDraft.validFrom,
        validTo: groupDraft.validTo,
        powers: groupDraft.powers,
      });
      flashMsg(isPresetModal ? "✓ Volunteer preset updated!" : "✓ Volunteer squad updated!");
    } else {
      createVolunteerGroup({
        chapterId: chapter.id,
        name: groupDraft.name.trim(),
        description: groupDraft.description.trim(),
        groupType: groupDraft.groupType,
        eventId: isPresetModal ? undefined : (groupDraft.eventId || undefined),
        isPreset: isPresetModal,
        memberIds: isPresetModal ? presetSelectedStudentIds : [],
        validFrom: groupDraft.validFrom,
        validTo: groupDraft.validTo,
        powers: groupDraft.powers,
      });
      flashMsg(isPresetModal ? "✓ Volunteer preset created!" : "✓ Volunteer squad created!");
    }

    setShowGroupModal(false);
  }

  async function handleDeleteGroup(group: VolunteerGroup) {
    const isPreset = Boolean(group.isPreset);
    const ok = await confirm({
      title: isPreset ? "Delete Volunteer Preset" : "Delete Volunteer Group",
      description: isPreset
        ? `Delete preset “${group.name}”? Reusable membership list will be removed.`
        : `Delete group “${group.name}”? All members will be unassigned from this squad.`,
      confirmLabel: isPreset ? "Delete Preset" : "Delete Group",
      danger: true,
    });
    if (!ok) return;

    deleteVolunteerGroup(group.id);
    flashMsg(isPreset ? `Volunteer preset "${group.name}" removed.` : `Volunteer group "${group.name}" removed.`);
  }

  function handleAddMemberToGroup(groupId: string, studentId: string) {
    if (!studentId) return;
    addVolunteerToGroup(groupId, studentId);
    flashMsg("✓ Added student to volunteer squad!");
    setSelectedStudentForGroup("");
  }

  function handleQuickAddMemberToGroup(groupId: string, studentId: string) {
    if (!studentId) return;
    addVolunteerToGroup(groupId, studentId);
    flashMsg("✓ Added student to squad!");
  }

  async function handleRemoveMemberFromGroup(group: VolunteerGroup, studentId: string) {
    const student = store.profiles.find((p) => p.id === studentId);
    const ok = await confirm({
      title: "Remove from Squad",
      description: `Remove ${student?.fullName || "this student"} from “${group.name}”?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    removeVolunteerFromGroup(group.id, studentId);
    flashMsg("Removed student from squad.");
  }

  function handleDirectAssignToEvent(group: VolunteerGroup) {
    if (!group.eventId) return;
    const event = store.events.find((e) => e.id === group.eventId);
    assignVolunteerGroupToEvent(group.id, group.eventId);
    flashMsg(`✓ Assigned all ${group.memberIds.length} squad volunteers directly to ${event?.title || "event"}!`);
  }

  function handleApplyPresetToSquad(presetId: string, squad: VolunteerGroup) {
    const preset = chapterPresets.find((p) => p.id === presetId);
    if (!preset) return;
    if (squad.eventId) {
      applyVolunteerPresetToEvent(preset.id, squad.eventId);
      const ev = store.events.find((e) => e.id === squad.eventId);
      flashMsg(`✓ Applied preset "${preset.name}" directly to ${ev?.title || "event"}!`);
    } else {
      for (const memberId of preset.memberIds) {
        if (!squad.memberIds.includes(memberId)) {
          addVolunteerToGroup(squad.id, memberId);
        }
      }
      flashMsg(`✓ Added ${preset.memberIds.length} volunteers from "${preset.name}" to "${squad.name}"!`);
    }
    setApplyPresetTargetSquad(null);
  }

  function handleAssignPresetToEvent(presetId: string, eventId: string) {
    const preset = chapterPresets.find((p) => p.id === presetId);
    const event = store.events.find((e) => e.id === eventId);
    if (!preset || !event) return;
    applyVolunteerPresetToEvent(preset.id, event.id);
    flashMsg(`✓ Assigned preset "${preset.name}" directly to ${event.title}!`);
    setAssignPresetTargetGroup(null);
    setSelectedEventId("");
  }

  function handleAssignToEvent() {
    if (!chapter || !assignEventTarget || !selectedEventId) return;
    const event = store.events.find((e) => e.id === selectedEventId);
    const eventName = event?.title || "event";

    if (assignEventTarget.targetType === "group" && assignEventTarget.groupId) {
      assignVolunteerGroupToEvent(assignEventTarget.groupId, selectedEventId);
      const group = chapterGroups.find((g) => g.id === assignEventTarget.groupId);
      flashMsg(`✓ Assigned volunteers from "${group?.name || "squad"}" directly to ${eventName}!`);
    } else if (assignEventTarget.targetType === "student") {
      const targetStudentId = assignStudentId || assignEventTarget.studentId;
      if (!targetStudentId) return;
      const student = store.profiles.find((p) => p.id === targetStudentId);
      assignVolunteerToEvent({
        chapterId: chapter.id,
        userId: targetStudentId,
        eventId: selectedEventId,
        tag: `Volunteer · ${eventName}`,
        powers: { ...DEFAULT_VOLUNTEER_POWERS },
        validFrom: event?.startsAt,
        validTo: event?.endsAt,
      });
      flashMsg(`✓ Assigned ${student?.fullName || "student"} directly to ${eventName}!`);
    }

    setAssignEventTarget(null);
    setSelectedEventId("");
    setAssignStudentId("");
    setAssignStudentSearch("");
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
              <>
                <Button
                  variant="ghost"
                  onClick={() => startAddVolunteerStudent()}
                  className="flex items-center gap-1.5 font-bold text-xs border border-border"
                  title="Search and add students directly to a volunteer squad"
                >
                  <UserPlus size={14} className="text-[var(--accent)]" />
                  + Add Student
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => startCreatePreset()}
                  className="flex items-center gap-1.5 font-bold text-xs border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                  title="Create reusable volunteer student preset"
                >
                  <Sparkles size={14} />
                  + Create Preset
                </Button>
                <Button
                  variant="primary"
                  onClick={() => startCreateGroup("listed")}
                  className="flex items-center gap-1.5 font-bold text-xs"
                >
                  <Plus size={14} />
                  Create Squad
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Stats Overview in Finexy-light style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total Active Volunteers" value={totalVolunteersCount} />
        <Stat label="Volunteer Presets" value={chapterPresets.length} />
        <Stat label="Event Squads" value={chapterEventSquads.length} />
        <Stat label="Total Squads" value={chapterGroups.length} />
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

      {/* TAB 1: VOLUNTEER GROUPS (PRESETS, EVENT SQUADS, LISTED POOLS) */}
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
                onClick={() => setGroupTypeFilter("presets")}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 ${
                  groupTypeFilter === "presets"
                    ? "bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold"
                    : "text-text-dim hover:text-text"
                }`}
              >
                <Sparkles size={11} />
                Volunteer Presets ({chapterPresets.length})
              </button>
              <button
                type="button"
                onClick={() => setGroupTypeFilter("events")}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                  groupTypeFilter === "events"
                    ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold"
                    : "text-text-dim hover:text-text"
                }`}
              >
                Event Squads ({chapterEventSquads.length})
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
                Listed Pools ({chapterRegularPools.length})
              </button>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => startAddVolunteerStudent()}
                  className="text-xs font-bold border border-border h-auto py-1 px-2.5"
                  title="Search and add students to squad"
                >
                  <UserPlus size={13} className="text-[var(--accent)] mr-1 inline" />
                  + Add Student
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => startCreatePreset()}
                  className="text-xs text-purple-600 dark:text-purple-400 border border-purple-500/30 h-auto py-1 px-2.5 font-bold hover:bg-purple-500/10 flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  + New Preset
                </Button>
                <Button
                  variant="orange"
                  onClick={() => startCreateGroup("listed")}
                  className="text-xs font-bold h-auto py-1 px-2.5"
                >
                  + New Squad
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
                const isPreset = Boolean(group.isPreset);
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
                            {isPreset ? (
                              <span className="inline-flex items-center gap-1 rounded bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                <Sparkles size={11} /> Preset
                              </span>
                            ) : group.eventId ? (
                              <Badge
                                tone="amber"
                                className="font-bold text-[10px] uppercase tracking-wider"
                              >
                                Event Squad
                              </Badge>
                            ) : isTemp ? (
                              <Badge
                                tone="amber"
                                className="font-bold text-[10px] uppercase tracking-wider"
                              >
                                Temp Squad
                              </Badge>
                            ) : (
                              <Badge
                                tone="green"
                                className="font-bold text-[10px] uppercase tracking-wider"
                              >
                                Listed Pool
                              </Badge>
                            )}

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
                              {isPreset ? "Students in Preset" : "Volunteers"}
                            </span>

                            {group.validFrom && !isPreset && (
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

                          {/* Add / Manage Members Button */}
                          <Button
                            variant="ghost"
                            onClick={() => {
                              if (isPreset) {
                                startEditPreset(group);
                              } else {
                                setAddingMembersGroupId(group.id);
                              }
                            }}
                            className="text-xs py-1 px-2.5 h-auto border border-border flex items-center gap-1"
                          >
                            <UserPlus size={13} />
                            {isPreset ? "Edit Students" : "Add Student"}
                          </Button>

                          {/* Case 1: Reusable Preset -> Assign Preset to Event */}
                          {isPreset && (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setAssignPresetTargetGroup(group);
                                setSelectedEventId("");
                              }}
                              className="text-xs py-1 px-2.5 h-auto text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 font-bold flex items-center gap-1"
                              title="Directly assign this preset to any event"
                            >
                              <Sparkles size={12} />
                              Assign to Event
                            </Button>
                          )}

                          {/* Case 2: Squad has linked event -> DIRECT ASSIGNMENT + Apply Preset */}
                          {group.eventId && (
                            <>
                              {chapterPresets.length > 0 && (
                                <Button
                                  variant="ghost"
                                  onClick={() => setApplyPresetTargetSquad(group)}
                                  className="text-xs py-1 px-2.5 h-auto text-purple-600 dark:text-purple-400 border border-purple-500/30 font-semibold hover:bg-purple-500/10 flex items-center gap-1"
                                  title="Import students from a reusable preset"
                                >
                                  <Sparkles size={12} />
                                  Apply Preset
                                </Button>
                              )}
                              <Button
                                variant="orange"
                                onClick={() => handleDirectAssignToEvent(group)}
                                className="text-xs py-1 px-2.5 h-auto font-bold flex items-center gap-1 shadow-sm"
                                title={`Directly assign all volunteers to ${linkedEvent?.title || "event"}`}
                              >
                                <Check size={12} />
                                Directly Assign to Event
                              </Button>
                            </>
                          )}

                          {/* Case 3: Regular Listed Pool (no event) -> Assign to Event */}
                          {!isPreset && !group.eventId && (
                            <>
                              {chapterPresets.length > 0 && (
                                <Button
                                  variant="ghost"
                                  onClick={() => setApplyPresetTargetSquad(group)}
                                  className="text-xs py-1 px-2.5 h-auto text-purple-600 dark:text-purple-400 border border-purple-500/30 font-semibold hover:bg-purple-500/10 flex items-center gap-1"
                                  title="Import students from preset into this squad"
                                >
                                  <Sparkles size={12} />
                                  Apply Preset
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  setAssignEventTarget({
                                    targetType: "group",
                                    groupId: group.id,
                                    title: `Assign "${group.name}" to Event`,
                                  })
                                }
                                className="text-xs py-1 px-2.5 h-auto text-[var(--accent)] border border-[var(--accent)]/30 font-semibold"
                              >
                                Assign to Event
                              </Button>
                            </>
                          )}

                          {/* Edit Group / Preset */}
                          <Button
                            variant="ghost"
                            onClick={() => (isPreset ? startEditPreset(group) : startEditGroup(group))}
                            className="text-xs py-1 px-2 h-auto text-text-dim"
                          >
                            Edit
                          </Button>

                          {/* Delete Group */}
                          <Button
                            variant="danger"
                            onClick={() => handleDeleteGroup(group)}
                            className="text-xs py-1 px-2 h-auto text-red-500"
                            title={isPreset ? "Delete preset" : "Delete group"}
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
                            {isPreset ? "Preset Students" : "Squad Members"} ({group.memberIds.length})
                          </span>
                          <div className="flex items-center gap-2">
                            {canManage && (
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  if (isPreset) {
                                    startEditPreset(group);
                                  } else {
                                    setAddingMembersGroupId(group.id);
                                    setSelectedStudentForGroup("");
                                    setStudentSearchQuery("");
                                  }
                                }}
                                className="text-xs font-bold py-1 px-2.5 h-auto text-[var(--accent)] hover:bg-[var(--accent)]/10 border border-[var(--accent)]/30"
                              >
                                <UserPlus size={12} className="inline mr-1" />
                                {isPreset ? "Edit Preset List" : "+ Add Student"}
                              </Button>
                            )}
                            <span className="text-[11px] text-text-dim hidden sm:inline">
                              {isPreset
                                ? "Preset members can be applied to any event with one click."
                                : "Powers can be adjusted group-wide or individually for each student."}
                            </span>
                          </div>
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
                                  onClick={() => {
                                    setAssignStudentId(student.id);
                                    setAssignStudentSearch("");
                                    setAssignEventTarget({
                                      targetType: "student",
                                      studentId: student.id,
                                      title: `Assign ${student.fullName} as Event Volunteer`,
                                    });
                                  }}
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
                  onClick={() => {
                    setAssignStudentId(chapterStudents[0]?.id || "");
                    setAssignStudentSearch("");
                    setAssignEventTarget({
                      targetType: "student",
                      studentId: chapterStudents[0]?.id || "",
                      title: "Assign Event Volunteer",
                    });
                  }}
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

      {/* DIALOG 1: CREATE / EDIT VOLUNTEER GROUP OR PRESET */}
      <Dialog
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title={
          isPresetModal
            ? editingGroupId
              ? "Edit Volunteer Preset"
              : "Create Volunteer Preset"
            : editingGroupId
              ? "Edit Volunteer Group"
              : "Create Volunteer Group / Squad"
        }
        description={
          isPresetModal
            ? "Configure a reusable preset of student volunteers with default permissions that can be applied to any event with one click."
            : "Configure a reusable listed volunteer pool or a temporary event squad with powers."
        }
        className="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>{isPresetModal ? "Preset Name" : "Squad / Group Name"}</FieldLabel>
            <Input
              value={groupDraft.name}
              onChange={(e) => setGroupDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={
                isPresetModal
                  ? "e.g. Core Event Leads, Registration Desk Preset, Stage Crew"
                  : "e.g. Check-in Desk Squad, Logistics Crew, Hackathon Staff"
              }
            />
          </div>

          <div>
            <FieldLabel>Description (Optional)</FieldLabel>
            <TextArea
              rows={2}
              value={groupDraft.description}
              onChange={(e) => setGroupDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder={
                isPresetModal
                  ? "Describe what this volunteer preset is used for across chapter events..."
                  : "Responsibilities, meeting points, venue checkpoints..."
              }
            />
          </div>

          {!isPresetModal && (
            <>
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
            </>
          )}

          {/* If Preset Modal, show searchable student multi-select checklist */}
          {isPresetModal && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-dim uppercase tracking-wider">
                  Preset Students ({presetSelectedStudentIds.length} selected)
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPresetSelectedStudentIds(chapterStudents.map((s) => s.id))}
                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-text-mute">·</span>
                  <button
                    type="button"
                    onClick={() => setPresetSelectedStudentIds([])}
                    className="text-[11px] font-semibold text-text-dim hover:text-text"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim" />
                <Input
                  value={presetStudentSearch}
                  onChange={(e) => setPresetStudentSearch(e.target.value)}
                  placeholder="Search students by name, email, department, ID..."
                  className="pl-8 text-xs py-1 h-auto"
                />
                {presetStudentSearch && (
                  <button
                    type="button"
                    onClick={() => setPresetStudentSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border bg-bg-page/40 p-1">
                {filteredPresetStudents.length === 0 ? (
                  <div className="py-6 text-center text-xs text-text-dim">
                    No students found matching &ldquo;{presetStudentSearch}&rdquo;
                  </div>
                ) : (
                  filteredPresetStudents.map((student) => {
                    const isSelected = presetSelectedStudentIds.includes(student.id);
                    return (
                      <label
                        key={student.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer transition select-none ${
                          isSelected
                            ? "bg-[var(--accent)]/10 border border-[var(--accent)]/25"
                            : "hover:bg-bg"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setPresetSelectedStudentIds((prev) =>
                                prev.includes(student.id)
                                  ? prev.filter((id) => id !== student.id)
                                  : [...prev, student.id],
                              );
                            }}
                            className="h-3.5 w-3.5 rounded border-border text-[var(--accent)] focus:ring-[var(--accent)]/30 cursor-pointer shrink-0"
                          />
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg border border-border text-[10px] font-bold">
                            {initials(student.fullName)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-text truncate">
                                {student.fullName}
                              </span>
                              {student.elevatesId && (
                                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-bg border border-border text-text-dim">
                                  {student.elevatesId}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-text-dim truncate">
                              {student.email}
                              {student.department ? ` · ${student.department}` : ""}
                              {student.year ? ` (Yr ${student.year})` : ""}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-bold text-[var(--accent)] shrink-0 flex items-center gap-1">
                            <Check size={11} /> Selected
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Inline Power Checkbox setup */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-[11px] font-bold text-text-dim uppercase tracking-wider block">
              Default Powers for {isPresetModal ? "Preset" : "Squad"} (Checkboxes)
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
              {editingGroupId
                ? isPresetModal
                  ? "Save Preset"
                  : "Save Changes"
                : isPresetModal
                  ? "Create Preset"
                  : "Create Group"}
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
          setStudentSearchQuery("");
        }}
        title="Add Student to Volunteer Squad"
        description="Search chapter students and appoint them to this volunteer squad."
        className="max-w-lg"
      >
        <div className="space-y-4">
          {/* Target Squad Selector / Badge */}
          {chapterGroups.length > 1 ? (
            <div>
              <FieldLabel>Target Volunteer Squad</FieldLabel>
              <Select
                value={addingMembersGroupId || ""}
                onChange={(e) => {
                  setAddingMembersGroupId(e.target.value);
                  setSelectedStudentForGroup("");
                }}
              >
                {chapterGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.isPreset ? "Preset" : g.eventId ? "Event Squad" : "Listed Pool"})
                  </option>
                ))}
              </Select>
            </div>
          ) : currentAddingGroup ? (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-bg-page/50">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider block">Target Squad</span>
                <span className="text-xs font-bold text-text truncate">{currentAddingGroup.name}</span>
              </div>
              <Badge tone={currentAddingGroup.isPreset ? "magenta" : currentAddingGroup.eventId ? "amber" : "green"}>
                {currentAddingGroup.isPreset ? "Preset" : currentAddingGroup.eventId ? "Event Squad" : "Listed Pool"}
              </Badge>
            </div>
          ) : null}

          {/* Quick Import from Volunteer Preset Chips */}
          {chapterPresets.length > 0 && (
            <div className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-1.5">
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} /> Quick Import from Volunteer Preset
              </span>
              <div className="flex flex-wrap gap-1.5">
                {chapterPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (currentAddingGroup) {
                        handleApplyPresetToSquad(preset.id, currentAddingGroup);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-bg border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-text hover:border-purple-500 hover:text-purple-600 transition shadow-2xs"
                    title={`Import all ${preset.memberIds.length} students from ${preset.name}`}
                  >
                    <span>{preset.name}</span>
                    <span className="text-[9px] text-text-mute font-mono">({preset.memberIds.length})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Bar with Icon and Clear Button */}
          <div>
            <FieldLabel>Search Students</FieldLabel>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim" />
              <Input
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="Search by student name, email, department, year, or ID..."
                className="pl-9 pr-8 text-xs w-full"
                autoFocus
              />
              {studentSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setStudentSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text p-0.5 rounded transition"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Search Results / Student List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-text-dim px-0.5">
              <span>
                {filteredAddStudents.length}{" "}
                {filteredAddStudents.length === 1 ? "student" : "students"} found
              </span>
              {selectedStudentForGroup && (
                <span className="text-[var(--accent)] font-semibold">1 student selected</span>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border bg-bg p-1 pr-1.5 shadow-2xs">
              {filteredAddStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-dim">
                  No chapter students found matching &ldquo;{studentSearchQuery}&rdquo;
                </div>
              ) : (
                filteredAddStudents.map((s) => {
                  const isInSquad = Boolean(
                    currentAddingGroup?.memberIds.includes(s.id),
                  );
                  const isSelected = selectedStudentForGroup === s.id;

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        if (!isInSquad) {
                          setSelectedStudentForGroup(s.id);
                        }
                      }}
                      className={`flex items-center justify-between gap-2.5 p-2 rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30"
                          : isInSquad
                            ? "opacity-60 bg-bg-page/30 cursor-default"
                            : "hover:bg-bg-page/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-[10px] ${
                            isSelected
                              ? "bg-[var(--accent)] text-white"
                              : "bg-bg-page border border-border text-text"
                          }`}
                        >
                          {initials(s.fullName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-text truncate">
                              {s.fullName}
                            </span>
                            {s.elevatesId && (
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-bg-page border border-border text-text-dim">
                                {s.elevatesId}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-dim truncate">
                            {s.email}
                            {s.department ? ` · ${s.department}` : ""}
                            {s.year ? ` (Yr ${s.year})` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isInSquad ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                            <Check size={11} /> In Squad
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant={isSelected ? "orange" : "ghost"}
                            className="text-[11px] py-0.5 px-2 h-7 font-bold border border-border"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (addingMembersGroupId) {
                                handleQuickAddMemberToGroup(addingMembersGroupId, s.id);
                              }
                            }}
                          >
                            + Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                setAddingMembersGroupId(null);
                setSelectedStudentForGroup("");
                setStudentSearchQuery("");
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              disabled={
                !selectedStudentForGroup ||
                Boolean(currentAddingGroup?.memberIds.includes(selectedStudentForGroup))
              }
              onClick={() => {
                if (addingMembersGroupId && selectedStudentForGroup) {
                  handleAddMemberToGroup(addingMembersGroupId, selectedStudentForGroup);
                }
              }}
              className="text-xs font-bold"
            >
              Add Selected to Squad
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG 4: ASSIGN GROUP OR STUDENT TO EVENT DIRECTLY */}
      <Dialog
        open={Boolean(assignEventTarget)}
        onClose={() => {
          setAssignEventTarget(null);
          setSelectedEventId("");
          setAssignStudentId("");
          setAssignStudentSearch("");
        }}
        title={assignEventTarget?.title || "Assign to Event"}
        description="Grant delegated event powers directly synchronized with the event schedule."
        className="max-w-lg"
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

          {/* If assigning an individual student, provide search and student selection */}
          {assignEventTarget?.targetType === "student" && (
            <div className="space-y-2">
              <FieldLabel>Student Volunteer</FieldLabel>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim" />
                <Input
                  value={assignStudentSearch}
                  onChange={(e) => setAssignStudentSearch(e.target.value)}
                  placeholder="Search students by name, email, department, ID..."
                  className="pl-9 pr-8 text-xs w-full"
                />
                {assignStudentSearch ? (
                  <button
                    type="button"
                    onClick={() => setAssignStudentSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text p-0.5 rounded transition"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>

              <div className="max-h-44 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border bg-bg p-1 shadow-2xs">
                {filteredAssignStudents.length === 0 ? (
                  <div className="py-4 text-center text-xs text-text-dim">
                    No chapter students found matching &ldquo;{assignStudentSearch}&rdquo;
                  </div>
                ) : (
                  filteredAssignStudents.map((s) => {
                    const isSelected = (assignStudentId || assignEventTarget.studentId) === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setAssignStudentId(s.id)}
                        className={`flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer transition ${
                          isSelected
                            ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30 font-semibold"
                            : "hover:bg-bg-page/70"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              isSelected
                                ? "bg-[var(--accent)] text-white"
                                : "bg-bg-page border border-border text-text"
                            }`}
                          >
                            {initials(s.fullName)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs text-text truncate block">{s.fullName}</span>
                            <span className="text-[10px] text-text-dim truncate block">
                              {s.email} {s.elevatesId ? `· ${s.elevatesId}` : ""}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-[var(--accent)] flex items-center gap-1">
                            <Check size={12} /> Selected
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {selectedEventId && (
            <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Check size={14} className="shrink-0" />
              <span>
                Schedule automatically synchronized with event dates (
                {formatDate(store.events.find((e) => e.id === selectedEventId)?.startsAt || "")}).
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                setAssignEventTarget(null);
                setSelectedEventId("");
                setAssignStudentId("");
                setAssignStudentSearch("");
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              disabled={
                !selectedEventId ||
                (assignEventTarget?.targetType === "student" &&
                  !(assignStudentId || assignEventTarget?.studentId))
              }
              onClick={handleAssignToEvent}
              className="text-xs font-bold"
            >
              Confirm Assignment
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG 5: APPLY PRESET TO SQUAD MODAL */}
      {applyPresetTargetSquad && (
        <Dialog
          open={Boolean(applyPresetTargetSquad)}
          onClose={() => setApplyPresetTargetSquad(null)}
          title={`Apply Volunteer Preset to "${applyPresetTargetSquad.name}"`}
          description={
            applyPresetTargetSquad.eventId
              ? "Select a preset to directly assign its students to this event."
              : "Select a preset to import all its student members into this squad."
          }
          className="max-w-md"
        >
          <div className="space-y-4">
            {chapterPresets.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-xl space-y-3">
                <Sparkles className="mx-auto h-8 w-8 text-purple-500 opacity-80" />
                <div>
                  <p className="text-xs font-bold text-text">No Reusable Presets Created Yet</p>
                  <p className="text-[11px] text-text-dim mt-1">
                    Create reusable student presets so you can assign teams with one click.
                  </p>
                </div>
                <Button
                  variant="orange"
                  onClick={() => {
                    setApplyPresetTargetSquad(null);
                    startCreatePreset();
                  }}
                  className="text-xs font-bold"
                >
                  + Create First Preset
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {chapterPresets.map((preset) => {
                  const memberCount = preset.memberIds.length;
                  return (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-bg hover:border-purple-500/50 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-text truncate">
                            {preset.name}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.2 text-[9px] font-bold">
                            <Sparkles size={9} /> Preset
                          </span>
                        </div>
                        {preset.description && (
                          <p className="text-[11px] text-text-dim truncate mt-0.5">
                            {preset.description}
                          </p>
                        )}
                        <span className="text-[10px] text-text-mute font-mono block mt-1">
                          {memberCount} {memberCount === 1 ? "student" : "students"} in preset
                        </span>
                      </div>

                      <Button
                        variant="orange"
                        className="text-xs font-bold shrink-0"
                        onClick={() => handleApplyPresetToSquad(preset.id, applyPresetTargetSquad)}
                      >
                        ⚡ Apply ({memberCount})
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setApplyPresetTargetSquad(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* DIALOG 6: ASSIGN PRESET DIRECTLY TO EVENT MODAL */}
      {assignPresetTargetGroup && (
        <Dialog
          open={Boolean(assignPresetTargetGroup)}
          onClose={() => {
            setAssignPresetTargetGroup(null);
            setSelectedEventId("");
          }}
          title={`Assign Preset "${assignPresetTargetGroup.name}" to Event`}
          description="Choose an event. All preset students will be assigned directly without asking for date ranges."
          className="max-w-md"
        >
          <div className="space-y-4">
            <div>
              <FieldLabel>Select Chapter Event</FieldLabel>
              <Select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">Select an event…</option>
                {store.events
                  .filter((e) => e.chapterId === chapter.id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.status})
                    </option>
                  ))}
              </Select>
            </div>

            {selectedEventId && (
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Check size={13} />
                  Direct Event Synchronization
                </div>
                <p className="text-[11px] text-text-dim">
                  All {assignPresetTargetGroup.memberIds.length} preset students will be assigned directly to{" "}
                  <strong>{store.events.find((e) => e.id === selectedEventId)?.title}</strong> for the event duration (
                  {formatDate(store.events.find((e) => e.id === selectedEventId)?.startsAt || "")}).
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => {
                  setAssignPresetTargetGroup(null);
                  setSelectedEventId("");
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="orange"
                disabled={!selectedEventId}
                onClick={() => handleAssignPresetToEvent(assignPresetTargetGroup.id, selectedEventId)}
                className="text-xs font-bold"
              >
                Assign Directly to Event
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
