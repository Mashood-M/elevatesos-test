"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { Download, FileText, FolderDown, ArrowLeft, Search } from "lucide-react";
import { useStore, useCurrentUser } from "@/context/store-context";
import { findChapterBySlugOrId } from "@/lib/chapters";
import { resourceCategoryLabel } from "@/lib/resources/categories";
import { formatDateTime, cn } from "@/lib/utils";

export default function ChapterResourcesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { store } = useStore();
  const { session } = useCurrentUser();
  const chapter = findChapterBySlugOrId(store.chapters, slug);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    store.resources.forEach((r) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats);
  }, [store.resources]);

  const filteredResources = useMemo(() => {
    return store.resources.filter((res) => {
      if (selectedCategory !== "all" && res.category !== selectedCategory) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        res.title.toLowerCase().includes(q) ||
        (res.description && res.description.toLowerCase().includes(q))
      );
    });
  }, [store.resources, selectedCategory, search]);

  if (!chapter) {
    return (
      <div className="py-16 text-center">
        <p className="font-mono text-sm text-[#71717a]">{"//"} Chapter not found</p>
        <Link
          href="/hq/chapters"
          className="mt-3 inline-block font-mono text-xs font-bold uppercase text-[#f26430] hover:underline"
        >
          Return to chapters
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="h-8 px-3 rounded-[6px] bg-white hover:bg-[#f3f4f6] text-[#2d2d34] font-mono text-[11px] font-bold uppercase tracking-wider border border-[#2d2d34] shadow-[1px_1px_0px_#2d2d34] transition-all cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft size={12} />
          <span>Back</span>
        </button>
        <span className="font-mono text-xs text-[#71717a]">/</span>
        <Link
          href={`/chapter/${slug}`}
          className="font-mono text-xs text-[#71717a] hover:text-[#f26430] transition-colors"
        >
          {chapter.name}
        </Link>
        <span className="font-mono text-xs text-[#71717a]">/</span>
        <span className="font-mono text-xs font-bold text-[#2d2d34]">Resources</span>
      </div>

      {/* 2. ARCHITECTURAL HERO BANNER */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#2d2d34]/20 bg-white p-5 sm:p-6 shadow-[2px_2px_0px_#2d2d34] bauhaus-grid-bg">
        <div
          className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#f26430] opacity-8 pointer-events-none select-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-6 h-28 w-28 bg-[#414066] opacity-6 rotate-45 pointer-events-none select-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[5px] bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26430]" />
                CAMPUS · {(chapter.shortCode || chapter.slug).toUpperCase()} {"//"} REPOSITORY
              </span>
              <span className="font-mono text-[10.5px] font-bold text-[#71717a] uppercase tracking-wider">
                CENTRAL ASSETS
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-black text-[#2d2d34] tracking-tight">
              Resources &amp; Operational Assets.
            </h1>
            <p className="mt-1.5 text-[13px] text-[#52525b] leading-relaxed">
              Official SOPs, workshop toolkits, branding guidelines, slide decks, and handbook materials for {chapter.name}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-[#71717a] uppercase px-3 py-1.5 rounded-[6px] bg-[#f3f4f6] border border-[#2d2d34]/20">
              {filteredResources.length} Assets Available
            </span>
          </div>
        </div>
      </section>

      {/* 3. 4-METRIC STRIP */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>01 {"//"} TOTAL ASSETS</span>
            <span className="h-2 w-2 rounded-full bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {store.resources.length}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Archived Files</p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>02 {"//"} CATEGORIES</span>
            <span className="h-2 w-2 rounded-full bg-[#414066]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {categories.length || 1}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Knowledge Tracks</p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>03 {"//"} BRAND ASSETS</span>
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black text-[#2d2d34]">
            {store.resources.filter((r) => r.category === "brand" || r.category === "kit").length}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Logos &amp; Kits</p>
        </div>

        <div className="bg-white border border-[#2d2d34]/20 rounded-[12px] p-3 sm:p-3.5 shadow-[1.5px_1.5px_0px_#2d2d34]">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#71717a] uppercase">
            <span>04 {"//"} ACCESS LEVEL</span>
            <span className="h-2 w-2 rounded-full bg-[#f26430]" />
          </div>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-black text-[#2d2d34] uppercase truncate">
            {session.roleKey.replace("_", " ")}
          </p>
          <p className="font-mono text-[8.5px] text-[#71717a] uppercase">Verified Member</p>
        </div>
      </section>

      {/* 4. SEARCH & CATEGORY FILTER BAR */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[12px] border border-[#2d2d34]/20 shadow-[1.5px_1.5px_0px_#2d2d34]">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "h-8 px-3 rounded-[6px] font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
              selectedCategory === "all"
                ? "bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]"
                : "bg-white text-[#71717a] hover:text-[#2d2d34] border border-[#2d2d34]/20"
            )}
          >
            <span>All Categories</span>
            <span className="rounded-[4px] bg-[#f3f4f6] px-1.5 py-0.2 font-mono text-[9px] font-bold text-[#2d2d34] border border-[#2d2d34]/20">
              {store.resources.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = store.resources.filter((r) => r.category === cat).length;
            const label = resourceCategoryLabel(store.resourceCategories, cat);
            const isSel = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "h-8 px-3 rounded-[6px] font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                  isSel
                    ? "bg-[#2d2d34] text-white shadow-[1.5px_1.5px_0px_#f26430]"
                    : "bg-white text-[#71717a] hover:text-[#2d2d34] border border-[#2d2d34]/20"
                )}
              >
                <span>{label}</span>
                <span className="rounded-[4px] bg-[#f3f4f6] px-1.5 py-0.2 font-mono text-[9px] font-bold text-[#2d2d34] border border-[#2d2d34]/20">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="h-8.5 w-full pl-8 pr-3 bg-[#f8f9fa] border border-[#2d2d34]/20 rounded-[6px] font-mono text-xs text-[#2d2d34] placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#2d2d34] focus:bg-white"
          />
        </div>
      </section>

      {/* 5. ASSET GRID */}
      {filteredResources.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[#2d2d34]/20 bg-white p-12 text-center">
          <FolderDown size={32} className="mx-auto text-[#71717a]/50 mb-3" />
          <p className="font-mono text-xs font-bold uppercase text-[#71717a]">
            {"//"} No resources match your query
          </p>
          <p className="mt-1 text-xs text-[#52525b]">
            Try adjusting your search terms or selecting another category.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((res, idx) => {
            const uploader = store.profiles.find((p) => p.id === res.uploadedBy);
            const num = String(idx + 1).padStart(2, "0");
            const catLabel = resourceCategoryLabel(store.resourceCategories, res.category);

            return (
              <article
                key={res.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[14px] border border-[#2d2d34]/20 bg-white p-5 shadow-[2px_2px_0px_#2d2d34] hover:shadow-[3px_3px_0px_#2d2d34] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-[10px] font-bold text-[#71717a] uppercase">
                      {num} {"//"} {catLabel}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-[#f26430]" />
                  </div>

                  <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#2d2d34] tracking-tight group-hover:text-[#f26430] transition-colors">
                    {res.title}
                  </h3>

                  <p className="mt-1.5 text-xs text-[#52525b] leading-relaxed line-clamp-3">
                    {res.description || "Official resource toolkit."}
                  </p>
                </div>

                <div className="mt-5 border-t border-[#2d2d34]/10 pt-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#71717a] mb-3">
                    <span>{uploader?.fullName || "Elevates Central"}</span>
                    <span>{formatDateTime(res.uploadedAt)}</span>
                  </div>

                  {res.url && res.url !== "#" ? (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={res.url.startsWith("data:") ? res.title : undefined}
                      className="h-8 w-full rounded-[6px] bg-[#2d2d34] hover:bg-[#1f1e24] text-white font-mono text-[11px] font-bold uppercase tracking-wider shadow-[1px_1px_0px_#f26430] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download size={12} />
                      <span>Download Asset</span>
                    </a>
                  ) : (
                    <div className="h-8 w-full rounded-[6px] bg-[#f3f4f6] text-[#71717a] font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-[#2d2d34]/20">
                      <FileText size={12} />
                      <span>No File Linked</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
