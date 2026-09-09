"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
  Shield,
  GraduationCap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Input } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow, resolveChapter } from "@/lib/access";
import { isSuperAdmin } from "@/lib/permissions";
import { formatDateTime, initials } from "@/lib/utils";
import { generateElevatesId } from "@/lib/forms/helpers";
import { roleKeyLabel } from "@/lib/leadership";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import type { Chapter, LeadershipAssignment, LeadershipTerm, Profile, RoleKey, UserRole } from "@/types";

interface ChapterMemberItem {
  id: string;
  elevatesId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  year: string;
  section: string;
  skills: string[];
  interests: string[];
  status: "claimed" | "unclaimed" | "pending";
  roleInfo: {
    label: string;
    tone: "orange" | "cyan" | "green" | "magenta" | "mute";
  };
  collectedAt: string;
  createdAt?: string;
  joinedAt?: string;
}

function resolveMemberRole(
  profileId: string,
  chapter: Chapter,
  userRoles: UserRole[],
  leadershipAssignments: LeadershipAssignment[],
  leadershipTerms: LeadershipTerm[],
): { label: string; tone: "orange" | "cyan" | "green" | "magenta" | "mute" } {
  if (
    chapter.campusLeadId === profileId ||
    chapter.customSettings?.campus_lead_id === profileId ||
    chapter.customSettings?.campusLeadId === profileId
  ) {
    return { label: "Campus Lead", tone: "orange" };
  }
  if (chapter.facultyId === profileId) {
    return { label: "Faculty Coordinator", tone: "magenta" };
  }
  const termIds = new Set(
    leadershipTerms.filter((t) => t.chapterId === chapter.id).map((t) => t.id),
  );
  const leadAssign = leadershipAssignments.find(
    (la) => termIds.has(la.termId) && la.userId === profileId,
  );
  if (leadAssign) {
    return {
      label: leadAssign.title || roleKeyLabel(leadAssign.roleKey),
      tone: "cyan",
    };
  }
  const uRole = userRoles.find(
    (ur) => ur.chapterId === chapter.id && ur.userId === profileId,
  );
  if (uRole?.roleKey) {
    const rk = uRole.roleKey as RoleKey;
    if (rk === "campus_lead" || rk === "chairman") {
      return { label: "Campus Lead", tone: "orange" };
    }
    if (rk === "faculty_coordinator") {
      return { label: "Faculty Coordinator", tone: "magenta" };
    }
    if (rk === "class_representative") {
      return { label: "Class Rep", tone: "cyan" };
    }
    return { label: roleKeyLabel(rk), tone: "mute" };
  }
  return { label: "Student Member", tone: "mute" };
}

export default function ChapterStudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, createUser, approveJoinRequests, rejectJoinRequests } = useStore();
  const { session } = useCurrentUser();
  const chapter = resolveChapter(store, slug, session.roleKey, session.chapterId);
  const targetChapter = chapter || store.chapters.find((c) => c.slug === slug);

  const isCampusLead = session.roleKey === "campus_lead";
  const canDelete = !isCampusLead && isSuperAdmin(session.roleKey);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "claimed" | "unclaimed">("all");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("all");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkReport, setBulkReport] = useState<{
    summary: { total: number; succeeded: number; failed: number };
    results: { row: number; name: string; email: string; status: "success" | "error"; message: string }[];
  } | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "Unassigned",
    year: "1st Year",
    section: "A",
    skills: "",
    interests: "",
  });

  // Strictly filter profiles that belong ONLY to this chapter
  const chapterMembers: ChapterMemberItem[] = useMemo(() => {
    if (!targetChapter) return [];
    const rawProfiles = (store.profiles ?? []).filter(
      (p) => p.chapterId === targetChapter.id,
    );

    return rawProfiles.map((p) => {
      const elevatesId = p.elevatesId || generateElevatesId(p.id);
      const roleInfo = resolveMemberRole(
        p.id,
        targetChapter,
        store.userRoles ?? [],
        store.leadershipAssignments ?? [],
        store.leadershipTerms ?? [],
      );

      let status: "claimed" | "unclaimed" | "pending" = "claimed";
      if ((p.status as unknown as string) === "disabled") status = "unclaimed";
      else if ((p.status as unknown as string) === "pending") status = "pending";

      return {
        id: p.id,
        elevatesId,
        fullName: p.fullName,
        email: p.email || "",
        phone: p.phone || "",
        department: p.department?.trim() || "Unassigned",
        year: p.year || "1st Year",
        section: p.section || "A",
        skills: p.skills || [],
        interests: p.interests || [],
        status,
        roleInfo,
        collectedAt: new Date().toISOString().split("T")[0],
        createdAt: p.createdAt,
        joinedAt: p.joinedAt || p.createdAt,
      };
    });
  }, [
    store.profiles,
    store.userRoles,
    store.leadershipAssignments,
    store.leadershipTerms,
    targetChapter,
  ]);

  const chapterDepartments = useMemo(() => {
    if (!targetChapter) return [];
    const deptsFromStore = (store.departments ?? [])
      .filter((d) => d.chapterId === targetChapter.id)
      .map((d) => d.name);
    const deptsFromMembers = chapterMembers
      .map((m) => m.department)
      .filter((d) => d && d !== "Unassigned");
    return [...new Set([...deptsFromStore, ...deptsFromMembers])].sort();
  }, [store.departments, targetChapter, chapterMembers]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chapterMembers.filter((s) => {
      const matchesSearch =
        !q ||
        s.elevatesId.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.roleInfo.label.toLowerCase().includes(q) ||
        s.skills.some((sk) => sk.toLowerCase().includes(q));

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "claimed" && s.status === "claimed") ||
        (filterStatus === "unclaimed" && (s.status === "unclaimed" || s.status === "pending"));

      const matchesDept =
        selectedDepartmentFilter === "all" ||
        s.department.toLowerCase() === selectedDepartmentFilter.toLowerCase() ||
        (selectedDepartmentFilter.toLowerCase() === "unassigned" &&
          (!s.department || s.department.toLowerCase() === "unassigned"));

      const matchesRole =
        selectedRoleFilter === "all" ||
        s.roleInfo.label.toLowerCase().includes(selectedRoleFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesDept && matchesRole;
    });
  }, [
    chapterMembers,
    search,
    filterStatus,
    selectedDepartmentFilter,
    selectedRoleFilter,
  ]);

  if (!targetChapter) {
    return <ChapterNotFound />;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const exportRosterToCsv = () => {
    const headers = [
      "Member Number (Elevates ID)",
      "Full Name",
      "Chapter Role",
      "Department",
      "Year",
      "Section",
      "Email",
      "Phone",
      "Skills",
      "Account Status",
    ];

    const rows = filteredStudents.map((m) => [
      `"${m.elevatesId}"`,
      `"${m.fullName.replace(/"/g, '""')}"`,
      `"${m.roleInfo.label}"`,
      `"${(m.department || "").replace(/"/g, '""')}"`,
      `"${m.year || ""}"`,
      `"${m.section || ""}"`,
      `"${m.email}"`,
      `"${m.phone || ""}"`,
      `"${m.skills.join("; ")}"`,
      `"${m.status}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${targetChapter.slug}-member-roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const skillsArr = formData.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const interestsArr = formData.interests
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    createUser({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      year: formData.year,
      section: formData.section,
      skills: skillsArr,
      interests: interestsArr,
      chapterId: targetChapter.id,
      roleKey: "student",
    });

    setIsAdding(false);
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      department: "Unassigned",
      year: "1st Year",
      section: "A",
      skills: "",
      interests: "",
    });

    setSyncSuccessMsg(`✓ Successfully added member to ${targetChapter.name}!`);
    setTimeout(() => setSyncSuccessMsg(""), 4000);
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    setIsBulkLoading(true);
    setBulkReport(null);
    try {
      const res = await fetch("/api/provisioning/bulk-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actingUserId: store.session.userId,
          chapterId: targetChapter.id,
          csvContent: bulkText,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setBulkReport({
          summary: data.summary,
          results: data.results,
        });

        data.results.forEach((r: any) => {
          if (r.status === "success") {
            createUser({
              fullName: r.name,
              email: r.email,
              chapterId: targetChapter.id,
              roleKey: "student",
            });
          }
        });
      } else {
        alert(`Bulk import error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Bulk import exception: ${err.message}`);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleSyncToProfile = (stu: ChapterMemberItem) => {
    createUser({
      fullName: stu.fullName,
      email: stu.email,
      phone: stu.phone,
      department: stu.department,
      year: stu.year,
      section: stu.section,
      skills: stu.skills,
      chapterId: targetChapter.id,
      roleKey: "student",
    });

    setSyncSuccessMsg(
      `✓ Successfully synced profile for ${stu.fullName}! Their Elevates account is now active.`,
    );
    setTimeout(() => setSyncSuccessMsg(""), 4000);
  };

  const handleDelete = (id: string) => {
    if (!canDelete) return;
    if (confirm("Remove member from this chapter?")) {
      fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          table: "profiles",
          id,
          payload: { chapter_id: null },
        }),
      }).catch(console.error);
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleBatchApprove = async () => {
    if (!selectedStudentIds.length) return;
    await approveJoinRequests(selectedStudentIds, "student", targetChapter.id);
    setSyncSuccessMsg(`✓ Approved ${selectedStudentIds.length} join requests into ${targetChapter.name}!`);
    setSelectedStudentIds([]);
    setTimeout(() => setSyncSuccessMsg(""), 4000);
  };

  const handleBatchReject = async () => {
    if (!selectedStudentIds.length) return;
    await rejectJoinRequests(selectedStudentIds);
    setSyncSuccessMsg(`Rejected ${selectedStudentIds.length} join requests.`);
    setSelectedStudentIds([]);
    setTimeout(() => setSyncSuccessMsg(""), 4000);
  };

  const activeSyncedCount = chapterMembers.filter((m) => m.status === "claimed").length;
  const pendingCount = chapterMembers.filter((m) => m.status !== "claimed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={chapterEyebrow(store.session.roleKey, "people")}
        title={`${targetChapter.name} Members Roster`}
        description={`Showing all official Supabase user profiles and verified student members registered in ${targetChapter.name} (${targetChapter.college}).`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={exportRosterToCsv}
              className="flex items-center gap-1.5 text-xs"
              title="Download full member roster as CSV spreadsheet"
            >
              <Download size={14} /> Export CSV
            </Button>
            <Link href="/referrals">
              <Button
                variant="secondary"
                className="flex items-center gap-1.5 text-xs"
              >
                Invite Students
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <FileSpreadsheet size={14} /> Bulk CSV Import
            </Button>
            <Button
              variant="orange"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus size={14} /> Add Member
            </Button>
          </div>
        }
      />

      {syncSuccessMsg && (
        <div className="rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 animate-fade-in">
          {syncSuccessMsg}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat
          label="Chapter Members"
          value={chapterMembers.length}
          hint="Strictly this chapter"
          accent="cyan"
        />
        <Stat
          label="Synced Supabase Profiles"
          value={activeSyncedCount}
          hint="Active accounts"
          accent="green"
        />
        <Stat
          label="Pending / Unclaimed"
          value={pendingCount}
          hint="Pre-registered"
          accent="orange"
        />
        <Stat
          label="Campus Departments"
          value={chapterDepartments.length}
          hint={targetChapter.city || targetChapter.college}
          accent="magenta"
        />
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Elevates ID (ELV-...), name, email, role, or phone..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["all", "claimed", "unclaimed"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                filterStatus === st
                  ? "bg-text text-bg-page shadow-sm"
                  : "bg-bg-panel text-text-dim hover:text-text border border-border/40"
              }`}
            >
              {st === "all"
                ? `All Members (${chapterMembers.length})`
                : st === "claimed"
                  ? `Active Synced (${activeSyncedCount})`
                  : `Unclaimed (${pendingCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Department Filter Pills */}
      {chapterDepartments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-text-dim mr-1">Department:</span>
          <button
            type="button"
            onClick={() => setSelectedDepartmentFilter("all")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              selectedDepartmentFilter === "all"
                ? "bg-text text-bg-page shadow-sm"
                : "bg-bg-panel text-text-dim hover:text-text border border-border/50"
            }`}
          >
            All Departments ({chapterMembers.length})
          </button>
          {chapterDepartments.map((dept: string) => {
            const count = chapterMembers.filter(
              (s) => s.department.toLowerCase() === dept.toLowerCase(),
            ).length;
            const isSelected =
              selectedDepartmentFilter.toLowerCase() === dept.toLowerCase();
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDepartmentFilter(dept)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  isSelected
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-bg-panel text-text-dim hover:text-text border border-border/50"
                }`}
              >
                {dept} ({count})
              </button>
            );
          })}
          {chapterMembers.some(
            (s) => !s.department || s.department.toLowerCase() === "unassigned",
          ) && (
            <button
              type="button"
              onClick={() => setSelectedDepartmentFilter("Unassigned")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                selectedDepartmentFilter.toLowerCase() === "unassigned"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-bg-panel text-text-dim hover:text-text border border-border/50"
              }`}
            >
              Unassigned (
              {
                chapterMembers.filter(
                  (s) => !s.department || s.department.toLowerCase() === "unassigned",
                ).length
              }
              )
            </button>
          )}
        </div>
      )}

      {/* Role Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-xs text-text-dim mr-1">Role:</span>
        {(["all", "Campus Lead", "Faculty", "Class Rep", "Student"] as const).map((r) => {
          const isSelected =
            selectedRoleFilter === (r === "all" ? "all" : r.toLowerCase());
          return (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRoleFilter(r === "all" ? "all" : r.toLowerCase())}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                isSelected
                  ? "bg-text text-bg-page shadow-sm"
                  : "bg-bg-panel text-text-dim hover:text-text border border-border/40"
              }`}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* Multi-Select Action Bar */}
      {selectedStudentIds.length > 0 && (
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--accent)] bg-[var(--accent)]/10 p-4">
          <span className="text-xs font-semibold text-text">
            {selectedStudentIds.length} candidate(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleBatchReject} className="text-xs text-red-400">
              Reject Selected
            </Button>
            <Button variant="orange" onClick={handleBatchApprove} className="text-xs">
              <CheckCircle size={14} className="mr-1" /> Accept Selected ({selectedStudentIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Student & Member List Table */}
      <div className="rounded-[var(--radius-lg)] bg-bg-panel p-5 shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-dim">
                <th className="pb-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      filteredStudents.length > 0 &&
                      selectedStudentIds.length === filteredStudents.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="pb-3 font-semibold">Member Number</th>
                <th className="pb-3 font-semibold">Member Name & Role</th>
                <th className="pb-3 font-semibold">Contact & Phone</th>
                <th className="pb-3 font-semibold">Department & Year</th>
                <th className="pb-3 font-semibold">Skills / Tags</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((stu) => {
                  const isSelected = selectedStudentIds.includes(stu.id);
                  const isCopied = copiedId === stu.elevatesId;

                  return (
                    <tr
                      key={stu.id}
                      className={`group hover:bg-bg-page/50 transition-colors ${
                        isSelected ? "bg-[var(--accent)]/5" : ""
                      }`}
                    >
                      <td className="py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(stu.id)}
                          className="rounded border-border"
                        />
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/25">
                            {stu.elevatesId}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(stu.elevatesId)}
                            className="text-text-mute hover:text-text transition-colors p-1"
                            title="Copy Member Number"
                          >
                            {isCopied ? (
                              <Check size={12} className="text-emerald-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center shrink-0 overflow-hidden rounded-full bg-[var(--secondary-soft)] text-xs font-bold text-[var(--secondary)]">
                            {initials(stu.fullName)}
                          </span>
                          <div>
                            <Link
                              href={`/profile/${stu.elevatesId || stu.id}`}
                              className="font-semibold text-text hover:text-[var(--accent)] hover:underline transition-colors"
                            >
                              {stu.fullName}
                            </Link>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <Badge tone={stu.roleInfo.tone}>
                                {stu.roleInfo.label}
                              </Badge>
                              {(stu.createdAt || stu.joinedAt) ? (
                                <span className="font-mono text-[10px] text-text-mute">
                                  Joined {formatDateTime((stu.createdAt || stu.joinedAt)!)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 text-text-dim">
                        <div className="flex flex-col gap-0.5">
                          {stu.phone ? (
                            <a
                              href={`tel:${stu.phone}`}
                              className="flex items-center gap-1 text-text hover:underline"
                            >
                              <Phone size={11} className="text-text-dim" /> {stu.phone}
                            </a>
                          ) : (
                            <span className="text-[11px] text-text-mute">—</span>
                          )}
                          <a
                            href={`mailto:${stu.email}`}
                            className="flex items-center gap-1 text-[11px] hover:text-[var(--accent)]"
                          >
                            <Mail size={11} className="text-text-dim" /> {stu.email}
                          </a>
                        </div>
                      </td>

                      <td className="py-3 text-text">
                        <div>
                          <p className="font-medium">{stu.department}</p>
                          <p className="text-[11px] text-text-dim">
                            {stu.year} {stu.section ? `· Sec ${stu.section}` : ""}
                          </p>
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {stu.skills.length > 0 ? (
                            stu.skills.map((sk) => (
                              <span
                                key={sk}
                                className="rounded bg-[var(--neutral-100)] px-1.5 py-0.5 text-[10px] font-medium text-text"
                              >
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-text-mute">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3">
                        {stu.status === "claimed" ? (
                          <Badge tone="green">
                            <UserCheck size={11} className="mr-1" /> Active Profile
                          </Badge>
                        ) : stu.status === "pending" ? (
                          <Badge tone="orange">
                            <Clock size={11} className="mr-1" /> Pending Approval
                          </Badge>
                        ) : (
                          <Badge tone="orange">
                            <Clock size={11} className="mr-1" /> Unclaimed
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {stu.status === "unclaimed" && (
                            <Button
                              variant="orange"
                              size="sm"
                              onClick={() => handleSyncToProfile(stu)}
                              className="h-7 px-2.5 text-[11px]"
                            >
                              <Sparkles size={12} className="mr-1" /> Sync
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(stu.id)}
                              className="h-7 px-2 text-red-500 hover:bg-red-50"
                              title="Remove member from chapter"
                            >
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-dim">
                    <Users size={32} className="mx-auto mb-2 text-text-mute opacity-50" />
                    <p className="font-medium">No members found</p>
                    <p className="text-[11px] text-text-mute mt-1">
                      {search
                        ? `No members match search query "${search}"`
                        : "No members registered in this chapter yet."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Single Student Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[var(--radius-xl)] bg-bg-panel p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                  Add Student to Database
                </h3>
                <p className="text-xs text-text-dim">Pre-collect skill & contact data for auto-sync</p>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="rounded-full p-1.5 text-text-dim hover:bg-bg-page hover:text-text"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-text">Student Full Name</label>
                <Input
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Student Full Name"
                  className="mt-1"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-text">Email Address</label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="student@student.edu.in"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text">Phone / WhatsApp</label>
                  <Input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98471 00000"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-text">Department</label>
                  <select
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-border bg-bg-page px-3 py-2 text-xs text-text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="Unassigned">-- Unassigned --</option>
                    {chapterDepartments.map((dept: string) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-text">Year</label>
                  <select
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-border bg-bg-page px-3 py-2 text-xs text-text"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-text">Technical Skills (Comma separated)</label>
                <Input
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="e.g. React, Python, Kali Linux, Figma, Arduino"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="font-semibold text-text">Interests / Focus Areas</label>
                <Input
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  placeholder="e.g. Web Development, CTF, Hardware"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button variant="secondary" type="button" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button variant="orange" type="submit">
                  Save to Student DB
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] bg-bg-panel p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                  Bulk CSV Import
                </h3>
                <p className="text-xs text-text-dim">Paste CSV lines from Google Sheets / Excel</p>
              </div>
              <button
                onClick={() => setIsBulkOpen(false)}
                className="rounded-full p-1.5 text-text-dim hover:bg-bg-page hover:text-text"
              >
                <X size={18} />
              </button>
            </div>

            {bulkReport ? (
              <div className="mt-4 space-y-4 text-xs">
                <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                  <span>
                    Import Complete: {bulkReport.summary.succeeded} succeeded, {bulkReport.summary.failed} failed out of {bulkReport.summary.total} rows.
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 rounded-[var(--radius-md)] border border-border bg-bg-page p-3">
                  {bulkReport.results.map((res) => (
                    <div key={res.row} className="flex items-center justify-between border-b border-border/50 pb-1.5 text-[11px]">
                      <div>
                        <span className="font-semibold text-text">Row {res.row}: {res.name}</span>{" "}
                        <span className="text-text-mute">({res.email})</span>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${res.status === "success"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                          }`}
                      >
                        {res.status === "success" ? "Success" : res.message}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="orange"
                    onClick={() => {
                      setIsBulkOpen(false);
                      setBulkReport(null);
                      setBulkText("");
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBulkImport} className="mt-4 space-y-4 text-xs">
                <div className="rounded-[var(--radius-md)] bg-[var(--neutral-100)] p-3 text-[11px] text-text-dim font-mono">
                  Format: Name, Email, Phone, Department, Year, Skills (separated by semicolons)
                  <br />
                  Example: John Doe, john@student.edu.in, 9847123456, CSE, 3rd Year, React; Python; Git
                </div>

                <div>
                  <label className="font-semibold text-text">CSV Data</label>
                  <textarea
                    rows={6}
                    required
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Paste multiple rows here..."
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-border bg-bg-page p-2.5 font-mono text-xs text-text"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                  <Button variant="secondary" type="button" onClick={() => setIsBulkOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="orange" type="submit" disabled={isBulkLoading}>
                    {isBulkLoading ? "Validating & Importing..." : "Import All"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
