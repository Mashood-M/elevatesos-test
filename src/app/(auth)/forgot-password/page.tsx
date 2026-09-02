"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your registered email address.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Authentication service is temporarily unavailable.");
        setLoading(false);
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl bg-surface/80">
          <div className="mb-6 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-text">Reset Password</h1>
            <p className="text-sm text-text-dim mt-1">
              Enter your email address and we&apos;ll send you instructions to reset your password.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-6 text-center py-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm leading-relaxed flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="font-semibold text-emerald-300">Password Reset Link Sent!</p>
                <p className="text-xs text-text-dim">
                  If an account exists for <span className="text-text font-medium">{email}</span>, you will receive password reset instructions shortly.
                </p>
              </div>

              <Link href="/login" className="block w-full">
                <Button variant="ghost" className="w-full h-11 text-sm font-medium border border-border">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <FieldLabel>Email Address</FieldLabel>
                <div className="relative mt-1">
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10"
                  />
                  <Mail className="w-4 h-4 text-text-mute absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full h-11 text-sm font-semibold mt-2"
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center text-xs text-text-dim hover:text-text transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
