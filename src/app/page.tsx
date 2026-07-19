import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[var(--charcoal-900)] text-white">
      <header className="mx-auto flex max-w-[1080px] items-center justify-between px-5 py-5">
        <p className="font-[family-name:var(--font-display)] text-[18px] font-extrabold tracking-[-0.03em]">
          Elevates
        </p>
        <Link href="/login">
          <Button variant="orange" className="h-8">
            Open app
          </Button>
        </Link>
      </header>

      <main className="mx-auto max-w-[1080px] px-5 pb-20 pt-16 md:pt-24">
        <p className="text-[13px] font-medium text-[var(--accent)]">
          Operating system for student builders
        </p>
        <h1 className="mt-4 max-w-[16ch] font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
          One HQ. Many chapters. Real work.
        </h1>
        <p className="mt-5 max-w-[48ch] text-[15px] leading-relaxed text-white/60">
          Manage events, leadership cycles, clusters, and chapter health across
          colleges — without duct-taping spreadsheets and Google Forms.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login">
            <Button variant="orange" className="h-10 px-4">
              Enter workspace
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/workflows">
            <Button
              variant="ghost"
              className="h-10 border-white/20 px-4 text-white hover:bg-white/10"
            >
              View workflows
            </Button>
          </Link>
        </div>

        <dl className="mt-16 grid gap-6 border-t border-white/10 pt-10 sm:grid-cols-3">
          <div>
            <dt className="font-[family-name:var(--font-mono)] text-[12px] text-white/40">
              Structure
            </dt>
            <dd className="mt-2 text-[15px] font-medium text-white/85">
              HQ → chapters → students, events, projects
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-mono)] text-[12px] text-white/40">
              Event loop
            </dt>
            <dd className="mt-2 text-[15px] font-medium text-white/85">
              Register → approve → attend → certificate
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-mono)] text-[12px] text-white/40">
              Brand
            </dt>
            <dd className="mt-2 text-[15px] font-medium text-white/85">
              Orange accent from elevates.live · charcoal ink
            </dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
