import { NextResponse } from "next/server";
import { isDemoMode, useSupabaseAuth } from "@/lib/mode";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  const configured = isSupabaseConfigured();
  return NextResponse.json({
    ok: true,
    service: "elevates-os",
    mode: isDemoMode() ? "demo" : configured ? "supabase" : "demo",
    supabaseConfigured: configured,
    supabaseAuth: useSupabaseAuth(),
    timestamp: new Date().toISOString(),
  });
}
