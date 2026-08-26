"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Clock,
  Download,
  Edit,
  FileSpreadsheet,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Input } from "@/components/ui/input";
import { useStore } from "@/context/store-context";
import { chapterEyebrow, resolveChapter } from "@/lib/access";
import { initials } from "@/lib/utils";

interface PreCollectedStudent {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  year: string;
  section?: string;
  skills: string[];
  interests: string[];
  status: "unclaimed" | "claimed";
  collectedAt: string;
}

const DEFAULT_PRE_COLLECTED: PreCollectedStudent[] = [];

export default function ChapterStudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store, createUser } = useStore();
  const chapter = resolveChapter(store, slug);

  const [studentList, setStudentList] = useState<PreCollectedStudent[]>(DEFAULT_PRE_COLLECTED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unclaimed" | "claimed">("all");
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [syncSuccessMsg, setSyncSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "Computer Science & Engineering",
    year: "1st Year",
    section: "A",
    skills: "",
    interests: "",
  });

  const activeChapter = chapter ?? store.chapters?.[0] ?? {
    id: "",
    slug: slug,
    name: "Chapter",
  };

  useEffect(() => {
    if (store.profiles && store.profiles.length > 0) {
      const chapterProfiles = store.profiles.filter(
        (p) => !activeChapter.id || p.chapterId === activeChapter.id || p.chapterId === "ch-ekc"
      );
      const mapped: PreCollectedStudent[] = chapterProfiles.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email || "",
        phone: p.phone || "",
        department: p.department || "Computer Science & Engineering",
        year: p.year || "1st Year",
        section: p.section || "A",
        skills: p.skills || [],
        interests: p.interests || [],
        status: p.status === "disabled" ? "unclaimed" : "claimed",
        collectedAt: new Date().toISOString().split("T")[0],
      }));
      setStudentList(mapped);
    }
  }, [store.profiles, activeChapter.id]);

  const filteredStudents = studentList.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      s.department.toLowerCase().includes(search.toLowerCase()) ||
      s.skills.some((sk) => sk.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filterStatus === "all" || s.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const skillsArr = formData.skills.split(",").map((s) => s.trim()).filter(Boolean);
    const interestsArr = formData.interests.split(",").map((i) => i.trim()).filter(Boolean);

    const newStudent: PreCollectedStudent = {
      id: `stu-${Date.now()}`,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      year: formData.year,
      section: formData.section,
      skills: skillsArr,
      interests: interestsArr,
      status: "unclaimed",
      collectedAt: new Date().toISOString().split("T")[0],
    };

    setStudentList((prev) => [newStudent, ...prev]);
    setIsAdding(false);
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      department: "Computer Science & Engineering",
      year: "1st Year",
      section: "A",
      skills: "",
      interests: "",
    });
  };

  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText.split("\n").filter((l) => l.trim().length > 0);
    const imported: PreCollectedStudent[] = [];

    lines.forEach((line, idx) => {
      // CSV format: Name, Email, Phone, Department, Year, Skills
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        imported.push({
          id: `bulk-${Date.now()}-${idx}`,
          fullName: parts[0] || "Student",
          email: parts[1] || `student${idx}@ekc.edu.in`,
          phone: parts[2] || "+91 90000 00000",
          department: parts[3] || "Computer Science & Engineering",
          year: parts[4] || "2nd Year",
          section: "A",
          skills: parts[5] ? parts[5].split(";").map((s) => s.trim()) : ["Engineering"],
          interests: ["Tech"],
          status: "unclaimed",
          collectedAt: new Date().toISOString().split("T")[0],
        });
      }
    });

    if (imported.length > 0) {
      setStudentList((prev) => [...imported, ...prev]);
      setIsBulkOpen(false);
      setBulkText("");
    }
  };

  const handleSyncToProfile = (stu: PreCollectedStudent) => {
    // Sync pre-collected skills directly into active accounts
    createUser({
      fullName: stu.fullName,
      email: stu.email,
      chapterId: activeChapter.id,
      roleKey: "student",
    });

    setStudentList((prev) =>
      prev.map((s) => (s.id === stu.id ? { ...s, status: "claimed" } : s)),
    );

    setSyncSuccessMsg(
      `✓ Successfully synced skills & department for ${stu.fullName}! Their Elevates OS profile is now active.`,
    );
    setTimeout(() => setSyncSuccessMsg(""), 4000);
  };

  const handleDelete = (id: string) => {
    if (confirm("Remove student from database?")) {
      setStudentList((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={chapterEyebrow(store.session.roleKey, "people")}
        title="Student Database & Skill Registry"
        description="Pre-collect student phone numbers, emails, skills, and departments. When students sign in, their profile and verified skills automatically sync."
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
              <Plus size={14} /> Add Student
            </Button>
          </div>
        }
      />

      {syncSuccessMsg && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-green-500/10 border border-green-500/30 p-3 text-xs font-semibold text-green-600">
          <CheckCircle size={16} />
          {syncSuccessMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total In Database" value={studentList.length} accent="cyan" />
        <Stat
          label="Unclaimed (Pre-Registered)"
          value={studentList.filter((s) => s.status === "unclaimed").length}
          accent="orange"
        />
        <Stat
          label="Claimed & Synced Profiles"
          value={studentList.filter((s) => s.status === "claimed").length}
          accent="green"
        />
        <Stat
          label="Active Chapter"
          value="EKC"
          accent="magenta"
        />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, phone, email, or skill..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["all", "unclaimed", "claimed"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                filterStatus === st
                  ? "bg-text text-bg-page shadow-sm"
                  : "bg-bg-panel text-text-dim hover:text-text"
              }`}
            >
              {st === "all" ? "All Students" : st === "unclaimed" ? "Unclaimed (Pending)" : "Synced Accounts"}
            </button>
          ))}
        </div>
      </div>

      {/* Student List Table */}
      <div className="rounded-[var(--radius-lg)] bg-bg-panel p-5 shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-dim">
                <th className="pb-3 font-semibold">Student Name</th>
                <th className="pb-3 font-semibold">Contact & Phone</th>
                <th className="pb-3 font-semibold">Department & Year</th>
                <th className="pb-3 font-semibold">Pre-Collected Skills</th>
                <th className="pb-3 font-semibold">Sync Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.map((stu) => (
                <tr key={stu.id} className="group hover:bg-bg-page/50">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--secondary-soft)] text-xs font-bold text-[var(--secondary)]">
                        {initials(stu.fullName)}
                      </span>
                      <div>
                        <p className="font-semibold text-text">{stu.fullName}</p>
                        <p className="text-[11px] text-text-dim">Added: {stu.collectedAt}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 text-text-dim">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-text">
                        <Phone size={11} className="text-text-dim" /> {stu.phone}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Mail size={11} className="text-text-dim" /> {stu.email}
                      </span>
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
                      {stu.skills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded bg-[var(--neutral-100)] px-1.5 py-0.5 text-[10px] font-medium text-text"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3">
                    {stu.status === "claimed" ? (
                      <Badge tone="green">
                        <UserCheck size={11} className="mr-1" /> Profile Synced
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
                          <Sparkles size={12} className="mr-1" /> Sync to Account
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(stu.id)}
                        className="h-7 px-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
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
                  placeholder="e.g. Muhammed Rashiq"
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
                    placeholder="student@ekc.edu.in"
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
                    <option value="Computer Science & Engineering">Computer Science (CSE)</option>
                    <option value="AI & Data Science">AI & Data Science (AI&DS)</option>
                    <option value="Computer Science & Business Systems">CS & Business Systems (CSBS)</option>
                    <option value="Cyber Security">Cyber Security</option>
                    <option value="Electronics & Communication">Electronics (ECE)</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Fire & Safety Engineering">Fire & Safety</option>
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

            <form onSubmit={handleBulkImport} className="mt-4 space-y-4 text-xs">
              <div className="rounded-[var(--radius-md)] bg-[var(--neutral-100)] p-3 text-[11px] text-text-dim font-mono">
                Format: Name, Email, Phone, Department, Year, Skills (separated by semicolons)
                <br />
                Example: John Doe, john@ekc.edu.in, 9847123456, CSE, 3rd Year, React; Python; Git
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
                <Button variant="orange" type="submit">
                  Import All
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
