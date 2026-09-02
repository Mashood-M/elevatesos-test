import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";

interface GetUserResult {
  user: any | null;
  isNetworkError: boolean;
  isAuthError: boolean;
}

/**
 * Executes supabase.auth.getUser() with a short timeout and retry mechanism.
 * Distinguishes between explicit authentication errors (e.g. expired/invalid JWT)
 * and network/connectivity failures (e.g. offline, DNS failure, timeout).
 */
async function getUserWithRetryAndTimeout(
  supabase: ReturnType<typeof createServerClient>,
  timeoutMs = 3500,
  retries = 1
): Promise<GetUserResult> {
  let lastErr: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("NETWORK_TIMEOUT"));
        }, timeoutMs);
        userPromise.finally(() => clearTimeout(timer));
      });

      const { data, error } = await Promise.race([userPromise, timeoutPromise]);

      if (error) {
        const errMsg = error.message?.toLowerCase() || "";
        const errStatus = (error as any).status;
        const isNetwork =
          errMsg.includes("fetch") ||
          errMsg.includes("network") ||
          errMsg.includes("timeout") ||
          errMsg.includes("econnrefused") ||
          errMsg.includes("enotfound") ||
          errStatus === 0 ||
          errStatus >= 500;

        if (isNetwork) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
          return { user: null, isNetworkError: true, isAuthError: false };
        }

        // Explicit authentication failure (invalid / expired token)
        return { user: null, isNetworkError: false, isAuthError: true };
      }

      return { user: data?.user ?? null, isNetworkError: false, isAuthError: false };
    } catch (err: any) {
      lastErr = err;
      const errMsg = err?.message?.toLowerCase() || "";
      const isNetwork =
        errMsg.includes("network_timeout") ||
        errMsg.includes("fetch") ||
        errMsg.includes("network") ||
        errMsg.includes("timeout") ||
        errMsg.includes("econnrefused") ||
        errMsg.includes("enotfound") ||
        err?.name === "AbortError";

      if (isNetwork && attempt < retries) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }

      if (isNetwork) {
        return { user: null, isNetworkError: true, isAuthError: false };
      }

      return { user: null, isNetworkError: false, isAuthError: true };
    }
  }

  return { user: null, isNetworkError: true, isAuthError: false };
}

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

  let supabaseResponse = NextResponse.next({
    request,
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
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  let { user, isNetworkError } = await getUserWithRetryAndTimeout(supabase, 3500, 1);

  const path = request.nextUrl.pathname;

  const isProtectedApp =
    path.startsWith("/hq") ||
    path.startsWith("/chapter") ||
    path.startsWith("/executive") ||
    path.startsWith("/faculty") ||
    path.startsWith("/notifications") ||
    path.startsWith("/workflows") ||
    path.startsWith("/v2") ||
    path.startsWith("/design-system") ||
    path.startsWith("/eos");

  // Check if auth session cookies exist on the incoming request
  const hasAuthCookie = request.cookies.getAll().some(
    (c) =>
      c.name.startsWith("sb-") ||
      c.name.includes("auth-token") ||
      c.name.includes("supabase")
  );

  if (!user && hasAuthCookie) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        user = sessionData.session.user;
      }
    } catch (_) {}
  }

  // Unauthenticated user or invalid session accessing protected route
  if (isProtectedApp && !user) {
    // If getUser failed due to network/connectivity issues OR timed out, AND session cookies exist:
    // Do NOT force-redirect to /login. Allow request through using existing session cookie.
    if ((isNetworkError || user === null) && hasAuthCookie) {
      supabaseResponse.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
      supabaseResponse.headers.set("Pragma", "no-cache");
      return supabaseResponse;
    }

    // Explicit invalid/expired session or missing auth cookies → redirect to /login cleanly
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Copy cookies so session updates aren't lost
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value);
    });
    return redirectResponse;
  }

  // Already-authenticated user visiting /login → redirect to /chapter index
  if (path === "/login" && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/chapter";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value);
    });
    return redirectResponse;
  }

  // Prevent back-button caching of protected app pages after sign out
  if (isProtectedApp) {
    supabaseResponse.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    supabaseResponse.headers.set("Pragma", "no-cache");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/hq/:path*",
    "/chapter/:path*",
    "/executive/:path*",
    "/faculty/:path*",
    "/notifications",
    "/workflows",
    "/v2",
    "/design-system",
    "/profile/:path*",
    "/eos",
    "/eos/:path*",
    "/login",
  ],
};
