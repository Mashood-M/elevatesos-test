"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { useStore } from "@/context/store-context";

export default function JoinChapterPage() {
  const { store, joinChapterCommunity } = useStore();
  const router = useRouter();
  const activeChapters = useMemo(
    () => store.chapters.filter((c) => c.status === "active"),
    [store.chapters],
  );
  const [chapterId, setChapterId] = useState(activeChapters[0]?.id ?? store.chapters[0]?.id ?? "");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");

  const chapter = useMemo(
    () => store.chapters.find((c) => c.id === chapterId),
    [store.chapters, chapterId],
  );

  function submit() {
    setError("");
    const profile = joinChapterCommunity({
      chapterId,
      fullName,
      email,
      department: department || undefined,
      year: year || undefined,
    });
    if (!profile) {
      setError("Could not join — check name, email, and chapter.");
      return;
    }
    router.push(chapter ? `/chapter/${chapter.slug}/community` : "/login");
  }

  return (
    <div className="min-h-dvh bg-[var(--charcoal-900)] px-6 py-14 text-white">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-[18px] font-extrabold tracking-[-0.04em]"
        >
          Elevates
        </Link>
        <h1 className="mt-10 font-[family-name:var(--font-display)] text-[2rem] font-extrabold tracking-[-0.035em]">
          Join a chapter
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/50">
          Every student on campus belongs. No fee, no department gate — grow
          through workshops and clusters.
        </p>

        <div className="mt-10 space-y-4 rounded-[var(--radius)] bg-white/[0.04] p-6 ring-1 ring-white/10">
          <div>
            <FieldLabel>Campus chapter</FieldLabel>
            <Select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="border-white/15 bg-black/25 text-white"
            >
              {activeChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.college}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Full name</FieldLabel>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-white/15 bg-black/25 text-white"
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-white/15 bg-black/25 text-white"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Department (optional)</FieldLabel>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Any"
                className="border-white/15 bg-black/25 text-white"
              />
            </div>
            <div>
              <FieldLabel>Year (optional)</FieldLabel>
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="1st / 2nd…"
                className="border-white/15 bg-black/25 text-white"
              />
            </div>
          </div>
          {error ? (
            <p className="text-sm text-[var(--accent)]">{error}</p>
          ) : null}
          <Button variant="orange" className="mt-2 h-10 w-full" onClick={submit}>
            Join community
          </Button>
        </div>

        <p className="mt-8 text-center text-[13px] text-white/40">
          <Link href="/eos" className="text-[var(--accent)] hover:text-white">
            Read the playbook
          </Link>
          {" · "}
          <Link href="/login" className="hover:text-white">
            Already in the app?
          </Link>
        </p>
      </div>
    </div>
  );
}
