import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const configured = isSupabaseConfigured();

  // If Supabase is not configured at all, allow all requests and warn.
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[CRITICAL SECURITY WARNING] Route protection is disabled in production because Supabase credentials are missing or are placeholder values!"
      );
    }
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  const isProtectedApp =
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

  // Prevent back-button caching of protected app pages after sign out
  if (isProtectedApp) {
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }

  // Unauthenticated user accessing protected route → redirect to login
  if (isProtectedApp && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Already-authenticated user visiting /login → redirect to /chapter index for proper role-based routing
  if (path === "/login" && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/chapter";
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
