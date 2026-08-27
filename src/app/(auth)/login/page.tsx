"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { homeForRole } from "@/lib/access";
import { createClient } from "@/lib/supabase/client";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import type { RoleKey } from "@/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (!password || !password.trim()) {
      setError("Password is required.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Authentication service is unavailable. Please try again later.");
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: signError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signError) {
        setError(signError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Login failed — no user returned. Please try again.");
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      const userEmail = authData.user.email;

      // Fetch profile by ID or email
      let { data: profile } = await supabase
        .from("profiles")
        .select("id, chapter_id, status, email")
        .eq("id", userId)
        .maybeSingle();

      if (!profile && userEmail) {
        const { data: profileByEmail } = await supabase
          .from("profiles")
          .select("id, chapter_id, status, email")
          .ilike("email", userEmail)
          .maybeSingle();
        profile = profileByEmail;
      }

      if (profile?.status === "disabled") {
        await supabase.auth.signOut();
        setError("This account has been disabled. Please contact your campus administrator.");
        setLoading(false);
        return;
      }

      // Fetch the user's roles from the database using either user_id or profile.id
      let userRoleRows: { role_id: string; chapter_id?: string | null }[] | null = null;

      const { data: ur1 } = await supabase
        .from("user_roles")
        .select("role_id, chapter_id")
        .eq("user_id", userId)
        .limit(1);
      userRoleRows = ur1;

      if ((!userRoleRows || userRoleRows.length === 0) && profile?.id) {
        const { data: ur2 } = await supabase
          .from("user_roles")
          .select("role_id, chapter_id")
          .eq("user_id", profile.id)
          .limit(1);
        userRoleRows = ur2;
      }

      let roleKey: RoleKey = "student";
      let chapterId: string | undefined = profile?.chapter_id ?? undefined;

      if (userRoleRows && userRoleRows.length > 0) {
        const roleId = userRoleRows[0].role_id;
        chapterId = userRoleRows[0].chapter_id ?? chapterId;

        const { data: roleRow } = await supabase
          .from("roles")
          .select("key")
          .eq("id", roleId)
          .maybeSingle();

        if (roleRow?.key) {
          roleKey = roleRow.key as RoleKey;
        }
      } else if (userEmail) {
        // Infer role from email if user_roles entry not explicitly present
        const e = userEmail.toLowerCase();
        if (e.includes("founder")) roleKey = "founder";
        else if (e.includes("admin")) roleKey = "hq_admin";
        else if (e.includes("chairman")) roleKey = "chairman";
        else if (e.includes("faculty")) roleKey = "faculty_coordinator";
        else if (e.includes("cr")) roleKey = "class_representative";
      }

      // Fetch chapter slug for redirect
      let chapterSlug = "";
      if (chapterId) {
        const { data: chapterRow } = await supabase
          .from("chapters")
          .select("slug")
          .eq("id", chapterId)
          .maybeSingle();
        if (chapterRow?.slug) chapterSlug = chapterRow.slug;
      }
      if (!chapterSlug) {
        const { data: firstChapter } = await supabase
          .from("chapters")
          .select("slug")
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (firstChapter?.slug) chapterSlug = firstChapter.slug;
      }

      setLoading(false);

      // Hard redirect — clears any stale client state and lets middleware verify the session
      const destination = next ?? homeForRole(roleKey, chapterSlug);
      window.location.href = destination;
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-[1.75rem] font-bold tracking-[-0.03em] text-[#111827]">
          Sign in
        </h2>
        <p className="text-[13px] leading-relaxed text-[#6b7280]">
          Enter your registered email and password to access the Elevates workspace.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-[var(--radius-lg)] bg-white p-7 shadow-sm border border-gray-200"
      >
        <div>
          <FieldLabel>Email address</FieldLabel>
          <div className="relative mt-1">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@elevates.live or campus email"
              required
              autoComplete="email"
              className="bg-white"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <FieldLabel>Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-[11px] text-[var(--accent)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              className="bg-white"
            />
          </div>
        </div>

        {error ? (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-[12px] text-red-600">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          variant="orange"
          className="mt-2 h-11 w-full flex items-center justify-center gap-2 font-semibold text-sm"
          disabled={loading}
        >
          {loading ? "Authenticating…" : "Sign in to workspace"}
          {!loading && <ArrowRight size={16} />}
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-text-dim">
        <span>Need an account or chapter invitation? </span>
        <Link href="/join" className="text-[var(--accent)] font-semibold hover:underline">
          Join a chapter
        </Link>
      </div>
    </>
  );
}

function LoginInner() {
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
          Elevates OS
        </Link>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[11px] font-mono tracking-wide text-white/80 mb-4 border border-white/10">
            <ShieldCheck size={13} className="text-[var(--accent)]" />
            SECURE NETWORK GATEWAY
          </div>
          <h1 className="max-w-[12ch] font-[family-name:var(--font-display)] text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Your campus workspace.
          </h1>
          <p className="mt-5 max-w-[36ch] text-[14px] leading-relaxed text-white/50">
            Unified operations, verified leadership rosters, live events, and attendance check-ins for Elevates chapters across Kerala.
          </p>
        </div>
        <p className="relative font-[family-name:var(--font-mono)] text-[12px] text-white/30">
          Learn. Build. Grow. Ship. Repeat.
        </p>
      </div>

      <div className="flex items-center justify-center bg-[#f8fafc] px-6 py-16">
        <div className="w-full max-w-[420px]">
          <Link
            href="/"
            className="mb-10 inline-block font-[family-name:var(--font-display)] text-[20px] font-extrabold tracking-[-0.04em] lg:hidden"
          >
            Elevates OS
          </Link>
          <LoginForm />
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
