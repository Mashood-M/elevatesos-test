"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/context/store-context";
import {
  Edit,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  X,
  Users,
  User,
  GraduationCap,
  Globe,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { resolveMediaUrl } from "@/lib/data/media";
import {
  FOUNDING_TEAM_IMAGE,
  INITIAL_FOUNDERS,
  INITIAL_ADVISORS,
  Founder,
  Advisor,
} from "@/lib/data/founders-team";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[10.5px] font-bold text-[#2d2d34] uppercase tracking-wider block">
        {label}
      </label>
      {children}
    </div>
  );
}

function TInput({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      className={`h-9 w-full rounded-[6px] border border-[#2d2d34]/30 bg-white px-3 text-xs text-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] focus:border-[#2d2d34] focus:outline-none focus:shadow-[2px_2px_0px_#2d2d34] transition-all ${
        mono ? "font-mono" : ""
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function AvatarImage({ src, alt }: { src?: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState<string>(src ? resolveMediaUrl(src) : "");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src ? resolveMediaUrl(src) : "");
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#faf9f6] text-[#71717a] font-mono font-bold text-xs">
        {alt ? alt.slice(0, 2).toUpperCase() : <User size={18} />}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => {
        if (src && src.startsWith("/") && imgSrc !== src) {
          setImgSrc(src);
        } else {
          setHasError(true);
        }
      }}
    />
  );
}

function FounderEditor({
  founder,
  onSave,
  onClose,
}: {
  founder: Founder;
  onSave: (f: Founder) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<Founder>(founder);
  const u = (patch: Partial<Founder>) => setD((prev) => ({ ...prev, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[16px] bg-white shadow-[4px_4px_0px_#2d2d34] border-2 border-[#2d2d34] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#2d2d34]/20 p-5 sticky top-0 bg-white z-10 bauhaus-grid-bg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-bold text-[#f26430] uppercase tracking-wider bg-[#fef0eb] px-2 py-0.5 rounded-[4px] border border-[#f26430]/30">
                {d.num || "#00"} // FOUNDER REGISTRY
              </span>
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-black text-[#2d2d34]">
              {founder.name ? "Edit Founder Profile" : "Register New Founder"}
            </h3>
            <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">
              Published on elevates.live/team — all 18 founding members
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717a] hover:text-[#2d2d34] p-1.5 rounded-[6px] hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Full Name">
            <TInput value={d.name} onChange={(v) => u({ name: v })} placeholder="Founder Full Name" />
          </Field>
          <Field label="Tag / Persona Badge (e.g. Main Class Bunker, Quiet Builder)">
            <TInput value={d.tag} onChange={(v) => u({ tag: v })} placeholder="e.g. Main Class Bunker" />
          </Field>
          <Field label="Role">
            <TInput value={d.role} onChange={(v) => u({ role: v })} placeholder="Founder" />
          </Field>
          <Field label="Proof of Work">
            <TInput
              value={d.proof}
              onChange={(v) => u({ proof: v })}
              placeholder="Full-stack · Built elevates.live"
            />
          </Field>
          <Field label="LinkedIn Profile URL">
            <TInput
              value={d.linkedin ?? ""}
              onChange={(v) => u({ linkedin: v })}
              mono
              placeholder="https://linkedin.com/in/username"
            />
          </Field>
          <Field label="Photo Path (in /public/founders/)">
            <TInput
              value={d.image}
              onChange={(v) => u({ image: v })}
              mono
              placeholder="/founders/sarhan-qadir.jpeg"
            />
          </Field>
          {d.image && (
            <div className="border border-[#2d2d34]/20 rounded-[10px] p-3 bg-[#faf9f6] flex items-center gap-3 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]">
              <div className="w-14 h-14 rounded-[8px] border border-[#2d2d34] overflow-hidden bg-white shrink-0 shadow-[1px_1px_0px_#2d2d34]">
                <AvatarImage src={d.image} alt={d.name} />
              </div>
              <div>
                <p className="font-mono text-xs font-bold text-[#2d2d34]">{d.name || "Preview"}</p>
                <p className="font-mono text-[10px] text-[#71717a] mt-0.5">{d.image}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-[#2d2d34]/20 p-4 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 hover:border-[#2d2d34] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(d);
              onClose();
            }}
            className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer"
          >
            Save Founder
          </button>
        </div>
      </div>
    </div>
  );
}

function AdvisorEditor({
  advisor,
  onSave,
  onClose,
}: {
  advisor: Advisor;
  onSave: (a: Advisor) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<Advisor>(advisor);
  const u = (patch: Partial<Advisor>) => setD((prev) => ({ ...prev, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[16px] bg-white shadow-[4px_4px_0px_#2d2d34] border-2 border-[#2d2d34]">
        <div className="flex items-center justify-between border-b border-[#2d2d34]/20 p-5 bauhaus-grid-bg">
          <div>
            <span className="font-mono text-[10px] font-bold text-[#5f7560] uppercase tracking-wider bg-[#f0f4f1] px-2 py-0.5 rounded-[4px] border border-[#5f7560]/30">
              FACULTY OVERSIGHT // ADVISOR
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-black text-[#2d2d34] mt-1">
              {advisor.name ? "Edit Faculty Advisor" : "Register Faculty Advisor"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717a] hover:text-[#2d2d34] p-1.5 rounded-[6px] hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Name">
            <TInput value={d.name} onChange={(v) => u({ name: v })} placeholder="Advisor Full Name" />
          </Field>
          <Field label="Role / Title">
            <TInput
              value={d.role}
              onChange={(v) => u({ role: v })}
              placeholder="Faculty Head & Advisor"
            />
          </Field>
          <Field label="Institution / Department">
            <TInput
              value={d.institution}
              onChange={(v) => u({ institution: v })}
              placeholder="CSE, Eranad Knowledge City Technical Campus"
            />
          </Field>
          <Field label="LinkedIn URL (optional)">
            <TInput
              value={d.linkedin ?? ""}
              onChange={(v) => u({ linkedin: v })}
              mono
              placeholder="https://linkedin.com/in/username"
            />
          </Field>
          <Field label="Photo Path (optional)">
            <TInput
              value={d.image ?? ""}
              onChange={(v) => u({ image: v })}
              mono
              placeholder="/faculaty/jasira-kt.jpeg"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-[#2d2d34]/20 p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 hover:border-[#2d2d34] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(d);
              onClose();
            }}
            className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2.5px_2.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer"
          >
            Save Advisor
          </button>
        </div>
      </div>
    </div>
  );
}

type SectionTab = "founders" | "advisors";

export default function TeamCMSPage() {
  const { store, updateOrgSettings } = useStore();
  const [tab, setTab] = useState<SectionTab>("founders");
  const [search, setSearch] = useState("");

  const founders: Founder[] =
    store.founders && store.founders.length > 0 ? store.founders : INITIAL_FOUNDERS;
  const advisors: Advisor[] =
    store.advisors && store.advisors.length > 0 ? store.advisors : INITIAL_ADVISORS;

  const saveFounders = (updated: Founder[]) => {
    void updateOrgSettings({ founders: updated });
  };

  const saveAdvisors = (updated: Advisor[]) => {
    void updateOrgSettings({ advisors: updated });
  };

  const [editingFounder, setEditingFounder] = useState<Founder | null>(null);
  const [isNewFounder, setIsNewFounder] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [isNewAdvisor, setIsNewAdvisor] = useState(false);

  const q = search.toLowerCase().trim();
  const filteredFounders = founders.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.tag.toLowerCase().includes(q) ||
      f.proof.toLowerCase().includes(q) ||
      (f.num && f.num.toLowerCase().includes(q)),
  );
  const filteredAdvisors = advisors.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      a.institution.toLowerCase().includes(q),
  );

  const blankFounder = (): Founder => ({
    id: `founder-${Date.now()}`,
    num: `#${String(founders.length + 1).padStart(2, "0")}`,
    name: "",
    tag: "",
    role: "Founder",
    proof: "",
    linkedin: "",
    cohort: "2025-26",
    image: "",
  });

  const blankAdvisor = (): Advisor => ({
    id: `advisor-${Date.now()}`,
    name: "",
    role: "",
    institution: "",
    linkedin: "",
    image: "",
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. ARCHITECTURAL HERO BANNER ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-7 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        {/* Subtle Decorative Geometric Accents */}
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-10 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-24 w-24 bg-[#414066] opacity-8 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-2 right-44 h-16 w-16 bg-[#f59e0b] opacity-10 rounded-full pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            {/* Monospace Eyebrow Badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                WEBSITE CMS {"//"} TEAM REGISTRY
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-[#71717a] uppercase tracking-wider">
                ELEVATES.LIVE/TEAM · COHORT 2025–26
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-black text-[#2d2d34] tracking-tight leading-snug">
              Founders &amp; Advisory Board.
              <span className="block text-[#f26430]">The Builders Behind Elevates.</span>
            </h1>

            <p className="mt-2 text-sm text-[#71717a] leading-relaxed max-w-xl">
              Manage the 18 founding student builders and institutional faculty advisors published on elevates.live/team — names, authentic persona badges, proof of work, LinkedIn credentials, and avatars.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            {tab === "founders" ? (
              <button
                type="button"
                onClick={() => {
                  setEditingFounder(blankFounder());
                  setIsNewFounder(true);
                }}
                className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Add Founder</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingAdvisor(blankAdvisor());
                  setIsNewAdvisor(true);
                }}
                className="h-9 px-4 rounded-[8px] bg-[#f26430] hover:bg-[#e05320] text-white font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Add Advisor</span>
              </button>
            )}

            <Link href="/hq/website">
              <button
                type="button"
                className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-[#414066]" />
                <span>CMS Hub</span>
              </button>
            </Link>

            <a
              href="https://elevates.live/team"
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3.5 rounded-[8px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34]/20 hover:border-[#2d2d34] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] hover:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Globe size={13} className="text-[#f26430]" />
              <span>Live Site ↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. 4-METRIC STRIP ───────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 01: Total Founders */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              01 // TOTAL FOUNDERS
            </span>
            <span className="h-2 w-2 rounded-full bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34]">
            {founders.length}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            18 Founding Engineers
          </p>
        </div>

        {/* Metric 02: With LinkedIn */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              02 // VERIFIED SOCIALS
            </span>
            <span className="h-2 w-2 rounded-[2px] bg-[#414066]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#414066]">
            {founders.filter((f) => f.linkedin).length}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            LinkedIn Verified
          </p>
        </div>

        {/* Metric 03: Faculty Advisors */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              03 // FACULTY ADVISORS
            </span>
            <span className="h-2 w-2 bg-[#5f7560] rotate-45" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#5f7560]">
            {advisors.length}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            Institutional Oversight
          </p>
        </div>

        {/* Metric 04: Cohort Batch */}
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3.5 sm:p-4 shadow-[1.5px_1.5px_0px_#2d2d34] hover:shadow-[2px_2px_0px_#2d2d34] transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              04 // FOUNDING BATCH
            </span>
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34]">
            2025–26
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#52525b] uppercase tracking-wider">
            Eranad Knowledge City
          </p>
        </div>
      </section>

      {/* ── 3. FOUNDING TEAM HERO GROUP PHOTO BANNER ────────────────────── */}
      {tab === "founders" && (
        <section className="relative rounded-[16px] border border-[#2d2d34]/20 bg-white p-2.5 sm:p-3 shadow-[2px_2px_0px_#2d2d34] overflow-hidden">
          <div className="relative h-72 sm:h-96 w-full overflow-hidden rounded-[12px] border border-[#2d2d34]/20">
            <img
              src={resolveMediaUrl(FOUNDING_TEAM_IMAGE)}
              alt="The 18 Founding Members of ELEVATES"
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FOUNDING_TEAM_IMAGE;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#18181b]/90 via-[#18181b]/35 to-transparent flex flex-col justify-end p-5 sm:p-7">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[10px] font-bold text-[#f26430] bg-[#2d2d34] px-2.5 py-1 rounded-[4px] uppercase tracking-widest shadow-[1px_1px_0px_#f26430]">
                  FOUNDING BATCH · 2025–26
                </span>
                <span className="font-mono text-[10px] text-white/80 uppercase tracking-widest hidden sm:inline-block">
                  18 STUDENT ARCHITECTS
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-white tracking-tight font-[family-name:var(--font-display)]">
                THE 18 FOUNDING MEMBERS OF ELEVATES
              </h2>
              <p className="text-xs sm:text-sm text-white/85 font-mono mt-1 max-w-xl">
                Eranad Knowledge City Technical Campus · Manjeri, Malappuram · Built by students, for students.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── 4. FILTER & SEARCH STRIP ───────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Monospace Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("founders")}
            className={`h-8.5 px-3.5 rounded-[6px] font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
              tab === "founders"
                ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                : "bg-white text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]/50 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
            }`}
          >
            <Users size={13} />
            <span>Founding Members ({founders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("advisors")}
            className={`h-8.5 px-3.5 rounded-[6px] font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
              tab === "advisors"
                ? "bg-[#2d2d34] text-white border-[#2d2d34] shadow-[1.5px_1.5px_0px_#f26430]"
                : "bg-white text-[#52525b] border-[#2d2d34]/20 hover:border-[#2d2d34]/50 shadow-[1px_1px_0px_rgba(45,45,52,0.1)]"
            }`}
          >
            <GraduationCap size={14} />
            <span>Faculty Advisors ({advisors.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "founders"
                ? "Search founders by name, tag, or proof..."
                : "Search faculty advisors..."
            }
            className="h-8.5 w-full pl-8 pr-3 rounded-[6px] border border-[#2d2d34]/30 bg-white font-mono text-xs text-[#2d2d34] placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#2d2d34] focus:shadow-[1.5px_1.5px_0px_#2d2d34] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#2d2d34]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </section>

      {/* ── 5. FOUNDERS GRID ───────────────────────────────────────────── */}
      {tab === "founders" && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFounders.map((f, i) => (
            <div
              key={f.id}
              className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-4 sm:p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3.5px_3.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col justify-between relative group overflow-hidden"
            >
              {/* Architectural drafting background accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#f26430]/5 via-transparent to-transparent pointer-events-none select-none" />

              <div>
                {/* Header: Avatar, Name, Tag & Watermark #Num */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-13 h-13 rounded-[10px] border border-[#2d2d34] overflow-hidden bg-[#faf9f6] shrink-0 shadow-[1.5px_1.5px_0px_#2d2d34]">
                      <AvatarImage src={f.image} alt={f.name} />
                    </div>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] font-black text-[#2d2d34] text-[15px] leading-tight group-hover:text-[#f26430] transition-colors">
                        {f.name}
                      </h3>
                      <span className="inline-block font-mono text-[10px] font-bold text-[#2d2d34] bg-[#f4f4f5] border border-[#2d2d34]/20 px-2 py-0.5 rounded-[4px] mt-1 shadow-[1px_1px_0px_rgba(45,45,52,0.06)]">
                        {f.tag}
                      </span>
                    </div>
                  </div>

                  {/* Watermark Serial Number */}
                  <span className="font-mono text-xs font-black text-[#f26430] bg-[#fef0eb] border border-[#f26430]/40 px-2 py-0.5 rounded-[4px] shrink-0 shadow-[1px_1px_0px_#f26430]">
                    {f.num || `#${String(i + 1).padStart(2, "0")}`}
                  </span>
                </div>

                {/* Subtext / Proof line */}
                <div className="text-xs font-medium text-[#52525b] leading-relaxed my-3 bg-[#faf9f6] p-2.5 rounded-[8px] border border-[#2d2d34]/10">
                  <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase tracking-wider block mb-0.5">
                    Proof of Work
                  </span>
                  {f.proof}
                </div>

                {/* Badges line */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  <span className="font-mono text-[10px] font-bold text-[#2d2d34] bg-white border border-[#2d2d34]/20 px-2 py-0.5 rounded-[4px]">
                    {f.role || "Founder"}
                  </span>
                  <span className="font-mono text-[10px] text-[#71717a] bg-white border border-[#2d2d34]/20 px-2 py-0.5 rounded-[4px]">
                    {f.cohort}
                  </span>
                  {f.linkedin && (
                    <a
                      href={f.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10.5px] font-bold text-[#0077b5] bg-sky-50 border border-sky-200 hover:border-sky-400 px-2 py-0.5 rounded-[4px] flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink size={10} /> LinkedIn
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-[#2d2d34]/15">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFounder(f);
                    setIsNewFounder(false);
                  }}
                  className="h-8 flex-1 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit size={12} />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => saveFounders(founders.filter((x) => x.id !== f.id))}
                  title="Remove founder"
                  className="h-8 w-8 rounded-[6px] bg-white hover:bg-red-50 text-[#dc2626] border border-[#2d2d34]/20 hover:border-[#dc2626] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] flex items-center justify-center transition-all cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {filteredFounders.length === 0 && (
            <div className="col-span-full text-center py-16 bg-white border border-[#2d2d34]/20 rounded-[14px] shadow-[2px_2px_0px_#2d2d34] p-8 bauhaus-grid-bg">
              <Users className="w-8 h-8 text-[#71717a] mx-auto mb-2" />
              <p className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
                No founders match "{search}"
              </p>
              <p className="font-mono text-xs text-[#71717a] mt-1">
                Try searching by first name, authentic tag, or role proof.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── 6. FACULTY ADVISORS LIST ───────────────────────────────────── */}
      {tab === "advisors" && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredAdvisors.map((a) => (
            <div
              key={a.id}
              className="rounded-[14px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-3.5 mb-3">
                  <div className="w-14 h-14 rounded-[10px] border border-[#2d2d34] overflow-hidden bg-[#faf9f6] shrink-0 shadow-[1.5px_1.5px_0px_#2d2d34]">
                    <AvatarImage src={a.image} alt={a.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-[family-name:var(--font-display)] font-black text-[#2d2d34] text-base leading-tight">
                        {a.name}
                      </h3>
                    </div>
                    <span className="inline-block font-mono text-[10.5px] font-bold text-[#5f7560] bg-[#f0f4f1] border border-[#5f7560]/30 px-2 py-0.5 rounded-[4px] mt-1">
                      {a.role}
                    </span>
                    <p className="font-mono text-xs text-[#71717a] mt-1.5 leading-snug">
                      {a.institution}
                    </p>
                  </div>
                </div>

                {a.linkedin && (
                  <div className="mb-4">
                    <a
                      href={a.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10.5px] font-bold text-[#0077b5] bg-sky-50 border border-sky-200 hover:border-sky-400 px-2 py-0.5 rounded-[4px] inline-flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink size={10} /> Verified Academic Profile
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#2d2d34]/15">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAdvisor(a);
                    setIsNewAdvisor(false);
                  }}
                  className="h-8 flex-1 rounded-[6px] bg-white hover:bg-neutral-50 text-[#2d2d34] font-mono text-xs font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] hover:shadow-[1.5px_1.5px_0px_#2d2d34] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit size={12} />
                  <span>Edit Advisor</span>
                </button>
                <button
                  type="button"
                  onClick={() => saveAdvisors(advisors.filter((x) => x.id !== a.id))}
                  title="Remove advisor"
                  className="h-8 w-8 rounded-[6px] bg-white hover:bg-red-50 text-[#dc2626] border border-[#2d2d34]/20 hover:border-[#dc2626] shadow-[1px_1px_0px_rgba(45,45,52,0.1)] flex items-center justify-center transition-all cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {filteredAdvisors.length === 0 && (
            <div className="col-span-full text-center py-16 bg-white border border-[#2d2d34]/20 rounded-[14px] shadow-[2px_2px_0px_#2d2d34] p-8 bauhaus-grid-bg">
              <GraduationCap className="w-8 h-8 text-[#71717a] mx-auto mb-2" />
              <p className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34]">
                No faculty advisors found
              </p>
              <p className="font-mono text-xs text-[#71717a] mt-1">
                Click "+ Add Advisor" to appoint an institutional advisor.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── 7. EDIT MODALS ─────────────────────────────────────────────── */}
      {editingFounder && (
        <FounderEditor
          founder={editingFounder}
          onClose={() => {
            setEditingFounder(null);
            setIsNewFounder(false);
          }}
          onSave={(saved) => {
            if (isNewFounder) saveFounders([...founders, saved]);
            else saveFounders(founders.map((f) => (f.id === saved.id ? saved : f)));
          }}
        />
      )}

      {editingAdvisor && (
        <AdvisorEditor
          advisor={editingAdvisor}
          onClose={() => {
            setEditingAdvisor(null);
            setIsNewAdvisor(false);
          }}
          onSave={(saved) => {
            if (isNewAdvisor) saveAdvisors([...advisors, saved]);
            else saveAdvisors(advisors.map((a) => (a.id === saved.id ? saved : a)));
          }}
        />
      )}
    </div>
  );
}
