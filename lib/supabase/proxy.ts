
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const APPROVED_STAFF_IDS = new Set([
  "b9650894-1845-41c2-ab76-5d74f82179d0",
  "70ff875c-5742-4489-a35f-59f9dceb507e",
]);

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;

  // Customers can browse the public catalog without signing in.
  const isPublicCatalog =
    pathname === "/catalog" || pathname.startsWith("/catalog/");

  if (isPublicCatalog) {
    return supabaseResponse;
  }

  const isLoginPage = pathname === "/login";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Supabase configuration is missing. Check your environment variables."
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

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verify the authentication token.
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId =
    typeof claims?.sub === "string" ? claims.sub : null;

  const isApprovedStaff =
    !error && userId !== null && APPROVED_STAFF_IDS.has(userId);

  // Only approved staff can access the internal portal.
  if (isLoginPage) {
    if (isApprovedStaff) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/";
      dashboardUrl.search = "";

      const redirectResponse = NextResponse.redirect(dashboardUrl);

      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });

      return redirectResponse;
    }

    // Signed-out users and unapproved users can see the login page.
    return supabaseResponse;
  }

  if (!isApprovedStaff) {
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
