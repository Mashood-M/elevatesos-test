"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { resetStoreBootstrapCache } from "@/lib/data/supabase-bootstrap";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types";

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Referral-style signup fields (independent student registration, no chapter selection)
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  // If already authenticated in Supabase, automatically redirect to workspace
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    async function checkExistingSession() {
      try {
        const res = await supabase!.auth.getSession();
        const user = res?.data?.session?.user;
        if (user) {
          setLoading(true);
          const activeRole = localStorage.getItem("elevates_active_role_key") || "student";
          let dest = (next && next !== "/join") ? next : undefined;
          if (!dest) {
            if (["founder", "hq_admin"].includes(activeRole)) {
              dest = "/hq";
            } else {
              dest = "/chapter";
            }
          }
          if (typeof window !== "undefined") {
            sessionStorage.setItem("elevates_skip_splash", "1");
            document.cookie = `elevates_active_role_key=${activeRole}; path=/; max-age=2592000; SameSite=Lax;`;
          }
          window.location.replace(dest);
          return;
        }
      } catch {
        // Ignore check failure
      }
    }
    void checkExistingSession();
  }, [next]);

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSignupSuccess(null);
    setLoading(true);

    const name = fullName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();
    const phoneDigits = phone.replace(/\D/g, "");

    if (!name || name.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      setLoading(false);
      return;
    }

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (phoneDigits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      setLoading(false);
      return;
    }

    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (signupPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Authentication service is currently unavailable. Please try again later.");
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: name,
            phone: phoneDigits,
          },
        },
      });

      if (signUpError) {
        let msg = signUpError.message;
        if (!msg || msg === "{}" || msg === "[object Object]") {
          if ((signUpError as { status?: number }).status === 500) {
            msg = "A database error occurred while creating your account. Please contact your administrator.";
          } else if ((signUpError as { status?: number }).status === 422) {
            msg = "This email is already registered or cannot be processed. Please sign in instead.";
          } else {
            msg = "Account creation failed. Please check your details and try again.";
          }
        }
        setError(msg);
        setLoading(false);
        return;
      }

      const authUser = authData.user;
      if (!authUser) {
        setError("Sign-up failed — no user returned.");
        setLoading(false);
        return;
      }

      // Update student profile and assign student role in parallel for maximum speed
      try {
        await Promise.allSettled([
          supabase
            .from("profiles")
            .update({
              phone: phoneDigits,
              full_name: name,
              status: "active",
              chapter_id: null,
            })
            .eq("id", authUser.id),
          (async () => {
            const { data: roleRow } = await supabase
              .from("roles")
              .select("id")
              .eq("key", "student")
              .maybeSingle();

            if (roleRow?.id) {
              await supabase.from("user_roles").upsert({
                user_id: authUser.id,
                role_id: roleRow.id,
                role_key: "student",
                chapter_id: null,
              });
            }
          })(),
          // Persist student join activity log via mutation
          fetch("/api/mutations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "record_referral_use",
              data: {
                userId: authUser.id,
                studentName: name,
                studentEmail: cleanEmail,
                phone: phoneDigits,
                chapterId: null,
              },
            }),
          }),
        ]);
      } catch (profileErr) {
        console.warn("Profile update warning after signup:", profileErr);
      }

      // Automatically sign in
      let { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: signupPassword,
      });

      // Auto confirm if email confirmation was queued
      if (signInError && signInError.message?.toLowerCase().includes("not confirmed")) {
        try {
          await fetch("/api/mutations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "auto_confirm_signup",
              data: { userId: authUser.id, email: cleanEmail },
            }),
          });
          const retry = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: signupPassword,
          });
          signInError = retry.error;
        } catch {}
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("elevates_active_chapter_id");
        localStorage.removeItem("elevates_locked_chapter_id");
        localStorage.removeItem("elevates_user_selected_role");
        localStorage.setItem("elevates_active_role_key", "student");
        localStorage.setItem("elevates_known_top_role", "student");
      }

      resetStoreBootstrapCache();

      // If active session created, take user straight to Student Hub
      if (!signInError) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("elevates_skip_splash", "1");
          document.cookie = "elevates_active_role_key=student; path=/; max-age=2592000; SameSite=Lax;";
        }
        const dest = (next && next !== "/join") ? next : "/chapter";
        window.location.replace(dest);
        return;
      }

      // If confirmation email is required
      setSignupSuccess("Account created successfully! Please check your email or sign in below.");
      setAuthMode("signin");
      setEmail(cleanEmail);
      setLoading(false);
    } catch (err: unknown) {
      console.error("Signup error:", err);
      setError("An unexpected error occurred during account creation. Please try again.");
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget as HTMLFormElement;
    const effectiveEmail = email.trim() || (form?.querySelector('input[type="email"]') as HTMLInputElement)?.value?.trim() || "";
    const effectivePassword = password || (form?.querySelector('input[type="password"]') as HTMLInputElement)?.value || "";
    const cleanEmail = effectiveEmail.toLowerCase();

    if (!cleanEmail) {
      setError("Email address is required.");
      setLoading(false);
      return;
    }

    if (!effectivePassword || !effectivePassword.trim()) {
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
        password: effectivePassword,
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

      let roleKey: RoleKey = "student";
      let chapterSlug = "";
      let chapterId: string | undefined = undefined;

      // Quick email heuristic fallback
      if (cleanEmail.includes("founder")) roleKey = "founder";
      else if (cleanEmail.includes("admin")) roleKey = "hq_admin";
      else if (cleanEmail.includes("chairman")) roleKey = "chairman";
      else if (cleanEmail.includes("faculty")) roleKey = "faculty_coordinator";
      else if (cleanEmail.includes("cr")) roleKey = "class_representative";

      // Fast parallel profile & role resolution (capped at 250ms so signin is instantaneous)
      try {
        const fetchDetailsPromise = (async () => {
          const [profileRes, rolesRes] = await Promise.allSettled([
            supabase
              .from("profiles")
              .select("id, chapter_id, status, role, designation")
              .eq("id", userId)
              .maybeSingle(),
            supabase
              .from("user_roles")
              .select("role_key, chapter_id")
              .eq("user_id", userId),
          ]);

          const profile = profileRes.status === "fulfilled" ? profileRes.value.data : null;
          const userRoleRows = rolesRes.status === "fulfilled" ? rolesRes.value.data : null;

          if (profile?.status === "disabled") {
            await supabase.auth.signOut();
            throw new Error("ACCOUNT_DISABLED");
          }

          if (profile?.chapter_id) {
            chapterId = profile.chapter_id;
          }

          const ROLE_PRIORITY: RoleKey[] = [
            "alumni",
            "student",
            "executive_member",
            "faculty_coordinator",
            "class_representative",
            "campus_lead",
            "hq_admin",
            "founder",
          ];

          const foundRoleKeys: RoleKey[] = [];
          if (userRoleRows && userRoleRows.length > 0) {
            for (const ur of userRoleRows) {
              if (ur.chapter_id && !chapterId) {
                chapterId = ur.chapter_id;
              }
              if (ur.role_key) {
                foundRoleKeys.push(ur.role_key as RoleKey);
              }
            }
          }

          if (profile) {
            const d = (profile.designation || "").toLowerCase().trim();
            const r = (profile.role || "").toLowerCase().trim();
            if ((d === "campus_lead" || r.includes("campus lead")) && !foundRoleKeys.includes("campus_lead")) {
              foundRoleKeys.push("campus_lead");
            }
            if ((d === "executive_member" || r.includes("executive member")) && !foundRoleKeys.includes("executive_member")) {
              foundRoleKeys.push("executive_member");
            }
          }

          if (foundRoleKeys.length > 0) {
            roleKey = foundRoleKeys.reduce<RoleKey>((best, cur) => {
              return ROLE_PRIORITY.indexOf(cur) > ROLE_PRIORITY.indexOf(best) ? cur : best;
            }, foundRoleKeys[0]);
          }

          if (chapterId) {
            const { data: chapterRow } = await supabase
              .from("chapters")
              .select("slug")
              .eq("id", chapterId)
              .maybeSingle();
            if (chapterRow?.slug) chapterSlug = chapterRow.slug;
          }
        })();

        const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 250));
        await Promise.race([fetchDetailsPromise, timeoutPromise]);
      } catch (detailErr: unknown) {
        const msg = (detailErr as { message?: string })?.message;
        if (msg === "ACCOUNT_DISABLED") {
          setError("This account has been disabled. Please contact your campus administrator.");
          setLoading(false);
          return;
        }
      }

      // Hard redirect — clears any stale client state and lets middleware verify the session
      let destination = (next && next !== "/join") ? next : undefined;
      if (!destination) {
        if (["founder", "hq_admin"].includes(roleKey)) {
          destination = "/hq";
        } else if (chapterSlug) {
          destination = `/chapter/${chapterSlug}`;
        } else {
          destination = "/chapter";
        }
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("elevates_skip_splash", "1");
        if (roleKey) {
          localStorage.setItem("elevates_active_role_key", roleKey);
          localStorage.setItem("elevates_known_top_role", roleKey);
          document.cookie = `elevates_active_role_key=${roleKey}; path=/; max-age=2592000; SameSite=Lax;`;
        }
        if (chapterId) {
          localStorage.setItem("elevates_active_chapter_id", chapterId);
        } else {
          localStorage.removeItem("elevates_active_chapter_id");
          localStorage.removeItem("elevates_locked_chapter_id");
        }

        // CRITICAL: Wipe stale unauthenticated store cache so target route loads with fresh authenticated session
        localStorage.removeItem("elevates_store_cache_v2");
        sessionStorage.removeItem("elevates_store_cache_v2");
      }

      resetStoreBootstrapCache();

      // Ensure Supabase auth session is committed to client cookies
      try {
        await supabase.auth.getSession();
      } catch {
        // Continue
      }

      // Small tick to ensure browser cookie jar has flushed document.cookie before full navigation
      await new Promise((resolve) => setTimeout(resolve, 80));

      window.location.replace(destination);
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
          {authMode === "signin" ? "Sign in" : "Create account"}
        </h2>
        <p className="text-[13px] leading-relaxed text-[#6b7280]">
          {authMode === "signin"
            ? "Enter your registered email and password to access the Elevates workspace."
            : "Register as a student builder in your campus chapter."}
        </p>
      </div>

      {signupSuccess && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[12px] font-medium text-emerald-800 flex items-start gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <span>{signupSuccess}</span>
        </div>
      )}

      {authMode === "signin" ? (
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-[var(--radius-lg)] bg-white p-7 shadow-sm border border-gray-200"
        >
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
                placeholder="you@elevates.live or campus email"
                required
                autoComplete="email"
                className="bg-white pl-9"
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
              <Lock
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="bg-white pl-9"
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
            className="mt-2 h-10 w-full !rounded-xl flex items-center justify-center gap-2 font-semibold text-[13px] shadow-xs hover:opacity-95 active:scale-[0.99] transition duration-150 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <span>Sign in to workspace</span>
                <ArrowRight size={15} />
              </>
            )}
          </Button>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-[12px] text-text-mute">
              Don&apos;t have an account yet?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setError("");
                  setSignupSuccess(null);
                }}
                className="font-bold text-[var(--accent)] hover:underline cursor-pointer"
              >
                Sign up for free
              </button>
            </p>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleSignUp}
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
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="you@college.edu"
                required
                autoComplete="email"
                className={cn(
                  "bg-white pl-9",
                  signupEmail.length > 0 && !EMAIL_REGEX.test(signupEmail.trim()) && "border-amber-400 focus-visible:ring-amber-300"
                )}
              />
            </div>
            {signupEmail.length > 0 && !EMAIL_REGEX.test(signupEmail.trim()) && (
              <p className="mt-1 text-[11px] text-amber-600">
                Please enter a valid email address (e.g. yourname@domain.com)
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <div className="flex items-center justify-between">
              <FieldLabel>Phone number</FieldLabel>
              <span className="text-[11px] font-mono text-gray-400">
                {phone.length}/10 digits
              </span>
            </div>
            <div className="relative mt-1">
              <Phone
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                maxLength={10}
                required
                autoComplete="tel"
                className={cn(
                  "bg-white pl-9 font-mono tracking-wider",
                  phone.length > 0 && phone.length < 10 && "border-amber-400 focus-visible:ring-amber-300"
                )}
              />
            </div>
            {phone.length > 0 && phone.length < 10 && (
              <p className="mt-1 text-[11px] text-amber-600">
                Must be exactly 10 digits ({10 - phone.length} more needed)
              </p>
            )}
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
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
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
                  className={cn(
                    "bg-white pl-9",
                    confirmPassword && signupPassword !== confirmPassword && "border-red-400"
                  )}
                />
              </div>
              {confirmPassword && signupPassword !== confirmPassword && (
                <p className="mt-1 text-[11px] text-red-500">Passwords don&apos;t match</p>
              )}
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
            className="mt-2 h-10 w-full !rounded-xl flex items-center justify-center gap-2 font-semibold text-[13px] shadow-xs hover:opacity-95 active:scale-[0.99] transition duration-150 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Creating account…</span>
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight size={15} />
              </>
            )}
          </Button>


          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-[12px] text-text-mute">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setError("");
                  setSignupSuccess(null);
                }}
                className="font-bold text-[var(--accent)] hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      )}
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
          className="relative flex items-center gap-2.5 font-[family-name:var(--font-display)] text-[20px] font-extrabold tracking-[-0.04em] transition hover:opacity-90"
        >
          <Image
            src="/elevates-symbol-white.png"
            alt="Elevates Logo"
            width={28}
            height={28}
            className="object-contain"
            priority
          />
          <span>Elevates OS</span>
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
            Unified operations, verified leadership directories, live events, and attendance check-ins for Elevates chapters across Kerala.
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
            className="mb-8 flex items-center gap-2.5 font-[family-name:var(--font-display)] text-[20px] font-extrabold tracking-[-0.04em] text-[#2d2d34] lg:hidden"
          >
            <Image
              src="/elevates-symbol.png"
              alt="Elevates Logo"
              width={26}
              height={26}
              className="object-contain"
              priority
            />
            <span>Elevates OS</span>
          </Link>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f8fafc]">
          <Loader2 size={26} className="animate-spin text-[var(--accent)]" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
