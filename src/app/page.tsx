import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--charcoal-900)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 55%)",
        }}
      />

      <header className="relative mx-auto flex max-w-[var(--content-max)] items-center justify-between px-6 py-6">
        <p className="font-[family-name:var(--font-display)] text-[20px] font-extrabold tracking-[-0.04em]">
          Elevates
        </p>
      </header>

      <main className="relative mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-[var(--content-max)] flex-col justify-center px-6 pb-20 pt-10">
        <h1 className="max-w-[14ch] font-[family-name:var(--font-display)] text-[clamp(2.75rem,7vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.04em]">
          Elevates
        </h1>
        <p className="mt-5 max-w-[36ch] font-[family-name:var(--font-display)] text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold leading-snug tracking-[-0.03em] text-white/85">
          The operating system for student builders.
        </p>
        <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-white/50">
          Chapters, workshops, clusters, and leadership — one playbook, earned
          progression, faculty optional.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/login">
            <Button variant="orange" className="h-11 px-5">
              Enter workspace
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link
            href="/join"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 text-[13px] font-semibold text-white tracking-[-0.01em] transition hover:bg-white/15 hover:border-white/35 active:scale-95 shadow-[var(--shadow-sm)]"
          >
            Join a chapter
          </Link>
        </div>
      </main>
    </div>
  );
}
