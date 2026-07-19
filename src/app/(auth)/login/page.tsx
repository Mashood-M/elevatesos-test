"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useStore } from "@/context/store-context";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { homeForRole } from "@/lib/access";
import { useSupabaseAuth } from "@/lib/mode";
import { createClient } from "@/lib/supabase/client";
import type { RoleKey } from "@/types";

const personas: {
  label: string;
  userId: string;
  roleKey: RoleKey;
  chapterId?: string;
}[] = [
  { label: "Founder (HQ)", userId: "u-founder", roleKey: "founder" },
  { label: "HQ Admin", userId: "u-hq-admin", roleKey: "hq_admin" },
  {
    label: "Faculty · EKC",
    userId: "u-faculty",
    roleKey: "faculty_coordinator",
    chapterId: "ch-ekc",
  },
  {
    label: "Chairman · EKC",
    userId: "u-chairman",
    roleKey: "chairman",
    chapterId: "ch-ekc",
  },
  {
    label: "Secretary · EKC",
    userId: "u-secretary",
    roleKey: "secretary",
    chapterId: "ch-ekc",
  },
  {
    label: "Class Rep · EKC",
    userId: "u-cr",
    roleKey: "class_representative",
    chapterId: "ch-ekc",
  },
  {
    label: "Student · Ananya",
    userId: "u-student-1",
    roleKey: "student",
    chapterId: "ch-ekc",
  },
];

function DemoLogin() {
  const router = useRouter();
  const { setSession } = useStore();

  function enter(userId: string, roleKey: RoleKey, chapterId?: string) {
    setSession(userId, roleKey, chapterId);
    router.push(homeForRole(roleKey, "ekc"));
  }

  return (
    <>
      <h2 className="font-[family-name:var(--font-display)] text-[1.5rem] font-bold tracking-[-0.02em]">
        Sign in
      </h2>
      <p className="mt-1 text-[13px] text-text-dim">
        Continue with a demo persona — try Forms hub and event detail pages after login.
      </p>

      <div className="mt-6 space-y-3.5 rounded-[var(--radius)] border border-border bg-bg-panel p-5">
        <div>
          <FieldLabel>Email</FieldLabel>
          <Input defaultValue="chairman@ekc.elevates.live" />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <Input type="password" defaultValue="••••••••" />
        </div>
        <div>
          <FieldLabel>Persona</FieldLabel>
          <Select defaultValue="u-chairman|chairman|ch-ekc" id="persona">
            {personas.map((p) => (
              <option
                key={p.label}
                value={`${p.userId}|${p.roleKey}|${p.chapterId ?? ""}`}
              >
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="orange"
          className="mt-1 h-10 w-full"
          onClick={() => {
            const el = document.getElementById(
              "persona",
            ) as HTMLSelectElement | null;
            const [userId, roleKey, chapterId] = (el?.value ?? "").split("|");
            enter(userId, roleKey as RoleKey, chapterId || undefined);
          }}
        >
          Continue
        </Button>
      </div>
    </>
  );
}

function SupabaseLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/hq";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <>
      <h2 className="font-[family-name:var(--font-display)] text-[1.5rem] font-bold tracking-[-0.02em]">
        Sign in
      </h2>
      <p className="mt-1 text-[13px] text-text-dim">
        Supabase Auth is enabled for this environment.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-3.5 rounded-[var(--radius)] border border-border bg-bg-panel p-5"
      >
        <div>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error ? (
          <p className="text-[12px] text-[var(--danger)]">{error}</p>
        ) : null}
        <Button
          type="submit"
          variant="orange"
          className="mt-1 h-10 w-full"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </>
  );
}

function LoginInner() {
  const auth = useSupabaseAuth();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[var(--charcoal-900)] p-10 text-white lg:flex">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-[18px] font-extrabold tracking-[-0.03em]"
        >
          Elevates
        </Link>
        <div>
          <h1 className="max-w-[14ch] font-[family-name:var(--font-display)] text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.03em]">
            {auth ? "Sign in to your workspace." : "Pick a role. See the real product."}
          </h1>
          <p className="mt-4 max-w-[40ch] text-[14px] leading-relaxed text-white/55">
            {auth
              ? "Connected to Supabase Auth. Apply migrations and seed before first use."
              : "Demo mode — seeded chapters, in-tab persistence. Try the three loops: events, ops, and org."}
          </p>
          {!auth ? (
            <ul className="mt-6 space-y-2 text-[13px] text-white/45">
              <li>1. Event — create → register → approve → check-in → cert</li>
              <li>2. Ops — tasks → announce → report → HQ approve</li>
              <li>3. Org — create chapter → see it on HQ dashboard</li>
            </ul>
          ) : null}
        </div>
        <p className="font-[family-name:var(--font-mono)] text-[12px] text-white/35">
          Learn. Build. Grow. Ship. Repeat.
        </p>
      </div>

      <div className="flex items-center justify-center bg-bg px-5 py-14">
        <div className="w-full max-w-[380px]">
          <Link
            href="/"
            className="mb-8 inline-block font-[family-name:var(--font-display)] text-[18px] font-extrabold lg:hidden"
          >
            Elevates
          </Link>
          {auth ? <SupabaseLogin /> : <DemoLogin />}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <LoginInner />
    </Suspense>
  );
}
