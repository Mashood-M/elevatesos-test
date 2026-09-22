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
  Filter,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  Shield,
  GraduationCap,
  Tag,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Input } from "@/components/ui/input";
import { useCurrentUser, useStore } from "@/context/store-context";
import { chapterEyebrow, resolveChapter } from "@/lib/access";
import { isSuperAdmin } from "@/lib/permissions";
import { getUserVolunteerPowers } from "@/lib/volunteers";
import { cn, formatDateTime, initials } from "@/lib/utils";
import { generateElevatesId, cohortRepIds } from "@/lib/forms/helpers";
import { roleKeyLabel } from "@/lib/leadership";
import { ChapterNotFound } from "@/components/chapter/chapter-not-found";
import type { Chapter, ClassCohort, LeadershipAssignment, LeadershipTerm, Profile, RoleKey, UserRole } from "@/types";

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
  volunteerTag?: string;
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
    (la) => termIds.has(la.termId) && la.userId === profileId && la.roleKey !== "volunteer",
  );
  if (leadAssign) {
    return {
      label: leadAssign.title || roleKeyLabel(leadAssign.roleKey),
      tone: "cyan",
    };
  }
  const uRole = userRoles.find(
    (ur) => ur.chapterId === chapter.id && ur.userId === profileId && ur.roleKey !== "volunteer",
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

  // Class Representative Scoped Cohort
  const myClassCohort = useMemo(() => {
    if (session.roleKey !== "class_representative" || !targetChapter) return null;
    const fromCohorts = (store.classCohorts ?? []).find(
      (c) =>
        (c.chapterId === targetChapter.id || !c.chapterId) &&
        cohortRepIds(c).includes(session.userId),
    );
    if (fromCohorts) return fromCohorts;
    const myProfile = store.profiles.find((p) => p.id === session.userId);
    if (myProfile?.department && myProfile?.year) {
      return {
        id: "rep-profile-cohort",
        chapterId: targetChapter.id,
        department: myProfile.department,
        year: myProfile.year,
        section: myProfile.section || "",
        repIds: [session.userId],
      } as ClassCohort;
    }
    return null;
  }, [session.roleKey, session.userId, store.classCohorts, store.profiles, targetChapter]);

  // Strictly filter profiles that belong ONLY to this chapter
  // For Class Representatives: strictly filter to students belonging to their assigned class!
  const chapterMembers: ChapterMemberItem[] = useMemo(() => {
    if (!targetChapter) return [];
    let rawProfiles = (store.profiles ?? []).filter(
      (p) => p.chapterId === targetChapter.id,
    );

    if (session.roleKey === "class_representative" && myClassCohort) {
      rawProfiles = rawProfiles.filter((p) => {
        const matchDept =
          (p.department || "").trim().toLowerCase() === myClassCohort.department.trim().toLowerCase();
        const matchYear =
          (p.year || "").trim().toLowerCase() === myClassCohort.year.trim().toLowerCase();
        const matchSec =
          !myClassCohort.section ||
          !p.section ||
          p.section.trim().toLowerCase() === myClassCohort.section.trim().toLowerCase();
        return matchDept && matchYear && matchSec;
      });
    }

    return rawProfiles.map((p) => {
      const elevatesId = p.elevatesId || generateElevatesId(p.id);
      const roleInfo = resolveMemberRole(
        p.id,
        targetChapter,
        store.userRoles ?? [],
        store.leadershipAssignments ?? [],
        store.leadershipTerms ?? [],
      );

      const vol = getUserVolunteerPowers(store, p.id);

      let status: "claimed" | "unclaimed" | "pending" = "claimed";
      if ((p.status as unknown as string) === "disabled") status = "unclaimed";
      else if ((p.status as unknown as string) === "pending") status = "pending";

      const isExecutiveLead =
        roleInfo.label.toLowerCase().includes("lead") ||
        roleInfo.label.toLowerCase().includes("coordinator") ||
        roleInfo.label.toLowerCase().includes("chairman");

      const rawVolunteerTag = vol.isVolunteer ? vol.effectiveTag : undefined;
      // Prevent duplicate or clashing badges: only show volunteerTag if distinct from role label and not a duplicate lead tag
      const volunteerTag =
        rawVolunteerTag &&
        rawVolunteerTag.toLowerCase() !== roleInfo.label.toLowerCase() &&
        !rawVolunteerTag.toLowerCase().includes("lead") &&
        !isExecutiveLead
          ? rawVolunteerTag
          : undefined;

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
        volunteerTag,
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

  const exportdirectoryToCsv = () => {
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
    link.setAttribute("download", `${targetChapter.slug}-member-directory.csv`);
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

        data.results.forEach((r: { status: string; name: string; email: string }) => {
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
    } catch (err: unknown) {
      alert(`Bulk import exception: ${err instanceof Error ? err.message : String(err)}`);
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
        eyebrow={chapterEyebrow(session.roleKey, "people")}
        title={`${targetChapter.name} Members directory`}
        description={`Official student directory and member profiles registered in ${targetChapter.name} (${targetChapter.college}).`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={exportdirectoryToCsv}
              className="flex items-center gap-1.5 text-xs"
              title="Download full member directory as CSV spreadsheet"
            >
              <Download size={14} /> Export CSV
            </Button>
            {session.roleKey !== "class_representative" && (
              <Link href="/referrals">
                <Button
                  variant="secondary"
                  className="flex items-center gap-1.5 text-xs"
                >
                  <UserPlus size={14} /> Invite Students
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {session.roleKey === "class_representative" && myClassCohort && (
        <div className="rounded-[var(--radius-xl)] border border-cyan-500/25 bg-cyan-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[var(--shadow-sm)] animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-500 shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-text">Class Representative View</p>
                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                  Assigned Cohort
                </span>
              </div>
              <p className="text-[12px] text-text-dim mt-0.5">
                Showing enrolled students in{" "}
                <strong className="text-text font-semibold">
                  {myClassCohort.department} · {myClassCohort.year}
                  {myClassCohort.section ? ` (Sec ${myClassCohort.section})` : ""}
                </strong>
              </p>
            </div>
          </div>
          <Badge tone="cyan">{chapterMembers.length} Students in Class</Badge>
        </div>
      )}

      {syncSuccessMsg && (
        <div className="rounded-[var(--radius-lg)] border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 shadow-[var(--shadow-sm)] animate-fade-in">
          <CheckCircle size={15} className="shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={session.roleKey === "class_representative" ? "Class Members" : "Total Members"}
          value={chapterMembers.length}
          hint={session.roleKey === "class_representative" ? "Enrolled in your class" : "Strictly this chapter"}
          accent="cyan"
        />
        <Stat
          label="Active Accounts"
          value={activeSyncedCount}
          hint="Synced Supabase profiles"
          accent="green"
        />
        <Stat
          label="Pending / Unclaimed"
          value={pendingCount}
          hint="Pre-registered members"
          accent="orange"
        />
        {session.roleKey !== "class_representative" ? (
          <Stat
            label="Campus Departments"
            value={chapterDepartments.length}
            hint={targetChapter.city || targetChapter.college}
            accent="magenta"
          />
        ) : (
          <Stat
            label="Assigned Cohort"
            value={myClassCohort ? `${myClassCohort.year}${myClassCohort.section ? ` · Sec ${myClassCohort.section}` : ""}` : "Class"}
            hint={myClassCohort?.department || "Your class"}
            accent="magenta"
          />
        )}
      </div>

      {/* Modern Unified Filter Toolbar */}
      <div className="rounded-[var(--radius-xl)] bg-bg-panel border border-border/70 p-3 sm:p-3.5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[240px] max-w-md flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-mute" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                session.roleKey === "class_representative"
                  ? "Search ID, name, email, or phone..."
                  : "Search ID, name, email, or role..."
              }
              className="h-9 pl-9 pr-8 text-xs rounded-xl bg-bg-page/70 border-border/70 hover:border-border focus:bg-bg-panel focus:border-[var(--accent)] transition-all placeholder:text-text-mute/80"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-mute hover:text-text p-1 rounded-full cursor-pointer"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Department Filter Chip */}
          {session.roleKey !== "class_representative" && (
            <div className="relative inline-flex items-center">
              <div className="flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-bg-page/70 pl-2.5 pr-7 text-xs text-text hover:border-border transition-colors focus-within:border-[var(--accent)]">
                <GraduationCap size={13} className="text-text-mute shrink-0" />
                <select
                  value={selectedDepartmentFilter}
                  onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                  className="bg-transparent text-xs text-text font-medium focus:outline-none cursor-pointer appearance-none"
                >
                  <option value="all">All Departments ({chapterMembers.length})</option>
                  {chapterDepartments.map((dept) => {
                    const count = chapterMembers.filter(
                      (s) => s.department.toLowerCase() === dept.toLowerCase()
                    ).length;
                    return (
                      <option key={dept} value={dept}>
                        {dept} ({count})
                      </option>
                    );
                  })}
                  {chapterMembers.some(
                    (s) => !s.department || s.department.toLowerCase() === "unassigned"
                  ) && (
                    <option value="Unassigned">
                      Unassigned (
                      {
                        chapterMembers.filter(
                          (s) => !s.department || s.department.toLowerCase() === "unassigned"
                        ).length
                      }
                      )
                    </option>
                  )}
                </select>
                <ChevronDown size={12} className="text-text-mute pointer-events-none absolute right-2.5" />
              </div>
            </div>
          )}

          {/* Role Filter Chip */}
          {session.roleKey !== "class_representative" && (
            <div className="relative inline-flex items-center">
              <div className="flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-bg-page/70 pl-2.5 pr-7 text-xs text-text hover:border-border transition-colors focus-within:border-[var(--accent)]">
                <Shield size={13} className="text-text-mute shrink-0" />
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="bg-transparent text-xs text-text font-medium focus:outline-none cursor-pointer appearance-none"
                >
                  <option value="all">All Roles</option>
                  <option value="campus lead">Campus Lead</option>
                  <option value="faculty">Faculty Coordinator</option>
                  <option value="class rep">Class Representative</option>
                  <option value="student">Student Member</option>
                </select>
                <ChevronDown size={12} className="text-text-mute pointer-events-none absolute right-2.5" />
              </div>
            </div>
          )}

          {/* Reset Filters Button */}
          {(selectedDepartmentFilter !== "all" || selectedRoleFilter !== "all" || search) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterStatus("all");
                setSelectedDepartmentFilter("all");
                setSelectedRoleFilter("all");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--accent)]/10 px-2.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Student & Member List Table */}
      <div className="rounded-[var(--radius-xl)] bg-bg-panel border border-border/70 shadow-[var(--shadow)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-bg-page/50 text-text-dim text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 pl-5 pr-3 w-36">Member ID</th>
                <th className="py-3.5 px-3 min-w-[220px]">
                  {session.roleKey === "class_representative" ? "Member Details" : "Member & Role"}
                </th>
                <th className="py-3.5 px-3 w-52">Contact</th>
                <th className="py-3.5 px-3 w-44">Academic Cohort</th>
                <th className="py-3.5 px-3 w-36">Skills / Focus</th>
                <th className="py-3.5 pr-5 pl-3 w-36">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((stu) => {
                  const isCopied = copiedId === stu.elevatesId;

                  return (
                    <tr
                      key={stu.id}
                      className="group hover:bg-bg-page/60 transition-colors"
                    >
                      <td className="py-3.5 pl-5 pr-3">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(stu.elevatesId)}
                          className="group/id inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-bg-page/70 px-2 py-1 font-mono text-[11px] font-semibold text-text-dim transition-all hover:border-[var(--accent)] hover:bg-bg-panel hover:text-text shadow-2xs"
                          title="Click to copy Elevates ID"
                        >
                          <span>{stu.elevatesId}</span>
                          {isCopied ? (
                            <Check size={11} className="text-emerald-500" />
                          ) : (
                            <Copy size={11} className="text-text-mute opacity-40 group-hover/id:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-hover)] shadow-2xs">
                            {initials(stu.fullName)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/profile/${stu.elevatesId || stu.id}`}
                              className="font-semibold text-text hover:text-[var(--accent)] hover:underline transition-colors block text-xs truncate max-w-[200px]"
                            >
                              {stu.fullName}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {session.roleKey !== "class_representative" && (
                                <Badge tone={stu.roleInfo.tone} className="text-[10px] px-2 py-0.5 font-medium">
                                  {stu.roleInfo.label}
                                </Badge>
                              )}
                              {stu.volunteerTag && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-medium">
                                  <Tag size={9} />
                                  {stu.volunteerTag}
                                </span>
                              )}
                              {(stu.createdAt || stu.joinedAt) && (
                                <span className="text-[10px] text-text-mute font-mono">
                                  Joined {formatDateTime((stu.createdAt || stu.joinedAt)!)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <a
                            href={`mailto:${stu.email}`}
                            className="inline-flex items-center gap-1.5 text-xs text-text hover:text-[var(--accent)] hover:underline truncate max-w-[190px]"
                            title={stu.email}
                          >
                            <Mail size={12} className="text-text-mute shrink-0" />
                            <span className="truncate">{stu.email || "No email"}</span>
                          </a>
                          {stu.phone ? (
                            <a
                              href={`tel:${stu.phone}`}
                              className="inline-flex items-center gap-1.5 text-[11px] text-text-dim hover:text-text hover:underline"
                            >
                              <Phone size={11} className="text-text-mute shrink-0" />
                              <span>{stu.phone}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-text-mute/60 pl-4.5">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div>
                          <p className="font-semibold text-xs text-text truncate max-w-[170px]" title={stu.department}>
                            {stu.department}
                          </p>
                          <p className="text-[11px] text-text-dim mt-0.5">
                            {stu.year} {stu.section ? `· Sec ${stu.section}` : ""}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {stu.skills.length > 0 ? (
                            <>
                              {stu.skills.slice(0, 2).map((sk) => (
                                <span
                                  key={sk}
                                  className="rounded-full bg-bg-page border border-border/70 px-2 py-0.5 text-[10px] font-medium text-text-dim"
                                >
                                  {sk}
                                </span>
                              ))}
                              {stu.skills.length > 2 && (
                                <span
                                  className="rounded-full bg-bg-page border border-border/70 px-1.5 py-0.5 text-[10px] font-semibold text-text-mute hover:text-text cursor-default"
                                  title={stu.skills.slice(2).join(", ")}
                                >
                                  +{stu.skills.length - 2}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-text-mute">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 pr-5 pl-3">
                        {stu.status === "claimed" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active Profile
                          </span>
                        ) : stu.status === "pending" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Pending Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Unclaimed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-dim">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-page border border-border/60 mx-auto mb-3 text-text-mute">
                      <Users size={22} />
                    </div>
                    <p className="font-semibold text-text text-sm">No members found</p>
                    <p className="text-xs text-text-mute mt-1 max-w-sm mx-auto">
                      {search || filterStatus !== "all" || selectedDepartmentFilter !== "all" || selectedRoleFilter !== "all"
                        ? "No students match your active filter criteria. Try clearing search or resetting filters."
                        : "No students registered in this chapter yet. Use 'Add Member' to get started."}
                    </p>
                    {(search || filterStatus !== "all" || selectedDepartmentFilter !== "all" || selectedRoleFilter !== "all") && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setFilterStatus("all");
                          setSelectedDepartmentFilter("all");
                          setSelectedRoleFilter("all");
                        }}
                        className="mt-3 text-xs"
                      >
                        <RotateCcw size={12} className="mr-1.5" /> Clear All Filters
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Single Student Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-2.5 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[var(--radius-2xl)] bg-bg-panel p-5 sm:p-6 shadow-2xl border border-border/70">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                  Add Student to Database
                </h3>
                <p className="text-xs text-text-dim mt-0.5">Pre-collect skill & contact data for auto-sync</p>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="rounded-full p-1.5 text-text-dim hover:bg-bg-page hover:text-text transition-colors"
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
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-border bg-bg-page px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-border bg-bg-page px-3 py-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
                  Save to Member Directory
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-2.5 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-2xl)] bg-bg-panel p-5 sm:p-6 shadow-2xl border border-border/70">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text">
                  Bulk CSV Import
                </h3>
                <p className="text-xs text-text-dim mt-0.5">Paste CSV lines from Google Sheets / Excel</p>
              </div>
              <button
                onClick={() => setIsBulkOpen(false)}
                className="rounded-full p-1.5 text-text-dim hover:bg-bg-page hover:text-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {bulkReport ? (
              <div className="mt-4 space-y-4 text-xs">
                <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                  <span className="font-medium">
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
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium",
                          res.status === "success"
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/20 text-red-500"
                        )}
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
                <div className="rounded-[var(--radius-md)] bg-bg-page border border-border/70 p-3 text-[11px] text-text-dim font-mono">
                  <strong className="text-text">Format:</strong> Name, Email, Phone, Department, Year, Skills (separated by semicolons)
                  <br />
                  <span className="text-text-mute">Example: John Doe, john@student.edu.in, 9847123456, CSE, 3rd Year, React; Python; Git</span>
                </div>

                <div>
                  <label className="font-semibold text-text">CSV Data</label>
                  <textarea
                    rows={6}
                    required
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Paste multiple rows here..."
                    className="mt-1 w-full rounded-[var(--radius-md)] border border-border bg-bg-page p-2.5 font-mono text-xs text-text focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
