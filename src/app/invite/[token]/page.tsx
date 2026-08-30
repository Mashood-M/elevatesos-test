"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Lock, Mail, ShieldCheck, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  markInviteTokenUsed,
  validateInviteToken,
} from "@/lib/data/supabase-bootstrap";

type TokenInfo = {
  id: string;
  token: string;
  createdBy: string;
  chapterId?: string;
  expiresAt?: string;
} | null;

/** Format a date as "Aug 30, 2026 at 11:59 PM" */
function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Returns hours remaining (float) until expiry */
function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60);
}

export default function InviteSignUpPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [tokenInfo, setTokenInfo] = useState<TokenInfo>(null);
  const [tokenStatus, setTokenStatus] = useState<"loading" | "valid" | "invalid" | "expired">("loading");
  const [invalidReason, setInvalidReason] = useState<"used" | "expired" | "bad">("bad");
  const [referrerName, setReferrerName] = useState<string>("");
  const [chapterName, setChapterName] = useState<string>("");

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    async function checkToken() {
      // First do a raw DB check to distinguish used vs expired vs bad
      const supabaseRaw = createClient();
      if (supabaseRaw) {
        const { data: raw } = await supabaseRaw
          .from("invite_tokens")
          .select("is_active, used_by, expires_at")
          .eq("token", token)
          .maybeSingle();
        if (raw) {
          if (raw.used_by) {
            setInvalidReason("used");
            setTokenStatus("invalid");
            return;
          }
          if (raw.expires_at && new Date(raw.expires_at) < new Date()) {
            setInvalidReason("expired");
            setTokenStatus("expired");
            return;
          }
          if (!raw.is_active) {
            setInvalidReason("bad");
            setTokenStatus("invalid");
            return;
          }
        } else {
          setInvalidReason("bad");
          setTokenStatus("invalid");
          return;
        }
      }

      const info = await validateInviteToken(token);
      if (!info) {
        setTokenStatus("invalid");
        return;
      }
      setTokenInfo(info);
      setTokenStatus("valid");

      // Load referrer name and chapter name for display
      const supabase = createClient();
      if (!supabase) return;
      const [{ data: referrer }, { data: chapter }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", info.createdBy).maybeSingle(),
        info.chapterId
          ? supabase.from("chapters").select("name").eq("id", info.chapterId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (referrer?.full_name) setReferrerName(referrer.full_name);
      if (chapter?.name) setChapterName(chapter.name);
    }
    checkToken();
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const name = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!name) { setError("Full name is required."); return; }
    if (!cleanEmail) { setError("Email is required."); return; }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!tokenInfo) { setError("Invalid invite link."); return; }

    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError("Authentication service unavailable.");
      setLoading(false);
      return;
    }

    try {
      // 1. Create Supabase auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const authUser = authData.user;
      if (!authUser) {
        setError("Sign-up failed — no user returned.");
        setLoading(false);
        return;
      }

      // 2. Create profile row
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authUser.id,
          email: cleanEmail,
          full_name: name,
          status: "active",
          chapter_id: tokenInfo.chapterId ?? null,
        })
        .select("id")
        .single();

      if (profileError) {
        // If profile already exists (e.g. upsert on auth trigger), keep going
        console.warn("Profile insert error (may be a trigger duplicate):", profileError.message);
      }

      const profileId = profileData?.id ?? authUser.id;

      // 3. Assign student role
      // Fetch the student role id first
      const { data: roleRow } = await supabase
        .from("roles")
        .select("id")
        .eq("key", "student")
        .maybeSingle();

      if (roleRow?.id) {
        await supabase.from("user_roles").insert({
          user_id: profileId,
          role_id: roleRow.id,
          role_key: "student",
          chapter_id: tokenInfo.chapterId ?? null,
        });
      }

      // 4. Mark the invite token as used
      await markInviteTokenUsed(tokenInfo.id, profileId);

      setLoading(false);
      setSuccess(true);

      // 5. Redirect to login after short delay
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err) {
      console.error("Sign-up error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  // ── Token expired state ─────────────────────────────────────────────────────
  if (tokenStatus === "expired") {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--charcoal-900)] px-6">
        <div className="w-full max-w-md text-center">
          <Clock className="mx-auto mb-4 h-14 w-14 text-amber-400" />
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">
            Invite link expired
          </h1>
          <p className="mt-3 text-sm text-white/50">
            This invite link has passed its 7-day expiry window. Ask the person
            who shared it to generate a fresh link from their{" "}
            <span className="font-semibold text-white/70">Invite Friends</span> page.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    );
  }

  // ── Token invalid state ─────────────────────────────────────────────────────
  if (tokenStatus === "invalid") {
    const msg = invalidReason === "used"
      ? "This invite link has already been used to create an account."
      : "This invite link is not valid. Ask someone in the network to send you a new one.";
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--charcoal-900)] px-6">
        <div className="w-full max-w-md text-center">
          <XCircle className="mx-auto mb-4 h-14 w-14 text-red-400" />
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">
            {invalidReason === "used" ? "Already used" : "Invalid invite"}
          </h1>
          <p className="mt-3 text-sm text-white/50">{msg}</p>
          <Link
            href="/login"
            className="mt-8 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (tokenStatus === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--charcoal-900)]">
        <p className="font-[family-name:var(--font-mono)] text-sm text-white/40 animate-pulse">
          Validating invite…
        </p>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--charcoal-900)] px-6">
        <div className="w-full max-w-md text-center">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-400" />
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-white">
            Welcome to Elevates!
          </h1>
          <p className="mt-3 text-sm text-white/60">
            Your account has been created. Redirecting you to sign in…
          </p>
        </div>
      </div>
    );
  }

  // ── Sign-up form ────────────────────────────────────────────────────────────
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--charcoal-900)] p-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 10% 0%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 55%)",
          }}
        />
        <Link
          href="/"
          className="relative font-[family-name:var(--font-display)] text-[20px] font-extrabold tracking-[-0.04em]"
        >
          Elevates OS
        </Link>
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-mono tracking-wide text-white/80">
            <ShieldCheck size={13} className="text-[var(--accent)]" />
            INVITE-ONLY ACCESS
          </div>
          <h1 className="max-w-[15ch] font-[family-name:var(--font-display)] text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.035em]">
            You&apos;ve been invited.
          </h1>
          <p className="max-w-[36ch] text-[14px] leading-relaxed text-white/50">
            Elevates OS is the campus operating system for student chapters.
            Access is by invite only — welcome to the network.
          </p>
          {referrerName && (
            <div className="rounded-[14px] border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] text-white/40 uppercase tracking-wider">Invited by</p>
              <p className="mt-1 text-[15px] font-semibold">{referrerName}</p>
              {chapterName && (
                <p className="mt-0.5 text-[12px] text-white/50">{chapterName} chapter</p>
              )}
            </div>
          )}
        </div>
        <p className="relative font-[family-name:var(--font-mono)] text-[12px] text-white/30">
          Learn. Build. Grow. Ship. Repeat.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center bg-[#f8fafc] px-6 py-16">
        <div className="w-full max-w-[420px]">
          <Link
            href="/"
            className="mb-10 inline-block font-[family-name:var(--font-display)] text-[20px] font-extrabold tracking-[-0.04em] lg:hidden"
          >
            Elevates OS
          </Link>

          <div className="space-y-1">
            <h2 className="font-[family-name:var(--font-display)] text-[1.75rem] font-bold tracking-[-0.03em] text-[#111827]">
              Create your account
            </h2>
            <p className="text-[13px] leading-relaxed text-[#6b7280]">
              {referrerName
                ? `${referrerName} invited you to join Elevates OS.`
                : "You have been invited to join Elevates OS."}
              {" "}Fill in your details to get started.
            </p>
            {tokenInfo?.expiresAt && (
              <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                hoursUntil(tokenInfo.expiresAt) < 24
                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}>
                <Clock size={11} />
                {hoursUntil(tokenInfo.expiresAt) < 1
                  ? "Expires in less than an hour"
                  : hoursUntil(tokenInfo.expiresAt) < 24
                  ? `Expires in ${Math.round(hoursUntil(tokenInfo.expiresAt))}h`
                  : `Expires ${formatExpiry(tokenInfo.expiresAt)}`}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4 rounded-[var(--radius-lg)] bg-white p-7 shadow-sm border border-gray-200"
          >
            {/* Full Name */}
            <div>
              <FieldLabel>Full name</FieldLabel>
              <div className="relative mt-1">
                <User
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                  className="bg-white pl-9"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <FieldLabel>Email address</FieldLabel>
              <div className="relative mt-1">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  required
                  autoComplete="email"
                  className="bg-white pl-9"
                />
              </div>
            </div>

            {/* Password row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Password</FieldLabel>
                <div className="relative mt-1">
                  <Lock
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 chars"
                    required
                    autoComplete="new-password"
                    className="bg-white pl-9"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Confirm password</FieldLabel>
                <div className="relative mt-1">
                  <Lock
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    autoComplete="new-password"
                    className={`bg-white pl-9 ${confirmPassword && password !== confirmPassword ? "border-red-400" : ""}`}
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-[11px] text-red-500">Passwords don&apos;t match</p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-[12px] text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="orange"
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 font-semibold text-sm"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create account"}
              {!loading && <ArrowRight size={16} />}
            </Button>

            <p className="text-center text-[11px] text-gray-400">
              By joining, you agree to Elevates&apos; community standards.
              Your account will have{" "}
              <span className="font-semibold text-gray-600">Student</span> access.
            </p>
          </form>

          <p className="mt-6 text-center text-[13px] text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
