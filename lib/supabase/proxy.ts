
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // Public pages: customers can browse the catalog without signing in.
  const isPublicCatalog =
    pathname === "/catalog" || pathname.startsWith("/catalog/");

  // The login page is also public.
  const isLoginPage = pathname === "/login";

  // Let public pages load without requiring staff authentication.
  // The catalog reads only from the restricted catalog_products view.
  if (isPublicCatalog) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Supabase configuration is missing. Check your .env.local file."
    );
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verify the user's authentication token.
  const { data, error } = await supabase.auth.getClaims();
  const hasValidSession = !error && Boolean(data?.claims);

  // Login page is accessible without signing in.
  if (isLoginPage) {
    if (hasValidSession) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/";
      dashboardUrl.search = "";

      const redirectResponse = NextResponse.redirect(dashboardUrl);

      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });

      return redirectResponse;
    }

    return supabaseResponse;
  }

  // All remaining internal pages require a valid staff session.
  if (!hasValidSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    const redirectResponse = NextResponse.redirect(loginUrl);

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return supabaseResponse;
}

