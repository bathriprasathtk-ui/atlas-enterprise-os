import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isWorkspace =
    pathname === "/workspace" ||
    pathname.startsWith("/workspace/");

  const isLogin = pathname === "/login";

  if (isWorkspace && !user) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  if (isLogin && user) {
    return NextResponse.redirect(
      new URL("/workspace/dashboard", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/workspace/:path*",
    "/login",
  ],
};