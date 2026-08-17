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
  { label: "HQ", userId: "u-founder", roleKey: "founder" },
  { label: "HQ Admin", userId: "u-hq-admin", roleKey: "hq_admin" },
  {
    label: "Campus Executive Team · EKC",
    userId: "u-chairman",
    roleKey: "chairman",
    chapterId: "ch-ekc",
  },
  {
    label: "Faculty Coordinator · EKC",
    userId: "u-faculty",
    roleKey: "faculty_coordinator",
    chapterId: "ch-ekc",
  },
  {
    label: "Class Rep · EKC",
    userId: "u-cr",
    roleKey: "class_representative",
    chapterId: "ch-ekc",
  },
  {
    label: "Student · EKC",
    userId: "u-student-1",
    roleKey: "student",
    chapterId: "ch-ekc",
  },
];

function DemoLogin() {
  const router = useRouter();
  const { setSession, store } = useStore();
  const [loginError, setLoginError] = useState("");

  const availablePersonas = personas.filter((p) => {
    const target = store.profiles.find((pr) => pr.id === p.userId);
    return !target || (target.status ?? "active") !== "disabled";
  });

  function enter(userId: string, roleKey: RoleKey, chapterId?: string) {
    const target = store.profiles.find((p) => p.id === userId);
    if (target && (target.status ?? "active") === "disabled") {
      setLoginError("That account is disabled.");
      return;
    }
    setLoginError("");
    setSession(userId, roleKey, chapterId);
    router.push(homeForRole(roleKey, "ekc"));
  }

  const defaultPersona =
    availablePersonas.find((p) => p.userId === "u-chairman") ??
    availablePersonas[0];

  return (
    <>
      <h2 className="font-[family-name:var(--font-display)] text-[1.625rem] font-bold tracking-[-0.03em]">
        Sign in
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-text-dim">
        Continue with a demo persona to explore the workspace.
      </p>

      <div className="mt-8 space-y-4 rounded-[var(--radius-lg)] bg-bg-panel p-7 shadow-[var(--shadow)]">
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
          <Select
            defaultValue={
              defaultPersona
                ? `${defaultPersona.userId}|${defaultPersona.roleKey}|${defaultPersona.chapterId ?? ""}`
                : ""
            }
            id="persona"
          >
            {availablePersonas.map((p) => (
              <option
                key={p.label}
                value={`${p.userId}|${p.roleKey}|${p.chapterId ?? ""}`}
              >
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        {loginError ? (
          <p className="text-[13px] text-[var(--accent)]">{loginError}</p>
        ) : null}
        <Button
          variant="orange"
          className="mt-2 h-10 w-full"
          disabled={!availablePersonas.length}
          onClick={() => {
            const el = document.getElementById(
              "persona",
            ) as HTMLSelectElement | null;
            const [userId, roleKey, chapterId] = (el?.value ?? "").split("|");
            if (!userId || !roleKey) {
              setLoginError("No available personas.");
              return;
            }
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
      <h2 className="font-[family-name:var(--font-display)] text-[1.625rem] font-bold tracking-[-0.03em]">
        Sign in
      </h2>
      <p className="mt-2 text-[13px] text-text-dim">
        Supabase Auth is enabled for this environment.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-[var(--radius-lg)] bg-bg-panel p-7 shadow-[var(--shadow)]"
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
          className="mt-2 h-10 w-full"
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
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--charcoal-900)] p-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 10% 0%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 50%)",
          }}
        />
        <Link
          href="/"
          className="relative font-[family-name:var(--font-display)] text-[20px] font-extrabold tracking-[-0.04em]"
        >
          Elevates
        </Link>
        <div className="relative">
          <h1 className="max-w-[12ch] font-[family-name:var(--font-display)] text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.035em]">
            {auth ? "Your workspace." : "See the real product."}
          </h1>
          <p className="mt-5 max-w-[36ch] text-[14px] leading-relaxed text-white/50">
            {auth
              ? "Connected to Supabase Auth."
              : "Demo mode with seeded chapters. Events, ops, and org loops in one place."}
          </p>
        </div>
        <p className="relative font-[family-name:var(--font-mono)] text-[12px] text-white/30">
          Learn. Build. Grow. Ship. Repeat.
        </p>
      </div>

      <div className="flex items-center justify-center bg-[#f3f4f6] px-6 py-16">
        <div className="w-full max-w-[420px]">
          <Link
            href="/"
            className="mb-10 inline-block font-[family-name:var(--font-display)] text-[20px] font-extrabold tracking-[-0.04em] lg:hidden"
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
