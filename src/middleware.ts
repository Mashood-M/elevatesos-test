import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const rawAuthFlag = process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH;
  const isExplicitlyDisabled = rawAuthFlag === "false" || rawAuthFlag === "0";
  const isProduction = process.env.NODE_ENV === "production";

  // Safeguard: default protection to enabled in production unless explicitly set to false
  const useAuth = isProduction
    ? !isExplicitlyDisabled
    : rawAuthFlag === "true" || rawAuthFlag === "1";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const configured = isSupabaseConfigured();

  if (!useAuth || !configured) {
    if (isProduction && !isExplicitlyDisabled && !configured) {
      console.error(
        "[CRITICAL SECURITY WARNING] Route protection active in production but Supabase credentials (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing or placeholder values!"
      );
    } else if (!useAuth) {
      console.warn(
        "[SECURITY WARNING] Route protection skipped because NEXT_PUBLIC_USE_SUPABASE_AUTH is disabled."
      );
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isApp =
    path.startsWith("/hq") ||
    path.startsWith("/chapter") ||
    path.startsWith("/executive") ||
    path.startsWith("/faculty") ||
    path.startsWith("/notifications") ||
    path.startsWith("/leaderboards") ||
    path.startsWith("/workflows") ||
    path.startsWith("/v2") ||
    path.startsWith("/design-system") ||
    path.startsWith("/profile") ||
    path.startsWith("/eos");

  if (isApp && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (path === "/login" && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/hq";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/hq/:path*",
    "/chapter/:path*",
    "/executive/:path*",
    "/faculty/:path*",
    "/notifications",
    "/leaderboards",
    "/workflows",
    "/v2",
    "/design-system",
    "/profile/:path*",
    "/eos",
    "/eos/:path*",
    "/login",
  ],
};
