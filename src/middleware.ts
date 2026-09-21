import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabase/env";

interface GetUserResult {
  user: User | null;
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
  timeoutMs = 2500,
  retries = 1,
): Promise<GetUserResult> {
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
        const errStatus = (error as { status?: number }).status;
        const isNetwork =
          errMsg.includes("fetch") ||
          errMsg.includes("network") ||
          errMsg.includes("timeout") ||
          errMsg.includes("econnrefused") ||
          errMsg.includes("enotfound") ||
          errStatus === 0 ||
          (typeof errStatus === "number" && errStatus >= 500);

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
    } catch (err: unknown) {
      const errorObj = err as { message?: string; name?: string };
      const errMsg = errorObj?.message?.toLowerCase() || "";
      const isNetwork =
        errMsg.includes("network_timeout") ||
        errMsg.includes("fetch") ||
        errMsg.includes("network") ||
        errMsg.includes("timeout") ||
        errMsg.includes("econnrefused") ||
        errMsg.includes("enotfound") ||
        errorObj?.name === "AbortError";

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
        "[CRITICAL SECURITY WARNING] Route protection is disabled in production because Supabase credentials are missing or are placeholder values!",
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
    path.startsWith("/profile") ||
    path.startsWith("/eos");

  if (!isProtectedApp) {
    return supabaseResponse;
  }

  // Validate the user with supabase.auth.getUser() instead of trusting cookie existence
  const { user } = await getUserWithRetryAndTimeout(supabase, 2500, 1);

  // Unauthenticated user accessing protected route → redirect to /login
  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Prevent back-button caching of protected app pages after sign out
  supabaseResponse.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  supabaseResponse.headers.set("Pragma", "no-cache");

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
  ],
};
